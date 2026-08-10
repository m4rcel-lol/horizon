import type { VerificationType } from "./index";

/**
 * Verification and affiliation rules.
 *
 * A user carries the tier an administrator granted them (`selfVerification`)
 * plus, optionally, the organisation that affiliated them. The badge actually
 * shown is derived from the two — never stored — so removing an affiliation
 * cleanly restores whatever the account had earned on its own.
 */

export const VERIFICATION_TYPES: VerificationType[] = [
  "NONE",
  "STANDARD",
  "BUSINESS",
  "GOVERNMENT",
  "GOVERNMENT_BUSINESS",
];

export type BadgeAsset =
  | "/assets/verified.svg"
  | "/assets/verified-business.svg"
  | "/assets/verified-government.svg";

export interface VerificationPresentation {
  /** Badge image, or null when the account is unverified. */
  badge: BadgeAsset | null;
  /** Organisations are shown with a square avatar, individuals with a circle. */
  avatarShape: "circle" | "square";
  label: string;
  /** Organisation tiers may affiliate other accounts. */
  isOrganisation: boolean;
}

const PRESENTATION: Record<VerificationType, VerificationPresentation> = {
  NONE: {
    badge: null,
    avatarShape: "circle",
    label: "Not verified",
    isOrganisation: false,
  },
  STANDARD: {
    badge: "/assets/verified.svg",
    avatarShape: "circle",
    label: "Verified",
    isOrganisation: false,
  },
  BUSINESS: {
    badge: "/assets/verified-business.svg",
    avatarShape: "square",
    label: "Verified business",
    isOrganisation: true,
  },
  GOVERNMENT: {
    badge: "/assets/verified-government.svg",
    avatarShape: "circle",
    label: "Verified government account",
    isOrganisation: false,
  },
  GOVERNMENT_BUSINESS: {
    badge: "/assets/verified-government.svg",
    avatarShape: "square",
    label: "Verified government organisation",
    isOrganisation: true,
  },
};

export function verificationPresentation(type: VerificationType): VerificationPresentation {
  return PRESENTATION[type] ?? PRESENTATION.NONE;
}

/**
 * Avatar shape for an account.
 *
 * Deliberately keyed on the tier the account holds in its own right, never on a
 * badge it displays through affiliation. Being affiliated by a business raises
 * a person's badge, but it does not make them an organisation, so they keep the
 * circular avatar.
 */
export function avatarShapeFor(selfVerification: VerificationType): "circle" | "square" {
  return verificationPresentation(selfVerification).avatarShape;
}

/** Only organisations hand out affiliations. */
export function canAffiliate(type: VerificationType): boolean {
  return verificationPresentation(type).isOrganisation;
}

/**
 * The badge an account actually displays.
 *
 * Being affiliated by an organisation is itself a verification: an unverified
 * account becomes STANDARD, and an account that was already verified is raised
 * to BUSINESS. Tiers at or above BUSINESS — and government tiers, which are not
 * ours to downgrade — are left alone.
 */
export function effectiveVerification(
  selfVerification: VerificationType,
  isAffiliated: boolean,
): VerificationType {
  if (!isAffiliated) return selfVerification;
  if (selfVerification === "NONE") return "STANDARD";
  if (selfVerification === "STANDARD") return "BUSINESS";
  return selfVerification;
}

export type AffiliationRefusal =
  | "SELF_AFFILIATION"
  | "NOT_AN_ORGANISATION"
  | "ALREADY_AFFILIATED"
  | "WOULD_CREATE_CYCLE";

export interface AffiliationCheck {
  allowed: boolean;
  reason?: AffiliationRefusal;
  message?: string;
}

const REFUSAL_MESSAGES: Record<AffiliationRefusal, string> = {
  SELF_AFFILIATION: "An account cannot affiliate itself.",
  NOT_AN_ORGANISATION:
    "Only verified business and verified government organisations can affiliate accounts.",
  ALREADY_AFFILIATED:
    "That account is already affiliated with an organisation. Remove the existing affiliation first.",
  WOULD_CREATE_CYCLE: "That account is already an organisation above this one in the affiliation chain.",
};

/**
 * Whether `organisation` may affiliate `target`.
 *
 * `ancestorsOfOrganisation` is the chain of organisations above the affiliating
 * one, used to keep affiliations a tree rather than a loop.
 */
export function checkAffiliation(input: {
  organisationId: string;
  organisationVerification: VerificationType;
  targetId: string;
  targetAffiliatedToId?: string | null;
  ancestorsOfOrganisation?: string[];
}): AffiliationCheck {
  const refuse = (reason: AffiliationRefusal): AffiliationCheck => ({
    allowed: false,
    reason,
    message: REFUSAL_MESSAGES[reason],
  });

  if (input.organisationId === input.targetId) return refuse("SELF_AFFILIATION");
  if (!canAffiliate(input.organisationVerification)) return refuse("NOT_AN_ORGANISATION");
  if (input.targetAffiliatedToId) return refuse("ALREADY_AFFILIATED");
  if ((input.ancestorsOfOrganisation ?? []).includes(input.targetId)) return refuse("WOULD_CREATE_CYCLE");

  return { allowed: true };
}
