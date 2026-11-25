import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createAppRepository } from '@/data';
import { errorMessage } from '@/data/errors';
import type { CertkeepRepository } from '@/data/repository';
import type { Membership, Session, VaultSnapshot } from '@/domain/types';

interface SessionValue {
  ready: boolean;
  session: Session | null;
  memberships: Membership[];
  organization: Membership | null;
  vault: VaultSnapshot | null;
  vaultLoading: boolean;
  vaultError: string | null;
  offline: boolean;
  mode: 'mock' | 'supabase';
  repo: CertkeepRepository;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  requestMagicLink: (email: string) => Promise<{ email: string; previewToken: string | null }>;
  consumeMagicLink: (token: string) => Promise<void>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  reloadVault: () => Promise<void>;
  setOffline: (offline: boolean) => Promise<void>;
  markAlertRead: (alertId: string) => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({
  children,
  repository,
}: {
  children: ReactNode;
  repository?: CertkeepRepository;
}) {
  const repo = useMemo(() => repository ?? createAppRepository(), [repository]);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [organization, setOrganization] = useState<Membership | null>(null);
  const [vault, setVault] = useState<VaultSnapshot | null>(null);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [offline, setOfflineState] = useState(false);

  const loadVault = useCallback(
    async (organizationId: string) => {
      setVaultLoading(true);
      try {
        const snapshot = await repo.getVault(organizationId);
        setVault(snapshot);
        setVaultError(null);
      } catch (error) {
        setVaultError(errorMessage(error, 'The vault did not load.'));
      } finally {
        setVaultLoading(false);
      }
    },
    [repo],
  );

  const adoptSession = useCallback(async () => {
    const next = await repo.getSession();
    setSession(next);
    if (!next) {
      setMemberships([]);
      setOrganization(null);
      setVault(null);
      setVaultError(null);
      return;
    }
    const nextMemberships = await repo.listMemberships();
    setMemberships(nextMemberships);
    const activeId = await repo.getActiveOrganizationId();
    const active = nextMemberships.find((item) => item.organizationId === activeId) ?? nextMemberships[0] ?? null;
    if (active && active.organizationId !== activeId) {
      await repo.setActiveOrganizationId(active.organizationId);
    }
    setOrganization(active);
    if (active) await loadVault(active.organizationId);
    else setVault(null);
  }, [loadVault, repo]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await repo.hydrate();
      if (cancelled) return;
      setOfflineState(await repo.isOffline());
      await adoptSession();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [adoptSession, repo]);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      await repo.signInWithPassword(email, password);
      await adoptSession();
    },
    [adoptSession, repo],
  );

  const requestMagicLink = useCallback((email: string) => repo.requestMagicLink(email), [repo]);

  const consumeMagicLink = useCallback(
    async (token: string) => {
      await repo.consumeMagicLink(token);
      await adoptSession();
    },
    [adoptSession, repo],
  );

  const signInDemo = useCallback(async () => {
    await repo.signInDemo();
    await adoptSession();
  }, [adoptSession, repo]);

  const signOut = useCallback(async () => {
    await repo.signOut();
    setSession(null);
    setMemberships([]);
    setOrganization(null);
    setVault(null);
  }, [repo]);

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      await repo.setActiveOrganizationId(organizationId);
      const next = memberships.find((item) => item.organizationId === organizationId) ?? null;
      setOrganization(next);
      setVault(null);
      if (next) await loadVault(next.organizationId);
    },
    [loadVault, memberships, repo],
  );

  const reloadVault = useCallback(async () => {
    if (!organization) return;
    await loadVault(organization.organizationId);
  }, [loadVault, organization]);

  const setOffline = useCallback(
    async (next: boolean) => {
      await repo.setOffline(next);
      setOfflineState(next);
      if (organization) await loadVault(organization.organizationId);
    },
    [loadVault, organization, repo],
  );

  const markAlertRead = useCallback(
    async (alertId: string) => {
      await repo.markAlertRead(alertId);
      await reloadVault();
    },
    [reloadVault, repo],
  );

  const value = useMemo<SessionValue>(
    () => ({
      ready,
      session,
      memberships,
      organization,
      vault,
      vaultLoading,
      vaultError,
      offline,
      mode: repo.mode,
      repo,
      signInWithPassword,
      requestMagicLink,
      consumeMagicLink,
      signInDemo,
      signOut,
      switchOrganization,
      reloadVault,
      setOffline,
      markAlertRead,
    }),
    [
      consumeMagicLink,
      markAlertRead,
      memberships,
      offline,
      organization,
      ready,
      reloadVault,
      repo,
      requestMagicLink,
      session,
      setOffline,
      signInDemo,
      signInWithPassword,
      signOut,
      switchOrganization,
      vault,
      vaultError,
      vaultLoading,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used within SessionProvider');
  return value;
}
