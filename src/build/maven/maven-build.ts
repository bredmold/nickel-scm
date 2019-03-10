import {NickelProject} from '../../nickel-project';
import {BuildStatus, BuildSystem, BuildSystemType} from '../../actions/build';
import * as child_process from 'child_process';

export class MavenBuild extends BuildSystem {
  private readonly path: string;

  constructor(project: NickelProject,
              private pom: string) {
    super(project, BuildSystemType.Maven);
    this.path = project.path;
  }

  /**
   * Run a Maven buildSystem with the given POM file
   */
  build(): Promise<any> {
    const defaultPom = `${this.path}/pom.xml`;
    const pomOption = (this.pom === defaultPom) ? '' : `-f ${this.pom}`;
    const mvnCmd = `mvn ${pomOption} clean install`;

    return new Promise<any>((resolve, reject) => {
      const summaryRe = /^\[ERROR] Failed to execute goal ([a-zA-Z0-9:._\- ()]+)?on project [a-zA-Z0-9.\-_]+:\s*(.*)/;
      child_process.exec(mvnCmd, {cwd: this.path, encoding: 'utf8'}, (error, stdout, stderr) => {
        if (error) {
          let lines = stdout.split(/\n/);
          let summary = 'Build failed';
          lines.forEach(line => {
            let m = line.trim().match(summaryRe);
            if (m) {
              summary = m[2];
              summary = summary.replace(' -> [Help 1]', '');
            }
          });
          reject(summary);
        } else {
          this.status = BuildStatus.Success;
          this.error = '';
          resolve();
        }
      });
    });
  }
}
