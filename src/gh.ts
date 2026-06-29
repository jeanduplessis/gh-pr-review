import { execFileSync } from "child_process";
import type { GraphQLResponse } from "./types";

export type GitHubField = string | number | boolean;

export interface GitHubTransport {
  graphql<T>(query: string, variables?: Record<string, GitHubField>): T;
  rest<T>(
    method: string,
    path: string,
    fields?: Record<string, GitHubField>,
  ): T;
}

function executeGh(args: string[]): string {
  try {
    return execFileSync("gh", args, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
    });
  } catch (err: unknown) {
    const error = err as { stderr?: string; message?: string };
    const message =
      error.stderr?.trim() || error.message || "Failed to execute gh command";
    throw new Error(message);
  }
}

function appendFields(
  args: string[],
  fields: Record<string, GitHubField>,
): void {
  for (const [key, value] of Object.entries(fields)) {
    args.push(typeof value === "string" ? "-f" : "-F", `${key}=${value}`);
  }
}

function parseJSON<T>(stdout: string): T {
  try {
    return JSON.parse(stdout) as T;
  } catch {
    throw new Error("Failed to parse GitHub API response as JSON");
  }
}

export function graphql<T>(
  query: string,
  variables: Record<string, GitHubField> = {},
): T {
  const args = ["api", "graphql", "-f", `query=${query}`];
  appendFields(args, variables);

  const parsed = parseJSON<GraphQLResponse<T>>(executeGh(args));
  if (parsed.errors && parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((e) => e.message).join("; "));
  }
  if (!parsed.data) {
    throw new Error("GitHub API returned no data");
  }
  return parsed.data;
}

export function rest<T>(
  method: string,
  path: string,
  fields: Record<string, GitHubField> = {},
): T {
  const args = ["api", "--method", method, path];
  appendFields(args, fields);
  return parseJSON<T>(executeGh(args));
}

export const githubTransport: GitHubTransport = { graphql, rest };
