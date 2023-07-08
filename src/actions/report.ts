import { NickelAction } from "./nickel-action";
import { NickelProject } from "../nickel-project";
import { ReportLine } from "../nickel-report";
import { TableColumn } from "../nickel-table";

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
    new TableColumn("Project"),
    new TableColumn("Branch"),
    new TableColumn("# Mod"),
    new TableColumn("Commit"),
    new TableColumn("Marks"),
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

  post(): void {
    // Empty
  }
}
