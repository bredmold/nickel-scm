import { NickelReport, ReportingItem, ReportLine } from "./nickel-report";

import { NickelAction } from "./actions/nickel-action";
import { NickelProject } from "./nickel-project";
import { NickelTimer } from "./nickel-timer";
import { SelectedItem } from "./nickel-selector";
import { logger } from "./logger";

/**
 * Nickel Instigator - perform actions across all projects
 */
export class NickelInstigator {
  constructor(private readonly selectedItems: SelectedItem[]) {}

  doIt(action: NickelAction, args: string[]): void {
    // Do eeet!
    const timer = new NickelTimer();
    const promises: Promise<ReportingItem>[] = this.selectedItems.map((selectedItem) => {
      const item = selectedItem.item;
      if (item instanceof NickelProject) {
        if (selectedItem.selected) {
          return action.act(<NickelProject>item, args);
        } else {
          // TODO Perform a more robust deep-copy of the skipReport object
          const values: { [index: string]: string } = {};
          Object.assign(values, action.skipReport.values);
          values["Project"] = item.name;

          const report: ReportLine = new ReportLine(values, false);
          Object.assign(report, action.skipReport);

          return Promise.resolve(report);
        }
      } else {
        // Assume it's a separator
        return Promise.resolve(item);
      }
    });

    Promise.all(promises).then((reports: ReportingItem[]) => {
      const report = new NickelReport(action.columns);
      const table = report.buildReport(reports);
      console.log(table.render());
      const reportLines = reports.filter(
        (report) => report instanceof ReportLine
      );
      action.post(reportLines as ReportLine[], args);
      logger.info(`${timer.elapsed() / 1000}s elapsed`);
    });
  }
}
