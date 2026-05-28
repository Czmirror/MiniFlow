import type { User } from "../../domain/user/User.js";
import type { UserRole } from "../../domain/user/User.js";

export interface UserRepository {
  create(input: {
    id: string;
    email: string;
    passwordHash: string;
    displayName?: string | null;
    language?: "ja" | "en";
    teamId?: string;
    role?: UserRole;
    isActive?: boolean;
  }): Promise<User>;
  updateProfile(input: {
    id: string;
    displayName?: string | null;
    language?: "ja" | "en";
    teamId?: string;
    role?: UserRole;
    isActive?: boolean;
  }): Promise<User>;
  updatePassword(input: { id: string; passwordHash: string }): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  list(): Promise<User[]>;
}
