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

export class OldBranchesReportAction implements NickelAction {
  readonly command = "oldBranches <reportFile> [age]";
  readonly description = "Generate a list of branches older than a certain age";
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
    return new OldBranchesReport(project, args).report();
  }

  post(reports: ReportLine[], args?: any): any {
    new BranchReportWriter(<BranchReportLine[]>reports, args).writeReport();
  }
}

class OldBranchesReport {
  private readonly candidateBranches: string[];
  private readonly age: number;

  constructor(public project: NickelProject, args: any) {
    this.candidateBranches = [];

    let age: number = 60;
    if (
      args instanceof Array &&
      args.length > 1 &&
      typeof args[1] === "string"
    ) {
      const ageArg: string = args[1];
      if (ageArg.match(/^\d+$/)) {
        const ageParsed: number = Number.parseInt(ageArg);
        if (ageParsed >= 1) {
          age = ageParsed;
        } else {
          logger.warn(
            `Supplied age is invalid, substituting a default: ${ageParsed}`
          );
        }
      } else {
        logger.warn(
          `Supplied age is not numeric, substituting a default: ${ageArg}`
        );
      }
    }
    this.age = age;

    logger.debug(`old branch report: age=${this.age}`);
  }

  report(): Promise<ReportLine> {
    return new Promise<ReportLine>((resolve) => {
      const finish = (e: any, status: BranchReportStatus) => {
        resolve(
          new BranchReportLine(
            {
              Project: this.project.name,
              Status: status,
              "# Candidates": this.candidateBranches.length.toString(),
            },
            this.candidateBranches
          )
        );
      };

      this.project.repository.fetch().then(
        (fetchResult) => {
          const remoteBranchItems = fetchResult.updatedBranches.filter(
            (item) => item.remoteBranch !== "(none)"
          );
          const trackingBranches = remoteBranchItems.map(
            (item) => item.trackingBranch
          );
          const logPromises = trackingBranches.map((branch) =>
            this.project.repository.committerDate(branch)
          );
          const now = new Date();

          Promise.all(logPromises).then((logDates) => {
            for (let i = 0; i < logPromises.length; ++i) {
              const branch: string = trackingBranches[i];
              const committerDate: Date = logDates[i];
              const ageInMillis = now.getTime() - committerDate.getTime();
              const ageInDays = Math.floor(ageInMillis / (3600 * 24 * 1000));
              if (ageInDays >= this.age) {
                const elements = branch.split(/\//);
                const remote = elements[0];
                const trackingBranch = elements.slice(1).join("/");
                logger.info(
                  `${this.project.name}: Candidate ${remote} ${trackingBranch} (${ageInDays} days)`
                );
                this.candidateBranches.push(branch);
              }
            }
            finish(null, BranchReportStatus.Success);
          });
        },
        (e) => finish(e, BranchReportStatus.Failure)
      );
    });
  }
}
