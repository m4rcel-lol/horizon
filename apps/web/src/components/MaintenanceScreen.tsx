import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, onMaintenance } from "../api";
import { useSession } from "../hooks/useSession";

/**
 * Shown over everything while the instance is in maintenance.
 *
 * The instance route is the authority: it is public, exempt from the mode, and
 * reports whether *this caller* is shut out rather than merely whether the mode
 * is on — so an administrator, who is exempt server-side, never sees this.
 *
 * A 503 from any other request raises it immediately, so nobody waits for the
 * next poll. Inferring the state purely from request outcomes does not work:
 * sign-in and the instance route stay open during maintenance, so a successful
 * one of those would otherwise clear a screen that should still be up.
 *
 * Sign-in stays reachable underneath, because an administrator arriving at a
 * closed instance has to be able to get in and turn it off.
 */
export function MaintenanceScreen() {
  const [pushed, setPushed] = useState<string | null>(null);
  const { isAuthenticated } = useSession();
  const location = useLocation();

  const { data } = useQuery({
    queryKey: ["instance-maintenance"],
    queryFn: api.instanceInfo,
    // While the mode is on, this is how a visitor learns it has ended.
    refetchInterval: 30_000,
    retry: false,
  });

  useEffect(() => {
    const unsubscribe = onMaintenance(setPushed);
    return () => {
      unsubscribe();
    };
  }, []);

  // Sign-in has to stay usable: an administrator arriving at a closed instance
  // gets in through this page, and covering it would make the mode a one-way
  // door out of the instance.
  const onSignIn = location.pathname === "/login" || location.pathname === "/setup";
  const active = !onSignIn && (Boolean(data?.maintenanceActive) || Boolean(pushed));
  const message =
    data?.maintenanceMessage || pushed || "This instance is down for maintenance.";

  if (!active) return null;

  return (
    <div
      role="alertdialog"
      aria-labelledby="maintenance-title"
      className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-fade-in"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="max-w-[420px] text-center">
        <img src="/assets/logo.svg" alt="" className="w-12 h-12 mx-auto mb-6 opacity-80" />
        <h1 id="maintenance-title" className="text-[26px] font-extrabold mb-3">
          Down for maintenance
        </h1>
        <p className="text-[15px] mb-6" style={{ color: "var(--color-text-secondary)" }}>
          {message}
        </p>
        <div className="flex flex-col gap-2 items-center">
          <button type="button" className="btn btn-primary btn-lg" onClick={() => window.location.reload()}>
            Try again
          </button>
          {!isAuthenticated ? (
            <Link to="/login" className="link text-[14px]" onClick={() => setPushed(null)}>
              Administrator sign-in
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
