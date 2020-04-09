So, you want to contribute code back to `nickel`? It warms my heart. Here are some things you need to know.

# Build

```bash
npm run build
```

I have to admit that I'm not sure how other node projects do it. I use the above command to run my build. In a better world, I would have written good unit tests, as well. Perhaps that will be one of my future projects for `nickel`.

# Test

Tests are written using [Jest](https://jestjs.io/en/) and [ts-jest](https://github.com/kulshekhar/ts-jest).

Not all of the features are fully tested, but here's a rough breakdown of test coverage for each major component.

## Coverage Reporting

To generate a coverage report:
```bash
npm run coverage
```

Please do look at test coverage for new features as you add them.

## Testing Breakdown

### sync

Sync is pretty much fully covered. Certain error paths are missing, but unit test coverage is solid. This is also the core component, and I use it at least daily.

### report

This is in a similar testing state to `sync` above. Good testing coverage, and used in my daily development process.

### cleanup

This is frequently used, and has good test coverage.

### mergedReport

The branch reporting features are less well tested than the core `sync`, `report`, and `cleanup` features. There is only limited unit test coverage here. Please feel free to contribute!

### guidedRemove

As with `mergedReport`, there is limited test coverage for this feature.

### oldBranches

See above. This is the newest, and least well-tested feature in the application.

# Contribute

I welcome contributions. Since this is something I do in my Copious Free Time, I can't really make promises as to when I'll have time to review pull requests.
