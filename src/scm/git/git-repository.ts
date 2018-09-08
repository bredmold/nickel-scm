import * as child_process from "child_process";
import {logger} from "../../nickel";

/** Results of a pull */
export interface PullResult {
    updatedFiles: string[];
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
        return this.run('git pull --ff-only').then(stdout => {
            let files: string[] = [];
            stdout.split(/\n/).forEach(line => {
                let match = line.match(updateRegex);
                if (match) {
                    files.push(match[1]);
                }
            });
            return {updatedFiles: files};
        });
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
        return this.run(`git remote prune ${remote}`).then(stdout => {
            let lines: string[] = stdout.split(/\n/);

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
            .then(stdout => stdout.trim());
    }

    /**
     * Get the current commit ID for this repository
     */
    commit(): Promise<string> {
        return this.run('git rev-parse --short HEAD')
            .then(stdout => stdout.trim());
    }

    status(): Promise<StatusResult> {
        let fileRegex = /^.. ([a-zA-Z0-9-._/]+)/;
        let threeDots = /(.+)\.\.\.(.+)/;
        let branchRegex = /^## ([a-zA-Z0-9-_/.]+)/;

        return this.run('git status -s -b').then(stdout => {
            let lines: string[] = stdout.split(/\n/);
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

    private run(command: string): Promise<string> {
        logger.debug(`${command} [${this.path}]`);
        return new Promise<any>((resolve, reject) => {
            child_process.exec(command, {cwd: this.path, encoding: 'utf8'}, (error, stdout, stderr) => {
                if (error) {
                    logger.warn(`${this.path}: ${error.message}`);
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }
}