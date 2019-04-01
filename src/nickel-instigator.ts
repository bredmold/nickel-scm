import {NickelProject} from "./nickel-project";
import {NickelTimer} from "./nickel-timer";
import {NickelAction} from "./actions/nickel-action";
import {NickelReport} from "./nickel-report";
import {logger} from "./nickel";

/**
 * Nickel Instigator - perform actions across all projects
 */
export class NickelInstigator {
  constructor(private projects: NickelProject[],
              private separators: number[],
              private selectedProjects: string[]) {
  }

  doIt(action: NickelAction<any>, args: any) {
    // Do eeet!
    const timer = new NickelTimer();
    const promises: Promise<any>[] = this.projects.map(project => {
      const pIdx = this.selectedProjects.findIndex(sp => sp == project.name);
      if (pIdx >= 0) {
        return action.act(project, args);
      } else {
        let report: any = {};
        Object.assign(report, action.skipReport);
        report.project = project;
        return Promise.resolve(report);
      }
    });
    Promise.all(promises).then(reports => {
      const report = new NickelReport(action.reportHeader, this.separators);
      console.log(report.buildReport(reports));
      action.post(reports, args);
      logger.info(`${timer.elapsed() / 1000}s elapsed`);
    });
  }
}
