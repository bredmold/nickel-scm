import {SyncResult, SyncStatus} from "./actions/sync";
import {GitRepository} from "./scm/git/git-repository";
import {ReportResult} from "./actions/report";
import {BuildResult, BuildStatus, BuildSystem, inferBuildSystem, NoBuildSystem} from "./actions/build";
import {CleanupResult, CleanupStatus} from "./actions/cleanup";
import {RemovedMergedBranchesStatus, RemoveMergedBranchesResult} from './actions/merged'
import {logger} from "./nickel";

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

  /** List of branches or branch name regular expressions that will not be evaluated for deletion */
  safeBranches: (string | RegExp)[];
}

export class NickelProject {
  name: string;
  path: string;
  defaultBranch: string;
  safeBranches: (string | RegExp)[];
  buildSystem: BuildSystem;
  repository: GitRepository;

  constructor(c: NickelProjectConfig) {
    this.name = c.name;
    this.path = c.path ? `${c.path}/${c.name}` : c.name;
    this.defaultBranch = c.defaultBranch;
    this.safeBranches = c.safeBranches;
    this.repository = new GitRepository(this.path);

    // Make sure the default branch is always "safe"
    this.safeBranches.push(this.defaultBranch);

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

  removeMergedBranches(dryRun: boolean): Promise<RemoveMergedBranchesResult> {
    return new Promise<RemoveMergedBranchesResult>((resolve, reject) => {
      this.repository.status().then(
        status => {
          if (status.modifiedFiles.length > 0) {
            resolve({
              project: this,
              candidateBranches: [],
              removedBranches: [],
              branch: status.branch,
              status: RemovedMergedBranchesStatus.Dirty,
            });
          } else if (status.branch !== this.defaultBranch) {
            resolve({
              project: this,
              candidateBranches: [],
              removedBranches: [],
              branch: status.branch,
              status: RemovedMergedBranchesStatus.Working,
            });
          } else {
            this.repository.fetch().then(
              fetchResult => {
                let deletedBranches: string[] = [];
                let addedBranches: string[] = [];
                fetchResult.updatedBranches.forEach(fetchItem => {
                  if (fetchItem.action === 'deleted') {
                    deletedBranches.push(fetchItem.trackingBranch);
                  } else if (fetchItem.action === 'new branch') {
                    addedBranches.push(fetchItem.trackingBranch);
                  }
                });

                let branchNameMap: {[key: string]: string} = {};
                deletedBranches.forEach(deletedBranch => {
                  const matchingBranch = addedBranches.find(addedBranch => addedBranch.toLowerCase() === deletedBranch.toLowerCase());
                  if (matchingBranch) {
                    branchNameMap[deletedBranch] = matchingBranch;
                    logger.debug(`Matching branch: ${deletedBranch} => ${matchingBranch}`);
                  }
                });

                this.repository.remoteMergedBranches().then(
                  remoteBranches => {
                    // List of regex values that check for 'safe' branches
                    const safeBranchRes: RegExp[] = this.safeBranches.map(safeBranch => {
                      return ((typeof safeBranch === 'string')
                        ? new RegExp(`^origin/${safeBranch}$`)
                        : safeBranch);
                    });

                    // List of non-safe branches
                    const branchesToExamine = remoteBranches.filter(branch => {
                      const safeIdx = safeBranchRes.findIndex(safeBranchRe => (branch.match(safeBranchRe) != null));
                      if (safeIdx < 0) {
                        const elements = branch.split(/\//);
                        const remote = elements[0];
                        const trackingBranch = elements.slice(1).join('/');
                        logger.info(`${this.name}: Candidate ${remote} ${trackingBranch}`);
                        return true;
                      } else {
                        return false;
                      }
                    });

                    let removedBranches: string[] = [];
                    if (!dryRun) {
                      branchesToExamine.forEach(branch => {
                        if (branchNameMap[branch]) {
                          branch = branchNameMap[branch];
                        }

                        const elements = branch.split(/\//);
                        const remote = elements[0];
                        let trackingBranch = elements.slice(1).join('/');

                        const deleted = this.repository.removeRemoteBranchSync(remote, trackingBranch);
                        if (deleted) {
                          logger.info(`${this.name}: Deleted ${remote} ${trackingBranch}`);
                          removedBranches.push(branch);
                        }
                      });
                    }

                    resolve({
                      project: this,
                      candidateBranches: branchesToExamine,
                      removedBranches: removedBranches,
                      branch: status.branch,
                      status: RemovedMergedBranchesStatus.Success,
                    });
                  },
                  e => resolve({
                    project: this,
                    candidateBranches: [],
                    removedBranches: [],
                    branch: status.branch,
                    status: RemovedMergedBranchesStatus.Failure,
                  })
                )
              },
              e => resolve({
                project: this,
                candidateBranches: [],
                removedBranches: [],
                branch: status.branch,
                status: RemovedMergedBranchesStatus.Failure,
              })
            );
          }
        },
        e => resolve({
          project: this,
          candidateBranches: [],
          removedBranches: [],
          branch: '',
          status: RemovedMergedBranchesStatus.Failure,
        })
      );
    });
  }
}
