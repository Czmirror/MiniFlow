export type HealthResponse = {
  status: "ok";
  service: "api";
  db: "connected" | "disconnected";
};

export type CreateRequestInput = {
  teamId: string;
  title: string;
  body: string;
};

export type RequestStatus = "Draft" | "Pending" | "Approved" | "Rejected" | "Deleted";

export type RequestDto = {
  id: string;
  teamId: string;
  createdBy: string;
  title: string;
  body: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ApprovalDto = {
  id: string;
  requestId: string;
  actedBy: string;
  actionType: "Approved" | "Rejected";
  reason: string | null;
  createdAt: string;
};

export type RequestDetailDto = {
  request: RequestDto;
  approvals: ApprovalDto[];
};

export type RegisterInput = {
  email: string;
  password: string;
};

export type LoginInput = RegisterInput;

export type AuthUserDto = {
  id: string;
  email: string;
};

export type AuthMeDto = AuthUserDto;

export type CsrfTokenDto = {
  csrfToken: string;
};

export type ListRequestsInput = {
  teamId: string;
  status?: RequestStatus;
  includeDeleted?: boolean;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export type ListRequestsResponse = {
  items: RequestDto[];
  page: number;
  limit: number;
  total: number;
};
