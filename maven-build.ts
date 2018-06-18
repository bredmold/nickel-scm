import {BuildStatus, BuildSystem, BuildSystemType, ShortBuildResult} from "./build";
import {NickelProject} from "./nickel-project";
import * as child_process from "child_process";

export class MavenBuild implements BuildSystem {
    type: BuildSystemType;
    path: string;

    constructor(public project: NickelProject,
                private pom: string) {
        this.type = BuildSystemType.Maven;
        this.path = project.path;
    }

    /**
     * Run a Maven buildSystem with the given POM file
     */
    build(): Promise<ShortBuildResult> {
        const defaultPom = `${this.path}/pom.xml`;
        const pomOption = (this.pom === defaultPom) ? '' : `-f ${this.pom}`;
        const mvnCmd = `mvn ${pomOption} clean install`;

        return new Promise<any>((resolve, reject) => {
            const summaryRe = /^\[ERROR] Failed to execute goal on project [a-zA-Z0-9.\-_]+:\s*(.*)/;
            child_process.exec(mvnCmd, {cwd: this.path, encoding: 'utf8'}, (error, stdout, stderr) => {
                if (error) {
                    let lines = stdout.split(/\n/);
                    let summary = 'Build failed';
                    lines.forEach(line => {
                        let m = line.trim().match(summaryRe);
                        if (m) {
                            summary = m[1];
                        }
                    });
                    reject(summary);
                } else {
                    resolve({
                        status: BuildStatus.Success,
                        error: `mvn -f ${this.pom} clean install`,
                    });
                }
            });
        });
    }
}