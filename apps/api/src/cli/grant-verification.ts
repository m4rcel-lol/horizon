/**
 * Grant, change or clear an account's verification tier from the command line.
 *
 *   docker compose exec api node apps/api/dist/cli/grant-verification.js \
 *     <username> <tier> [reason]
 *
 * Tiers: NONE, STANDARD, BUSINESS, GOVERNMENT, GOVERNMENT_BUSINESS
 *
 * The same thing the admin console at /admin/verification does, for when you
 * would rather not open a browser — or cannot, because nobody has an
 * administrator account yet.
 */
import { PrismaClient } from "@horizon/database";
import {
  VERIFICATION_TYPES,
  canAffiliate,
  effectiveVerification,
  verificationPresentation,
  type VerificationType,
} from "@horizon/shared";

async function main() {
  const [username, tierArg, ...reasonParts] = process.argv.slice(2);
  const reason = reasonParts.join(" ") || null;

  if (!username || !tierArg) {
    console.error(
      "Usage: node apps/api/dist/cli/grant-verification.js <username> <tier> [reason]\n\n" +
        "Tiers:\n" +
        VERIFICATION_TYPES.map((t) => {
          const p = verificationPresentation(t);
          const extras = [
            p.avatarShape === "square" ? "square avatar" : "round avatar",
            p.isOrganisation ? "can affiliate others" : null,
          ].filter(Boolean);
          return `  ${t.padEnd(20)} ${p.label} (${extras.join(", ")})`;
        }).join("\n"),
    );
    process.exit(1);
  }

  const tier = tierArg.toUpperCase() as VerificationType;
  if (!VERIFICATION_TYPES.includes(tier)) {
    console.error(`Unknown tier "${tierArg}". Use one of: ${VERIFICATION_TYPES.join(", ")}`);
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findFirst({
      where: { username },
      select: { id: true, username: true, verification: true, isSystem: true, affiliatedToId: true },
    });

    if (!user) {
      console.error(`No account @${username} on this instance.`);
      process.exit(1);
    }
    // Same rule the API enforces: system accounts hold their tier by definition.
    if (user.isSystem) {
      console.error(`@${user.username} is a system account and cannot be re-verified.`);
      process.exit(1);
    }

    const from = user.verification as VerificationType;
    if (from === tier) {
      console.log(`@${user.username} is already ${verificationPresentation(tier).label}.`);
      return;
    }

    // Everything moves together: the tier, the affiliates that tier was
    // backing, and the history rows that explain both.
    const released = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { verification: tier } });
      await tx.verificationHistory.create({
        data: { userId: user.id, fromType: from, toType: tier, reason, actorId: null },
      });

      // Dropping an organisation tier leaves its affiliates holding a badge
      // nobody is backing, so release them — exactly as the API route does.
      if (canAffiliate(tier)) return 0;

      const affiliates = await tx.user.findMany({
        where: { affiliatedToId: user.id },
        select: { id: true, verification: true },
      });
      for (const other of affiliates) {
        const before = effectiveVerification(other.verification as VerificationType, true);
        const after = effectiveVerification(other.verification as VerificationType, false);
        await tx.user.update({
          where: { id: other.id },
          data: { affiliatedToId: null, affiliatedAt: null },
        });
        if (before !== after) {
          await tx.verificationHistory.create({
            data: {
              userId: other.id,
              fromType: before,
              toType: after,
              actorId: user.id,
              reason: `@${user.username} is no longer an organisation`,
            },
          });
        }
      }
      return affiliates.length;
    });

    const shown = verificationPresentation(tier);
    console.log(
      `@${user.username}: ${verificationPresentation(from).label} → ${shown.label}`,
    );
    console.log(
      `Avatar is now ${shown.avatarShape}. ${
        shown.isOrganisation
          ? "This account can affiliate others."
          : "This account cannot affiliate others."
      }`,
    );
    if (released > 0) {
      console.log(
        `Released ${released} affiliated account${released === 1 ? "" : "s"}, since the new tier cannot back them.`,
      );
    }
    if (user.affiliatedToId && tier !== "NONE") {
      console.log(
        "Note: this account is itself affiliated to an organisation, so the badge it\n" +
          "displays is derived from both and may differ from the tier just granted.",
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Failed to set verification:", error instanceof Error ? error.message : error);
  process.exit(1);
});
