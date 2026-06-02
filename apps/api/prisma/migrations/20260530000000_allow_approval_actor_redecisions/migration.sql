-- Re-submitted requests keep prior rejection history on the same request.
-- The same approver may decide again in a later submission round.
DROP INDEX IF EXISTS "approvals_requestId_actedBy_key";
