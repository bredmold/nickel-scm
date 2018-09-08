import {NickelProject} from "../nickel-project";

export interface ReportResult {
    /* Report project */
    project: NickelProject;

    /** Current branch for the repository */
    branch: string;

    /** Number of modified files in the repository */
    modified: number;

    /** Commit ID */
    commit: string;
}