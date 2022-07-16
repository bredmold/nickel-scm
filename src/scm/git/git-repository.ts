import { ShellRunner } from "./shell-runner";
import { logger } from "../../logger";

/** Results of a pull */
export interface PullResult {
  updatedFiles: string[];
}

/** Results of a fetch */
export interface FetchItem {
  flag: string;
  action: string;
  remoteBranch: string;
  trackingBranch: string;
}

export interface FetchResult {
  updatedBranches: FetchItem[];
}

/**
 * Status information
 */
export interface StatusResult {
  modifiedFiles: string[];
  branch: string;
  remoteBranch: string;
  commit: string;
  ahead: number;
  behind: number;
}

/**
 * Result of deleting a branch
 */
export interface RemoveRemoteBranchResult {
  remote: string;
  branch: string;
  deleted: boolean;
}

/**
 * Remote branch reference, with origin name and branch name
 */
export class RemoteBranch {
  static fromBranchName(branchName: string): RemoteBranch {
    const normalized = branchName.replace(/^remotes\//, "");
    const pathElements = normalized.split(/\//);
    const remote = pathElements[0];
    const branch = pathElements.slice(1).join("/");
    logger.debug(`Remote branch: remote=${remote} branch=${branch}`);
    return new RemoteBranch(remote, branch);
  }

  constructor(public remote: string, public branch: string) {}

  toString(): string {
    return `${this.remote}/${this.branch}`;
  }
}

/**
 * Results of a branch listing
 */
export interface BranchListing {
  /** Local branches */
  local: string[];

  /** Remote tracking branches */
  remote: RemoteBranch[];
}

export class GitRepository {
  constructor(
    private readonly path: string,
    private readonly runner: ShellRunner,
    private readonly commitPrefix: number,
    private readonly pruneOnFetch: boolean
  ) {}

  /**
   * Return a new repository with the desired pruneOnFetch behavior
   *
   * @param pruneOnFetch If true, add the --prune option to commands that fetch (e.g. pull)
   */
  withPruneOnFetch(pruneOnFetch: boolean): GitRepository {
    return new GitRepository(
      this.path,
      this.runner,
      this.commitPrefix,
      pruneOnFetch
    );
  }

  /**
   * Perform a Git pull operation on the given repository
   *
   * @returns {Promise<PullResult>} Report of what happened
   */
  async pull(): Promise<PullResult> {
    const updateRegex = /^ ([a-zA-Z0-9/.-_]*)\s+\|/;
    const pruneOption = this.pruneOnFetch ? "--prune" : "";
    const out = await this.runner.run(`git pull --ff-only ${pruneOption}`);
    const lines = out.stdout.split(/\n/);

    return lines.reduce(
      (pullResult: PullResult, line: string) => {
        const match = line.match(updateRegex);
        if (match) {
          pullResult.updatedFiles.push(match[1]);
        }
        return pullResult;
      },
      { updatedFiles: [] }
    );
  }

  async fetch(): Promise<FetchResult> {
    const branchRegex =
      /^ ([ +\-t*!=]) (\[?[a-zA-Z0-9 .]+]?)\s+([a-zA-Z0-9-_./]+|\(none\))\s+->\s+([a-zA-Z0-9-_./]+)\s*(.*)?$/;
    const out = await this.runner.run("git fetch --prune");

    const lines = out.stderr.split(/\n/);
    logger.debug("lines = %j", lines);
    const result: FetchResult = lines.reduce(
      (result: FetchResult, line: string) => {
        const lineMatch = line.match(branchRegex);
        if (lineMatch) {
          const rawFlag = lineMatch[1];
          let flag = "unknown";
          switch (rawFlag) {
            case " ":
              flag = "fast-forward";
              break;
            case "+":
              flag = "forced update";
              break;
            case "-":
              flag = "pruned";
              break;
            case "t":
              flag = "tag update";
              break;
            case "*":
              flag = "new ref";
              break;
            case "!":
              flag = "rejected";
              break;
            case "=":
              flag = "up to date";
              break;
          }

          const summary = lineMatch[2];
          const remoteBranch = lineMatch[3];
          const localBranch = lineMatch[4];
          result.updatedBranches.push({
            flag: flag,
            action: summary,
            remoteBranch: remoteBranch,
            trackingBranch: localBranch,
          });
        }
        return result;
      },
      { updatedBranches: [] }
    );

    logger.debug(`fetchItems=${JSON.stringify(result.updatedBranches)}`);
    return result;
  }

  /**
   * Remove a remote branch
   *
   * @param remote Name of the remote being operated on
   * @param branch Name of the branch to remove
   */
  async removeRemoteBranch(
    remote: string,
    branch: string
  ): Promise<RemoveRemoteBranchResult> {
    try {
      await this.runner.run(`git push --delete ${remote} ${branch}`);
      return { remote: remote, branch: branch, deleted: true };
    } catch (error) {
      return { remote: remote, branch: branch, deleted: false };
    }
  }

  /**
   * Checkout a git branch
   *
   * @param {string} branch Name of the branch to check out
   * @returns {Promise<any>} Promise that resolves (or rejects) with the command
   */
  async selectBranch(branch: string): Promise<boolean> {
    await this.runner.run(`git checkout ${branch}`);
    return true;
  }

  /**
   * Delete a local branch
   *
   * @param {string} branch Name of the local branch to delete
   * @returns {Promise<any>} Promise that resolves (or rejects) with the command
   */
  async deleteLocalBranch(branch: string): Promise<boolean> {
    await this.runner.run(`git branch -d ${branch}`);
    return true;
  }

  /**
   * Prune the given remote (remove local branches that no longer correspond to remote branches)
   *
   * @param {string} remote Name of the remote to prune
   * @returns {Promise<string[]>} List of branches that were pruned
   */
  async prune(remote: string): Promise<string[]> {
    const pruneRegex = /^ \* \[pruned] (.*)$/;
    const out = await this.runner.run(`git remote prune ${remote}`);
    const lines: string[] = out.stdout.split(/\n/);

    return lines.reduce((pruned: string[], line: string) => {
      const pruneMatch = line.match(pruneRegex);
      if (pruneMatch) {
        pruned.push(pruneMatch[1]);
      }
      return pruned;
    }, []);
  }

  /**
   * Get the current branch for this repository
   */
  async branch(): Promise<string> {
    const out = await this.runner.run("git rev-parse --abbrev-ref HEAD");
    return out.stdout.trim();
  }

  /**
   * Get the current commit ID for this repository
   */
  async commit(): Promise<string> {
    const out = await this.runner.run("git rev-parse HEAD");
    return this.shorten(out.stdout.trim());
  }

  async status(): Promise<StatusResult> {
    const commitRe = /^# branch.oid ([a-fA-F0-9]+)$/;
    const localBranchRe = /^# branch.head ([a-zA-Z0-9_/-]+)$/;
    const remoteBranchRe = /^# branch.upstream ([a-zA-Z0-9_/-]+)$/;
    const aheadBehindRe = /^# branch.ab \+(\d+) -(\d+)$/;
    const fileLineRe =
      /^([12]) [ .MADRCU?!]{2} N\.\.\. \d+ \d+ \d+ [a-fA-F0-9]+ [a-fA-F0-9]+ (.*)$/;
    const renameRe = /^\w\d+ ([a-zA-Z0-9_/.-]+)\t([a-zA-Z0-9_/.-]+)$/;

    const out = await this.runner.run("git status --porcelain=2 -b");
    const lines: string[] = out.stdout.split(/\n/);

    let idx = 0;

    const commitLine = lines[idx];
    const commitMatch = commitLine.match(commitRe);
    const commit = commitMatch ? commitMatch[1] : "";
    idx += commitMatch ? 1 : 0;

    const localBranchLine = lines[idx];
    const localBranchMatch = localBranchLine.match(localBranchRe);
    const localBranch = localBranchMatch ? localBranchMatch[1] : "";
    idx += localBranchMatch ? 1 : 0;

    const remoteBranchLine = lines[idx];
    const remoteBranchMatch = remoteBranchLine.match(remoteBranchRe);
    const remoteBranch = remoteBranchMatch ? remoteBranchMatch[1] : "";
    idx += remoteBranchMatch ? 1 : 0;

    const aheadBehindLine = lines[idx];
    const aheadBehindMatch = aheadBehindLine.match(aheadBehindRe);
    const ahead = aheadBehindMatch ? parseInt(aheadBehindMatch[1]) : 0;
    const behind = aheadBehindMatch ? parseInt(aheadBehindMatch[2]) : 0;
    idx += aheadBehindMatch ? 1 : 0;

    const modifiedFiles: string[] = lines
      .splice(idx)
      .map((line) => {
        const lineMatcher = line.match(fileLineRe);
        if (lineMatcher) {
          const indicator = lineMatcher[1];
          const tail = lineMatcher[2];
          if (indicator === "1") {
            return tail;
          } else {
            const renameMatch = tail.match(renameRe);
            return renameMatch ? renameMatch[1] : "";
          }
        } else {
          return "";
        }
      })
      .filter((file) => file !== "");

    return {
      modifiedFiles: modifiedFiles,
      branch: localBranch,
      remoteBranch: remoteBranch,
      commit: this.shorten(commit),
      ahead: ahead,
      behind: behind,
    };
  }

  async remoteBranches(merged = false): Promise<string[]> {
    const command = `git branch -r ${merged ? "--merged" : ""}`;
    const out = await this.runner.run(command);
    const lines: string[] = out.stdout.split(/\n/);
    const branchRe = /^\s+([a-zA-Z0-9-/._]+)$/;

    return lines
      .map((line) => {
        const lineMatch = line.match(branchRe);
        if (lineMatch) {
          logger.debug(`${this.path}: branch=${lineMatch[1]} line=${line}`);
          return lineMatch[1];
        } else {
          return "";
        }
      })
      .filter((branch) => branch !== "");
  }

  /**
   * Gets all the merged remote-tracking branches for this repository. Filters out HEAD.
   */
  remoteMergedBranches(): Promise<string[]> {
    return this.remoteBranches(true);
  }

  /**
   * Get a listing of all the branches the repository knows about
   */
  async allBranches(): Promise<BranchListing> {
    const out = await this.runner.run("git branch -a");
    const lines: string[] = out.stdout.split(/\n/);
    const branchRe = /^..(remotes\/([a-zA-Z0-9_-]+)\/)?([a-zA-Z0-9/_-]+)$/;

    return lines.reduce(
      (branches: BranchListing, line: string) => {
        const lineMatch = line.match(branchRe);
        if (lineMatch) {
          const remote = lineMatch[1];
          const remoteName = lineMatch[2];
          const branchName = lineMatch[3];
          if (remote && remote.length > 0) {
            branches.remote.push(new RemoteBranch(remoteName, branchName));
          } else {
            branches.local.push(branchName);
          }
        }

        return branches;
      },
      { local: [], remote: [] }
    );
  }

  /**
   * Get the commit date for the most recent commit on a given branch
   *
   * @param branch Branch name to check
   */
  async committerDate(branch: string): Promise<Date> {
    const out = await this.runner.run(
      `git log -n 1 --pretty=format:%cI ${branch}`
    );
    const trimmed = out.stdout.trim();
    return new Date(trimmed);
  }

  /**
   * Shorten a commit ID according to the policy
   */
  private shorten(commit: string): string {
    return this.commitPrefix > 0 && commit.length > this.commitPrefix
      ? commit.substr(0, this.commitPrefix)
      : commit;
  }
}
