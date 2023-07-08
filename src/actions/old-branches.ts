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

/**
 * args is expected to be an array of strings containing 1 or 2 items
 *   - item 0: report file name
 *   - item 1: age in days
 */
export class OldBranchesReportAction implements NickelAction {
  constructor(
    readonly reportFile: string,
    readonly age: number,
  ) {}

  skipReport(project: NickelProject): ReportLine {
    return new BranchReportLine(
      {
        Project: project.name,
        Status: BranchReportStatus.Skipped,
        "# Candidates": "0",
      },
      [],
      false,
    );
  }

  readonly columns = [
    new TableColumn("Project"),
    new TableColumn("Status"),
    new TableColumn("# Candidates"),
  ];

  act(project: NickelProject): Promise<ReportLine> {
    return new OldBranchesReport(project, this.age).report();
  }

  post(reports: ReportLine[]): void {
    new BranchReportWriter(
      <BranchReportLine[]>reports,
      this.reportFile,
    ).writeReport();
  }
}

class OldBranchesReport {
  constructor(
    private readonly project: NickelProject,
    private readonly age: number,
  ) {
    logger.debug(`old branch report: age=${this.age}`);
  }

  async report(): Promise<ReportLine> {
    const project = this.project.name;

    function line(status: BranchReportStatus, candidateBranches: string[]) {
      return new BranchReportLine(
        {
          Project: project,
          Status: status,
          "# Candidates": candidateBranches.length.toString(),
        },
        candidateBranches,
      );
    }

    try {
      await this.project.repository.fetch();
      const trackingBranches = await this.project.repository.remoteBranches();

      const logPromises = trackingBranches.map((branch) =>
        this.project.repository.committerDate(branch).then((date) => {
          return { branch: branch, logDate: date };
        }),
      );

      const now = new Date();
      const logDates = await Promise.all(logPromises);

      const candidateBranches: string[] = logDates.reduce(
        (candidates: string[], dateAndBranch) => {
          const branch: string = dateAndBranch.branch;
          const committerDate: Date = dateAndBranch.logDate;

          const ageInMillis = now.getTime() - committerDate.getTime();
          const ageInDays = Math.floor(ageInMillis / (3600 * 24 * 1000));
          if (ageInDays >= this.age) {
            const elements = branch.split(/\//);
            const remote = elements[0];
            const trackingBranch = elements.slice(1).join("/");
            logger.info(
              `${this.project.name}: Candidate ${remote} ${trackingBranch} (${ageInDays} days)`,
            );
            candidates.push(branch);
          }

          return candidates;
        },
        [],
      );

      return line(BranchReportStatus.Success, candidateBranches);
    } catch (e) {
      logger.error(e);
      return line(BranchReportStatus.Failure, []);
    }
  }
}
