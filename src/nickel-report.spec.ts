import { describe, beforeEach, test, expect } from "vitest";
import { Chalk } from "chalk";

import {
  NickelReport,
  ReportLine,
  ReportSeparator,
  ReportingItem,
} from "./nickel-report.js";

import { TableCell, TableColumn, TableRow } from "@nickel/table";

describe("Nickel Report", () => {
  let columns: TableColumn[];
  let report: NickelReport;

  beforeEach(() => {
    columns = [{ title: "test" }];
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
      new TableRow([new TableCell("", "left")], "sep"),
      new TableRow([new TableCell(" b")]),
    ]);
  });

  test("Named separator", () => {
    const chalk = new Chalk({ level: 1 });
    const rows: ReportingItem[] = [
      new ReportLine({ test: "a" }),
      new ReportSeparator("george"),
      new ReportLine({ test: "b" }),
    ];

    const table = report.buildReport(rows);
    expect(table.rows).toStrictEqual([
      new TableRow([new TableCell(" a")]),
      new TableRow(
        [new TableCell(` ${chalk.italic.bold("george")} `, "left")],
        "sep",
      ),
      new TableRow([new TableCell(" b")]),
    ]);
  });

  test("Automatic highlighting", () => {
    const chalk = new Chalk({ level: 1 });
    const rows = [
      new ReportLine({ test: "sync-success" }),
      new ReportLine({ test: "sync-fail" }),
      new ReportLine({ test: "sync-dirty" }),
      new ReportLine({ test: "clean-success" }),
      new ReportLine({ test: "clean-failure" }),
      new ReportLine({ test: "clean-dirty" }),
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
