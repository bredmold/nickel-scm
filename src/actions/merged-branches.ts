import {NickelProject} from '../nickel-project'
import {logger} from "../nickel";
import {BranchReportResult, BranchReportStatus} from "./branch-reports";

export class MergedBranchesReport implements BranchReportResult {
  candidateBranches: string[];
  status: BranchReportStatus;

  constructor(public project: NickelProject) {
    this.candidateBranches = [];
    this.status = BranchReportStatus.New;
  }

  report(): Promise<BranchReportResult> {
    return new Promise<BranchReportResult>(resolve => {
      const finish = (e: any, status: BranchReportStatus) => {
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
              finish(null, BranchReportStatus.Success);
            },
            e => finish(e, BranchReportStatus.Failure)
          );
        },
        e => finish(e, BranchReportStatus.Failure)
      );
    });
  }
}

