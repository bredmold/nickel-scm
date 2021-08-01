import { GuidedBranchRemovalAction } from "./guided-remove";
import { MergedBranchesReportAction } from "./merged-branches";
import { NickelProject } from "../nickel-project";
import { OldBranchesReportAction } from "./old-branches";
import { ReportLine } from "../nickel-report";
import { RepositoryCleanupAction } from "./cleanup";
import { RepositoryReportAction } from "./report";
import { RepositorySyncAction } from "./sync";
import { TableColumn } from "../nickel-table";

export interface NickelAction {
  /**
   * Command string template
   */
  readonly command: string;

  /**
   * Return a brief description of the action
   */
  readonly description: string;

  /**
   * Perform the action, generating a response
   *
   * @param project The project on which to act
   * @param args List of command arguments
   */
  act(project: NickelProject, args?: string[]): Promise<ReportLine>;

  /**
   * Perform an action after all other actions have completed
   *
   * @param reports List of all reports generated
   * @param args List of command arguments
   */
  post(reports: ReportLine[], args?: string[]): void;

  /**
   * Generic empty report in case the project was skipped
   */
  skipReport(project: NickelProject): ReportLine;

  /**
   * Column titles
   */
  readonly columns: TableColumn[];
}

export const ALL_ACTIONS = [
  new RepositorySyncAction(),
  new RepositoryReportAction(),
  new RepositoryCleanupAction(),
  new MergedBranchesReportAction(),
  new GuidedBranchRemovalAction(),
  new OldBranchesReportAction(),
];
