import {
  COURT_FAVOURITE_MONTHLY_CROWNS,
  FREE_DAILY_CROWNS,
  MAX_REWARDED_ADS_PER_DAY,
  REWARDED_AD_CROWNS,
  SOCIETY_PATRON_MONTHLY_CROWNS,
} from '../constants/game';

const DAY_MS = 24 * 60 * 60 * 1000;

// Creates an empty Crown wallet with every supported bucket present.
export const createDefaultCrownWallet = () => ({
  freeCrowns: 0,
  rewardedCrowns: 0,
  subscriptionCrowns: 0,
  topupCrowns: 0,
  freeGrantedAt: null,
  rewardedAdsWatchedToday: 0,
  rewardedWindowStartedAt: null,
  subscriptionTier: 'free',
  subscriptionPeriodEnd: null,
  subscriptionGrantKey: null,
});

// Totals spendable Crown balances across all wallet buckets.
export const getTotalCrowns = (wallet = {}) =>
  Number(wallet.freeCrowns || 0) +
  Number(wallet.rewardedCrowns || 0) +
  Number(wallet.subscriptionCrowns || 0) +
  Number(wallet.topupCrowns || 0);

const isOlderThanDay = (isoDate) => {
  if (!isoDate) return true;
  return Date.now() - new Date(isoDate).getTime() >= DAY_MS;
};

// Refreshes daily free Crowns and rewarded-ad availability windows.
export const refreshDailyCrowns = (wallet = createDefaultCrownWallet()) => {
  const next = { ...createDefaultCrownWallet(), ...wallet };
  const now = new Date().toISOString();
  if (isOlderThanDay(next.freeGrantedAt)) {
    next.freeCrowns = FREE_DAILY_CROWNS;
    next.freeGrantedAt = now;
  }
  if (isOlderThanDay(next.rewardedWindowStartedAt)) {
    next.rewardedCrowns = 0;
    next.rewardedAdsWatchedToday = 0;
    next.rewardedWindowStartedAt = now;
  }
  return next;
};

// Adds Crowns after a rewarded ad while enforcing the daily cap.
export const grantRewardedAdCrowns = (wallet = createDefaultCrownWallet(), crownAmount = REWARDED_AD_CROWNS) => {
  const next = refreshDailyCrowns(wallet);
  if ((next.rewardedAdsWatchedToday || 0) >= MAX_REWARDED_ADS_PER_DAY) {
    return { wallet: next, granted: false, crownsGranted: 0 };
  }
  const crownsGranted = Math.max(0, Number(crownAmount || REWARDED_AD_CROWNS));
  return {
    wallet: {
      ...next,
      rewardedCrowns: Number(next.rewardedCrowns || 0) + crownsGranted,
      rewardedAdsWatchedToday: Number(next.rewardedAdsWatchedToday || 0) + 1,
    },
    granted: true,
    crownsGranted,
  };
};

// Spends one Crown from the oldest/free-est eligible bucket first.
export const spendOneCrown = (wallet = createDefaultCrownWallet()) => {
  const next = refreshDailyCrowns(wallet);
  const buckets = ['freeCrowns', 'rewardedCrowns', 'subscriptionCrowns', 'topupCrowns'];
  for (const bucket of buckets) {
    if (Number(next[bucket] || 0) > 0) {
      return {
        wallet: {
          ...next,
          [bucket]: Number(next[bucket] || 0) - 1,
        },
        spent: true,
      };
    }
  }
  return { wallet: next, spent: false };
};

// Applies subscription grants and avoids double-granting the same period.
export const applySubscriptionTier = (wallet = createDefaultCrownWallet(), tier = 'free', periodEnd = null) => {
  const next = refreshDailyCrowns(wallet);
  const currentTier = next.subscriptionTier || 'free';
  const grantKey = tier === 'free' ? null : `${tier}:${periodEnd || 'current'}`;
  if (tier === currentTier && next.subscriptionPeriodEnd === periodEnd) {
    return next;
  }
  if (tier === 'free') {
    return {
      ...next,
      subscriptionTier: 'free',
      subscriptionPeriodEnd: null,
    };
  }
  const crownsToGrant =
    tier === 'court_favourite'
      ? COURT_FAVOURITE_MONTHLY_CROWNS
      : tier === 'society_patron'
        ? SOCIETY_PATRON_MONTHLY_CROWNS
        : 0;
  const shouldGrantCrowns = grantKey !== next.subscriptionGrantKey;
  return {
    ...next,
    subscriptionTier: tier,
    subscriptionCrowns: Number(next.subscriptionCrowns || 0) + (shouldGrantCrowns ? crownsToGrant : 0),
    subscriptionPeriodEnd: periodEnd,
    subscriptionGrantKey: grantKey,
  };
};

// Reports how many rewarded ads remain in the current daily window.
export const getRewardedAdsRemaining = (wallet = createDefaultCrownWallet()) => {
  const next = refreshDailyCrowns(wallet);
  return Math.max(0, MAX_REWARDED_ADS_PER_DAY - Number(next.rewardedAdsWatchedToday || 0));
};
