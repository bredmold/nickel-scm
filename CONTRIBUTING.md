So, you want to contribute code back to `nickel`? It warms my heart. Here are some things you need to know.

# Build

```bash
npm run build
```

I have to admit that I'm not sure how other node projects do it. I use the above command to run my build.
In a better world, I would have written good unit tests, as well. Perhaps that will be one of my future projects
for `nickel`.

# Test

Despite the fact that I have very little automated testing, I use the tool on a daily basis, which means many
of the features are quite well tested. Here's a rough breakdown of the pieces, and how well tested they are
in the real world.

## Testing Breakdown

### sync

This is the core. I use this constantly. It's very well tested.

### report

Also well tested from routine use.

### cleanup

Less well tested, but still used frequently.

### build

This could be broken, for all I know. I almost never use it.

## Jasmine

While the automated tests are woefully inadquate, please do feel free to contribute appropriate unit tests
with your PR, written against the Jasmine testing API.

# Contribute

I welcome contributions. Since this is something I do in my Copious Free Time, I can't really make promises
as to when I'll have time to review pull requests.
