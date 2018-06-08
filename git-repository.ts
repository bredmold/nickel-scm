import * as child_process from "child_process";

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
        let branchRegex = /^## ([a-zA-Z0-9-_/]+)/;

        return this.run('git status -s -b').then(stdout => {
            let lines: string[] = stdout.split(/\n/);
            let firstLine = lines[0];
            let branchMatch = firstLine.match(branchRegex);
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
        return new Promise<any>((resolve, reject) => {
            child_process.exec(command, {cwd: this.path, encoding: 'utf8'}, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }
}