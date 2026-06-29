import { describe, expect, test } from "bun:test";
import type { GitHubTransport } from "../gh";
import {
  COMMENT_PUBLICATION_QUERY,
  THREAD_ROOT_COMMENT_QUERY,
} from "../graphql/queries";
import type { ParsedArgs } from "../utils";
import { replyToThread } from "./reply";

function replyArgs(overrides: Partial<ParsedArgs["flags"]> = {}): ParsedArgs {
  return {
    flags: {
      R: "octocat/widgets",
      pr: "42",
      "thread-id": "PRRT_thread",
      body: "Fixed in latest commit",
      ...overrides,
    },
    positional: [],
  };
}

function successfulTransport(): GitHubTransport {
  return {
    graphql: ((query: string) => {
      if (query === THREAD_ROOT_COMMENT_QUERY) {
        return {
          node: {
            __typename: "PullRequestReviewThread",
            comments: { nodes: [{ databaseId: 1001 }] },
          },
        };
      }

      if (query === COMMENT_PUBLICATION_QUERY) {
        return {
          node: {
            __typename: "PullRequestReviewComment",
            id: "PRRC_reply",
            databaseId: 2002,
            state: "SUBMITTED",
          },
        };
      }

      throw new Error("Unexpected GraphQL query");
    }) as GitHubTransport["graphql"],
    rest: (() => ({
      id: 2002,
      node_id: "PRRC_reply",
    })) as GitHubTransport["rest"],
  };
}

describe("replyToThread", () => {
  test("resolves thread root and constructs REST reply request", () => {
    const graphqlCalls: Array<{
      query: string;
      variables: Record<string, string | number | boolean>;
    }> = [];
    const restCalls: Array<{
      method: string;
      path: string;
      fields: Record<string, string | number | boolean>;
    }> = [];
    const base = successfulTransport();
    const transport: GitHubTransport = {
      graphql: ((
        query: string,
        variables: Record<string, string | number | boolean> = {},
      ) => {
        graphqlCalls.push({ query, variables });
        return base.graphql(query, variables);
      }) as GitHubTransport["graphql"],
      rest: ((
        method: string,
        path: string,
        fields: Record<string, string | number | boolean> = {},
      ) => {
        restCalls.push({ method, path, fields });
        return base.rest(method, path, fields);
      }) as GitHubTransport["rest"],
    };

    replyToThread(replyArgs(), transport);

    expect(graphqlCalls).toEqual([
      {
        query: THREAD_ROOT_COMMENT_QUERY,
        variables: { threadId: "PRRT_thread" },
      },
      {
        query: COMMENT_PUBLICATION_QUERY,
        variables: { commentId: "PRRC_reply" },
      },
    ]);
    expect(restCalls).toEqual([
      {
        method: "POST",
        path: "repos/octocat/widgets/pulls/42/comments/1001/replies",
        fields: { body: "Fixed in latest commit" },
      },
    ]);
  });

  test("returns structured output for a submitted reply", () => {
    expect(replyToThread(replyArgs(), successfulTransport())).toEqual({
      comment_node_id: "PRRC_reply",
      comment_database_id: 2002,
      state: "SUBMITTED",
    });
  });

  test("fails when resulting reply is not submitted", () => {
    const transport = successfulTransport();
    transport.graphql = ((query: string) => {
      if (query === THREAD_ROOT_COMMENT_QUERY) {
        return {
          node: {
            __typename: "PullRequestReviewThread",
            comments: { nodes: [{ databaseId: 1001 }] },
          },
        };
      }
      return {
        node: {
          __typename: "PullRequestReviewComment",
          id: "PRRC_pending",
          databaseId: 2002,
          state: "PENDING",
        },
      };
    }) as GitHubTransport["graphql"];

    expect(() => replyToThread(replyArgs(), transport)).toThrow(
      "Reply comment PRRC_pending was not submitted (observed state: PENDING)",
    );
  });

  test("fails clearly when thread is missing", () => {
    const transport = successfulTransport();
    transport.graphql = (() => ({ node: null })) as GitHubTransport["graphql"];

    expect(() => replyToThread(replyArgs(), transport)).toThrow(
      "Review thread not found: PRRT_thread",
    );
  });

  test("fails clearly when thread has no root comment database ID", () => {
    const transport = successfulTransport();
    transport.graphql = (() => ({
      node: {
        __typename: "PullRequestReviewThread",
        comments: { nodes: [] },
      },
    })) as GitHubTransport["graphql"];

    expect(() => replyToThread(replyArgs(), transport)).toThrow(
      "Review thread PRRT_thread has no root comment database ID",
    );
  });

  test("preserves required reply flag validation", () => {
    expect(() =>
      replyToThread(replyArgs({ "thread-id": "" }), successfulTransport()),
    ).toThrow("Missing required flag: --thread-id");
    expect(() =>
      replyToThread(replyArgs({ body: "" }), successfulTransport()),
    ).toThrow("Missing required flag: --body");
  });

  test("keeps separate replies independent from draft-review state", () => {
    const restCalls: string[] = [];
    const transport: GitHubTransport = {
      graphql: ((
        query: string,
        variables: Record<string, string | number | boolean> = {},
      ) => {
        if (query === THREAD_ROOT_COMMENT_QUERY) {
          return {
            node: {
              __typename: "PullRequestReviewThread",
              comments: { nodes: [{ databaseId: 1001 }] },
            },
          };
        }
        const id = variables.commentId === "PRRC_first" ? 2001 : 2002;
        return {
          node: {
            __typename: "PullRequestReviewComment",
            id: variables.commentId,
            databaseId: id,
            state: "SUBMITTED",
          },
        };
      }) as GitHubTransport["graphql"],
      rest: ((
        _method: string,
        _path: string,
        fields: Record<string, string | number | boolean> = {},
      ) => {
        const suffix = fields.body === "first" ? "first" : "second";
        restCalls.push(suffix);
        return {
          id: suffix === "first" ? 2001 : 2002,
          node_id: `PRRC_${suffix}`,
        };
      }) as GitHubTransport["rest"],
    };

    const first = replyToThread(replyArgs({ body: "first" }), transport);
    const second = replyToThread(replyArgs({ body: "second" }), transport);

    expect(first.state).toBe("SUBMITTED");
    expect(second.state).toBe("SUBMITTED");
    expect(restCalls).toEqual(["first", "second"]);
  });
});
