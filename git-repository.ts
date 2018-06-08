import * as child_process from "child_process";

/** Results of a pull */
export interface PullResult {
    updatedFiles: string[];
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
        return new Promise((resolve, reject) => {
            child_process.exec('git pull --ff-only', {cwd: this.path, encoding: 'utf8'}, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    let files: string[] = [];
                    stdout.split(/\n/).forEach(line => {
                        let match = line.match(updateRegex);
                        if (match) {
                            files.push(match[1]);
                        }
                    });
                    resolve({updatedFiles: files});
                }
            });
        });
    }

    /**
     * Get the current branch for this repository
     */
    branch(): Promise<string> {
        return new Promise((resolve, reject) => {
            child_process.exec('git rev-parse --abbrev-ref HEAD', {cwd: this.path, encoding: 'utf8'}, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout.trim());
                }
            });
        });
    }
}