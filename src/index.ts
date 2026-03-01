import { parseArgs, exitWithError } from "./utils";
import { viewCommand } from "./commands/view";
import { replyCommand } from "./commands/reply";
import { threadsCommand } from "./commands/threads";
import { resolveCommand } from "./commands/resolve";
import { unresolveCommand } from "./commands/unresolve";

const VERSION = "0.1.0";

const HELP_TEXT = `gh pr-review — Read and respond to PR review comments

Usage:
  gh pr-review <command> [options]

Commands:
  view        View reviews with inline comments and thread replies
  reply       Reply to a review thread
  threads     List review threads (with filters)
  resolve     Resolve a thread
  unresolve   Unresolve a thread

Global options:
  -R owner/repo    Repository (optional if in a git repo with gh remote)
  --pr <number>    Pull request number
  --help, -h       Show this help message
  --version, -v    Show version

Examples:
  gh pr-review view --pr 42
  gh pr-review view https://github.com/owner/repo/pull/42
  gh pr-review threads --pr 42 --unresolved
  gh pr-review reply --pr 42 --thread-id PRRT_... --body "Fixed!"
  gh pr-review resolve --pr 42 --thread-id PRRT_...`;

const rawArgs = process.argv.slice(2);
const args = parseArgs(rawArgs);

if (args.flags["help"] || args.flags["h"]) {
  console.log(HELP_TEXT);
  process.exit(0);
}

if (args.flags["version"] || args.flags["v"]) {
  console.log(VERSION);
  process.exit(0);
}

const command = args.positional[0];

if (!command) {
  exitWithError("No command specified. Run with --help for usage.");
}

args.positional = args.positional.slice(1);

switch (command) {
  case "view":
    viewCommand(args);
    break;
  case "reply":
    replyCommand(args);
    break;
  case "threads":
    threadsCommand(args);
    break;
  case "resolve":
    resolveCommand(args);
    break;
  case "unresolve":
    unresolveCommand(args);
    break;
  default:
    exitWithError(`Unknown command: ${command}. Run with --help for usage.`);
}
