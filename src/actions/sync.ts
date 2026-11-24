import { NickelAction } from "./nickel-action.js";
import { NickelProject } from "../nickel-project.js";
import { ReportLine } from "../nickel-report.js";
import { logger } from "../logger.js";

export type SyncStatus =
  "sync-new" | "sync-success" | "sync-fail" | "sync-dirty" | "sync-skipped";

export class RepositorySyncAction implements NickelAction {
  skipReport(project: NickelProject): ReportLine {
    return new ReportLine(
      {
        Project: project.name,
        Updated: "0",
        Branch: "",
        Status: "sync-skipped",
      },
      false,
    );
  }
  readonly columns = [
    { title: "Project" },
    { title: "Branch" },
    { title: "Updated" },
    { title: "Status" },
  ];

  async act(project: NickelProject): Promise<ReportLine> {
    function line(
      branch: string,
      updatedFiles: string[],
      status: SyncStatus,
    ): ReportLine {
      return new ReportLine({
        Project: project.name,
        Branch: branch,
        Updated: updatedFiles.length.toString(),
        Status: status,
      });
    }

    try {
      const status = await project.repository.status();
      const branch = status.branch;
      if (status.modifiedFiles.length > 0) {
        return line(branch, [], "sync-dirty");
      } else {
        try {
          const pullResult = await project.repository.pull();
          const updatedFiles = pullResult.updatedFiles;
          return line(branch, updatedFiles, "sync-success");
        } catch (e) {
          logger.error(e);
          return line(branch, [], "sync-fail");
        }
      }
    } catch (e) {
      logger.error(e);
      return line("", [], "sync-fail");
    }
  }

  post(): Promise<void> {
    return Promise.resolve();
  }
}
