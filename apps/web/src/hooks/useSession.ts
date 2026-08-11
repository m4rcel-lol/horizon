import { useCallback, useEffect, useState } from "react";
import {
  type StoredAccount,
  clearAllAccounts,
  getActiveAccount,
  listAccounts,
  removeAccount,
  saveAccount,
  setActiveAccount,
} from "../lib/sessions";

/**
 * Client session state: active account + vault of other signed-in accounts.
 * Survives reloads via localStorage until the server AuthModule issues real cookies.
 */
export function useSession() {
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [active, setActive] = useState<StoredAccount | null>(null);

  const refresh = useCallback(() => {
    setAccounts(listAccounts());
    setActive(getActiveAccount());
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "horizon:account-vault" || e.key === "horizon:active-account-id") {
        refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const loginLocal = useCallback(
    (account: StoredAccount) => {
      saveAccount(account, true);
      refresh();
    },
    [refresh],
  );

  const switchAccount = useCallback(
    (userId: string) => {
      setActiveAccount(userId);
      refresh();
    },
    [refresh],
  );

  const logout = useCallback(
    (userId?: string) => {
      if (userId) removeAccount(userId);
      else {
        const current = getActiveAccount();
        if (current) removeAccount(current.userId);
      }
      refresh();
    },
    [refresh],
  );

  const logoutAll = useCallback(() => {
    clearAllAccounts();
    refresh();
  }, [refresh]);

  return {
    accounts,
    active,
    isAuthenticated: Boolean(active),
    loginLocal,
    switchAccount,
    logout,
    logoutAll,
    refresh,
  };
}
