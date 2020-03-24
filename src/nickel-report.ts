import { SyncStatus } from "./actions/sync";
import chalk, { Level } from "chalk";
import { CleanupStatus } from "./actions/cleanup";
import {
  CellAlignment,
  NickelTable,
  TableCell,
  TableColumn,
  TableRow,
} from "./nickel-table";

/**
 * Returns a collection of name/value pairs
 */
export class ReportLine implements ReportingItem {
  readonly name: string;

  constructor(
    public readonly values: { [index: string]: string },
    public readonly selected: boolean = true
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
  selected: boolean = true;

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
  constructor(private readonly columns: TableColumn[]) {
    chalk.enabled = true;
    chalk.level = Level.Basic;
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
    return new NickelTable(this.columns, tableRows);
  }

  /**
   * Process a separator row
   *
   * @param sep the separator
   */
  private processSeparator(sep: ReportSeparator): TableRow {
    const sectionText = sep.name.match(/^\s*$/)
      ? ""
      : ` ${chalk.italic.bold(sep.name)} `;
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
    const cells = this.columns.map((column) => {
      let value = row.get(column.title);

      // Value transformations
      if (value === SyncStatus.Success || value === CleanupStatus.Success) {
        value = chalk.green(value);
      } else if (
        value === SyncStatus.Failure ||
        value == CleanupStatus.Failure
      ) {
        value = chalk.red(value);
      } else if (value === SyncStatus.Dirty || value === CleanupStatus.Dirty) {
        value = chalk.bgYellow.black(value);
      }

      return new TableCell(value.toString());
    });
    return new TableRow(cells, "data");
  }
}
