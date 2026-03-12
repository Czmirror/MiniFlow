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

export type RequestDto = {
  id: string;
  teamId: string;
  createdBy: string;
  title: string;
  body: string;
  status: "Draft";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
