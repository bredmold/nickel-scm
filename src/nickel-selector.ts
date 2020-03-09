import {ReportingItem, ReportSeparator} from "./nickel-report";
import {NickelProject} from "./nickel-project";
import {logger} from "./logger";

export interface SelectedItem {
  readonly item: ReportingItem;
  readonly selected: boolean;
}

export interface NickelSelector {
  (item: ReportingItem): Promise<SelectedItem>;

  criteria: string;
}

/**
 * Generate a project selection predicate. If the inputs are invalid, then throw.
 *
 * @param selectedProjects A list of explicitly selected projects
 * @param activeBranch
 */
export function nickelSelector(selectedProjects: string[],
                               activeBranch: string): NickelSelector {
  const haveSelectedProjects = (selectedProjects.length > 0);
  const haveActiveBranch = (activeBranch.trim().length > 0);

  let selector: NickelSelector;
  if (!haveSelectedProjects && !haveActiveBranch) {
    logger.debug(`No project selector`);
    selector = (item => Promise.resolve({item: item, selected: true})) as NickelSelector;
    selector.criteria = 'All projects';
  } else if (haveSelectedProjects && !haveActiveBranch) {
    logger.debug(`Project list selector: ${selectedProjects}`);
    selector = (item => {
      return (item instanceof ReportSeparator)
        ? Promise.resolve({item: item, selected: false})
        : Promise.resolve({
          item: item,
          selected: (selectedProjects.findIndex(project => (project === item.name)) >= 0)
        })
    }) as NickelSelector;
    selector.criteria = `in list: ${selectedProjects}`;
  } else if (!haveSelectedProjects && haveActiveBranch) {
    logger.debug(`Active branch selector: ${activeBranch}`);
    selector = (item => new Promise(resolve => {
      if (item instanceof ReportSeparator)
        resolve({item: item, selected: false});

      (<NickelProject>item)
        .repository
        .branch()
        .then(branch => {
          logger.debug(`[${item.name}] branch=${branch} selected=${branch === activeBranch}`);
          resolve({item: item, selected: (branch === activeBranch)});
        });
    })) as NickelSelector;
    selector.criteria = `active branch = ${activeBranch}`;
  } else {
    throw 'Conflicting project selectors';
  }

  return selector;
}
