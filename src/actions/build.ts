import {NickelProject} from "../nickel-project";
import * as fs from "fs";
import {MavenBuild} from "../build/maven/maven-build";

export enum BuildSystemType {
    Maven = 'mvn',
    None = 'none',
}

export enum BuildStatus {
    Success = 'build-success',
    Failure = 'build-failure',
    Invalid = 'build-nope',
}

export interface BuildResult {
    /** The project that was built */
    project: NickelProject;

    /** Build system type */
    type: string;

    /** Active branch for the buildSystem */
    branch: string;

    /** Active commit ID for the buildSystem */
    commit: string;

    /** Status of the buildSystem */
    status: BuildStatus;

    /** On an unsuccessful buildSystem, a short message indicating failure reason */
    error: string;
}

export interface ShortBuildResult {
    status: BuildStatus;
    error: string;
}

/**
 * Given a filesystem path, determine the appropriate buildSystem system to use
 *
 * @param project The project that's being built
 * @returns {BuildSystem} Object that knows how to run a buildSystem for this project
 */
export function inferBuildSystem(project: NickelProject): BuildSystem {
    const pomPath = `${project.path}/pom.xml`;
    if (fs.existsSync(pomPath)) {
        return new MavenBuild(project, pomPath);
    } else {
        throw `Unable to identify build system for project ${project.name}`;
    }
}

export interface BuildSystem {
    type: BuildSystemType;

    project: NickelProject;

    build(): Promise<ShortBuildResult>;
}

export class NoBuildSystem implements BuildSystem {
    type: BuildSystemType;

    constructor(public project: NickelProject) {
        this.type = BuildSystemType.None;
    }

    build(): Promise<ShortBuildResult> {
        return Promise.resolve({
            status: BuildStatus.Invalid,
            error: ''
        });
    }
}
