import {
  BranchReportLine,
  BranchReportStatus,
  BranchReportWriter,
} from "./branch-reports";

import { NickelAction } from "./nickel-action";
import { NickelProject } from "../nickel-project";
import { ReportLine } from "../nickel-report";
import { TableColumn } from "../nickel-table";
import { logger } from "../logger";

export class MergedBranchesReportAction implements NickelAction {
  readonly command = "mergedReport <reportFile>";
  readonly description = "Generated a merged branches report";
  skipReport(project: NickelProject): ReportLine {
    return new BranchReportLine(
      {
        Project: project.name,
        Status: BranchReportStatus.Skipped,
        "# Candidates": "0",
      },
      [],
      false
    );
  }
  readonly columns = [
    new TableColumn("Project"),
    new TableColumn("Status"),
    new TableColumn("# Candidates"),
  ];

  async act(project: NickelProject): Promise<ReportLine> {
    function line(candidateBranches: string[], status: BranchReportStatus) {
      return new BranchReportLine(
        {
          Project: project.name,
          Status: status,
          "# Candidates": candidateBranches.length.toString(),
        },
        candidateBranches
      );
    }

    try {
      await project.repository.fetch();
      const remoteBranches: string[] = await project.repository.remoteMergedBranches();
      // List of regex values that check for 'safe' branches
      const safeBranchRes: RegExp[] = project.safeBranches.map((safeBranch) => {
        return typeof safeBranch === "string"
          ? new RegExp(`^origin/${safeBranch}$`)
          : safeBranch;
      });

      const candidateBranches = remoteBranches.filter((branch) => {
        const safeIdx = safeBranchRes.findIndex(
          (safeBranchRe) => branch.match(safeBranchRe) != null
        );
        if (safeIdx < 0) {
          const elements = branch.split(/\//);
          const remote = elements[0];
          const trackingBranch = elements.slice(1).join("/");
          logger.info(`${project.name}: Candidate ${remote} ${trackingBranch}`);

          return true;
        } else {
          return false;
        }
      });
      return line(candidateBranches, BranchReportStatus.Success);
    } catch (e) {
      logger.error(e);
      return line([], BranchReportStatus.Failure);
    }
  }

  post(reports: ReportLine[], args?: string[]): void {
    if (args) {
      new BranchReportWriter(
        <BranchReportLine[]>reports,
        args[0]
      ).writeReport();
    } else {
      logger.error("Report file was not provided");
    }
  }
}
