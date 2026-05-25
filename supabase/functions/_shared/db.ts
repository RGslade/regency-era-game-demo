const serviceRoleKey = () => Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseUrl = () => (Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, '');

export const requireSupabaseService = () => {
  if (!supabaseUrl() || !serviceRoleKey()) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for this function.');
  }
};

const headers = (extra: Record<string, string> = {}) => ({
  apikey: serviceRoleKey(),
  Authorization: `Bearer ${serviceRoleKey()}`,
  ...extra,
});

export const restFetch = async (path: string, init: RequestInit = {}) => {
  requireSupabaseService();
  return fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...headers(),
      ...(init.headers || {}),
    },
  });
};

export const readJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Supabase REST request failed with status ${response.status}`);
  }
  return text ? JSON.parse(text) : null;
};

export type UserRow = {
  id: string;
  revenuecat_app_user_id: string;
};

export const getOrCreateUser = async (anonymousUserId: string): Promise<UserRow> => {
  const upsertResponse = await restFetch('users?on_conflict=revenuecat_app_user_id', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify([{ revenuecat_app_user_id: anonymousUserId, last_seen_at: new Date().toISOString() }]),
  });
  const rows = await readJson<UserRow[]>(upsertResponse);
  if (!rows?.[0]) throw new Error('Could not create or load user.');
  return rows[0];
};

export type Wallet = {
  freeCrowns: number;
  rewardedCrowns: number;
  subscriptionCrowns: number;
  topupCrowns: number;
  freeGrantedAt: string | null;
  rewardedAdsWatchedToday: number;
  rewardedWindowStartedAt: string | null;
  subscriptionTier: string;
  subscriptionPeriodEnd: string | null;
};

type WalletRow = {
  user_id: string;
  free_crowns: number;
  rewarded_crowns: number;
  subscription_crowns: number;
  topup_crowns: number;
  free_granted_at: string | null;
  rewarded_ads_watched_today: number;
  rewarded_window_started_at: string | null;
  subscription_tier: string;
  subscription_period_end: string | null;
};

export const toClientWallet = (row: WalletRow): Wallet => ({
  freeCrowns: row.free_crowns || 0,
  rewardedCrowns: row.rewarded_crowns || 0,
  subscriptionCrowns: row.subscription_crowns || 0,
  topupCrowns: row.topup_crowns || 0,
  freeGrantedAt: row.free_granted_at,
  rewardedAdsWatchedToday: row.rewarded_ads_watched_today || 0,
  rewardedWindowStartedAt: row.rewarded_window_started_at,
  subscriptionTier: row.subscription_tier || 'free',
  subscriptionPeriodEnd: row.subscription_period_end,
});

const fromClientWallet = (wallet: Wallet) => ({
  free_crowns: wallet.freeCrowns,
  rewarded_crowns: wallet.rewardedCrowns,
  subscription_crowns: wallet.subscriptionCrowns,
  topup_crowns: wallet.topupCrowns,
  free_granted_at: wallet.freeGrantedAt,
  rewarded_ads_watched_today: wallet.rewardedAdsWatchedToday,
  rewarded_window_started_at: wallet.rewardedWindowStartedAt,
  subscription_tier: wallet.subscriptionTier,
  subscription_period_end: wallet.subscriptionPeriodEnd,
});

const dayMs = 24 * 60 * 60 * 1000;
const isOlderThanDay = (isoDate: string | null) => !isoDate || Date.now() - new Date(isoDate).getTime() >= dayMs;

export const refreshWallet = (wallet: Wallet): Wallet => {
  const now = new Date().toISOString();
  const refreshed = { ...wallet };
  if (isOlderThanDay(refreshed.freeGrantedAt)) {
    refreshed.freeCrowns = 10;
    refreshed.freeGrantedAt = now;
  }
  if (isOlderThanDay(refreshed.rewardedWindowStartedAt)) {
    refreshed.rewardedCrowns = 0;
    refreshed.rewardedAdsWatchedToday = 0;
    refreshed.rewardedWindowStartedAt = now;
  }
  return refreshed;
};

export const totalCrowns = (wallet: Wallet) =>
  wallet.freeCrowns + wallet.rewardedCrowns + wallet.subscriptionCrowns + wallet.topupCrowns;

export const getWallet = async (userId: string): Promise<Wallet> => {
  const response = await restFetch(`crown_wallets?user_id=eq.${userId}&select=*`);
  const rows = await readJson<WalletRow[]>(response);
  if (rows?.[0]) return refreshWallet(toClientWallet(rows[0]));

  const createResponse = await restFetch('crown_wallets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify([{ user_id: userId, free_crowns: 10, free_granted_at: new Date().toISOString() }]),
  });
  const createdRows = await readJson<WalletRow[]>(createResponse);
  return refreshWallet(toClientWallet(createdRows[0]));
};

export const saveWallet = async (userId: string, wallet: Wallet): Promise<Wallet> => {
  const response = await restFetch(`crown_wallets?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(fromClientWallet(wallet)),
  });
  const rows = await readJson<WalletRow[]>(response);
  return toClientWallet(rows[0]);
};

export const insertLedger = async (userId: string, amount: number, source: string, reason: string) => {
  const response = await restFetch('crown_ledger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ user_id: userId, amount, source, reason }]),
  });
  await readJson(response);
};

export const spendOneCrown = (wallet: Wallet) => {
  const refreshed = refreshWallet(wallet);
  for (const key of ['freeCrowns', 'rewardedCrowns', 'subscriptionCrowns', 'topupCrowns'] as const) {
    if (refreshed[key] > 0) {
      return { wallet: { ...refreshed, [key]: refreshed[key] - 1 }, spent: true };
    }
  }
  return { wallet: refreshed, spent: false };
};

