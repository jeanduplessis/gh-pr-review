/**
 * Query to fetch reviews and review threads for a pull request.
 * Used by the `view` command.
 *
 * Variables: $owner, $repo, $number, $reviewsCursor, $threadsCursor
 */
export const REVIEWS_AND_THREADS_QUERY = `
query($owner: String!, $repo: String!, $number: Int!, $reviewsCursor: String, $threadsCursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      reviews(first: 100, after: $reviewsCursor) {
        nodes {
          id
          state
          author {
            login
          }
          body
          submittedAt
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
      reviewThreads(first: 100, after: $threadsCursor) {
        nodes {
          id
          isResolved
          isOutdated
          path
          line
          comments(first: 100) {
            nodes {
              id
              body
              author {
                login
              }
              createdAt
              path
              line
              pullRequestReview {
                id
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
`;

/**
 * Query to fetch additional comment pages for a specific review thread.
 * Used by the `view` command when a thread has >100 comments.
 *
 * Variables: $threadId, $cursor
 */
export const THREAD_COMMENTS_QUERY = `
query($threadId: ID!, $cursor: String!) {
  node(id: $threadId) {
    ... on PullRequestReviewThread {
      comments(first: 100, after: $cursor) {
        nodes {
          id
          body
          author {
            login
          }
          createdAt
          path
          line
          pullRequestReview {
            id
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
`;

/** Resolve a review thread node ID to its root review comment database ID. */
export const THREAD_ROOT_COMMENT_QUERY = `
query($threadId: ID!) {
  node(id: $threadId) {
    __typename
    ... on PullRequestReviewThread {
      comments(first: 1) {
        nodes {
          databaseId
        }
      }
    }
  }
}
`;

/** Fetch authoritative comment-level publication state for a review comment. */
export const COMMENT_PUBLICATION_QUERY = `
query($commentId: ID!) {
  node(id: $commentId) {
    __typename
    ... on PullRequestReviewComment {
      id
      databaseId
      state
    }
  }
}
`;

/**
 * Query to fetch only review threads for a pull request.
 * Used by the `threads` command.
 *
 * Variables: $owner, $repo, $number, $cursor
 */
export const THREADS_QUERY = `
query($owner: String!, $repo: String!, $number: Int!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      reviewThreads(first: 100, after: $cursor) {
        nodes {
          id
          isResolved
          isOutdated
          path
          line
          comments(first: 1) {
            nodes {
              id
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
`;
