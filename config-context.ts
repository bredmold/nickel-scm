/**
 * Configuration context that provides variables and functions to the config script
 */
import {NickelProject} from "./nickel-project";

export class ConfigContext {
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
     */
    project(name: string) {
        ConfigContext.projects.push(new NickelProject(name, ConfigContext.root));
    }
}