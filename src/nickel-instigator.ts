import {NickelTimer} from "./nickel-timer";
import {NickelAction} from "./actions/nickel-action";
import {NickelReport, ReportLine} from "./nickel-report";
import {NickelProject} from "./nickel-project";
import {logger} from "./logger";
import {SelectedItem} from "./nickel-selector";

/**
 * Nickel Instigator - perform actions across all projects
 */
export class NickelInstigator {
  constructor(private readonly selectedItems: SelectedItem[]) {
  }

  doIt(action: NickelAction, args: any) {
    // Do eeet!
    const timer = new NickelTimer();
    const promises: Promise<any>[] = this.selectedItems.map(selectedItem => {
      const item = selectedItem.item;
      if (item instanceof NickelProject) {
        if (selectedItem.selected) {
          return action.act(<NickelProject>item, args);
        } else {
          const values: { [index: string]: string } = {};
          Object.assign(values, action.skipReport.values);
          values['Project'] = item.name;

          const report: ReportLine = new ReportLine(values, false);
          return Promise.resolve(report);
        }
      } else {
        // Assume it's a separator
        return Promise.resolve(item);
      }
    });

    Promise
      .all(promises)
      .then(reports => {
        const report = new NickelReport(action.columns);
        const table = report.buildReport(reports);
        console.log(table.render());
        const reportLines = reports.filter(report => report instanceof ReportLine);
        action.post(reportLines, args);
        logger.info(`${timer.elapsed() / 1000}s elapsed`);
      });
  }
}
