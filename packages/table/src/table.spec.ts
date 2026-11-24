import { describe, expect, test } from "vitest";
import { Chalk } from "chalk";

import { NickelTable, TableCell, TableRow } from "./table.js";

describe("Nickel Table", () => {
  test("Simplest table", () => {
    const chalk = new Chalk({ level: 1 });
    const columns = [{ title: "a" }];
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
    const chalk = new Chalk({ level: 1 });
    const columns = [{ title: "a" }, { title: "b" }];
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
    const chalk = new Chalk({ level: 1 });
    const columns = [{ title: "a" }, { title: "b" }];
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
    const chalk = new Chalk({ level: 1 });
    const columns = [{ title: "a" }, { title: "b" }];
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
    const chalk = new Chalk({ level: 1 });
    const columns = [{ title: "one" }, { title: "two" }];
    const rows = [
      new TableRow([new TableCell("c", "left"), new TableCell("d", "right")]),
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
    const chalk = new Chalk({ level: 1 });
    const columns = [{ title: "one" }, { title: "two" }];
    const rows = [new TableRow([new TableCell("c")])];

    expect(() => new NickelTable(columns, rows, chalk)).toThrow("Invalid row");
  });

  test("Cell with chalk content", () => {
    const chalk = new Chalk({ level: 1 });
    const columns = [{ title: "one" }, { title: "two" }];
    const rows = [
      new TableRow([
        new TableCell(chalk.green("c"), "left"),
        new TableCell("d", "right"),
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
    const chalk = new Chalk({ level: 1 });
    const columns = [{ title: "one" }];
    const rows = [
      new TableRow([new TableCell("s", "left")], "sep"),
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
