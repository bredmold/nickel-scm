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
              private actions: string[],
              private selectedProjects: string[],
              private dryRun: boolean) {
  }

  doIt(action: NickelAction<any>): Promise<any> {
    const idx = this.actions.findIndex(a => a === action.token());
    if (idx >= 0) {
      // Do eeet!
      const timer = new NickelTimer();
      const promises: Promise<any>[] = this.projects.map(project => {
        const pIdx = this.selectedProjects.findIndex(sp => sp == project.name);
        if (pIdx >= 0) {
          return action.act(project, this.dryRun);
        } else {
          return Promise.resolve({project: project});
        }
      });
      return Promise.all(promises).then(reports => {
        const report = new NickelReport(action.reportHeader(), this.separators);
        console.log(report.buildReport(reports));
        logger.info(`${timer.elapsed() / 1000}s elapsed`);
      });
    } else {
      // Do nothing
      return Promise.resolve();
    }
  }
}
