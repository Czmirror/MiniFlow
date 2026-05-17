-- Prevent the same actor from recording multiple approval decisions on one request.
CREATE UNIQUE INDEX "approvals_requestId_actedBy_key" ON "approvals"("requestId", "actedBy");
