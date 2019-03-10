import {NickelProject} from "../nickel-project";
import {BuildResult, BuildSystem, NoBuildSystem} from "./build";
import {MavenBuild} from "../build/maven/maven-build";
import * as fs from "fs";

/**
 * Given a filesystem path, determine the appropriate buildSystem system to use
 *
 * @param project The project that's being built
 * @returns {BuildSystem} Object that knows how to run a buildSystem for this project
 */
function inferBuildSystem(project: NickelProject): BuildSystem {
  const pomPath = `${project.path}/pom.xml`;
  if (fs.existsSync(pomPath)) {
    return new MavenBuild(project, pomPath);
  } else {
    throw `Unable to identify build system for project ${project.name}`;
  }
}

export function actionBuild(project: NickelProject): Promise<BuildResult> {
  const buildSystem: BuildSystem = (project.buildSystem === true)
    ? inferBuildSystem(project)
    : new NoBuildSystem(project);

  return buildSystem.manageBuild();
}
