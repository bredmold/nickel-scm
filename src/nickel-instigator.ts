import { NickelReport, ReportLine, ReportingItem } from "./nickel-report";

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

  async doIt(action: NickelAction): Promise<void> {
    // Do eeet!
    const timer = new NickelTimer();
    const promises: Promise<ReportingItem>[] = this.selectedItems.map(
      (selectedItem) => {
        const item = selectedItem.item;
        if (item instanceof NickelProject) {
          if (selectedItem.selected) {
            return action.act(<NickelProject>item);
          } else {
            return Promise.resolve(action.skipReport(<NickelProject>item));
          }
        } else {
          // Assume it's a separator
          return Promise.resolve(item);
        }
      }
    );

    const reports: ReportingItem[] = await Promise.all(promises);
    const report = new NickelReport(action.columns);
    const table = report.buildReport(reports);
    console.log(table.render());
    const reportLines = reports.filter(
      (report) => report instanceof ReportLine
    );
    action.post(reportLines as ReportLine[]);
    logger.info(`${timer.elapsed() / 1000}s elapsed`);
  }
}
