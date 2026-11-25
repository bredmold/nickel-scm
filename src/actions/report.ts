import { NickelAction } from "./nickel-action.js";
import { NickelProject } from "../nickel-project.js";
import { ReportLine } from "../nickel-report.js";
import { TableColumn } from "@bredmold/table";

export class RepositoryReportAction implements NickelAction {
  skipReport(project: NickelProject): ReportLine {
    return new ReportLine(
      {
        Project: project.name,
        Branch: "",
        "# Mod": "0",
        Commit: "",
        Marks: "",
      },
      false,
    );
  }
  readonly columns: TableColumn[] = [
    { title: "Project" },
    { title: "Branch" },
    { title: "# Mod" },
    { title: "Commit" },
    { title: "Marks" },
  ];

  async act(project: NickelProject): Promise<ReportLine> {
    const status = await project.repository.status();
    return new ReportLine({
      Project: project.name,
      Branch: status.branch,
      "# Mod": status.modifiedFiles.length.toString(),
      Commit: status.commit,
      Marks: project.marks.join(","),
    });
  }

  post(): Promise<void> {
    return Promise.resolve();
  }
}
