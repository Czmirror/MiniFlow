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
