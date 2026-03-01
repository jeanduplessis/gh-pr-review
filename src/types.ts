// === API Response Types (from GitHub GraphQL) ===

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

// Raw GraphQL response types
export interface GQLPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface GQLAuthor {
  login: string;
}

export interface GQLReviewComment {
  id: string;
  body: string;
  author: GQLAuthor | null;
  createdAt: string;
  path: string;
  line: number | null;
  pullRequestReview: { id: string } | null;
}

export interface GQLReviewThread {
  id: string;
  isResolved: boolean;
  isOutdated: boolean;
  path: string;
  line: number | null;
  comments: {
    nodes: GQLReviewComment[];
  };
}

export interface GQLReview {
  id: string;
  state: ReviewState;
  author: GQLAuthor | null;
  body: string;
  submittedAt: string;
}

export interface GQLPullRequest {
  reviews: {
    nodes: GQLReview[];
    pageInfo: GQLPageInfo;
  };
  reviewThreads: {
    nodes: GQLReviewThread[];
    pageInfo: GQLPageInfo;
  };
}

// === Output Types (what we emit as JSON) ===

export type ReviewState = "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING";

export interface ThreadComment {
  author_login: string;
  body: string;
  created_at: string;
}

export interface ReviewComment {
  thread_id: string;
  path: string;
  line?: number;
  author_login: string;
  body: string;
  created_at: string;
  is_resolved: boolean;
  is_outdated: boolean;
  thread_comments: ThreadComment[];
}

export interface Review {
  id: string;
  state: ReviewState;
  author_login: string;
  body?: string;
  submitted_at: string;
  comments: ReviewComment[];
}

export interface ReviewReport {
  reviews: Review[];
}

export interface ReplyMinimal {
  comment_node_id: string;
}

export interface ThreadSummary {
  threadId: string;
  isResolved: boolean;
  path: string;
  line?: number;
  isOutdated: boolean;
}

export interface ThreadMutationResult {
  thread_node_id: string;
  is_resolved: boolean;
}

// === CLI Types ===

export interface PRIdentifier {
  owner: string;
  repo: string;
  number: number;
}

export interface ViewOptions {
  pr: PRIdentifier;
  reviewer?: string;
  states?: ReviewState[];
  unresolved?: boolean;
  notOutdated?: boolean;
  tail?: number;
}

export interface ReplyOptions {
  pr: PRIdentifier;
  threadId: string;
  body: string;
}

export interface ThreadsOptions {
  pr: PRIdentifier;
  unresolved?: boolean;
}

export interface ResolveOptions {
  pr: PRIdentifier;
  threadId: string;
}
