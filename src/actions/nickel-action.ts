import { NickelProject } from "../nickel-project.js";
import { ReportLine } from "../nickel-report.js";
import { TableColumn } from "../nickel-table.js";

export interface NickelAction {
  /**
   * Perform the action, generating a response
   *
   * @param project The project on which to act
   */
  act(project: NickelProject): Promise<ReportLine>;

  /**
   * Perform an action after all other actions have completed
   *
   * @param reports List of all reports generated
   */
  post(reports: ReportLine[]): Promise<void>;

  /**
   * Generic empty report in case the project was skipped
   */
  skipReport(project: NickelProject): ReportLine;

  /**
   * Column titles
   */
  readonly columns: TableColumn[];
}
