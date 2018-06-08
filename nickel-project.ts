import {SyncResult, SyncStatus} from "./sync";
import {GitRepository} from "./git-repository";

export class NickelProject {
    name: string;
    path: string;
    repository: GitRepository;

    constructor(name: string, path?: string) {
        this.name = name;
        this.path = path ? `${path}/${name}` : name;
        this.repository = new GitRepository(this.path);
    }

    sync(): Promise<SyncResult> {
        return new Promise<SyncResult>((resolve, reject) => {
            this.repository.branch().then(
                branch => {
                    this.repository.pull().then(
                        pullResult => {
                            resolve({
                                status: SyncStatus.Success,
                                updateCount: pullResult.updatedFiles.length,
                                project: this,
                                branch: branch,
                            });
                        },
                        e => resolve({status: SyncStatus.Failure, updateCount: 0, project: this, branch: ''})
                    );
                },
                e => {
                    resolve({status: SyncStatus.Failure, updateCount: 0, project: this, branch: ''});
                }
            );
        });
    }
}