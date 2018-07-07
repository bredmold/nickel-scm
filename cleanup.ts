import {NickelProject} from "./nickel-project";

export enum CleanupStatus {
    Skipped = 'clean-skip',
    Dirty = 'clean-dirty',
    Success = 'clean-success',
    Failure = 'clean-failure',
}

export interface CleanupResult {
    /** The project that was cleaned */
    project: NickelProject;

    /** Starting branch for the project */
    branch: string;

    /** Status of the cleanup operation */
    status: CleanupStatus;
}