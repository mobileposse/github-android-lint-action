# Github Android Lint Action

This action runs a Gradle Lint check on all files in the repo and creates a Github [Check Run](https://developer.github.com/v3/checks/runs/) report with the results.

## Inputs

### `repo_token`

**Required** Github token to use for creating the check run

## Example usage

```yaml
name: Android Lint
on:
  push:
jobs:
  lint:
    name: Lint Check
    runs-on: ubuntu-18.04
    container: mobileposse/dev:latest
    steps:
      - name: Checkout
        uses: actions/checkout@v1
      - name: Lint
        uses: mobileposse/github-android-lint-action@v1
        with:
          repo_token: ${{ secrets.GITHUB_TOKEN }}
```

## Publishing

Compile a version of `index.js` that includes all dependencies

```
npx ncc build dist/index.js -o lib
```

## Local Testing

```
INPUT_REPO_TOKEN='your token here' GITHUB_REPOSITORY='org/repo' node lib/index.js
```
