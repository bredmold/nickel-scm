import * as ch from "chalk";

import {
  CellAlignment,
  NickelTable,
  TableCell,
  TableColumn,
  TableRow,
} from "./nickel-table";

describe("Nickel Table", () => {
  test("Simplest table", () => {
    const chalk = new ch.Instance({ level: 1 });
    const columns = [new TableColumn("a")];
    const rows = [new TableRow([new TableCell("b")])];
    const table = new NickelTable(columns, rows, chalk);

    const rendered = table.render();

    const expectedLines = [
      `╔═══╗`,
      `║ ${chalk.bold("a")} ║`,
      `╟───╢`,
      `║ b ║`,
      `╚═══╝`,
    ];
    expect(rendered).toBe(expectedLines.join("\n"));
  });

  test("2x2 Table", () => {
    const chalk = new ch.Instance({ level: 1 });
    const columns = [new TableColumn("a"), new TableColumn("b")];
    const rows = [
      new TableRow([new TableCell("c"), new TableCell("d")]),
      new TableRow([new TableCell("e"), new TableCell("f")]),
    ];
    const table = new NickelTable(columns, rows, chalk);

    const rendered = table.render();

    const expectedLines = [
      `╔═══╤═══╗`,
      `║ ${chalk.bold("a")} │ ${chalk.bold("b")} ║`,
      `╟───┼───╢`,
      `║ c │ d ║`,
      `║ e │ f ║`,
      `╚═══╧═══╝`,
    ];

    expect(rendered).toBe(expectedLines.join("\n"));
  });

  test("Table with separator row", () => {
    const chalk = new ch.Instance({ level: 1 });
    const columns = [new TableColumn("a"), new TableColumn("b")];
    const rows = [
      new TableRow([new TableCell("c"), new TableCell("d")]),
      new TableRow([new TableCell(""), new TableCell("")], "sep"),
      new TableRow([new TableCell("e"), new TableCell("f")]),
    ];
    const table = new NickelTable(columns, rows, chalk);

    const rendered = table.render();

    const expectedLines = [
      `╔═══╤═══╗`,
      `║ ${chalk.bold("a")} │ ${chalk.bold("b")} ║`,
      `╟───┼───╢`,
      `║ c │ d ║`,
      `╟───┼───╢`,
      `║ e │ f ║`,
      `╚═══╧═══╝`,
    ];

    expect(rendered).toBe(expectedLines.join("\n"));
  });

  test("Separator row with content", () => {
    const chalk = new ch.Instance({ level: 1 });
    const columns = [new TableColumn("a"), new TableColumn("b")];
    const rows = [
      new TableRow([new TableCell("c"), new TableCell("d")]),
      new TableRow([new TableCell("g"), new TableCell("h")], "sep"),
      new TableRow([new TableCell("e"), new TableCell("f")]),
    ];
    const table = new NickelTable(columns, rows, chalk);

    const rendered = table.render();

    const expectedLines = [
      `╔═══╤═══╗`,
      `║ ${chalk.bold("a")} │ ${chalk.bold("b")} ║`,
      `╟───┼───╢`,
      `║ c │ d ║`,
      `╟─g─┼─h─╢`,
      `║ e │ f ║`,
      `╚═══╧═══╝`,
    ];

    expect(rendered).toBe(expectedLines.join("\n"));
  });

  test("Table with left aligned and right aligned cells", () => {
    const chalk = new ch.Instance({ level: 1 });
    const columns = [new TableColumn("one"), new TableColumn("two")];
    const rows = [
      new TableRow([
        new TableCell("c", CellAlignment.Left),
        new TableCell("d", CellAlignment.Right),
      ]),
    ];
    const table = new NickelTable(columns, rows, chalk);

    const rendered = table.render();

    const expectedLines = [
      `╔═════╤═════╗`,
      `║ ${chalk.bold("one")} │ ${chalk.bold("two")} ║`,
      `╟─────┼─────╢`,
      `║ c   │   d ║`,
      `╚═════╧═════╝`,
    ];

    expect(rendered).toBe(expectedLines.join("\n"));
  });

  test("Invalid row length", () => {
    const chalk = new ch.Instance({ level: 1 });
    const columns = [new TableColumn("one"), new TableColumn("two")];
    const rows = [new TableRow([new TableCell("c")])];

    expect(() => new NickelTable(columns, rows, chalk)).toThrow("Invalid row");
  });

  test("Cell with chalk content", () => {
    const chalk = new ch.Instance({ level: 1 });
    const columns = [new TableColumn("one"), new TableColumn("two")];
    const rows = [
      new TableRow([
        new TableCell(chalk.green("c"), CellAlignment.Left),
        new TableCell("d", CellAlignment.Right),
      ]),
    ];
    const table = new NickelTable(columns, rows, chalk);

    const rendered = table.render();

    const expectedLines = [
      `╔═════╤═════╗`,
      `║ ${chalk.bold("one")} │ ${chalk.bold("two")} ║`,
      `╟─────┼─────╢`,
      `║ ${chalk.green("c")}   │   d ║`,
      `╚═════╧═════╝`,
    ];

    expect(rendered).toBe(expectedLines.join("\n"));
  });

  test("First row is a separator", () => {
    const chalk = new ch.Instance({ level: 1 });
    const columns = [new TableColumn("one")];
    const rows = [
      new TableRow([new TableCell("s", CellAlignment.Left)], "sep"),
      new TableRow([new TableCell("a")]),
    ];
    const table = new NickelTable(columns, rows, chalk);

    const rendered = table.render();

    const expectedLines = [
      `╔═════╗`,
      `║ ${chalk.bold("one")} ║`,
      `╟─s───╢`,
      `║   a ║`,
      `╚═════╝`,
    ];

    expect(rendered).toBe(expectedLines.join("\n"));
  });
});
