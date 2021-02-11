# Nickel: Keep local repositories in sync

Nickel is a tool to keep a bunch of Git repositories in sync, and to run certain common
maintenance operations across those repositories.

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

## Install

```bash
npm install -g nickel-scm
```

### Test

```bash
nickel --help
```

This should give the standard help message for nickel.

### Configure

Configuration is done using a JS configuration file. The default location of this file is

`${HOME}/nickel.js`

The content of this file is a series of project declarations. For example:

```javascript
root = "c:/Dev/Lexipol";
defaultBranch = "develop";

project("project-base");
project("project-commons");
project("project-service");

// All of the "thing" projects share a mark
separator(); // Draw a horizontal line in all reports
project("thing-base", { marks: ["thing"] });
project("thing-commons", { marks: ["thing"] });
project("thing-service", { marks: ["thing"] });

separator("Ops"); // Draw a horizontal line, labeled with the word 'Ops'
defaultBranch = "master";
project("ops-project");
```

The first line declares where the projects live. If you have projects in multiple locations,
root can be changed in the middle of the file and will be picked up by subsequent calls to
`project(...)`.

## Run

Here's the standard help message.

```
Usage: nickel [options] [command]

nickel-scm: Manage local Git repositories

Options:
  -V, --version                   output the version number
  --config <config>               Configuration file
  --projects <projects>           List of projects
  --active-branch <activeBranch>  Select projects with this active branch
  --level <level>                 Log level
  --mark <mark>                   Select projects with this mark
  -h, --help                      output usage information

Commands:
  sync                            Sync all projects
  report                          Local repository report
  cleanup                         Retire unused branches
  mergedReport <reportFile>       Generated a merged branches report
  guidedRemove <reportFile>       Remove branches based on a merged branches report
  oldBranches <reportFile> [age]  Generate a list of branches older than a certain age
```

The most common form of the command is `nickel sync`. This will sync all the repositories listed
in the config file.

Any list of commands may be listed, though they will be run in a fixed order, rather than in
command-line order.

### Selecting projects

There are two command-line options that allow you to select the list of projects to run against:

| Option            | Description                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `--projects`      | Select projects by name (if there are duplicates, this will select all matching projects)   |
| `--active-branch` | Select projects by active branch (this will query each project as part of project selection |

### report

Generates a project report. Here's an example:

```
╔═══════════════════════════╤════════════════════╤═══════╤═════════╤═══════╗
║                   Project │             Branch │ # Mod │  Commit │ Marks ║
╟───────────────────────────┼────────────────────┼───────┼─────────┼───────╢
║    service-project-b-base │ Feature/FOOBAR-456 │     0 │ ca14608 │     a ║
║         project-a-commons │ Feature/FOOBAR-456 │     0 │ 661cc1d │     b ║
║         project-a-service │ Feature/FOOBAR-456 │     0 │ 1a85852 │       ║
║ service-project-b-commons │ Feature/FOOBAR-456 │     0 │ 7f5784a │       ║
║ service-project-b-service │ Feature/FOOBAR-456 │     0 │ 5c5e360 │       ║
╚═══════════════════════════╧════════════════════╧═══════╧═════════╧═══════╝
```

| Column Name | Description                                               |
| ----------- | --------------------------------------------------------- |
| Project     | The name of the project                                   |
| Branch      | Current branch for the project                            |
| # Mod       | Count of modified files in the project workspace          |
| Commit      | Latest commit ID on the current branch                    |
| Marks       | Comma-separated list of marks associated with the project |

### sync

Sync all projects and report on the results:

```
╔═══════════════════════════╤════════════════════╤═════════╤══════════════╗
║                   Project │             Branch │ Updated │       Status ║
╟───────────────────────────┼────────────────────┼─────────┼──────────────╢
║    service-project-b-base │ Feature/FOOBAR-456 │       0 │ sync-success ║
║         project-a-commons │ Feature/FOOBAR-456 │       0 │ sync-success ║
║         project-a-service │ Feature/FOOBAR-456 │       2 │ sync-success ║
║ service-project-b-commons │ Feature/FOOBAR-456 │       0 │ sync-success ║
║ service-project-b-service │ Feature/FOOBAR-456 │       0 │ sync-success ║
╚═══════════════════════════╧════════════════════╧═════════╧══════════════╝
```

| Column Name | Description                                                |
| ----------- | ---------------------------------------------------------- |
| Project     | The name of the project                                    |
| Branch      | Current branch for the project                             |
| Updated     | Count of files that were updated during the sync operation |
| Status      | Overall result of the sync for this project                |

Here are the meanings of the status values:

| Status       | Description                                       |
| ------------ | ------------------------------------------------- |
| sync-success | Success                                           |
| sync-failure | Failure                                           |
| sync-new     | Nothing happened - this indicates a bug in nickel |

### cleanup

Cleanup all projects that are not on their "default" branch:

```
╔═══════════════════════════╤═════════════════════╤═══════════════╗
║                   Project │              Branch │        Status ║
╟───────────────────────────┼─────────────────────┼───────────────╢
║    service-project-a-base │ Feature/FOOBAR-1111 │ clean-success ║
║ service-project-a-commons │ Feature/FOOBAR-1111 │ clean-success ║
║ service-project-a-service │ Feature/FOOBAR-1111 │ clean-success ║
╟───────────────────────────┼─────────────────────┼───────────────╢
║            prj-client-web │             develop │    clean-skip ║
║   ops-kubernetes-clusters │             develop │    clean-skip ║
║        ops-jenkins-docker │              master │    clean-skip ║
╚═══════════════════════════╧═════════════════════╧═══════════════╝
```

| Column Name | Description                                    |
| ----------- | ---------------------------------------------- |
| Project     | The name of the project                        |
| Branch      | Current branch for the project, before cleanup |
| Status      | Overall result for the cleanup operation       |

Here are the meanings of the status values:

| Status        | Description                                                           |
| ------------- | --------------------------------------------------------------------- |
| clean-skip    | The project was not cleaned (already on the default branch)           |
| clean-dirty   | The project is not on the default branch, but the repository is dirty |
| clean-success | Cleanup operation succeeded                                           |
| clean-failure | Cleanup operation was attempted, but failed                           |

### mergeReport

Identify merged branches and generate a report.

No example report, in this case, but here are the report columns:

| Column Name  | Description                                           |
| ------------ | ----------------------------------------------------- |
| Project      | The name of the project                               |
| Status       | Overall result of the merge operation                 |
| # Candidates | List of branches identified as candidates for removal |

Here are the status values:

| Status               | Description                             |
| -------------------- | --------------------------------------- |
| merge-report-success | Successful merged branch identification |
| merge-report-failure | The merge failed - see the log          |

### guidedRemove

Based on a merge branch report, remove selected branches.

The report structure looks like this:

| Column Name | Description                                    |
| ----------- | ---------------------------------------------- |
| Project     | The name of the project                        |
| Branch      | Current branch for the project                 |
| Status      | Overall status of merging for this project     |
| Kept        | How many branches from the report were kept    |
| Removed     | How many branches form the report were removed |

Here are the status values:

| Status               | Description                                                          |
| -------------------- | -------------------------------------------------------------------- |
| guided-merge-success | Successfully completed at least one merge for the project            |
| guided-merge-failure | Unable to merge any branches for this project                        |
| guided-merge-skipped | Skipped the project because there was nothing to do                  |
| guided-merge-dirty   | The work space was dirty, so no branch manipulation was possible     |
| guided-merge-working | The work space was already on a branch, so no branches were targeted |

# Develop

Some handy commands to run when developing and releasing nickel.

## Building Locally

```bash
npm run build && npm install -g
```

## Tests

Run unit tests:
```bash
npm run test
```

Run unit tests with coverage:
```bash
npm run coverage
```

## Release

```bash
npm version patch && npm run build && npm publish
```

## Future Plans

These are features I have in mind for the future. I have no schedule for getting to them.

- Expand the marks feature to make it more robust
  - Implicit marking based on filesystem location
  - Implicit marking based on project inspection
  - Default marks similar to current filesystem root
- Create and push a branch across projects
- Check out an existing remote branch across projects

### Configuration

Nested configuration around folders. Here's a proposed bit of example configuration:
```javascript
root("/home/bredmold/Projects", projectsDir => {
  projectsDir.repositoryDir("work", work => {
    work.label("Company Name");
    work.git("models");
    work.git("service-impl", repo => {
      repo.label("Service Implementation");
    });
    work.svn("legacy-service");
  });

  projectsDir.repositoryDir("personal", personal => {
    personal.label("Personal Projects");
    personal.addRepositories();
  });
});
```

There's a lot to unpack in this example

* Function `root()`
    * Accepts an argument giving the filesystem path of a project root
    * Accepts a second argument that is a callback function with one argument
        * Argument `projectsDir` is an object that hold configuration context
    * Method `repositoryDir()` recurses into a sub-directory containing more projects
        * The method implicitly creates a separator in the report
        * Accepts a directory name, and a callback function as arguments
        * The callback function takes a context argument
    * Method `git()` declares a Git repository, taking an argument with the directory name
        * Optional second argument is a callback function that takes a config context
    * Method `svn()` declares a SubVersion repository
        * Similar to Git, it takes an optional callback function for additional configuration
        * This is the *most* aspirational item in the proposed configuration (supporting non-Git VCS)

Note that the resulting table display will still not be hierarchichal. Here's the expectation
```
╔═════════════════════════╤═════════╤═════════╤══════════════╗
║                 Project │  Branch │ Updated │       Status ║
╟─ Company Name ──────────┼─────────┼─────────┼──────────────╢
║                  models │  master │       0 │ sync-success ║
║  Service Implementation │ PRJ-123 │       1 │ sync-success ║
║          legacy-service │  master │      12 │ sync-success ║
╟─ Personal Projects ─────┼─────────┼─────────┼──────────────╢
║        found-repository │ develop │       0 │ sync-success ║
╚═════════════════════════╧═════════╧═════════╧══════════════╝
```

### Combined Search for Branches

Instead of having different specialized reports for branches, have a branch searching feature that can apply various criteria. Ideally, the feature optimizes certain requests "under the hood", in order to search efficiently when Git already supplies the desired search.

```bash
nickel branches --merged --report=merged.json # Search for merged branches, and save the result to merged.json
nickel branches --old --days=60               # Search for branches at least 60 days old, with no saved report (only stdout)
nickel branches --email='bredmold@gmail.com'  # Branches with an author email or committer email equal to bredmold@gmail.com
```

The report feature generates a JSON document suitable for use with the [guidedRemove](#guidedRemove) command.

This is a generalization of some existing features.
