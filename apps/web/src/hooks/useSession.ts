import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type StoredAccount,
  clearAllAccounts,
  listAccounts,
  removeAccount,
  saveAccount,
} from "../lib/sessions";
import { api, type ApiUser } from "../api";
import type { PermissionKey } from "@horizon/shared";

/**
 * Session state.
 *
 * The server is the only authority on who you are: the session cookie is
 * HttpOnly, so the client cannot read or forge it, and `/api/auth/me` is what
 * decides whether you are signed in. localStorage keeps a list of accounts you
 * have used on this device — purely a convenience for the account switcher, and
 * never a credential.
 */
export function useSession() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["session"],
    queryFn: api.me,
    retry: false,
    staleTime: 30_000,
  });

  const active: ApiUser | null = data?.user ?? null;

  /**
   * What the server will let this account do.
   *
   * Only ever used to decide what to render. Every one of these is enforced
   * again server-side, so hiding a control is a courtesy rather than the
   * protection itself — a hand-typed URL still gets a 403.
   */
  const permissions = new Set<string>(data?.permissions ?? []);
  const can = useCallback(
    (permission: PermissionKey) => permissions.has(permission),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.permissions],
  );

  /** Remember this account on this device so the switcher can offer it. */
  const remember = useCallback((user: ApiUser) => {
    saveAccount(
      {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl ?? null,
        // Not a credential: the real session is an HttpOnly cookie the browser
        // holds and JavaScript cannot see.
        token: "cookie",
        expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
        lastUsedAt: new Date().toISOString(),
      },
      true,
    );
  }, []);

  const signIn = useMutation({
    mutationFn: ({
      identifier,
      password,
      remember,
    }: {
      identifier: string;
      password: string;
      remember: boolean;
    }) => api.login(identifier, password, remember),
    onSuccess: ({ user }) => {
      remember(user);
      queryClient.setQueryData(["session"], { user });
      queryClient.invalidateQueries();
      // Permissions arrive with /auth/me, which login does not return.
      refetch();
    },
  });

  const signUp = useMutation({
    mutationFn: api.register,
    onSuccess: ({ user }) => {
      remember(user);
      queryClient.setQueryData(["session"], { user });
      queryClient.invalidateQueries();
    },
  });

  const signOutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      queryClient.setQueryData(["session"], { user: null });
      queryClient.invalidateQueries();
    },
  });

  const logout = useCallback(
    async (userId?: string) => {
      // Forget the device entry first so the switcher updates even if the
      // network call fails.
      if (userId) removeAccount(userId);
      else if (active) removeAccount(active.id);
      await signOutMutation.mutateAsync().catch(() => undefined);
    },
    [active, signOutMutation],
  );

  const logoutAll = useCallback(async () => {
    clearAllAccounts();
    await signOutMutation.mutateAsync().catch(() => undefined);
  }, [signOutMutation]);

  return {
    /** Accounts used on this device, for the switcher. */
    accounts: listAccounts() as StoredAccount[],
    /** The account the server says you are, or null. */
    active,
    isAuthenticated: Boolean(active),
    /** Permission keys held by that account, for hiding what it cannot use. */
    permissions,
    can,
    loading: isLoading,
    signIn: async (identifier: string, password: string, remember = true) =>
      (await signIn.mutateAsync({ identifier, password, remember })).user,
    signUp: async (input: {
      username: string;
      email: string;
      password: string;
      displayName?: string;
    }) => (await signUp.mutateAsync(input)).user,
    logout,
    logoutAll,
    refresh: refetch,
  };
}
