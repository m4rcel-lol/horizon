/**
 * Create or promote an administrator from the command line.
 *
 *   docker compose exec api node apps/api/dist/cli/create-admin.js \
 *     <username> <email> <password>
 *
 * Idempotent: run it again to reset the password or to promote an account that
 * already exists. Intended for the first administrator, and for the case where
 * you have locked yourself out.
 */
import { PrismaClient } from "@horizon/database";
import * as argon2 from "argon2";
import { PERMISSIONS } from "@horizon/shared";

const ROLE_NAME = "administrator";

async function main() {
  const [username, email, password] = process.argv.slice(2);

  if (!username || !email || !password) {
    console.error(
      "Usage: node apps/api/dist/cli/create-admin.js <username> <email> <password>",
    );
    process.exit(1);
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    console.error("Username must be 3-20 characters: letters, numbers, underscores.");
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("Password must be at least 10 characters.");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    // The role and its permissions, so the account is already correct when
    // authorization checks land.
    const role = await prisma.role.upsert({
      where: { name: ROLE_NAME },
      update: {},
      create: {
        name: ROLE_NAME,
        description: "Full administrative access to this instance",
        isSystem: true,
      },
    });

    for (const key of Object.values(PERMISSIONS)) {
      const permission = await prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key },
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
      select: { id: true, username: true, isSystem: true },
    });

    if (existing?.isSystem) {
      console.error(`@${existing.username} is a system account and cannot be used as an administrator.`);
      process.exit(1);
    }

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash, email, status: "ACTIVE", loginDisabled: false },
          select: { id: true, username: true },
        })
      : await prisma.user.create({
          data: { username, email, passwordHash, displayName: username },
          select: { id: true, username: true },
        });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });

    console.log(
      existing
        ? `Updated @${user.username}: password reset and administrator role granted.`
        : `Created @${user.username} with the administrator role.`,
    );
    console.log("Sign in at /login with that username and password.");
    console.log(
      "\nNote: authorization is not enforced yet, so the /admin pages are currently\n" +
        "reachable by anyone who knows the URL. This role is recorded for when it is.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Failed to create the administrator:", error instanceof Error ? error.message : error);
  process.exit(1);
});
