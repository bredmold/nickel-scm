import {SyncResult, SyncStatus} from "./sync";
import {GitRepository} from "./git-repository";
import {ReportResult} from "./report";
import {BuildResult, BuildStatus, BuildSystem, inferBuildSystem, NoBuildSystem} from "./build";

/** Configuration values that can be passed in for a project */
export interface NickelProjectConfig {
    /** Project name */
    name: string;

    /** Filesystem path for the project */
    path?: string;

    /** Build system to use - if none is specified, the project is skipped during builds */
    build: string | boolean;
}

export class NickelProject {
    name: string;
    path: string;
    buildSystem: BuildSystem;
    repository: GitRepository;

    constructor(c: NickelProjectConfig) {
        this.name = c.name;
        this.path = c.path ? `${c.path}/${c.name}` : c.name;
        this.repository = new GitRepository(this.path);

        if (c.build === true) {
            this.buildSystem = inferBuildSystem(this);
        } else {
            this.buildSystem = new NoBuildSystem(this);
        }
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
            this.repository.status().then(
                status => {
                    if (status.modifiedFiles.length > 0) {
                        resolve({status: SyncStatus.Dirty, updateCount: 0, project: this, branch: status.branch});
                    } else {
                        this.repository.pull().then(
                            pullResult => {
                                resolve({
                                    status: SyncStatus.Success,
                                    updateCount: pullResult.updatedFiles.length,
                                    project: this,
                                    branch: status.branch,
                                });
                            },
                            e => resolve({status: SyncStatus.Failure, updateCount: 0, project: this, branch: ''})
                        );
                    }
                },
                e => resolve({status: SyncStatus.Failure, updateCount: 0, project: this, branch: ''})
            );
        });
    }

    build(): Promise<BuildResult> {
        return new Promise<BuildResult>((resolve, reject) => {
            this.repository.branch().then(
                branch => {
                    this.repository.commit().then(
                        commitId => {
                            this.buildSystem.build().then(
                                buildResult => {
                                    resolve({
                                        project: this,
                                        type: this.buildSystem.type,
                                        branch: branch,
                                        commit: commitId,
                                        status: buildResult.status,
                                        error: buildResult.error,
                                    });
                                },
                                e => resolve({
                                    project: this,
                                    type: this.buildSystem.type,
                                    branch: branch,
                                    commit: commitId,
                                    status: BuildStatus.Failure,
                                    error: e,
                                })
                            );
                        },
                        e => resolve({
                            project: this,
                            type: this.buildSystem.type,
                            branch: branch,
                            commit: '',
                            status: BuildStatus.Failure,
                            error: 'Unable to find commit',
                        })
                    );
                },
                e => {
                    resolve({
                        project: this,
                        type: this.buildSystem.type,
                        branch: '',
                        commit: '',
                        status: BuildStatus.Failure,
                        error: 'Unable to find branch',
                    });
                }
            );
        });
    }
}