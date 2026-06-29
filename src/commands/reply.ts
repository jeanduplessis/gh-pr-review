import { githubTransport, type GitHubTransport } from "../gh";
import {
  COMMENT_PUBLICATION_QUERY,
  THREAD_ROOT_COMMENT_QUERY,
} from "../graphql/queries";
import type { ReplyResult, ReviewCommentState } from "../types";
import type { ParsedArgs } from "../utils";
import { exitWithError, outputJSON, resolvePR } from "../utils";

interface ThreadRootResponse {
  node: {
    __typename: string;
    comments?: { nodes: Array<{ databaseId: number | null }> };
  } | null;
}

interface RestReplyResponse {
  id: number;
  node_id: string;
}

interface CommentPublicationResponse {
  node: {
    __typename: string;
    id?: string;
    databaseId?: number | null;
    state?: ReviewCommentState;
  } | null;
}

export function replyToThread(
  args: ParsedArgs,
  transport: GitHubTransport = githubTransport,
): ReplyResult {
  const threadId = args.flags["thread-id"];
  const body = args.flags["body"];

  if (!threadId) {
    throw new Error("Missing required flag: --thread-id");
  }
  if (!body) {
    throw new Error("Missing required flag: --body");
  }

  const pr = resolvePR(args);
  const thread = transport.graphql<ThreadRootResponse>(
    THREAD_ROOT_COMMENT_QUERY,
    { threadId },
  ).node;
  if (!thread || thread.__typename !== "PullRequestReviewThread") {
    throw new Error(`Review thread not found: ${threadId}`);
  }

  const rootCommentDatabaseId = thread.comments?.nodes[0]?.databaseId;
  if (!rootCommentDatabaseId) {
    throw new Error(
      `Review thread ${threadId} has no root comment database ID`,
    );
  }

  const path = `repos/${pr.owner}/${pr.repo}/pulls/${pr.number}/comments/${rootCommentDatabaseId}/replies`;
  const created = transport.rest<RestReplyResponse>("POST", path, { body });
  if (!created.node_id) {
    throw new Error(
      `GitHub REST reply response did not include a comment node ID (database ID: ${created.id})`,
    );
  }

  const comment = transport.graphql<CommentPublicationResponse>(
    COMMENT_PUBLICATION_QUERY,
    {
      commentId: created.node_id,
    },
  ).node;
  const commentNodeId = comment?.id ?? created.node_id;
  const commentDatabaseId = comment?.databaseId ?? created.id;
  const state = comment?.state ?? "UNKNOWN";

  if (
    comment?.__typename !== "PullRequestReviewComment" ||
    state !== "SUBMITTED"
  ) {
    throw new Error(
      `Reply comment ${commentNodeId} was not submitted (observed state: ${state})`,
    );
  }
  if (!commentDatabaseId) {
    throw new Error(
      `Submitted reply comment ${commentNodeId} has no database ID`,
    );
  }

  return {
    comment_node_id: commentNodeId,
    comment_database_id: commentDatabaseId,
    state,
  };
}

export function replyCommand(args: ParsedArgs): void {
  try {
    outputJSON(replyToThread(args));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    exitWithError(message);
  }
}
