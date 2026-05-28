/**
 * User is intentionally small for the first authentication slice. Add roles or
 * team membership later without leaking transport concerns into request workflow code.
 */
export class User {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly displayName: string | null;
  readonly language: "ja" | "en";
  readonly teamId: string;
  readonly role: UserRole;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(params: {
    id: string;
    email: string;
    passwordHash: string;
    displayName?: string | null;
    language?: string;
    teamId?: string;
    role?: string;
    isActive?: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = params.id;
    this.email = params.email;
    this.passwordHash = params.passwordHash;
    this.displayName = params.displayName ?? null;
    this.language = normalizeLanguage(params.language);
    this.teamId = params.teamId ?? "team-1";
    this.role = normalizeRole(params.role);
    this.isActive = params.isActive ?? true;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;

    if (this.email.trim().length === 0) {
      throw new Error("email must not be empty");
    }
    if (this.teamId.trim().length === 0) {
      throw new Error("teamId must not be empty");
    }
  }
}

export type UserRole = "Applicant" | "Approver" | "Admin";

function normalizeLanguage(language: string | undefined): "ja" | "en" {
  if (language === "en") {
    return "en";
  }

  return "ja";
}

function normalizeRole(role: string | undefined): UserRole {
  if (role === "Approver" || role === "Admin") {
    return role;
  }

  return "Applicant";
}
