import { writeFile } from "fs/promises";

import { ReportLine } from "../nickel-report.js";
import { logger } from "../logger.js";

export enum BranchReportStatus {
  New = "report-new",
  Success = "report-success",
  Failure = "report-failure",
  Skipped = "report-skip",
}

export class BranchReportLine extends ReportLine {
  constructor(
    values: { [index: string]: string },
    public candidateBranches: string[],
    selected = true,
  ) {
    super(values, selected);
  }
}

export interface BranchReportDetails {
  project: string;
  branch: string;
  keep: boolean;
}

export class BranchReportWriter {
  constructor(
    private reports: BranchReportLine[],
    private readonly reportFile: string,
  ) {}

  async writeReport(): Promise<void> {
    const processed: BranchReportDetails[] = [];
    this.reports.forEach((report) => {
      report.candidateBranches.forEach((branch) => {
        processed.push({
          project: report.get("Project"),
          branch: branch,
          keep: false,
        });
      });
    });

    const reportText = JSON.stringify(processed, null, 1);

    logger.info(`Generating branch report to file: ${this.reportFile}`);
    await writeFile(this.reportFile, reportText);
  }
}
