import { EMPTY_PROJECT, NickelProject } from "../nickel-project";
import {
  BranchReportLine,
  BranchReportStatus,
  BranchReportWriter,
} from "./branch-reports";
import { ReportLine } from "../nickel-report";
import { NickelAction } from "./nickel-action";
import { TableColumn } from "../nickel-table";
import { logger } from "../logger";

export class MergedBranchesReportAction implements NickelAction {
  readonly command = "mergedReport <reportFile>";
  readonly description = "Generated a merged branches report";
  readonly skipReport = new ReportLine(
    {
      Project: EMPTY_PROJECT.name,
      Status: BranchReportStatus.Skipped,
      "# Candidates": "0",
    },
    false
  );
  readonly columns = [
    new TableColumn("Project"),
    new TableColumn("Status"),
    new TableColumn("# Candidates"),
  ];

  act(project: NickelProject, args?: any): Promise<ReportLine> {
    return new Promise<ReportLine>(async (resolve) => {
      let candidateBranches: string[] = [];
      const finish = (e: any, status: BranchReportStatus) => {
        resolve(
          new BranchReportLine(
            {
              Project: project.name,
              Status: status,
              "# Candidates": candidateBranches.length.toString(),
            },
            candidateBranches
          )
        );
      };

      try {
        await project.repository.fetch();
        const remoteBranches: string[] = await project.repository.remoteMergedBranches();
        // List of regex values that check for 'safe' branches
        const safeBranchRes: RegExp[] = project.safeBranches.map(
          (safeBranch) => {
            return typeof safeBranch === "string"
              ? new RegExp(`^origin/${safeBranch}$`)
              : safeBranch;
          }
        );

        candidateBranches = remoteBranches.filter((branch) => {
          const safeIdx = safeBranchRes.findIndex(
            (safeBranchRe) => branch.match(safeBranchRe) != null
          );
          if (safeIdx < 0) {
            const elements = branch.split(/\//);
            const remote = elements[0];
            const trackingBranch = elements.slice(1).join("/");
            logger.info(
              `${project.name}: Candidate ${remote} ${trackingBranch}`
            );

            return true;
          } else {
            return false;
          }
        });
        finish(null, BranchReportStatus.Success);
      } catch (e) {
        finish(e, BranchReportStatus.Failure);
      }
    });
  }

  post(reports: ReportLine[], args?: any): any {
    new BranchReportWriter(
      <BranchReportLine[]>reports,
      args instanceof Array ? args[0].toString() : args.toString()
    ).writeReport();
  }
}
