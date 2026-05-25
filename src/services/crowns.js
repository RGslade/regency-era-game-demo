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
  const refreshedWallet = { ...createDefaultCrownWallet(), ...wallet };
  const now = new Date().toISOString();
  if (isOlderThanDay(refreshedWallet.freeGrantedAt)) {
    refreshedWallet.freeCrowns = FREE_DAILY_CROWNS;
    refreshedWallet.freeGrantedAt = now;
  }
  if (isOlderThanDay(refreshedWallet.rewardedWindowStartedAt)) {
    refreshedWallet.rewardedCrowns = 0;
    refreshedWallet.rewardedAdsWatchedToday = 0;
    refreshedWallet.rewardedWindowStartedAt = now;
  }
  return refreshedWallet;
};

// Adds Crowns after a rewarded ad while enforcing the daily cap.
export const grantRewardedAdCrowns = (wallet = createDefaultCrownWallet(), crownAmount = REWARDED_AD_CROWNS) => {
  const refreshedWallet = refreshDailyCrowns(wallet);
  if ((refreshedWallet.rewardedAdsWatchedToday || 0) >= MAX_REWARDED_ADS_PER_DAY) {
    return { wallet: refreshedWallet, granted: false, crownsGranted: 0 };
  }
  const crownsGranted = Math.max(0, Number(crownAmount || REWARDED_AD_CROWNS));
  return {
    wallet: {
      ...refreshedWallet,
      rewardedCrowns: Number(refreshedWallet.rewardedCrowns || 0) + crownsGranted,
      rewardedAdsWatchedToday: Number(refreshedWallet.rewardedAdsWatchedToday || 0) + 1,
    },
    granted: true,
    crownsGranted,
  };
};

// Spends one Crown from the oldest/free-est eligible bucket first.
export const spendOneCrown = (wallet = createDefaultCrownWallet()) => {
  const refreshedWallet = refreshDailyCrowns(wallet);
  const spendPriorityBuckets = ['freeCrowns', 'rewardedCrowns', 'subscriptionCrowns', 'topupCrowns'];
  for (const bucket of spendPriorityBuckets) {
    if (Number(refreshedWallet[bucket] || 0) > 0) {
      return {
        wallet: {
          ...refreshedWallet,
          [bucket]: Number(refreshedWallet[bucket] || 0) - 1,
        },
        spent: true,
      };
    }
  }
  return { wallet: refreshedWallet, spent: false };
};

// Applies subscription grants and avoids double-granting the same period.
export const applySubscriptionTier = (wallet = createDefaultCrownWallet(), tier = 'free', periodEnd = null) => {
  const refreshedWallet = refreshDailyCrowns(wallet);
  const previousSubscriptionTier = refreshedWallet.subscriptionTier || 'free';
  const subscriptionGrantKey = tier === 'free' ? null : `${tier}:${periodEnd || 'current'}`;
  if (tier === previousSubscriptionTier && refreshedWallet.subscriptionPeriodEnd === periodEnd) {
    return refreshedWallet;
  }
  if (tier === 'free') {
    return {
      ...refreshedWallet,
      subscriptionTier: 'free',
      subscriptionPeriodEnd: null,
    };
  }
  const monthlyCrownsToGrant =
    tier === 'court_favourite'
      ? COURT_FAVOURITE_MONTHLY_CROWNS
      : tier === 'society_patron'
        ? SOCIETY_PATRON_MONTHLY_CROWNS
        : 0;
  const shouldGrantCrowns = subscriptionGrantKey !== refreshedWallet.subscriptionGrantKey;
  return {
    ...refreshedWallet,
    subscriptionTier: tier,
    subscriptionCrowns: Number(refreshedWallet.subscriptionCrowns || 0) + (shouldGrantCrowns ? monthlyCrownsToGrant : 0),
    subscriptionPeriodEnd: periodEnd,
    subscriptionGrantKey,
  };
};

// Reports how many rewarded ads remain in the current daily window.
export const getRewardedAdsRemaining = (wallet = createDefaultCrownWallet()) => {
  const refreshedWallet = refreshDailyCrowns(wallet);
  return Math.max(0, MAX_REWARDED_ADS_PER_DAY - Number(refreshedWallet.rewardedAdsWatchedToday || 0));
};
