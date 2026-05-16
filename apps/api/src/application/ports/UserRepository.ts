import type { User } from "../../domain/user/User.js";

export interface UserRepository {
  create(input: { id: string; email: string; passwordHash: string }): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}
