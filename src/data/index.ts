import { withOfflineCache } from '@/data/cache';
import { createMockRepository } from '@/data/mock-repository';
import type { CertkeepRepository } from '@/data/repository';
import { asyncStorageStore, type KeyValueStore } from '@/data/storage';
import { createSupabaseRepository } from '@/data/supabase-repository';

export function isSupabaseConfigured(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  return Boolean(env.EXPO_PUBLIC_SUPABASE_URL?.trim() && env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim());
}

export function createAppRepository(store: KeyValueStore = asyncStorageStore): CertkeepRepository {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const inner =
    url && anonKey
      ? createSupabaseRepository({ url, anonKey, store })
      : createMockRepository({ store });
  return withOfflineCache(inner, store);
}

export { createMemoryStore } from '@/data/storage';
export { DEMO_PASSWORD, IDS } from '@/data/seed';
