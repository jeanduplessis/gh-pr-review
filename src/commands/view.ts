import type {
  GQLPullRequest,
  GQLReview,
  GQLReviewThread,
  Review,
  ReviewComment,
  ReviewReport,
  ReviewState,
  ThreadComment,
} from "../types";
import { graphql } from "../gh";
import { REVIEWS_AND_THREADS_QUERY } from "../graphql/queries";
import type { ParsedArgs } from "../utils";
import { exitWithError, outputJSON, parseStates, resolvePR } from "../utils";

interface QueryResult {
  repository: {
    pullRequest: GQLPullRequest;
  };
}

/**
 * Fetch all reviews and review threads for a pull request,
 * apply client-side filters, and output a ReviewReport.
 */
export function viewCommand(args: ParsedArgs): void {
  // --- Fetch all pages of reviews and threads ---
  const allReviews: GQLReview[] = [];
  const allThreads: GQLReviewThread[] = [];

  let reviewsCursor: string | null = null;
  let threadsCursor: string | null = null;
  let hasMoreReviews = true;
  let hasMoreThreads = true;

  try {
    const pr = resolvePR(args);
    while (hasMoreReviews || hasMoreThreads) {
      const variables: Record<string, string | number | boolean> = {
        owner: pr.owner,
        repo: pr.repo,
        number: pr.number,
      };
      if (reviewsCursor) variables.reviewsCursor = reviewsCursor;
      if (threadsCursor) variables.threadsCursor = threadsCursor;

      const data = graphql<QueryResult>(REVIEWS_AND_THREADS_QUERY, variables);
      const pullRequest = data.repository.pullRequest;

      if (hasMoreReviews) {
        allReviews.push(...pullRequest.reviews.nodes);
        hasMoreReviews = pullRequest.reviews.pageInfo.hasNextPage;
        reviewsCursor = pullRequest.reviews.pageInfo.endCursor;
      }

      if (hasMoreThreads) {
        allThreads.push(...pullRequest.reviewThreads.nodes);
        hasMoreThreads = pullRequest.reviewThreads.pageInfo.hasNextPage;
        threadsCursor = pullRequest.reviewThreads.pageInfo.endCursor;
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch reviews";
    exitWithError(message);
  }

  // --- Build a map of review ID -> Review ---
  const reviewMap = new Map<string, Review>();

  for (const r of allReviews) {
    const review: Review = {
      id: r.id,
      state: r.state,
      author_login: r.author?.login ?? "ghost",
      submitted_at: r.submittedAt,
      comments: [],
    };
    if (r.body !== "") {
      review.body = r.body;
    }
    reviewMap.set(r.id, review);
  }

  // --- Map threads to ReviewComments and attach to reviews ---
  for (const thread of allThreads) {
    const commentNodes = thread.comments.nodes;
    if (commentNodes.length === 0) continue;

    const firstComment = commentNodes[0];
    const reviewId = firstComment.pullRequestReview?.id;
    if (!reviewId) continue;

    const review = reviewMap.get(reviewId);
    if (!review) continue;

    // Build thread_comments from subsequent comments (replies)
    const threadComments: ThreadComment[] = commentNodes.slice(1).map((c) => ({
      author_login: c.author?.login ?? "ghost",
      body: c.body,
      created_at: c.createdAt,
    }));

    const reviewComment: ReviewComment = {
      thread_id: thread.id,
      path: thread.path,
      author_login: firstComment.author?.login ?? "ghost",
      body: firstComment.body,
      created_at: firstComment.createdAt,
      is_resolved: thread.isResolved,
      is_outdated: thread.isOutdated,
      thread_comments: threadComments,
    };

    if (thread.line != null) {
      reviewComment.line = thread.line;
    }

    review.comments.push(reviewComment);
  }

  // --- Apply client-side filters ---
  let reviews = Array.from(reviewMap.values());

  // --reviewer <login>
  const reviewerFlag = args.flags["reviewer"];
  if (reviewerFlag) {
    reviews = reviews.filter((r) => r.author_login === reviewerFlag);
  }

  // --states <APPROVED,CHANGES_REQUESTED,...>
  const statesFlag = args.flags["states"];
  if (statesFlag) {
    let states: ReviewState[];
    try {
      states = parseStates(statesFlag);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid states";
      exitWithError(message);
    }
    reviews = reviews.filter((r) => states.includes(r.state));
  }

  // --unresolved: remove resolved comments, then remove reviews with no comments
  if (args.flags["unresolved"] !== undefined) {
    for (const review of reviews) {
      review.comments = review.comments.filter((c) => !c.is_resolved);
    }
    reviews = reviews.filter((r) => r.comments.length > 0);
  }

  // --not-outdated: remove outdated comments, then remove reviews with no comments
  if (args.flags["not-outdated"] !== undefined) {
    for (const review of reviews) {
      review.comments = review.comments.filter((c) => !c.is_outdated);
    }
    reviews = reviews.filter((r) => r.comments.length > 0);
  }

  // --tail <n>: keep only the last n thread_comments per comment
  const tailFlag = args.flags["tail"];
  if (tailFlag !== undefined) {
    const n = parseInt(tailFlag, 10);
    if (isNaN(n) || n < 0) {
      exitWithError(`Invalid --tail value: ${tailFlag}. Must be a non-negative integer`);
    }
    for (const review of reviews) {
      for (const comment of review.comments) {
        if (comment.thread_comments.length > n) {
          comment.thread_comments = comment.thread_comments.slice(-n);
        }
      }
    }
  }

  // --- Output ---
  const report: ReviewReport = { reviews };
  outputJSON(report);
}
