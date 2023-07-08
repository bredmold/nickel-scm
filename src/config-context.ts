import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import { NickelProject, NickelProjectConfig } from "./nickel-project";
import { ReportSeparator, ReportingItem } from "./nickel-report";

import { logger } from "./logger";

type ConfigItem = string | string[];
type OptionalConfiguration = { [index: string]: ConfigItem } | null;

/**
 * Normalize a path based on well known rules
 *
 * @param userPath The user-supplied path to resolve
 * @returns Normalized path
 */
function normalizePath(userPath: string): string {
  let p = userPath;

  if (p.startsWith("~/")) {
    p = p.substring(2);
    p = path.resolve(os.homedir(), p);
  }

  return p;
}

/**
 * Root context for a set of projects
 */
abstract class PathContext {
  private _defaultBranch?: string;
  private _safeBranches: (string | RegExp)[] = [];
  private _commitPrefix?: number;
  private _label?: string;
  private _pruneOnFetch?: boolean;
  public readonly root: string;

  protected constructor(
    root: string,
    private readonly parent?: PathContext,
  ) {
    this.root = normalizePath(root);
    if (!fs.existsSync(this.root)) throw `No such file: ${this.root}`;

    const stats = fs.statSync(this.root);
    if (!stats.isDirectory()) throw `Not a directory: ${this.root}`;

    logger.debug("path context: %s", this.root);
  }

  /**
   * Optionally update the default branch, and then return it.
   *
   * If a default branch has been set for this level, it is returned.
   * If there is no default branch, then the parent context is examined.
   * If there is no default branch, and no parent, the default is 'master'.
   *
   * @param defaultBranch Optional specification of the default branch, will be returned if present
   * @returns The "default" branch for this context
   */
  defaultBranch(defaultBranch?: string): string {
    if (defaultBranch) this._defaultBranch = defaultBranch;

    if (this._defaultBranch) return this._defaultBranch;
    else if (this.parent) return this.parent.defaultBranch();
    else return "master";
  }

  /**
   * Optionally update the safe branches list, and then return it
   *
   * If safe branches have been set for this context, they are returned.
   * If there are no safe branches, then the parent context is examined.
   * If there are no safe branches, and no parent, the default is the empty list.
   *
   * @param safeBranches List of "safe" branches for this context
   * @returns safe branches list for this context
   */
  safeBranches(safeBranches?: (string | RegExp)[]): (string | RegExp)[] {
    if (safeBranches) this._safeBranches = safeBranches;

    if (this._safeBranches.length > 0) return this._safeBranches;
    else if (this.parent) return this.parent.safeBranches();
    else return [];
  }

  /**
   * Optionally update the commit prefix, and then return it
   *
   * If a commit prefix has been set for this level, it is returned.
   * If there is no commit prefix, then the parent context is examined.
   * If there is not commit prefix, and no parent, the default is 12
   *
   * @param commitPrefix Optional commit prefix value
   */
  commitPrefix(commitPrefix?: number): number {
    if (commitPrefix) this._commitPrefix = commitPrefix;

    if (this._commitPrefix) return this._commitPrefix;
    else if (this.parent) return this.parent.commitPrefix();
    else return 12;
  }

  /**
   * Optionally update the label for this context, and then return it
   *
   * There is no hierarchical behavior, unlike with defaultBranch or safeBranches above.
   *
   * @param label Optional label for this context
   * @returns Context label, or the name, if no label is defined
   */
  label(label?: string): string {
    if (label) this._label = label;

    if (this._label) return this._label;
    else return this.name();
  }

  pruneOnFetch(pruneOnFetch?: boolean): boolean {
    if (typeof pruneOnFetch === "boolean") this._pruneOnFetch = pruneOnFetch;

    if (typeof this._pruneOnFetch === "boolean") return this._pruneOnFetch;
    else if (this.parent) return this.parent.pruneOnFetch();
    else return false;
  }

  /**
   * Get the project parent path, which is the directory containing the project
   */
  path(): string {
    return path.dirname(this.root);
  }

  /**
   * Get the project name, which is also the name of the final path element
   */
  name(): string {
    return path.basename(this.root);
  }

  /**
   * Return a list of reporting items attached to this context
   */
  abstract getReportItems(): ReportingItem[];
}

export class DirectoryContext extends PathContext {
  private _separator = false;
  private readonly _children: PathContext[] = [];

  constructor(root: string, parent?: DirectoryContext) {
    super(root, parent);
  }

  /**
   * Optionally control the separator status for this context
   *
   * @param separator If true, generate a separator for this context entry
   * @returns whether or not to generate a separator for this context
   */
  separator(separator?: boolean): boolean {
    if (separator) this._separator = separator;
    return this._separator;
  }

  /**
   * Return all the reporting items (repositories and separators) for this context
   */
  getReportItems(): ReportingItem[] {
    const items: ReportingItem[] = [];

    if (this.separator()) items.push(new ReportSeparator(this.label()));
    logger.debug("%s: separator=%s", this.name(), this.separator());

    const childItems: ReportingItem[][] = this._children.map((child) =>
      child.getReportItems(),
    );
    items.push(...childItems.flat());

    return items;
  }

  /**
   * Create a child context from the current context, based on a sub-directory
   *
   * @param name The name of the final path component in the new context (directory name)
   * @param contextFn Callback function for further user configuration
   */
  projects(name: string, contextFn: (context: DirectoryContext) => void): void {
    const childPath = this.root + path.sep + name;
    const childContext = new DirectoryContext(childPath, this);
    contextFn(childContext);

    this._children.push(childContext);
  }

  /**
   * Create a child repository context from the current context.
   *
   * @param name The name of the final path component in the new context (directory name)
   * @param contextFn Callback function for further user configuration
   */
  git(name: string, contextFn?: (context: RepositoryContext) => void): void {
    const childPath = this.root + path.sep + name;
    const childContext = new RepositoryContext(childPath, this);
    if (contextFn) {
      contextFn(childContext);
    }

    this._children.push(childContext);
  }
}

export class RepositoryContext extends PathContext {
  private readonly _parent: DirectoryContext;

  constructor(root: string, parent: DirectoryContext) {
    super(root, parent);

    this._parent = parent;

    // TODO re-factor this into a Git-specific class
    const dotGit = `${this.root}/.git`;
    const dotGitStats = fs.statSync(dotGit);
    if (!dotGitStats.isDirectory()) throw `Not a Git repository: ${this.root}`;
  }

  toNickelProjectConfig(): NickelProjectConfig {
    return {
      name: this.name(),
      path: this.path(),
      defaultBranch: this.defaultBranch(),
      safeBranches: this.safeBranches(),
      commitPrefix: this.commitPrefix(),
      marks: [this._parent.name()],
      pruneOnFetch: this.pruneOnFetch(),
    };
  }

  getReportItems(): ReportingItem[] {
    return [new NickelProject(this.toNickelProjectConfig())];
  }
}

/**
 * Configuration context that provides variables and functions to the config script
 */
export class ConfigContext {
  static reportItems: ReportingItem[] = [];
  static root = "";
  static defaultBranch = "master";
  static safeBranches: (string | RegExp)[] = [];
  static commitPrefix = 12;
  static pruneOnFetch = false;

  /**
   * Set the root for the config context
   * @deprecated
   */
  set root(root: string) {
    ConfigContext.root = root;
  }

  /**
   * Set the default branch for the config context
   * @deprecated
   */
  set defaultBranch(defaultBranch: string) {
    ConfigContext.defaultBranch = defaultBranch;
  }

  /**
   * @deprecated
   */
  set safeBranches(safeBranches: (string | RegExp)[]) {
    ConfigContext.safeBranches = safeBranches;
  }

  /**
   * If true, then fetch operations (e.g. pull) should be called with --prune option
   * @deprecated
   */
  set pruneOnFetch(pruneOnFetch: boolean) {
    ConfigContext.pruneOnFetch = pruneOnFetch;
  }

  /**
   * Register a project definition
   *
   * @deprecated
   * @param {string} name The name of the project, or a full path
   * @param c Configuration
   */
  project(name: string, c?: OptionalConfiguration): void {
    let defaultBranch = ConfigContext.defaultBranch;
    let marks: string[] = [];

    if (c) {
      logger.debug("[%s]: ctxt=%j", name, c);

      if (typeof c.defaultBranch === "string") {
        defaultBranch = c.defaultBranch;
        logger.debug(`[${name}]: defaultBranch=${c.defaultBranch}`);
      }

      if (Array.isArray(c.marks)) {
        marks = c.marks.map((mark: string) => mark.toString());
        logger.debug(`[${name}]: marks=${marks}`);
      }
    }

    ConfigContext.reportItems.push(
      new NickelProject({
        name: name,
        path: ConfigContext.root,
        defaultBranch: defaultBranch,
        safeBranches: ConfigContext.safeBranches,
        commitPrefix: ConfigContext.commitPrefix,
        marks: marks,
        pruneOnFetch: ConfigContext.pruneOnFetch,
      }),
    );
  }

  /**
   * Add a separator row to the summary table
   *
   * @param name Optional label attached to the separator
   * @deprecated
   */
  separator(name = ""): void {
    ConfigContext.reportItems.push(new ReportSeparator(name));
  }

  /**
   * Starting point for context-based configuration (a.k.a. "The New Hot-ness")
   *
   * @param root Filesystem root for projects
   * @param contextFn Callback function for further user configuration
   */
  projectRoot(
    root: string,
    contextFn: (context: DirectoryContext) => void,
  ): void {
    const rootContext = new DirectoryContext(root);
    contextFn(rootContext);
    ConfigContext.reportItems.push(...rootContext.getReportItems());
  }
}
