import * as chalk from "chalk";

import {
  CellAlignment,
  NickelTable,
  TableCell,
  TableColumn,
  TableRow,
} from "./nickel-table";

import { CleanupStatus } from "./actions/cleanup";
import { SyncStatus } from "./actions/sync";

/**
 * Returns a collection of name/value pairs
 */
export class ReportLine implements ReportingItem {
  readonly name: string;

  constructor(
    public readonly values: { [index: string]: string },
    public readonly selected: boolean = true,
  ) {
    this.name = values["Project"];
  }

  get(key: string): string {
    return this.values[key];
  }
}

/**
 * An item in a report - either a project or a separator
 */
export interface ReportingItem {
  readonly name: string;
}

/**
 * Models a report separator, including an optional label for the separator
 */
export class ReportSeparator implements ReportingItem {
  selected = true;

  /**
   * Build a report separator instance
   *
   * @param name Optional label for the separator
   */
  constructor(public readonly name: string) {}
}

/**
 * Build a report after running some task on each project
 *
 * Header structure:
 *   keys = field names
 *   values = Printable header value
 */
export class NickelReport {
  private readonly chalk;

  constructor(private readonly columns: TableColumn[]) {
    this.chalk = new chalk.Instance({ level: 1 });
  }

  /**
   * Generate a report string, based on the header structure
   *
   * @param {ReportLine[]} rows Report rows, structure determined by the header
   */
  buildReport(rows: ReportingItem[]): NickelTable {
    const tableRows = rows.map((row) => {
      if (row instanceof ReportLine) {
        return this.processRow(<ReportLine>row);
      } else {
        return this.processSeparator(<ReportSeparator>row);
      }
    });
    return new NickelTable(this.columns, tableRows, this.chalk);
  }

  /**
   * Process a separator row
   *
   * @param sep the separator
   */
  private processSeparator(sep: ReportSeparator): TableRow {
    const sectionText = sep.name.match(/^\s*$/)
      ? ""
      : ` ${this.chalk.italic.bold(sep.name)} `;
    const head = new TableCell(sectionText, CellAlignment.Left);
    const tail = this.columns.slice(1).map(() => new TableCell(""));
    return new TableRow([head].concat(tail), "sep");
  }

  /**
   * Process a single data row, generating an appropriate report value
   *
   * @param row Data row in object form
   */
  private processRow(row: ReportLine): TableRow {
    const cells = this.columns.map((column, idx) => {
      let value = row.get(column.title);

      // Value transformations
      if (value === SyncStatus.Success || value === CleanupStatus.Success) {
        value = this.chalk.green(value);
      } else if (
        value === SyncStatus.Failure ||
        value == CleanupStatus.Failure
      ) {
        value = this.chalk.red(value);
      } else if (value === SyncStatus.Dirty || value === CleanupStatus.Dirty) {
        value = this.chalk.bgYellow.black(value);
      }

      const renderedValue =
        idx == 0 ? " " + value.toString() : value.toString();
      return new TableCell(renderedValue);
    });
    return new TableRow(cells, "data");
  }
}
