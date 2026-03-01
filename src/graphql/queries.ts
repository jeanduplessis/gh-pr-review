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
