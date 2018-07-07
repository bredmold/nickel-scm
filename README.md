# Nickel: Keep local repositories in sync

Nickel is a tool to keep a bunch of Git repositories in sync, and to run certain common
maintenance operations across those repositories.

## Install

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
  Usage: nickel [options] <cmd...>

  Options:

    --config <config>  Configuration file
    -h, --help         output usage information
```

The most common form of the command is `nickel sync`. This will sync all the repositories listed
in the config file.

Any list of commands may be listed, though they will be run in a fixed order, rather than in
command-line order.

### report

Generates a project report. Here's an example:

```
╔═════════════════════════════════╤════════════════════╤═══════╤═════════╗
║ Project                         │ Branch             │ # Mod │ Commit  ║
╟─────────────────────────────────┼────────────────────┼───────┼─────────╢
║ kms-parent-child-agency-base    │ Feature/NEXGEN-892 │ 0     │ ca14608 ║
║ kms-agency-commons              │ Feature/NEXGEN-892 │ 0     │ 661cc1d ║
║ kms-agency-service              │ Feature/NEXGEN-892 │ 0     │ 1a85852 ║
║ kms-parent-child-agency-commons │ Feature/NEXGEN-892 │ 0     │ 7f5784a ║
║ kms-parent-child-agency-service │ Feature/NEXGEN-892 │ 0     │ 5c5e360 ║
╚═════════════════════════════════╧════════════════════╧═══════╧═════════╝
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
╔═════════════════════════════════╤════════════════════╤═════════╤══════════════╗
║ Project                         │ Branch             │ Updated │ Status       ║
╟─────────────────────────────────┼────────────────────┼─────────┼──────────────╢
║ kms-parent-child-agency-base    │ Feature/NEXGEN-892 │ 0       │ sync-success ║
║ kms-agency-commons              │ Feature/NEXGEN-892 │ 0       │ sync-success ║
║ kms-agency-service              │ Feature/NEXGEN-892 │ 2       │ sync-success ║
║ kms-parent-child-agency-commons │ Feature/NEXGEN-892 │ 0       │ sync-success ║
║ kms-parent-child-agency-service │ Feature/NEXGEN-892 │ 0       │ sync-success ║
╚═════════════════════════════════╧════════════════════╧═════════╧══════════════╝
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
╔════════════════════════════════════╤═════════════════════╤═══════════════╗
║ Project                            │ Branch              │ Status        ║
╟────────────────────────────────────┼─────────────────────┼───────────────╢
║ service-project-a-base             │ Feature/FOOBAR-1111 │ clean-success ║
║ service-project-a-commons          │ Feature/FOOBAR-1111 │ clean-success ║
║ service-project-a-service          │ Feature/FOOBAR-1111 │ clean-success ║
╟────────────────────────────────────┼─────────────────────┼───────────────╢
║ prj-client-web                     │ develop             │ clean-skip    ║
║ ops-kubernetes-clusters            │ develop             │ clean-skip    ║
║ ops-jenkins-docker                 │ master              │ clean-skip    ║
╚════════════════════════════════════╧═════════════════════╧═══════════════╝
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
╔═════════════════════════════════╤══════╤════════════════════╤═════════╤═══════════════╤══════════════════════════╗
║ Project                         │ Type │ Branch             │ Commit  │ Status        │ Message                  ║
╟─────────────────────────────────┼──────┼────────────────────┼─────────┼───────────────┼──────────────────────────╢
║ kms-parent-child-agency-base    │ mvn  │ Feature/NEXGEN-892 │ ca14608 │ build-failure │ There are test failures. ║
║ kms-agency-commons              │ none │ Feature/NEXGEN-892 │ 661cc1d │ build-nope    │                          ║
║ kms-agency-service              │ none │ Feature/NEXGEN-892 │ fa053ca │ build-nope    │                          ║
║ kms-parent-child-agency-commons │ none │ Feature/NEXGEN-892 │ 263be7c │ build-nope    │                          ║
║ kms-parent-child-agency-service │ none │ Feature/NEXGEN-892 │ 4998a09 │ build-nope    │                          ║
╚═════════════════════════════════╧══════╧════════════════════╧═════════╧═══════════════╧══════════════════════════╝
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
