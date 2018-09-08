import {NickelProject} from "../nickel-project";
import {ReportResult} from "./report";
import {CleanupResult} from "./cleanup";
import {SyncResult} from "./sync";
import {BuildResult} from "./build";

export interface NickelAction<ResponseType> {
    /**
     * Name of the action token to search for
     */
    token(): string;

    /**
     * Perform the action, generating a response
     *
     * @param project The project on which to act
     */
    act(project: NickelProject): Promise<ResponseType>;

    /**
     * Build the report description that tells the reporter how to assemble a report
     */
    reportHeader(): object;
}

export const REPORT_ACTION: NickelAction<ReportResult> = {
    token: () => 'report',
    act: project => project.report(),
    reportHeader: () => {
        return {
            'project.name': 'Project',
            'branch': 'Branch',
            'modified': '# Mod',
            'commit': 'Commit',
        }
    }
};

export const CLEANUP_ACTION: NickelAction<CleanupResult> = {
    token: () => 'cleanup',
    act: project => project.cleanup(),
    reportHeader: () => {
        return {
            'project.name': 'Project',
            'branch': 'Branch',
            'status': 'Status',
        }
    }
};

export const SYNC_ACTION: NickelAction<SyncResult> = {
    token: () => 'sync',
    act: project => project.sync(),
    reportHeader: () => {
        return {
            'project.name': 'Project',
            'branch': 'Branch',
            'updateCount': 'Updated',
            'status': 'Status'
        }
    }
};

export const BUILD_ACTION: NickelAction<BuildResult> = {
    token: () => 'build',
    act: project => project.build(),
    reportHeader: () => {
        return {
            'project.name': 'Project',
            'type': 'Type',
            'branch': 'Branch',
            'commit': 'Commit',
            'status': 'Status',
            'error': {header: 'Message', width: 120},
        }
    }
};
