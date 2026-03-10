export type HealthResponse = {
  status: "ok";
  service: "api";
  db: "connected" | "disconnected";
};
