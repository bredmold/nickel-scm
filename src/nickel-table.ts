import * as chalk from "chalk";

export class RowConfig {
  constructor(
    readonly left: string,
    readonly right: string,
    readonly sep: string,
    readonly pad: string
  ) {}
}

/**
 * Table configuration - tagged list of row configurations.
 *
 * The following tags are expected
 *   first - configuration for the first row of the table
 *   last  - configuration for the last row of the table
 *   sep   - configuration for separator rows in the table
 *   data  - configuration for "normal" data rows in the table
 *
 * Other configuration tags are perfectly acceptable
 */
export class TableConfig {
  [index: string]: RowConfig;
}

const CONFIG = {
  first: new RowConfig("╔═", "═╗", "═╤═", "═"),
  last: new RowConfig("╚═", "═╝", "═╧═", "═"),
  sep: new RowConfig("╟─", "─╢", "─┼─", "─"),
  data: new RowConfig("║ ", " ║", " │ ", " "),
};

/**
 * Model a table column, including all relevant data
 */
export class TableColumn {
  constructor(readonly title: string) {}
}

/**
 * Cell alignment - supports left, and right
 */
export enum CellAlignment {
  Left,
  Right,
}

// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\u001b\[\d+m/;

/**
 * Model a table cell, includes content and alignment
 */
export class TableCell {
  readonly size: number;

  constructor(
    private readonly data: string,
    private readonly align: CellAlignment = CellAlignment.Right
  ) {
    this.size = this.lengthInternal();
  }

  /**
   * Render the table cell
   *
   * @param width The width of the space this cell is being rendered into
   * @param pad Padding string - should be length 1
   */
  render(width: number, pad: string): string {
    const padding = pad.repeat(width - this.size);
    return this.align === CellAlignment.Left
      ? this.data + padding
      : padding + this.data;
  }

  private lengthInternal(): number {
    return this.data
      .split(ANSI_PATTERN)
      .map((segment) => segment.length)
      .reduce((a, b) => a + b);
  }
}

/**
 * Model a table row
 */
export class TableRow {
  constructor(readonly cells: TableCell[], readonly tag: string = "data") {}

  render(
    columnWidths: number[],
    tableConfig: TableConfig,
    override: string | null = null
  ): string {
    const tag = override ? override : this.tag;
    const rowConfig = tableConfig[tag];
    const renderedCells = this.cells.map((cell, i) =>
      cell.render(columnWidths[i], rowConfig.pad)
    );
    const rowContent = renderedCells.join(rowConfig.sep);
    return rowConfig.left + rowContent + rowConfig.right;
  }
}

/**
 * Model a table
 */
export class NickelTable {
  private readonly columnWidths: number[];

  constructor(
    readonly columns: TableColumn[],
    readonly rows: TableRow[],
    private readonly chalk: chalk.Chalk
  ) {
    const titleWidths = this.columns.map((col) => col.title.length);
    this.columnWidths = this.buildColumnWidths(titleWidths, 0);
  }

  /**
   * Render the table, including table configuration
   *
   * @param config
   */
  render(config: TableConfig = CONFIG): string {
    const emptyRow = new TableRow(
      this.columns.map(() => new TableCell("")),
      "empty"
    );
    const headerRow = new TableRow(
      this.columns.map((col) => new TableCell(this.chalk.bold(col.title))),
      "data"
    );

    const preambleAlways = [
      emptyRow.render(this.columnWidths, config, "first"),
      headerRow.render(this.columnWidths, config),
    ];

    const firstRowTag = this.rows[0].tag;
    const preamble =
      firstRowTag === "sep"
        ? preambleAlways
        : [
            ...preambleAlways,
            emptyRow.render(this.columnWidths, config, "sep"),
          ];

    const dataLines: string[] = this.rows.map((row) =>
      row.render(this.columnWidths, config)
    );
    const lastLine = emptyRow.render(this.columnWidths, config, "last");

    const allLines = preamble.concat(dataLines, [lastLine]);
    return allLines.join("\n");
  }

  private buildColumnWidths(widths: number[], idx: number): number[] {
    if (idx >= this.rows.length) {
      return widths;
    }

    const row = this.rows[idx];
    if (row.cells.length != widths.length) {
      throw `Invalid row with ${row.cells.length} cells: expected ${widths.length}`;
    }

    const rowWidths = row.cells.map((cell) => cell.size);
    const widthPairs = widths.map((w, i) => [w, rowWidths[i]]);
    const mergedWidths = widthPairs.map((p) => Math.max(p[0], p[1]));
    return this.buildColumnWidths(mergedWidths, idx + 1);
  }
}
