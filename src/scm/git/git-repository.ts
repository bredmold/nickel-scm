import * as child_process from "child_process";
import {logger} from "../../nickel";

/** Results of a pull */
export interface PullResult {
  updatedFiles: string[];
}

/** Results of a fetch */
export interface FetchItem {
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
  ahead: number;
  behind: number;
}

/**
 * Remote branch reference, with origin name and branch name
 */
export class RemoteBranch {
  static fromBranchName(branchName: string) {
    const normalized = branchName.replace(/^remotes\//, '');
    const pathElements = normalized.split(/\//);
    const remote = pathElements[0];
    const branch = pathElements.slice(1).join('/');
    logger.debug(`Remote branch: remote=${remote} branch=${branch}`);
    return new RemoteBranch(remote, branch);
  }

  constructor(public remote: string,
              public branch: string) {
  }

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

interface ProcessResult {
  stdout: string;
  stderr: string;
}


/**
 * Local Git repository
 */
export class GitRepository {
  constructor(private path: string) {
  }

  /**
   * Perform a Git pull operation on the given repository
   *
   * @returns {Promise<PullResult>} Report of what happened
   */
  pull(): Promise<PullResult> {
    let updateRegex = /^ ([a-zA-Z0-9/.-_]*)/;
    return this.run('git pull --ff-only').then(out => {
      let files: string[] = [];
      out.stdout.split(/\n/).forEach(line => {
        let match = line.match(updateRegex);
        if (match) {
          files.push(match[1]);
        }
      });
      return {updatedFiles: files};
    });
  }

  fetch(): Promise<FetchResult> {
    const branchRegex = /^ ([ +-t*!=]) \[([a-zA-Z ]+)]\s+([a-zA-Z0-9-_./]+|\(none\))\s+->\s+([a-zA-Z0-9-_./]+)$/;
    return this.run('git fetch --prune').then(out => {
      let lines = out.stderr.split(/\n/);
      let fetchItems: FetchItem[] = [];
      lines.forEach(line => {
        const lineMatch = line.match(branchRegex);
        if (lineMatch) {
          const summary = lineMatch[2];
          const remoteBranch = lineMatch[3];
          const localBranch = lineMatch[4];
          fetchItems.push({
            action: summary,
            remoteBranch: remoteBranch,
            trackingBranch: localBranch,
          });
        }
      });
      logger.debug(`fetchItems=${JSON.stringify(fetchItems)}`);
      return {updatedBranches: fetchItems};
    });
  }

  /**
   * Synchronously remove a remote branch
   *
   * @param remote Name of the remote being operated on
   * @param branch Name of the branch to remove
   */
  removeRemoteBranchSync(remote: string, branch: string): boolean {
    const normalizedBranch = branch.replace(/\//, '\/');
    const deletedRe = new RegExp(`^\s+-\s+\\[deleted]\s+${normalizedBranch}$`);

    try {
      this.runSync(`git push --delete ${remote} ${branch}`);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Checkout a git branch
   *
   * @param {string} branch Name of the branch to check out
   * @returns {Promise<any>} Promise that resolves (or rejects) with the command
   */
  selectBranch(branch: string): Promise<any> {
    return this.run(`git checkout ${branch}`).then(() => true);
  }

  /**
   * Delete a local branch
   *
   * @param {string} branch Name of the local branch to delete
   * @returns {Promise<any>} Promise that resolves (or rejects) with the command
   */
  deleteLocalBranch(branch: string): Promise<any> {
    return this.run(`git branch -d ${branch}`).then(() => true);
  }

  /**
   * Prune the given remote (remove local branches that no longer correspond to remote branches)
   *
   * @param {string} remote Name of the remote to prune
   * @returns {Promise<string[]>} List of branches that were pruned
   */
  prune(remote: string): Promise<string[]> {
    let pruneRegex = /^ * \[pruned] (.*)$/;
    return this.run(`git remote prune ${remote}`).then(out => {
      let lines: string[] = out.stdout.split(/\n/);

      if (lines.length <= 0) {
        return [];
      } else {
        let pruned: string[] = [];

        lines.forEach(line => {
          let pruneMatch = line.match(pruneRegex);
          if (pruneMatch) {
            pruned.push(pruneMatch[1]);
          }
        });

        return pruned;
      }
    });
  }

  /**
   * Get the current branch for this repository
   */
  branch(): Promise<string> {
    return this.run('git rev-parse --abbrev-ref HEAD')
      .then(out => out.stdout.trim());
  }

  /**
   * Get the current commit ID for this repository
   */
  commit(): Promise<string> {
    return this.run('git rev-parse --short HEAD')
      .then(out => out.stdout.trim());
  }

  status(): Promise<StatusResult> {
    let fileRegex = /^.. ([a-zA-Z0-9-._/]+)/;
    let threeDots = /(.+)\.\.\.(.+)/;
    let branchRegex = /^## ([a-zA-Z0-9-_/.]+)/;

    return this.run('git status -s -b').then(out => {
      let lines: string[] = out.stdout.split(/\n/);
      let firstLine = lines[0];

      let threeDotsMatch = firstLine.match(threeDots);
      let branchSpec = threeDotsMatch ? threeDotsMatch[1] : firstLine;

      let branchMatch = branchSpec.match(branchRegex);
      let branch = branchMatch ? branchMatch[1] : '';

      let files: string[] = [];
      lines.splice(1).forEach(line => {
        let lineMatch = line.match(fileRegex);
        if (lineMatch) {
          files.push(lineMatch[1]);
        }
      });

      return {
        modifiedFiles: files,
        branch: branch,
        ahead: 0,
        behind: 0,
      };
    });
  }

  /**
   * Gets all the merged remote-tracking branches for this repository. Filters out HEAD.
   */
  remoteMergedBranches(): Promise<string[]> {
    return this.run('git branch -r --merged').then(out => {
      const lines: string[] = out.stdout.split(/\n/);
      const branchRe = /^\s+([a-zA-Z0-9-\/._]+)$/;
      let branches: string[] = [];

      lines.forEach(line => {
        let lineMatch = line.match(branchRe);
        if (lineMatch) {
          logger.debug(`${this.path}: branch=${lineMatch[1]} line=${line}`);
          branches.push(lineMatch[1]);
        }
      });

      return branches;
    });
  }

  /**
   * Get a listing of all the branches the repository knows about
   */
  allBranches(): Promise<BranchListing> {
    return this.run('git branch -a').then(out => {
      const lines: string[] = out.stdout.split(/\n'/);
      const branchRe = /^..(remotes\/([a-zA-Z0-9_-]+)\/)?([a-zA-Z0-9/_-]+)$/;
      let localBranches: string[] = [];
      let remoteBranches: RemoteBranch[] = [];

      lines.forEach(line => {
        const lineMatch = line.match(branchRe);
        if (lineMatch) {
          const remote = lineMatch[1];
          const remoteName = lineMatch[2];
          const branchName = lineMatch[3];

          if (remote.length > 0) {
            remoteBranches.push(new RemoteBranch(remoteName, branchName));
          } else {
            localBranches.push(branchName);
          }
        }
      });
      return {
        local: localBranches,
        remote: remoteBranches,
      };
    });
  }

  private run(command: string): Promise<ProcessResult> {
    logger.debug(`${command} [${this.path}]`);
    return new Promise<any>((resolve, reject) => {
      child_process.exec(command, {cwd: this.path, encoding: 'utf8'}, (error, stdout, stderr) => {
        if (error) {
          logger.warn(`${this.path}: ${error.message}`);
          reject(error);
        } else {
          resolve({stdout: stdout, stderr: stderr});
        }
      });
    });
  }

  private runSync(command: string): string {
    logger.debug(`${command} [${this.path}]`);
    try {
      return child_process.execSync(command, {cwd: this.path, stdio: 'pipe', encoding: 'utf8'});
    } catch (error) {
      logger.warn(`${this.path}: ${error.message}`);
      throw error;
    }
  }
}
