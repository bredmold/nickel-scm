import {SyncResult, SyncStatus} from "./sync";
import {GitRepository} from "./git-repository";
import {ReportResult} from "./report";

export class NickelProject {
    name: string;
    path: string;
    repository: GitRepository;

    constructor(name: string, path?: string) {
        this.name = name;
        this.path = path ? `${path}/${name}` : name;
        this.repository = new GitRepository(this.path);
    }

    report(): Promise<ReportResult> {
        return new Promise<ReportResult>((resolve, reject) => {
            this.repository.status().then(
                status => {
                    this.repository.commit().then(
                        commitId => {
                            resolve({
                                project: this,
                                branch: status.branch,
                                modified: status.modifiedFiles.length,
                                commit: commitId,
                            });
                        },
                        e => resolve({
                            project: this,
                            branch: status.branch,
                            modified: status.modifiedFiles.length,
                            commit: ''
                        })
                    );
                },
                e => resolve({project: this, branch: '', modified: 0, commit: ''})
            );
        });
    }

    sync(): Promise<SyncResult> {
        return new Promise<SyncResult>((resolve, reject) => {
            this.repository.branch().then(
                branch => {
                    this.repository.pull().then(
                        pullResult => {
                            resolve({
                                status: SyncStatus.Success,
                                updateCount: pullResult.updatedFiles.length,
                                project: this,
                                branch: branch,
                            });
                        },
                        e => resolve({status: SyncStatus.Failure, updateCount: 0, project: this, branch: ''})
                    );
                },
                e => {
                    resolve({status: SyncStatus.Failure, updateCount: 0, project: this, branch: ''});
                }
            );
        });
    }
}