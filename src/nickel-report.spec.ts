import * as ch from "chalk";

import {
  CellAlignment,
  TableCell,
  TableColumn,
  TableRow,
} from "./nickel-table";
import {
  NickelReport,
  ReportLine,
  ReportSeparator,
  ReportingItem,
} from "./nickel-report";

import { CleanupStatus } from "./actions/cleanup";
import { SyncStatus } from "./actions/sync";

describe("Nickel Report", () => {
  let columns: TableColumn[];
  let report: NickelReport;

  beforeEach(() => {
    columns = [new TableColumn("test")];
    report = new NickelReport(columns);
  });

  test("Single data row", () => {
    const rows = [
      new ReportLine({
        test: "test",
      }),
    ];

    const table = report.buildReport(rows);
    expect(table.columns).toStrictEqual(columns);
    expect(table.rows).toStrictEqual([new TableRow([new TableCell(" test")])]);
  });

  test("Two rows, one separator", () => {
    const rows: ReportingItem[] = [
      new ReportLine({ test: "a" }),
      new ReportSeparator(""),
      new ReportLine({ test: "b" }),
    ];

    const table = report.buildReport(rows);
    expect(table.rows).toStrictEqual([
      new TableRow([new TableCell(" a")]),
      new TableRow([new TableCell("", CellAlignment.Left)], "sep"),
      new TableRow([new TableCell(" b")]),
    ]);
  });

  test("Named separator", () => {
    const chalk = new ch.Instance({ level: 1 });
    const rows: ReportingItem[] = [
      new ReportLine({ test: "a" }),
      new ReportSeparator("george"),
      new ReportLine({ test: "b" }),
    ];

    const table = report.buildReport(rows);
    expect(table.rows).toStrictEqual([
      new TableRow([new TableCell(" a")]),
      new TableRow(
        [new TableCell(` ${chalk.italic.bold("george")} `, CellAlignment.Left)],
        "sep",
      ),
      new TableRow([new TableCell(" b")]),
    ]);
  });

  test("Automatic highlighting", () => {
    const chalk = new ch.Instance({ level: 1 });
    const rows = [
      new ReportLine({ test: SyncStatus.Success }),
      new ReportLine({ test: SyncStatus.Failure }),
      new ReportLine({ test: SyncStatus.Dirty }),
      new ReportLine({ test: CleanupStatus.Success }),
      new ReportLine({ test: CleanupStatus.Failure }),
      new ReportLine({ test: CleanupStatus.Dirty }),
    ];

    const table = report.buildReport(rows);
    expect(table.rows).toStrictEqual([
      new TableRow([new TableCell(` ${chalk.green("sync-success")}`)]),
      new TableRow([new TableCell(` ${chalk.red("sync-fail")}`)]),
      new TableRow([new TableCell(` ${chalk.bgYellow.black("sync-dirty")}`)]),
      new TableRow([new TableCell(` ${chalk.green("clean-success")}`)]),
      new TableRow([new TableCell(` ${chalk.red("clean-failure")}`)]),
      new TableRow([new TableCell(` ${chalk.bgYellow.black("clean-dirty")}`)]),
    ]);
  });
});
