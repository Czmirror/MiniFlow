# MiniFlow hot

Last Reviewed: 2026-05-16
TTL: 7d

## Current Focus
Approval lifecycle consistency.

## Current Work
- reviewing Rejected -> Draft transition
- adding or adjusting domain tests
- validating Request aggregate consistency

## Current Constraints
- approvals are insert-only
- Approved state must have exactly one Approved entry
- Rejected state may have one or more Rejected entries
- revise() can move Rejected -> Draft
- revise() preserves approval history
- Approved is terminal

## Current Risks
- status and approval history may drift
- duplicate approval decisions by the same actor
- Deleted status and deletedAt may become inconsistent
- use cases may bypass domain rules

## Active Areas
- domain state transitions
- approval decision rules
- Request aggregate
- domain tests
- application use cases only when needed

## Ignore For Now
- LINE integration
- notification system
- advanced user management
- deployment optimization
- UI polish