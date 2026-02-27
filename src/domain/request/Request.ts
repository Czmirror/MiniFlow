import type { Status } from "./Status";

export class Request {
  status: Status = "Draft";

  submit(): void {
    if (this.status !== "Draft") {
      throw new Error("409");
    }
    this.status = "Pending";
  }
}
