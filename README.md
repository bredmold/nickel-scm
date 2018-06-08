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

project('kms-parent-child-agency-base');
project('kms-agency-commons');
project('kms-agency-service');
project('kms-parent-child-agency-commons');
project('kms-parent-child-agency-service');
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

