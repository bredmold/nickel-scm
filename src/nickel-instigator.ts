import {NickelTimer} from "./nickel-timer";
import {NickelAction} from "./actions/nickel-action";
import {NickelReport, ReportingItem} from "./nickel-report";
import {logger} from "./nickel";
import {NickelProject} from "./nickel-project";

/**
 * Nickel Instigator - perform actions across all projects
 */
export class NickelInstigator {
  private projects: NickelProject[];

  constructor(private reportItems: ReportingItem[]) {
    this.projects = reportItems.filter(item => (item instanceof NickelProject)) as NickelProject[];
  }

  doIt(action: NickelAction<any>, args: any) {
    // Do eeet!
    const timer = new NickelTimer();
    const promises: Promise<any>[] = this.projects.map(project => {
      if (project.selected) {
        return action.act(project, args);
      } else {
        let report: any = {};
        Object.assign(report, action.skipReport);
        report.project = project;
        return Promise.resolve(report);
      }
    });
    Promise.all(promises).then(reports => {
      const report = new NickelReport(action.reportHeader, this.reportItems);
      console.log(report.buildReport(reports));
      action.post(reports, args);
      logger.info(`${timer.elapsed() / 1000}s elapsed`);
    });
  }
}
