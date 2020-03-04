import {CellAlignment, NickelTable, TableCell, TableColumn, TableRow} from "./nickel-table";
import chalk from "chalk";

beforeAll(() => {
  chalk.enabled = true;
});

describe('Nickel Table', () => {
  test('Simplest table', () => {
    const columns = [new TableColumn('a')];
    const rows = [new TableRow([new TableCell('b')])];
    const table = new NickelTable(columns, rows);

    const rendered = table.render();

    const expectedLines = [
      `╔═══╗`,
      `║ ${chalk.bold('a')} ║`,
      `╟───╢`,
      `║ b ║`,
      `╚═══╝`
    ];
    expect(rendered).toBe(expectedLines.join('\n'));
  });

  test('2x2 Table', () => {
    const columns = [new TableColumn('a'), new TableColumn('b')];
    const rows = [
      new TableRow([new TableCell('c'), new TableCell('d')]),
      new TableRow([new TableCell('e'), new TableCell('f')]),
    ];
    const table = new NickelTable(columns, rows);

    const rendered = table.render();

    const expectedLines = [
      `╔═══╤═══╗`,
      `║ ${chalk.bold('a')} │ ${chalk.bold('b')} ║`,
      `╟───┼───╢`,
      `║ c │ d ║`,
      `║ e │ f ║`,
      `╚═══╧═══╝`
    ];

    expect(rendered).toBe(expectedLines.join('\n'));
  });

  test('Table with separator row', () => {
    const columns = [new TableColumn('a'), new TableColumn('b')];
    const rows = [
      new TableRow([new TableCell('c'), new TableCell('d')]),
      new TableRow([new TableCell(''), new TableCell('')], 'sep'),
      new TableRow([new TableCell('e'), new TableCell('f')]),
    ];
    const table = new NickelTable(columns, rows);

    const rendered = table.render();

    const expectedLines = [
      `╔═══╤═══╗`,
      `║ ${chalk.bold('a')} │ ${chalk.bold('b')} ║`,
      `╟───┼───╢`,
      `║ c │ d ║`,
      `╟───┼───╢`,
      `║ e │ f ║`,
      `╚═══╧═══╝`
    ];

    expect(rendered).toBe(expectedLines.join('\n'));
  });

  test('Separator row with content', () => {
    const columns = [new TableColumn('a'), new TableColumn('b')];
    const rows = [
      new TableRow([new TableCell('c'), new TableCell('d')]),
      new TableRow([new TableCell('g'), new TableCell('h')], 'sep'),
      new TableRow([new TableCell('e'), new TableCell('f')]),
    ];
    const table = new NickelTable(columns, rows);

    const rendered = table.render();

    const expectedLines = [
      `╔═══╤═══╗`,
      `║ ${chalk.bold('a')} │ ${chalk.bold('b')} ║`,
      `╟───┼───╢`,
      `║ c │ d ║`,
      `╟─g─┼─h─╢`,
      `║ e │ f ║`,
      `╚═══╧═══╝`
    ];

    expect(rendered).toBe(expectedLines.join('\n'));
  });

  test('Table with left aligned and right aligned cells', () => {
    const columns = [new TableColumn('one'), new TableColumn('two')];
    const rows = [
      new TableRow([new TableCell('c', CellAlignment.Left), new TableCell('d', CellAlignment.Right)]),
    ];
    const table = new NickelTable(columns, rows);

    const rendered = table.render();

    const expectedLines = [
      `╔═════╤═════╗`,
      `║ ${chalk.bold('one')} │ ${chalk.bold('two')} ║`,
      `╟─────┼─────╢`,
      `║ c   │   d ║`,
      `╚═════╧═════╝`
    ];

    expect(rendered).toBe(expectedLines.join('\n'));
  });

  test('Invalid row length', () => {
    const columns = [new TableColumn('one'), new TableColumn('two')];
    const rows = [
      new TableRow([new TableCell('c')]),
    ];

    expect(() => new NickelTable(columns, rows)).toThrow('Invalid row');
  });

  test('Cell with chalk content', () => {
    const columns = [new TableColumn('one'), new TableColumn('two')];
    const rows = [
      new TableRow([new TableCell(chalk.green('c'), CellAlignment.Left), new TableCell('d', CellAlignment.Right)]),
    ];
    const table = new NickelTable(columns, rows);

    const rendered = table.render();

    const expectedLines = [
      `╔═════╤═════╗`,
      `║ ${chalk.bold('one')} │ ${chalk.bold('two')} ║`,
      `╟─────┼─────╢`,
      `║ ${chalk.green('c')}   │   d ║`,
      `╚═════╧═════╝`
    ];

    expect(rendered).toBe(expectedLines.join('\n'));
  });
});
