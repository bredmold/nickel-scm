import {NickelProject} from '../nickel-project'
import {logger} from "../nickel";
import * as fs from "fs";
import {FetchResult, RemoteBranch} from "../scm/git/git-repository";

/*
Merged branches report generation
 */

export enum MergedBranchesStatus {
  New = 'merge-report-new',
  Success = 'merge-report-success',
  Failure = 'merge-report-failure',
  Skipped = 'merge-report-skip',
}

export interface MergedBranchesResult {
  /** The project being reported on */
  project: NickelProject;

  /** List of branches identified for removal */
  candidateBranches: string[];

  /** Status when pulling branch status */
  status: MergedBranchesStatus;
}

export class MergedBranchesReport implements MergedBranchesResult {
  candidateBranches: string[];
  status: MergedBranchesStatus;

  constructor(public project: NickelProject) {
    this.candidateBranches = [];
    this.status = MergedBranchesStatus.New;
  }

  report(): Promise<MergedBranchesResult> {
    return new Promise<MergedBranchesResult>(resolve => {
      const finish = (e: any, status: MergedBranchesStatus) => {
        this.status = status;
        resolve(this);
      };

      this.project.repository.fetch().then(
        () => {
          this.project.repository.remoteMergedBranches().then(
            remoteBranches => {
              // List of regex values that check for 'safe' branches
              const safeBranchRes: RegExp[] = this.project.safeBranches.map(safeBranch => {
                return ((typeof safeBranch === 'string')
                  ? new RegExp(`^origin/${safeBranch}$`)
                  : safeBranch);
              });

              this.candidateBranches = remoteBranches.filter(branch => {
                const safeIdx = safeBranchRes.findIndex(safeBranchRe => (branch.match(safeBranchRe) != null));
                if (safeIdx < 0) {
                  const elements = branch.split(/\//);
                  const remote = elements[0];
                  const trackingBranch = elements.slice(1).join('/');
                  logger.info(`${this.project.name}: Candidate ${remote} ${trackingBranch}`);

                  return true;
                } else {
                  return false;
                }
              });
              finish(null, MergedBranchesStatus.Success);
            },
            e => finish(e, MergedBranchesStatus.Failure)
          );
        },
        e => finish(e, MergedBranchesStatus.Failure)
      );
    });
  }
}

export interface MergedBranchInstruction {
  project: string;
  branch: string;
  keep: boolean;
}

export class MergedBranchesInstructions {
  constructor(private reports: MergedBranchesResult[],
              private reportFile: string) {
  }

  writeReport(): void {
    let processed: MergedBranchInstruction[] = [];
    this.reports.forEach(report => {
      report.candidateBranches.forEach(branch => {
        processed.push({
          project: report.project.name,
          branch: branch,
          keep: false,
        });
      });
    });

    const reportText = JSON.stringify(processed, null, 1);

    logger.info(`Generating branch report to file: ${this.reportFile}`);
    fs.writeFileSync(this.reportFile, reportText);
  }
}

/*
Guided Branch Removal
 */
export enum GuidedBranchRemovalStatus {
  New = 'guided-merge-new',
  Success = 'guided-merge-success',
  Failure = 'guided-merge-failure',
  Skipped = 'guided-merge-skip',
  Dirty = 'guided-merge-dirty',
  Working = 'guided-merge-working',
}

export interface GuidedBranchRemovalResult {
  /** The project whose branches were pruned */
  project: NickelProject;

  /** Current working branch for the project */
  branch: string;

  /** List of branches explicitly retained */
  branchesKept: string[]

  /** List of merged branches that were removed */
  removedBranches: string[];

  /** List of branches that could not be removed for any reason */
  notRemovedBranches: string[];

  /** Status from merging branches */
  status: GuidedBranchRemovalStatus;
}

export class GuidedBranchRemoval implements GuidedBranchRemovalResult {
  branch: string;
  branchesKept: string[];
  removedBranches: string[];
  notRemovedBranches: string[];
  branchesToRemove: RemoteBranch[];
  status: GuidedBranchRemovalStatus;

  constructor(public project: NickelProject,
              branchReportFilename: string) {
    this.status = GuidedBranchRemovalStatus.New;
    this.branch = '';
    this.removedBranches = [];

    // List of regex values that check for 'safe' branches
    const safeBranchRes: RegExp[] = this.project.safeBranches.map(safeBranch => {
      return ((typeof safeBranch === 'string')
        ? new RegExp(`^origin/${safeBranch}$`)
        : safeBranch);
    });

    const branchReportRaw: string = fs.readFileSync(branchReportFilename, {encoding: 'utf-8'});
    const branchInstructions: MergedBranchInstruction[] = JSON.parse(branchReportRaw);

    // Filter the branch instructions - selecting only "non-safe" branches for the current project
    this.branchesKept = [];
    this.branchesToRemove = [];
    this.notRemovedBranches = [];
    branchInstructions.forEach(bi => {
      if (bi.project === project.name) {
        logger.debug(`${JSON.stringify(bi)}`);
        if (bi.keep) {
          this.branchesKept.push(bi.branch);
          logger.info(`${this.project.name}: Keeping branch ${bi.branch}`);
        } else {
          const branch = bi.branch;
          const safeIdx = safeBranchRes.findIndex(safeBranchRe => (branch.match(safeBranchRe) != null));
          if (safeIdx < 0) {
            const branchToRemove: RemoteBranch = RemoteBranch.fromBranchName(bi.branch);
            logger.debug(`${JSON.stringify(branchToRemove)}`);
            this.branchesToRemove.push(branchToRemove);
            logger.info(`${this.project.name}: Will attempt to remove branch ${bi.branch}`);
          }
        }
      }
    });
  }

  prune(): Promise<GuidedBranchRemovalResult> {
    return new Promise<GuidedBranchRemovalResult>(resolve => {
      let finish = (e: any, status: GuidedBranchRemovalStatus) => {
        this.status = status;
        resolve(this);
      };

      this.project.repository.status().then(
        status => {
          this.branch = status.branch;
          if (status.modifiedFiles.length > 0) {
            finish(null, GuidedBranchRemovalStatus.Dirty);
          } else if (status.branch !== this.project.defaultBranch) {
            finish(null, GuidedBranchRemovalStatus.Working);
          } else if (this.branchesToRemove.length < 1) {
            logger.debug(`${this.project.name}: No branches to remove`);
            finish(null, GuidedBranchRemovalStatus.Skipped);
          } else if (this.branchesToRemove.length > 0) {
            this.project.repository.fetch().then(
              fetchResult => {
                //
                // Find the list of branches that are both deleted and added
                //

                let deletedBranches: string[] = [];
                let addedBranches: string[] = [];
                fetchResult.updatedBranches.forEach(fetchItem => {
                  if (fetchItem.action === 'deleted') {
                    deletedBranches.push(fetchItem.trackingBranch);
                  } else if (fetchItem.action === 'new branch') {
                    addedBranches.push(fetchItem.trackingBranch);
                  }
                });

                // Map from remote name to local branch name to remote branch name
                let branchNameMap: { [key: string]: { [key: string]: string } } = {};
                deletedBranches.forEach(localBranch => {
                  const remoteBranch = addedBranches.find(addedBranch => addedBranch.toLowerCase() === localBranch.toLowerCase());
                  if (remoteBranch) {
                    const remoteBranchParts = remoteBranch.split(/\//);
                    const remote = remoteBranchParts[0];
                    const remoteBranchName = remoteBranchParts.slice(1).join('/');

                    const localBranchParts = localBranch.split(/\//);
                    const localBranchName = localBranchParts.slice(1).join('/');

                    if (!branchNameMap[remote]) {
                      branchNameMap[remote] = {};
                    }

                    branchNameMap[remote][localBranchName] = remoteBranchName;
                    logger.debug(`Matching branch: ${localBranch} => ${remoteBranch}`);
                  }
                });

                //
                // Use the branch name map to figure out which branches to keep or delete
                //

                this.project.repository.allBranches().then(
                  () => {
                    this.branchesToRemove.forEach(remoteBranch => {
                      const remote = remoteBranch.remote;
                      const branch = branchNameMap[remote].hasOwnProperty(remoteBranch.branch)
                        ? branchNameMap[remote][remoteBranch.branch]
                        : remoteBranch.branch;
                      logger.debug(`${this.project.name}: Delete ${remote} ${branch}`);
                      const deleted = this.project.repository.removeRemoteBranchSync(remote, branch);
                      if (deleted) {
                        logger.info(`${this.project.name}: Deleted ${remoteBranch.remote} ${remoteBranch.branch}`);
                        this.removedBranches.push(remoteBranch.toString());
                      } else {
                        logger.warn(`${this.project.name}: Failed to remove branch ${remoteBranch.remote} ${remoteBranch.branch}`);
                        this.notRemovedBranches.push(remoteBranch.toString());
                      }
                    });
                    finish(null, GuidedBranchRemovalStatus.Success);
                  },
                  e => finish(e, GuidedBranchRemovalStatus.Failure)
                )
              },
              e => finish(e, GuidedBranchRemovalStatus.Failure)
            );
          }
        },
        e => finish(e, GuidedBranchRemovalStatus.Failure)
      );
    });
  }
}
