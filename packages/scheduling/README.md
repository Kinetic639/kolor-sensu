# Scheduling

This package is reserved for framework-agnostic calendar and scheduling logic.
It may depend on `@repo/contracts`, but must not own UI, persistence, booking flows,
or application-specific policy.

Persist future backend instants in UTC and format them in the configured display
timezone. Shared date calculations belong here instead of being scattered across
components. DnD Kit is available for future calendar interaction adapters, but
domain scheduling state must remain independent from drag-and-drop event shapes.
