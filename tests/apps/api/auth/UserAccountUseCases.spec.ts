import { describe, expect, it } from "vitest";
import { changePassword } from "../../../../apps/api/src/application/auth/ChangePassword";
import { loginUser } from "../../../../apps/api/src/application/auth/LoginUser";
import { updateAccount } from "../../../../apps/api/src/application/auth/UpdateAccount";
import { updateUser } from "../../../../apps/api/src/application/auth/UpdateUser";
import type { UserRepository } from "../../../../apps/api/src/application/ports/UserRepository";
import { InputValidationError } from "../../../../apps/api/src/application/errors/InputValidationError";
import { User } from "../../../../apps/api/src/domain/user/User";
import { hashPassword } from "../../../../apps/api/src/infrastructure/auth/password";

describe("apps/api account and user use cases", () => {
  it("updates display name and language preference", async () => {
    const repository = new InMemoryUserRepository();
    repository.seed(await createUser({ id: "user-1", email: "user@example.com" }));

    const updated = await updateAccount(repository, {
      userId: "user-1",
      displayName: "山田 太郎",
      language: "en"
    });

    expect(updated?.displayName).toBe("山田 太郎");
    expect(updated?.language).toBe("en");
  });

  it("changes password only when current password matches", async () => {
    const repository = new InMemoryUserRepository();
    repository.seed(await createUser({ id: "user-1", email: "user@example.com", password: "password1234" }));

    await changePassword(repository, {
      userId: "user-1",
      currentPassword: "password1234",
      newPassword: "newpassword1234"
    });

    await expect(
      loginUser(repository, { email: "user@example.com", password: "newpassword1234" })
    ).resolves.toMatchObject({ id: "user-1" });
  });

  it("rejects login for disabled users", async () => {
    const repository = new InMemoryUserRepository();
    repository.seed(
      await createUser({
        id: "user-1",
        email: "user@example.com",
        isActive: false
      })
    );

    await expect(
      loginUser(repository, { email: "user@example.com", password: "password1234" })
    ).rejects.toBeInstanceOf(InputValidationError);
  });

  it("normalizes legacy blank team ids to the default team", async () => {
    const repository = new InMemoryUserRepository();
    repository.seed(await createUser({ id: "user-1", email: "user@example.com", teamId: " " }));

    const user = await loginUser(repository, { email: "user@example.com", password: "password1234" });

    expect(user.teamId).toBe("team-1");
  });

  it("updates user management fields", async () => {
    const repository = new InMemoryUserRepository();
    repository.seed(await createUser({ id: "user-1", email: "user@example.com" }));

    const updated = await updateUser(repository, {
      id: "user-1",
      displayName: "承認者",
      language: "ja",
      teamId: "team-2",
      isActive: false
    });

    expect(updated).toMatchObject({
      displayName: "承認者",
      language: "ja",
      teamId: "team-2",
      isActive: false
    });
  });
});

class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  seed(user: User): void {
    this.users.set(user.id, user);
  }

  async create(input: {
    id: string;
    email: string;
    passwordHash: string;
    displayName?: string | null;
    language?: "ja" | "en";
    teamId?: string;
    isActive?: boolean;
  }): Promise<User> {
    const user = new User({
      ...input,
      createdAt: new Date("2026-05-22T00:00:00.000Z"),
      updatedAt: new Date("2026-05-22T00:00:00.000Z")
    });
    this.seed(user);
    return user;
  }

  async updateProfile(input: {
    id: string;
    displayName?: string | null;
    language?: "ja" | "en";
    teamId?: string;
    isActive?: boolean;
  }): Promise<User> {
    const current = this.users.get(input.id);
    if (!current) {
      throw new Error("missing user");
    }

    return this.create({
      id: current.id,
      email: current.email,
      passwordHash: current.passwordHash,
      displayName: input.displayName === undefined ? current.displayName : input.displayName,
      language: input.language ?? current.language,
      teamId: input.teamId ?? current.teamId,
      isActive: input.isActive ?? current.isActive
    });
  }

  async updatePassword(input: { id: string; passwordHash: string }): Promise<User> {
    const current = this.users.get(input.id);
    if (!current) {
      throw new Error("missing user");
    }

    return this.create({
      id: current.id,
      email: current.email,
      passwordHash: input.passwordHash,
      displayName: current.displayName,
      language: current.language,
      teamId: current.teamId,
      isActive: current.isActive
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return Array.from(this.users.values()).find((user) => user.email === email) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async list(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}

async function createUser(input: {
  id: string;
  email: string;
  password?: string;
  displayName?: string | null;
  language?: "ja" | "en";
  teamId?: string;
  isActive?: boolean;
}) {
  return new User({
    id: input.id,
    email: input.email,
    passwordHash: await hashPassword(input.password ?? "password1234"),
    displayName: input.displayName,
    language: input.language,
    teamId: input.teamId,
    isActive: input.isActive,
    createdAt: new Date("2026-05-22T00:00:00.000Z"),
    updatedAt: new Date("2026-05-22T00:00:00.000Z")
  });
}
