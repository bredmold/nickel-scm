import {EMPTY_PROJECT, NickelProject} from "../nickel-project";
import {ReportLine} from "../nickel-report";
import {NickelAction} from "./nickel-action";
import {TableColumn} from "../nickel-table";

export class RepositoryReportAction implements NickelAction {
  readonly command = 'report';
  readonly description = 'Local repository report';
  readonly skipReport = new ReportLine({
    'Project': EMPTY_PROJECT.name,
    '# Mod': '0',
    'Branch': '',
    'Commit': '',
  }, false);
  readonly columns = [
    new TableColumn('Project'),
    new TableColumn('Branch'),
    new TableColumn('# Mod'),
    new TableColumn('Commit'),
  ];

  act(project: NickelProject, args?: any): Promise<ReportLine> {
    return new Promise<ReportLine>(resolve => {
      let branch = '';
      let modifiedFiles = [];
      let commit = '';

      const finish = function () {
        resolve(new ReportLine({
          'Project': project.name,
          'Branch': branch,
          '# Mod': modifiedFiles.length.toString(),
          'Commit': commit,
        }));
      };

      project
        .repository
        .status()
        .then(
          status => {
            branch = status.branch;
            modifiedFiles = status.modifiedFiles;
            commit = status.commit;
            finish();
          },
          () => finish());
    });
  }

  post(reports: ReportLine[], args?: any): any {
    // Empty
  }
}
