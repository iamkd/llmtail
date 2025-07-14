# Changelog

## v0.2.1

Date: 2025-07-15

### Patch Changes

- Incorrect build script was used to publish the previous version, which caused the CLI to not work properly. This version fixes the build script and ensures the CLI works as expected.
- Fixed the early return in the collection endpoint to ensure it writes the whole batch.
- Use `util.inspect` to format the logs in a more readable way.

## v0.2.0

Date: 2025-07-14

### Minor Changes

- Added IIFE global script at `@llmtail/browser/global` for easier usage in the browser (e.g. through unpkg).
- Asyncified the server instead of relying on callbacks.
- Split the files for better testing/reimporting.
- Fixed the tsconfig.

## v0.1.1

Date: 2025-07-13

### Minor Changes

- Added README files for `@llmtail/cli`, `@llmtail/browser`, and `@llmtail/core` packages.
- Added basic changelog.

## v0.1.0

Date: 2025-07-12

### Major Changes

- Initial release of `llmtail` CLI, browser, and core packages.