import {NickelProject} from "./nickel-project";

export enum SyncStatus {
    New = 'sync-new',
    Success = 'sync-success',
    Failure = 'sync-fail',
    Dirty = 'sync-dirty',
}

export interface SyncResult {
    /** Sync operation status */
    status: SyncStatus;

    /** Sync project */
    project: NickelProject;

    /** Number of files that were updated */
    updateCount: number;

    /** Current branch for the repository */
    branch: string;
}
