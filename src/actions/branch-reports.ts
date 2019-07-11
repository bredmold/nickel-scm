import {NickelProject} from "../nickel-project";
import {logger} from "../nickel";
import * as fs from "fs";

export enum BranchReportStatus {
  New = 'report-new',
  Success = 'report-success',
  Failure = 'report-failure',
  Skipped = 'report-skip',
}

export interface BranchReportResult {
  /** The project being reported on */
  project: NickelProject;

  /** List of branches identified for removal */
  candidateBranches: string[];

  /** Status when pulling branch status */
  status: BranchReportStatus;
}

export interface BranchReportDetails {
  project: string;
  branch: string;
  keep: boolean;
}

export class BranchReportWriter {
  private readonly reportFile: string;

  constructor(private reports: BranchReportResult[],
              args: any) {
    this.reportFile = args[0];
  }

  writeReport(): void {
    let processed: BranchReportDetails[] = [];
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

