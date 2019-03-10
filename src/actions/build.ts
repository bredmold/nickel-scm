import {NickelProject} from "../nickel-project";

export enum BuildSystemType {
  Maven = 'mvn',
  None = 'none',
}

export enum BuildStatus {
  New = 'build-new',
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

export abstract class BuildSystem implements BuildResult {
  branch: string;
  commit: string;
  status: BuildStatus;
  error: string;

  protected constructor(public project: NickelProject,
                        public type: BuildSystemType) {
    this.branch = '';
    this.commit = '';
    this.status = BuildStatus.New;
    this.error = '';
  }

  manageBuild(): Promise<BuildResult> {
    return new Promise<BuildResult>(resolve => {
      const fail = (e: any) => {
        this.status = BuildStatus.Failure;
        this.error = e;
        resolve(this);
      };

      this.project.repository.branch().then(
        branch => {
          this.branch = branch;
          this.project.repository.commit().then(
            commitId => {
              this.commit = commitId;
              this.build().then(
                () => {
                  resolve(this);
                },
                e => fail(e)
              );
            },
            e => fail(e)
          );
        },
        () => fail('Unable to find branch')
      );
    });
  }

  abstract build(): Promise<any>;
}

export class NoBuildSystem extends BuildSystem implements BuildResult {
  constructor(project: NickelProject) {
    super(project,
      BuildSystemType.None);
  }

  build(): Promise<BuildResult> {
    this.status = BuildStatus.Invalid;
    return Promise.resolve(this);
  }
}
