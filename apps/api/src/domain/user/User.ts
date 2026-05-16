/**
 * User is intentionally small for the first authentication slice. Add roles or
 * team membership later without leaking transport concerns into request workflow code.
 */
export class User {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(params: {
    id: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = params.id;
    this.email = params.email;
    this.passwordHash = params.passwordHash;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;

    if (this.email.trim().length === 0) {
      throw new Error("email must not be empty");
    }
  }
}
