import {EMPTY_PROJECT, NickelProject} from "../nickel-project";
import {RemoteBranch} from "../scm/git/git-repository";
import * as fs from "fs";
import {BranchReportDetails} from "./branch-reports";
import {ReportLine} from "../nickel-report";
import {NickelAction} from "./nickel-action";
import {TableColumn} from "../nickel-table";
import {logger} from "../logger";

export enum GuidedBranchRemovalStatus {
  New = 'guided-merge-new',
  Success = 'guided-merge-success',
  Failure = 'guided-merge-failure',
  Skipped = 'guided-merge-skip',
  Dirty = 'guided-merge-dirty',
  Working = 'guided-merge-working',
}

export class GuidedBranchRemovalAction implements NickelAction {
  readonly command = 'guidedRemove <reportFile>';
  readonly description = 'Remove branches based on a merged branches report';
  readonly skipReport = new ReportLine({
    'Project': EMPTY_PROJECT.name,
    'Branch': '',
    'Status': GuidedBranchRemovalStatus.Skipped,
    '# Kept': '0',
    '# Removed': '0',
    '# Failed': '0',
  }, false);
  readonly columns = [
    new TableColumn('Project'),
    new TableColumn('Branch'),
    new TableColumn('Status'),
    new TableColumn('# Kept'),
    new TableColumn('# Removed'),
    new TableColumn('# Failed'),
  ];

  act(project: NickelProject, args?: any): Promise<ReportLine> {
    return new GuidedBranchRemoval(project, args)
      .prune();
  }

  post(reports: ReportLine[], args?: any): any {
    // Empty
  }
}

class GuidedBranchRemoval {
  branch: string;
  branchesKept: string[];
  removedBranches: string[];
  notRemovedBranches: string[];
  branchesToRemove: RemoteBranch[];
  status: GuidedBranchRemovalStatus;

  constructor(private project: NickelProject,
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
    const branchInstructions: BranchReportDetails[] = JSON.parse(branchReportRaw);

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

  prune(): Promise<ReportLine> {
    return new Promise<ReportLine>(resolve => {
      let finish = (e: any, status: GuidedBranchRemovalStatus) => {
        resolve(new ReportLine({
          'Project': this.project.name,
          'Branch': this.branch,
          'Status': status,
          '# Kept': this.branchesKept.length.toString(),
          '# Removed': this.removedBranches.length.toString(),
          '# Failed': this.notRemovedBranches.length.toString(),
        }));
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
                  if (fetchItem.flag === 'pruned') {
                    deletedBranches.push(fetchItem.trackingBranch);
                  } else if (fetchItem.flag === 'new ref') {
                    addedBranches.push(fetchItem.trackingBranch);
                  }
                });

                // Map from remote name to local branch name to remote branch name
                let branchNameMap: { [key: string]: { [key: string]: string } } = {};
                deletedBranches.forEach(localBranch => {
                  const remoteBranch = addedBranches.find(
                    addedBranch => addedBranch.toLowerCase() === localBranch.toLowerCase());
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
