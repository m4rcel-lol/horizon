import { Link } from "react-router-dom";
import { verificationPresentation, type VerificationType } from "@horizon/shared";

/**
 * Badge for a verification tier. Business accounts show the gold badge,
 * government accounts of both kinds the grey one; the tier's avatar shape is
 * what distinguishes an institution from a person.
 */
export function VerifiedBadge({
  type,
  className = "w-[18px] h-[18px]",
}: {
  type: VerificationType;
  className?: string;
}) {
  const { badge, label } = verificationPresentation(type);
  if (!badge) return null;
  return <img src={badge} alt={label} title={label} className={`inline-block shrink-0 ${className}`} />;
}

/** Organisations render square, individuals round. */
export function Avatar({
  shape = "circle",
  size = 48,
  src = "/assets/default-avatar.svg",
  className = "",
  ring = false,
}: {
  shape?: "circle" | "square";
  size?: number;
  src?: string;
  className?: string;
  ring?: boolean;
}) {
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: shape === "square" ? Math.round(size * 0.1) : "50%",
        ...(ring ? { borderWidth: 4, borderStyle: "solid", borderColor: "var(--color-bg)" } : {}),
      }}
      className={`object-cover shrink-0 bg-[var(--color-bg-secondary)] ${className}`}
    />
  );
}

/**
 * The small square mark an affiliated account carries next to its name,
 * linking back to the organisation that vouched for it.
 */
export function AffiliateBadge({
  organisation,
  size = 18,
}: {
  organisation: { username: string; displayName: string };
  size?: number;
}) {
  return (
    <Link
      to={`/${organisation.username}`}
      title={`Affiliated with ${organisation.displayName} (@${organisation.username})`}
      className="inline-flex shrink-0 align-middle"
    >
      <img
        src="/assets/default-avatar.svg"
        alt={`Affiliated with @${organisation.username}`}
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.15) }}
        className="object-cover bg-[var(--color-bg-secondary)]"
      />
    </Link>
  );
}

/** Display name followed by whichever marks the account has earned. */
export function NameWithBadges({
  displayName,
  verification,
  affiliatedTo,
  className = "",
  badgeClassName,
  badgeHref,
  badgeTitle,
}: {
  displayName: string;
  verification: VerificationType;
  affiliatedTo?: { username: string; displayName: string } | null;
  className?: string;
  badgeClassName?: string;
  /** Makes the badge a link — used on organisations to open their affiliates. */
  badgeHref?: string;
  badgeTitle?: string;
}) {
  const badge = <VerifiedBadge type={verification} className={badgeClassName} />;
  return (
    <span className={`inline-flex items-center gap-1 min-w-0 ${className}`}>
      <span className="truncate">{displayName}</span>
      {badgeHref ? (
        <Link to={badgeHref} title={badgeTitle} className="inline-flex shrink-0">
          {badge}
        </Link>
      ) : (
        badge
      )}
      {affiliatedTo ? <AffiliateBadge organisation={affiliatedTo} /> : null}
    </span>
  );
}
