# Nickel: Keep local repositories in sync

Nickel is a tool to keep a bunch of Git repositories in sync, and to run certain common
maintenance operations across those repositories.

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
root = 'c:/Dev/Lexipol';
defaultBranch = 'develop';

project('project-base', {build: true});
project('project-commons');
project('project-service');

separator(); // Draw a horizontal line in all reports
project('thing-base', {build: true});
project('thing-commons');
project('thing-service');

separator();
defaultBranch = 'master';
project('ops-project');
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

  -V, --version              output the version number
  --config <config>          Configuration file
  --projects <projects>      List of projects
  --level <level>            Log level
  -h, --help                 output usage information

Commands:

  sync                       Sync all projects
  report                     Local repository report
  build                      Build all projects
  cleanup                    Retire unused branches
  mergeReport <reportFile>   Generate a merged branches report
  guidedRemove <reportFile>  Remove branches based on a merged branches report
```

The most common form of the command is `nickel sync`. This will sync all the repositories listed
in the config file.

Any list of commands may be listed, though they will be run in a fixed order, rather than in
command-line order.

### report

Generates a project report. Here's an example:

```
╔═══════════════════════════╤════════════════════╤═══════╤═════════╗
║ Project                   │ Branch             │ # Mod │ Commit  ║
╟───────────────────────────┼────────────────────┼───────┼─────────╢
║ service-project-b-base    │ Feature/FOOBAR-456 │ 0     │ ca14608 ║
║ project-a-commons         │ Feature/FOOBAR-456 │ 0     │ 661cc1d ║
║ project-a-service         │ Feature/FOOBAR-456 │ 0     │ 1a85852 ║
║ service-project-b-commons │ Feature/FOOBAR-456 │ 0     │ 7f5784a ║
║ service-project-b-service │ Feature/FOOBAR-456 │ 0     │ 5c5e360 ║
╚═══════════════════════════╧════════════════════╧═══════╧═════════╝
```

| Column Name | Description |
| ---         | --- |
| Project     | The name of the project |
| Branch      | Current branch for the project |
| # Mod       | Count of modified files in the project workspace |
| Commit      | Latest commit ID on the current branch |

### sync

Sync all projects and report on the results:

```
╔═══════════════════════════╤════════════════════╤═════════╤══════════════╗
║ Project                   │ Branch             │ Updated │ Status       ║
╟───────────────────────────┼────────────────────┼─────────┼──────────────╢
║ service-project-b-base    │ Feature/FOOBAR-456 │ 0       │ sync-success ║
║ project-a-commons         │ Feature/FOOBAR-456 │ 0       │ sync-success ║
║ project-a-service         │ Feature/FOOBAR-456 │ 2       │ sync-success ║
║ service-project-b-commons │ Feature/FOOBAR-456 │ 0       │ sync-success ║
║ service-project-b-service │ Feature/FOOBAR-456 │ 0       │ sync-success ║
╚═══════════════════════════╧════════════════════╧═════════╧══════════════╝
```

| Column Name | Description |
| ---         | --- |
| Project     | The name of the project |
| Branch      | Current branch for the project |
| Updated     | Count of files that were updated during the sync operation |
| Status      | Overall result of the sync for this project |

Here are the meanings of the status values:

| Status | Description |
| ---    | --- |
| sync-success | Success |
| sync-failure | Failure |
| sync-new     | Nothing happened - this indicates a bug in nickel |

### cleanup

Cleanup all projects that are not on their "default" branch:

```
╔═══════════════════════════╤═════════════════════╤═══════════════╗
║ Project                   │ Branch              │ Status        ║
╟───────────────────────────┼─────────────────────┼───────────────╢
║ service-project-a-base    │ Feature/FOOBAR-1111 │ clean-success ║
║ service-project-a-commons │ Feature/FOOBAR-1111 │ clean-success ║
║ service-project-a-service │ Feature/FOOBAR-1111 │ clean-success ║
╟───────────────────────────┼─────────────────────┼───────────────╢
║ prj-client-web            │ develop             │ clean-skip    ║
║ ops-kubernetes-clusters   │ develop             │ clean-skip    ║
║ ops-jenkins-docker        │ master              │ clean-skip    ║
╚═══════════════════════════╧═════════════════════╧═══════════════╝
```

| Column Name | Description |
| ---         | --- |
| Project     | The name of the project |
| Branch      | Current branch for the project, before cleanup |
| Status      | Overall result for the cleanup operation |

Here are the meanings of the status values:

| Status | Description |
| ---    | --- |
| clean-skip | The project was not cleaned (already on the default branch) |
| clean-dirty | The project is not on the default branch, but the repository is dirty |
| clean-success | Cleanup operation succeeded |
| clean-failure | Cleanup operation was attempted, but failed |

### build

Build all projects that have a defined build system:

```
╔═══════════════════════════╤══════╤════════════════════╤═════════╤═══════════════╤══════════════════════════╗
║ Project                   │ Type │ Branch             │ Commit  │ Status        │ Message                  ║
╟───────────────────────────┼──────┼────────────────────┼─────────┼───────────────┼──────────────────────────╢
║ service-project-a-base    │ mvn  │ Feature/FOOBAR-456 │ ca14608 │ build-failure │ There are test failures. ║
║ project-b-commons         │ none │ Feature/FOOBAR-456 │ 661cc1d │ build-nope    │                          ║
║ project-b-service         │ none │ Feature/FOOBAR-456 │ fa053ca │ build-nope    │                          ║
║ service-project-a-commons │ none │ Feature/FOOBAR-456 │ 263be7c │ build-nope    │                          ║
║ service-project-a-service │ none │ Feature/FOOBAR-456 │ 4998a09 │ build-nope    │                          ║
╚═══════════════════════════╧══════╧════════════════════╧═════════╧═══════════════╧══════════════════════════╝
```

| Column Name | Description |
| ---         | --- |
| Project     | The name of the project |
| Type        | What kind of build system (`none` or `mvn`) |
| Branch      | Current branch for the project |
| Commit      | Latest commit ID on the current branch |
| Status      | Overall result of the build for this project |
| Message     | For build failures, an indicator of what happened |

Here are the meanings of the status values:

| Status | Description |
| ---    | --- |
| build-success | Success |
| build-failure | Failure |
| build-nope    | Project has no build step |

### mergedReport

Identify merged branches and generate a report.

No example report, in this case, but here are the report columns:

| Column Name  | Description |
| ---          | --- |
| Project      | The name of the project |
| Status       | Overall result of the merge operation |
| # Candidates | List of branches identified as candidates for removal |

Here are the status values:

| Status | Description |
| ---    | --- |
| merge-report-success | Successful merged branch identification |
| merge-report-failure | The merge failed - see the log |

### guidedRemove

Based on a merge branch report, remove selected branches.

The report structure looks like this:

| Column Name | Description |
| --- | --- |
| Project   | The name of the project |
| Branch    | Current branch for the project |
| Status    | Overall status of merging for this project |
| # Kept    | How many branches from the report were kept |
| # Removed | How many branches form the report were removed |

Here are the status values:

| Status | Description |
| --- | --- |
| guided-merge-success | Successfully completed at least one merge for the project |
| guided-merge-failure | Unable to merge any branches for this project |
| guided-merge-skipped | Skipped the project because there was nothing to do |
| guided-merge-dirty   | The work space was dirty, so no branch manipulation was possible |
| guided-merge-working | The work space was already on a branch, so no branches were targeted |
