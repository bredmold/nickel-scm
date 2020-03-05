import {NickelTimer} from "./nickel-timer";
import {NickelAction} from "./actions/nickel-action";
import {NickelReport, ReportingItem} from "./nickel-report";
import {NickelProject} from "./nickel-project";
import {logger} from "./logger";

/**
 * Nickel Instigator - perform actions across all projects
 */
export class NickelInstigator {
  constructor(private reportItems: ReportingItem[]) {
  }

  doIt(action: NickelAction, args: any) {
    // Do eeet!
    const timer = new NickelTimer();
    const promises: Promise<any>[] = this.reportItems.map(item => {
      if (item.selected && (item instanceof NickelProject)) {
        return action.act(<NickelProject>item, args);
      } else if (item.selected) {
        return Promise.resolve(item);
      } else {
        let report: any = {};
        Object.assign(report, action.skipReport);
        report.project = item;
        return Promise.resolve(report);
      }
    });

    Promise
      .all(promises)
      .then(reports => {
        const report = new NickelReport(action.columns);
        const table = report.buildReport(reports);
        console.log(table.render());
        action.post(reports, args);
        logger.info(`${timer.elapsed() / 1000}s elapsed`);
      });
  }
}
