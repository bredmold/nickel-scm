import {NickelReport, ReportingItem, ReportLine, ReportSeparator} from "./nickel-report";
import {CellAlignment, TableCell, TableColumn, TableRow} from "./nickel-table";
import chalk from "chalk";
import {SyncStatus} from "./actions/sync";
import {CleanupStatus} from "./actions/cleanup";

describe('Nickel Report', () => {
  let columns: TableColumn[];
  let report: NickelReport;

  beforeEach(() => {
    columns = [
      new TableColumn('test'),
    ];
    report = new NickelReport(columns);
  });

  test('Single data row', () => {
    const rows = [
      new ReportLine({
        test: 'test'
      }),
    ];

    const table = report.buildReport(rows);
    expect(table.columns).toStrictEqual(columns);
    expect(table.rows).toStrictEqual([
      new TableRow([new TableCell('test')]),
    ]);
  });

  test('Two rows, one separator', () => {
    const rows: ReportingItem[] = [
      new ReportLine({test: 'a'}),
      new ReportSeparator(''),
      new ReportLine({test: 'b'}),
    ];

    const table = report.buildReport(rows);
    expect(table.rows).toStrictEqual([
      new TableRow([new TableCell('a')]),
      new TableRow([new TableCell('', CellAlignment.Left)], 'sep'),
      new TableRow([new TableCell('b')]),
    ]);
  });

  test('Named separator', () => {
    const rows: ReportingItem[] = [
      new ReportLine({test: 'a'}),
      new ReportSeparator('george'),
      new ReportLine({test: 'b'}),
    ];

    const table = report.buildReport(rows);
    expect(table.rows).toStrictEqual([
      new TableRow([new TableCell('a')]),
      new TableRow([new TableCell(` ${chalk.italic.bold('george')} `, CellAlignment.Left)], 'sep'),
      new TableRow([new TableCell('b')]),
    ]);
  });

  test('Automatic highlighting', () => {
    const rows = [
      new ReportLine({test: SyncStatus.Success}),
      new ReportLine({test: SyncStatus.Failure}),
      new ReportLine({test: SyncStatus.Dirty}),
      new ReportLine({test: CleanupStatus.Success}),
      new ReportLine({test: CleanupStatus.Failure}),
      new ReportLine({test: CleanupStatus.Dirty}),
    ];

    const table = report.buildReport(rows);
    expect(table.rows).toStrictEqual([
      new TableRow([new TableCell(`${chalk.green('sync-success')}`)]),
      new TableRow([new TableCell(`${chalk.red('sync-fail')}`)]),
      new TableRow([new TableCell(`${chalk.bgYellow.black('sync-dirty')}`)]),
      new TableRow([new TableCell(`${chalk.green('clean-success')}`)]),
      new TableRow([new TableCell(`${chalk.red('clean-failure')}`)]),
      new TableRow([new TableCell(`${chalk.bgYellow.black('clean-dirty')}`)]),
    ]);
  });
});
