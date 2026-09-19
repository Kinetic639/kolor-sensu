# Mock API

This package owns transport-level mocks built with MSW. Its handlers may return
canonical fixtures from `@repo/mock-data`, but fixture definitions stay in the
mock-data package.

Import `@repo/mock-api/server` in Vitest or Node-based tests and
`@repo/mock-api/browser` only when an application explicitly enables browser
mocking. Current placeholder pages do not start MSW automatically.
