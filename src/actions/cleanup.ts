import { NickelAction } from "./nickel-action.js";
import { NickelProject } from "../nickel-project.js";
import { ReportLine } from "../nickel-report.js";
import { logger } from "../logger.js";

export type CleanupStatus =
  | "clean-new"
  | "clean-skip"
  | "clean-dirty"
  | "clean-success"
  | "clean-failure";

export class RepositoryCleanupAction implements NickelAction {
  skipReport(project: NickelProject): ReportLine {
    return new ReportLine(
      {
        Project: project.name,
        Branch: "",
        Status: "clean-skip",
      },
      false,
    );
  }

  readonly columns = [
    { title: "Project" },
    { title: "Branch" },
    { title: "Status" },
  ];

  async act(project: NickelProject): Promise<ReportLine> {
    function line(branch: string, status: CleanupStatus) {
      return new ReportLine({
        Project: project.name,
        Branch: branch,
        Status: status,
      });
    }

    try {
      const status = await project.repository.status();
      const branch = status.branch;

      try {
        if (project.defaultBranch === status.branch) {
          return line(branch, "clean-skip");
        } else if (status.modifiedFiles.length > 0) {
          return line(branch, "clean-dirty");
        } else {
          await project.repository.selectBranch(project.defaultBranch);
          await project.repository.pull();
          await project.repository.deleteLocalBranch(status.branch);
          await project.repository.prune("origin");
          return line(branch, "clean-success");
        }
      } catch (e) {
        logger.error(e);
        return line(branch, "clean-failure");
      }
    } catch (e) {
      logger.error(e);
      return line("", "clean-failure");
    }
  }

  post(): Promise<void> {
    return Promise.resolve();
  }
}
