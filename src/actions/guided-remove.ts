import * as fs from "fs";

import {
  FetchResult,
  RemoteBranch,
  RemoveRemoteBranchResult,
} from "../scm/git/git-repository";

import { BranchReportDetails } from "./branch-reports";
import { NickelAction } from "./nickel-action";
import { NickelProject } from "../nickel-project";
import { ReportLine } from "../nickel-report";
import { TableColumn } from "../nickel-table";
import { logger } from "../logger";

export enum GuidedBranchRemovalStatus {
  New = "guided-merge-new",
  Success = "guided-merge-success",
  Failure = "guided-merge-failure",
  Skipped = "guided-merge-skip",
  Dirty = "guided-merge-dirty",
  Working = "guided-merge-working",
}

export class GuidedBranchRemovalAction implements NickelAction {
  constructor(readonly reportFile: string) {}

  skipReport(project: NickelProject): ReportLine {
    return new ReportLine(
      {
        Project: project.name,
        Branch: "",
        Status: GuidedBranchRemovalStatus.Skipped,
        "# Kept": "0",
        "# Removed": "0",
        "# Failed": "0",
      },
      false,
    );
  }

  readonly columns = [
    new TableColumn("Project"),
    new TableColumn("Branch"),
    new TableColumn("Status"),
    new TableColumn("# Kept"),
    new TableColumn("# Removed"),
    new TableColumn("# Failed"),
  ];

  act(project: NickelProject): Promise<ReportLine> {
    return new GuidedBranchRemoval(project, this.reportFile).prune();
  }

  post(): void {
    // Empty
  }
}

/**
 * Map from remote name to local branch name to remote branch name
 */
type BranchNameMap = {
  [key: string]: { [key: string]: string };
};

interface FetchInfo {
  added: string[];
  deleted: string[];
}

class GuidedBranchRemoval {
  private readonly branchesKept: string[];
  private readonly branchesToRemove: RemoteBranch[];

  constructor(
    private readonly project: NickelProject,
    branchReportFilename: string,
  ) {
    // List of regex values that check for 'safe' branches
    const safeBranchRes: RegExp[] = this.project.safeBranches.map(
      (safeBranch) => {
        return typeof safeBranch === "string"
          ? new RegExp(`^origin/${safeBranch}$`)
          : safeBranch;
      },
    );

    const branchReportRaw: string = fs.readFileSync(branchReportFilename, {
      encoding: "utf-8",
    });
    const branchInstructions: BranchReportDetails[] =
      JSON.parse(branchReportRaw);

    // Filter the branch instructions - selecting only "non-safe" branches for the current project
    this.branchesKept = [];
    this.branchesToRemove = [];
    branchInstructions.forEach((bi) => {
      if (bi.project === project.name) {
        logger.debug("%j", bi);
        if (bi.keep) {
          this.branchesKept.push(bi.branch);
          logger.info(`${this.project.name}: Keeping branch ${bi.branch}`);
        } else {
          const branch = bi.branch;
          const safeIdx = safeBranchRes.findIndex(
            (safeBranchRe) => branch.match(safeBranchRe) != null,
          );
          if (safeIdx < 0) {
            const branchToRemove: RemoteBranch = RemoteBranch.fromBranchName(
              bi.branch,
            );
            logger.debug(`${JSON.stringify(branchToRemove)}`);
            this.branchesToRemove.push(branchToRemove);
            logger.info(
              `${this.project.name}: Will attempt to remove branch ${bi.branch}`,
            );
          }
        }
      }
    });
  }

  async prune(): Promise<ReportLine> {
    const project = this.project;
    const branchesKept = this.branchesKept;

    function line(
      branch: string,
      removedBranches: string[],
      notRemovedBranches: string[],
      status: GuidedBranchRemovalStatus,
    ) {
      return new ReportLine({
        Project: project.name,
        Branch: branch,
        Status: status,
        "# Kept": branchesKept.length.toString(),
        "# Removed": removedBranches.length.toString(),
        "# Failed": notRemovedBranches.length.toString(),
      });
    }

    try {
      const status = await this.project.repository.status();
      const branch = status.branch;

      try {
        if (status.modifiedFiles.length > 0) {
          return line(branch, [], [], GuidedBranchRemovalStatus.Dirty);
        } else if (status.branch !== this.project.defaultBranch) {
          return line(branch, [], [], GuidedBranchRemovalStatus.Working);
        } else if (this.branchesToRemove.length < 1) {
          logger.debug(`${this.project.name}: No branches to remove`);
          return line(branch, [], [], GuidedBranchRemovalStatus.Skipped);
        } else {
          const fetchResult = await this.project.repository.fetch();

          const fetchInfo = this.constructFetchInfo(fetchResult);
          const branchNameMap: BranchNameMap =
            this.constructBranchNameMap(fetchInfo);
          const deletePromises = this.requestBranchDeletes(branchNameMap);
          const deleteResponses = await Promise.all(deletePromises);

          const removedBranches: string[] = [];
          const notRemovedBranches: string[] = [];
          deleteResponses.forEach((deleteResponse) => {
            const remoteBranch = `${deleteResponse.remote}/${deleteResponse.branch}`;
            if (deleteResponse.deleted) {
              logger.info(
                `${this.project.name}: Deleted ${deleteResponse.remote} ${deleteResponse.branch}`,
              );
              removedBranches.push(remoteBranch);
            } else {
              logger.warn(
                `${this.project.name}: Failed to remove branch ${deleteResponse.remote} ${deleteResponse.branch}`,
              );
              notRemovedBranches.push(remoteBranch);
            }
          });
          return line(
            branch,
            removedBranches,
            notRemovedBranches,
            GuidedBranchRemovalStatus.Success,
          );
        }
      } catch (e) {
        logger.error(e);
        return line(branch, [], [], GuidedBranchRemovalStatus.Failure);
      }
    } catch (e) {
      logger.error(e);
      return line("", [], [], GuidedBranchRemovalStatus.Failure);
    }
  }

  /**
   * Based on the results of a fetch, constrct a list of branches added and removed. This is useful to support Windows
   * clients, where case information for branch names is often lost. Using this map, it's possible to recover that
   * information.
   *
   * @param fetchResult Parsed results from git fetch
   */
  private constructFetchInfo(fetchResult: FetchResult): FetchInfo {
    const deletedBranches: string[] = [];
    const addedBranches: string[] = [];
    fetchResult.updatedBranches.forEach((fetchItem) => {
      if (fetchItem.flag === "pruned") {
        deletedBranches.push(fetchItem.trackingBranch);
      } else if (fetchItem.flag === "new ref") {
        addedBranches.push(fetchItem.trackingBranch);
      }
    });

    return { added: addedBranches, deleted: deletedBranches };
  }

  /**
   * Once we've parsed out the details of added and removed branches, we can use that information to supplement
   * our knowledge of branch names, mapping local branch names with remote branch names that may differ only on case.
   *
   * @param fetch FetchInfo object built out of the fetch results
   */
  private constructBranchNameMap(fetch: FetchInfo): BranchNameMap {
    const branchNameMap: BranchNameMap = {};
    fetch.deleted.forEach((localBranch) => {
      const remoteBranch = fetch.added.find(
        (addedBranch) =>
          addedBranch.toLowerCase() === localBranch.toLowerCase(),
      );
      if (remoteBranch) {
        const remoteBranchParts = remoteBranch.split(/\//);
        const remote = remoteBranchParts[0];
        const remoteBranchName = remoteBranchParts.slice(1).join("/");

        const localBranchParts = localBranch.split(/\//);
        const localBranchName = localBranchParts.slice(1).join("/");

        if (!branchNameMap[remote]) {
          branchNameMap[remote] = {};
        }

        branchNameMap[remote][localBranchName] = remoteBranchName;
        logger.debug(`Matching branch: ${localBranch} => ${remoteBranch}`);
      }
    });

    return branchNameMap;
  }

  /**
   * Use the branch name map to figure out which branches to keep or delete
   *
   * @param branchNameMap Supplemental information giving the remote names of some branches
   */
  private requestBranchDeletes(
    branchNameMap: BranchNameMap,
  ): Promise<RemoveRemoteBranchResult>[] {
    return this.branchesToRemove.map((remoteBranch) => {
      const remote = remoteBranch.remote;
      const forRemote = branchNameMap[remote];
      const branch =
        forRemote &&
        Object.prototype.hasOwnProperty.call(forRemote, remoteBranch.branch)
          ? forRemote[remoteBranch.branch]
          : remoteBranch.branch;
      logger.debug(`${this.project.name}: Delete ${remote} ${branch}`);
      return this.project.repository.removeRemoteBranch(remote, branch);
    });
  }
}
