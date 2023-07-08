import * as path from "path";

import { ReportSeparator, ReportingItem } from "./nickel-report";

import { NickelProject } from "./nickel-project";
import { logger } from "./logger";

export interface SelectedItem {
  readonly item: ReportingItem;
  readonly selected: boolean;
}

/**
 * Selector configuration
 */
export interface SelectorConfig {
  /** Projects in this list are selected */
  readonly projects: string[];

  /** Paths containing projects */
  readonly paths: string[];

  /** Select based on this branch name */
  readonly branch: string;

  /** Select projects with this mark */
  readonly mark: string;
}

export interface NickelSelector {
  (item: ReportingItem): Promise<SelectedItem>;

  criteria: string;
}

function trueSelector(): NickelSelector {
  logger.debug(`No project selector`);
  const selector = ((item) =>
    Promise.resolve({ item: item, selected: true })) as NickelSelector;
  selector.criteria = "All projects";
  return selector;
}

function projectListSelector(projects: string[]): NickelSelector {
  logger.debug(`Project list selector: ${projects}`);
  const selector = ((item) => {
    return item instanceof ReportSeparator
      ? Promise.resolve({ item: item, selected: false })
      : Promise.resolve({
          item: item,
          selected: projects.findIndex((project) => project === item.name) >= 0,
        });
  }) as NickelSelector;
  selector.criteria = `in list: ${projects}`;
  return selector;
}

function projectPathSelector(paths: string[]): NickelSelector {
  logger.debug(`Project path selector: ${paths}`);
  const selector = ((item) => {
    if (item instanceof ReportSeparator) {
      return Promise.resolve({ item: item, selected: false });
    } else {
      const project = item as NickelProject;
      const matchingPaths = paths
        .map((p) => path.normalize(p))
        .map((p) => (path.isAbsolute(p) ? p : path.resolve(p)))
        .filter((p) => project.path.startsWith(p));

      return Promise.resolve({
        item: item,
        selected: matchingPaths.length > 0,
      });
    }
  }) as NickelSelector;
  selector.criteria = `in path list: ${paths}`;
  return selector;
}

function branchSelector(selectorBranch: string): NickelSelector {
  logger.debug(`Active branch selector: ${selectorBranch}`);
  const selector = (async (item) => {
    if (item instanceof ReportSeparator) {
      return { item: item, selected: false };
    } else {
      const project = item as NickelProject;
      const branch = await project.repository.branch();
      logger.debug(
        `[${item.name}] branch=${branch} selected=${branch === selectorBranch}`,
      );
      return { item: item, selected: branch === selectorBranch };
    }
  }) as NickelSelector;
  selector.criteria = `active branch = ${selectorBranch}`;
  return selector;
}

function markSelector(selectorMark: string): NickelSelector {
  logger.debug(`Project mark selector: ${selectorMark}`);

  function isMarked(project: NickelProject): boolean {
    const markIdx = project.marks.findIndex(
      (projectMark) => projectMark === selectorMark,
    );
    return markIdx >= 0;
  }

  const selector = ((item) => {
    return item instanceof ReportSeparator
      ? Promise.resolve({ item: item, selected: false })
      : Promise.resolve({
          item: item,
          selected: isMarked(<NickelProject>item),
        });
  }) as NickelSelector;
  selector.criteria = `project mark = ${selectorMark}`;
  return selector;
}

/**
 * Generate a project selection predicate. If the inputs are invalid, then throw.
 */
export function nickelSelector(config: SelectorConfig): NickelSelector {
  const haveSelectedProjects = config.projects.length > 0;
  const haveSelectedPaths = config.paths.length > 0;
  const haveActiveBranch = config.branch.trim().length > 0;
  const haveSelectedMark = config.mark.trim().length > 0;

  const selectorCount: number =
    (haveSelectedProjects ? 1 : 0) +
    (haveSelectedPaths ? 1 : 0) +
    (haveActiveBranch ? 1 : 0) +
    (haveSelectedMark ? 1 : 0);

  if (selectorCount > 1) {
    throw `Conflicting selectors: projects=${config.projects} paths=${config.paths} branch=${config.branch} mark=${config.mark}`;
  } else if (haveSelectedPaths) {
    return projectPathSelector(config.paths);
  } else if (haveSelectedProjects) {
    return projectListSelector(config.projects);
  } else if (haveActiveBranch) {
    return branchSelector(config.branch);
  } else if (haveSelectedMark) {
    return markSelector(config.mark);
  } else {
    return trueSelector();
  }
}

/**
 * Filter the list of projects based on selection criteria
 *
 * @param config Selection configuration
 * @param items List of configured reporting items
 * @return A promise containing projects merged with selection criteria
 */
export async function selectItems(
  config: SelectorConfig,
  items: ReportingItem[],
): Promise<SelectedItem[]> {
  const selector = nickelSelector(config);

  const selectorPromises = items.map((item) => selector(item));
  const selectedItems = await Promise.all(selectorPromises);
  const selected: number = selectedItems.filter((item) => item.selected).length;
  logger.debug(`Selected ${selected} projects`);

  if (selected === 0) {
    throw `No projects meet selection criteria: ${selector.criteria}`;
  } else {
    return selectedItems;
  }
}
