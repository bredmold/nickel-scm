import {SyncResult, SyncStatus} from "./actions/sync";
import {GitRepository} from "./scm/git/git-repository";
import {ReportResult} from "./actions/report";
import {BuildResult, BuildStatus, BuildSystem, inferBuildSystem, NoBuildSystem} from "./actions/build";
import {CleanupResult, CleanupStatus} from "./actions/cleanup";

/** Configuration values that can be passed in for a project */
export interface NickelProjectConfig {
    /** Project name */
    name: string;

    /** Filesystem path for the project */
    path?: string;

    /** Build system to use - if none is specified, the project is skipped during builds */
    build: string | boolean;

    /** Name of the default branch (used during cleanup) */
    defaultBranch: string;
}

export class NickelProject {
    name: string;
    path: string;
    defaultBranch: string;
    buildSystem: BuildSystem;
    repository: GitRepository;

    constructor(c: NickelProjectConfig) {
        this.name = c.name;
        this.path = c.path ? `${c.path}/${c.name}` : c.name;
        this.defaultBranch = c.defaultBranch;
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

    cleanup(): Promise<CleanupResult> {
        return new Promise<CleanupResult>((resolve, reject) => {
            this.repository.status().then(
                status => {
                    if (this.defaultBranch === status.branch) {
                        resolve({
                            project: this,
                            status: CleanupStatus.Skipped,
                            branch: status.branch,
                        });
                    } else if (status.modifiedFiles.length > 0) {
                        resolve({
                            project: this,
                            status: CleanupStatus.Dirty,
                            branch: status.branch,
                        });
                    } else {
                        this.repository.selectBranch(this.defaultBranch).then(
                            () => {
                                this.repository.pull().then(
                                    pull => {
                                        this.repository.deleteLocalBranch(status.branch).then(
                                            () => {
                                                this.repository.prune('origin').then(
                                                    pruned => {
                                                        resolve({
                                                            project: this,
                                                            status: CleanupStatus.Success,
                                                            branch: status.branch,
                                                        });
                                                    },
                                                    e => resolve({
                                                        project: this,
                                                        status: CleanupStatus.Failure,
                                                        branch: status.branch,
                                                    })
                                                );
                                            },
                                            e => resolve({
                                                project: this,
                                                status: CleanupStatus.Failure,
                                                branch: status.branch,
                                            })
                                        );
                                    },
                                    e => resolve({
                                        project: this,
                                        status: CleanupStatus.Failure,
                                        branch: status.branch,
                                    })
                                );
                            },
                            e => resolve({
                                project: this,
                                status: CleanupStatus.Failure,
                                branch: status.branch,
                            })
                        );
                    }
                },
                e => resolve({
                    project: this,
                    status: CleanupStatus.Failure,
                    branch: '',
                })
            );
        });
    }
}