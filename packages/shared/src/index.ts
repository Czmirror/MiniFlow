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
  displayName?: string;
  language?: "ja" | "en";
  teamId?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthUserDto = {
  id: string;
  email: string;
  displayName: string | null;
  language: "ja" | "en";
  teamId: string;
  isActive: boolean;
};

export type AuthMeDto = AuthUserDto;

export type CsrfTokenDto = {
  csrfToken: string;
};

export type UpdateAccountInput = {
  displayName?: string | null;
  language?: "ja" | "en";
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type UserManagementDto = AuthUserDto & {
  createdAt: string;
  updatedAt: string;
};

export type CreateUserInput = {
  email: string;
  password: string;
  displayName?: string | null;
  language?: "ja" | "en";
  teamId: string;
};

export type UpdateUserInput = {
  displayName?: string | null;
  language?: "ja" | "en";
  teamId?: string;
  isActive?: boolean;
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
