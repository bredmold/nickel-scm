import { ReportLine, ReportSeparator } from "./nickel-report";

import { NickelAction } from "./actions/nickel-action";
import { NickelInstigator } from "./nickel-instigator";
import { NickelProject } from "./nickel-project";
import { SelectedItem } from "./nickel-selector";
import { TableColumn } from "./nickel-table";

describe("Nickel Instigator", () => {
  let items: SelectedItem[];
  let instigator: NickelInstigator;

  beforeEach(() => {
    items = [
      {
        item: new NickelProject({
          name: "test",
          path: "/application/path",
          defaultBranch: "master",
          safeBranches: [],
          commitPrefix: -1,
        }),
        selected: true,
      },
      {
        item: new ReportSeparator("Bell bottoms!"),
        selected: true,
      },
    ];

    instigator = new NickelInstigator(items);
  });

  test("doTheThing", (done) => {
    let actCount: number = 0;
    const action = new (class implements NickelAction {
      readonly columns = [new TableColumn("test")];
      readonly command = "test";
      readonly description = "test";
      readonly skipReport = new ReportLine({ test: "a" }, false);

      act(project: NickelProject, args?: any): Promise<ReportLine> {
        actCount += 1;
        return Promise.resolve(new ReportLine({ test: "b" }));
      }

      post(reports: ReportLine[], args?: any): any {
        expect(actCount).toStrictEqual(1);
        expect(reports).toStrictEqual([new ReportLine({ test: "b" })]);
        done();
      }
    })();

    instigator.doIt(action, null);
  });

  test("skipped project", (done) => {
    const action = new (class implements NickelAction {
      readonly columns = [new TableColumn("test")];
      readonly command = "test";
      readonly description = "test";
      readonly skipReport = new ReportLine({ test: "a" }, false);

      act(project: NickelProject, args?: any): Promise<ReportLine> {
        done.fail("act should not be called");
        return Promise.reject("fail");
      }

      post(reports: ReportLine[], args?: any): any {
        expect(reports).toStrictEqual([
          new ReportLine({ Project: "test", test: "a" }, false),
        ]);
        done();
      }
    })();

    items = items.map((item) => ({ item: item.item, selected: false }));
    instigator = new NickelInstigator(items);

    instigator.doIt(action, null);
  });
});
