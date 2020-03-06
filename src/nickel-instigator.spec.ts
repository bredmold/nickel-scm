import {NickelInstigator} from "./nickel-instigator";
import {ReportingItem, ReportLine, ReportSeparator} from "./nickel-report";
import {NickelProject} from "./nickel-project";
import {NickelAction} from "./actions/nickel-action";
import {TableColumn} from "./nickel-table";

describe('Nickel Instigator', () => {
  let items: ReportingItem[];
  let instigator: NickelInstigator;

  beforeEach(() => {
    items = [
      new NickelProject({
        name: 'test',
        path: '/application/path',
        defaultBranch: 'master',
        safeBranches: [],
        commitPrefix: -1,
      }),
      new ReportSeparator('Bell bottoms!'),
    ];

    instigator = new NickelInstigator(items);
  });

  test('doTheThing', done => {
    let actCount: number = 0;
    const action = new class implements NickelAction {
      readonly columns = [new TableColumn('test')];
      readonly command = 'test';
      readonly description = 'test';
      readonly skipReport = new ReportLine({test: 'a'}, false);

      act(project: NickelProject, args?: any): Promise<ReportLine> {
        actCount += 1;
        return Promise.resolve(new ReportLine({test: 'b'}));
      }

      post(reports: ReportLine[], args?: any): any {
        expect(actCount).toStrictEqual(1);
        expect(reports).toStrictEqual([new ReportLine({test: 'b'})]);
        done();
      }
    };
    items.forEach(item => {
      item.selected = true
    });

    instigator.doIt(action, null);
  });

  test('skipped project', done => {
    const action = new class implements NickelAction {
      readonly columns = [new TableColumn('test')];
      readonly command = 'test';
      readonly description = 'test';
      readonly skipReport = new ReportLine({test: 'a'}, false);

      act(project: NickelProject, args?: any): Promise<ReportLine> {
        done.fail('act should not be called');
        return Promise.reject('fail');
      }

      post(reports: ReportLine[], args?: any): any {
        expect(reports)
          .toStrictEqual([new ReportLine({'Project': 'test', test: 'a'}, false)]);
        done();
      }
    };
    items.forEach(item => {
      item.selected = false
    });

    instigator.doIt(action, null);
  });
});
