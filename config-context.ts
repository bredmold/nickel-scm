/**
 * Configuration context that provides variables and functions to the config script
 */
import {NickelProject} from "./nickel-project";

export class ConfigContext {
    static separators: number[] = [];
    static projects: NickelProject[] = [];
    static root: string = '';

    /**
     * Set the root for the config context
     */
    set root(root: string) {
        ConfigContext.root = root;
    }

    /**
     * Register a project definition
     *
     * @param {string} name The name of the project, or a full path
     * @param c Configuration
     */
    project(name: string, c: any) {
        ConfigContext.projects.push(new NickelProject({
            name: name,
            path: ConfigContext.root,
            build: (c && c.build) || undefined,
        }));
    }

    separator() {
        ConfigContext.separators.push(ConfigContext.projects.length);
    }
}