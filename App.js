import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import MobileAds, { BannerAd, BannerAdSize, InterstitialAd, AdEventType, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';
import { appStyles as styles } from './src/styles/appStyles';
import { colors } from './src/constants/colors';
import { defaultSettingId, getSettingTheme } from './src/types/settings';
import { GameScreen } from './src/screens/GameScreen';
import { RelationshipsScreen } from './src/screens/RelationshipsScreen';
import { RemoveAdvertsScreen } from './src/screens/RemoveAdvertsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { logError, logWarn, registerGlobalErrorLogger } from './src/services/logger';
import { appBridge } from './src/services/appBridge';
import {DEFAULT_APP_CONFIG, getPlatformConfigValue, getRevenueCatApiKey, loadRemoteAppConfig,} from './src/services/appConfig';
import {loadAnonymousUserId, loadAppSettingsState, loadCrownWalletState, saveAppSettingsState, saveCrownWalletState,} from './src/services/storage';
import {applySubscriptionTier, createDefaultCrownWallet, getTotalCrowns, grantRewardedAdCrowns,refreshDailyCrowns,} from './src/services/crowns';
import { CROWN_PURSE_CROWNS, REVENUECAT_PRODUCT_IDS, REWARDED_AD_CROWNS } from './src/constants/game';
import {fetchBackendCrownWallet, fetchBackendUserSettings, grantBackendRewardedCrowns, syncBackendUserSettings,} from './src/services/aiStoryService';
import { createDefaultAppSettings } from './src/types/settingsOptions';

const isAdNoFillError = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('no-fill') || message.includes('no fill');
};

// Merges local and backend wallets while preserving the best available balances.
const mergeCrownWallets = (localWallet = createDefaultCrownWallet(), backendWallet = createDefaultCrownWallet()) => {
  const local = refreshDailyCrowns(localWallet || createDefaultCrownWallet());
  const backend = refreshDailyCrowns(backendWallet || createDefaultCrownWallet());
  const localTier = local.subscriptionTier || 'free';
  const backendTier = backend.subscriptionTier || 'free';
  const preserveLocalSubscription = localTier !== 'free';
  return refreshDailyCrowns({
    ...backend,
    freeCrowns: Math.max(Number(local.freeCrowns || 0), Number(backend.freeCrowns || 0)),
    rewardedCrowns: Math.max(Number(local.rewardedCrowns || 0), Number(backend.rewardedCrowns || 0)),
    subscriptionCrowns: Math.max(Number(local.subscriptionCrowns || 0), Number(backend.subscriptionCrowns || 0)),
    topupCrowns: Math.max(Number(local.topupCrowns || 0), Number(backend.topupCrowns || 0)),
    rewardedAdsWatchedToday: Math.max(Number(local.rewardedAdsWatchedToday || 0), Number(backend.rewardedAdsWatchedToday || 0)),
    rewardedWindowStartedAt: backend.rewardedWindowStartedAt || local.rewardedWindowStartedAt,
    subscriptionTier: preserveLocalSubscription ? localTier : backendTier,
    subscriptionPeriodEnd: preserveLocalSubscription ? local.subscriptionPeriodEnd || null : backend.subscriptionPeriodEnd || null,
    subscriptionGrantKey: local.subscriptionGrantKey || backend.subscriptionGrantKey || null,
  });
};

export default function Main() {
  const [screen, setScreen] = useState('game');
  const [errorMessage, setErrorMessage] = useState('');
  const [appConfig, setAppConfig] = useState(DEFAULT_APP_CONFIG);
  const [appConfigReady, setAppConfigReady] = useState(false);
  const [adInitialized, setAdInitialized] = useState(false);
  const [adsRemoved, setAdsRemoved] = useState(false);
  const [anonymousUserId, setAnonymousUserId] = useState('');
  const [crownWallet, setCrownWallet] = useState(createDefaultCrownWallet);
  const [interstitialReady, setInterstitialReady] = useState(false);
  const [rewardedReady, setRewardedReady] = useState(false);
  const [rewardedStatus, setRewardedStatus] = useState('idle');
  const [pendingInterstitial, setPendingInterstitial] = useState(false);
  const [appSettings, setAppSettings] = useState(createDefaultAppSettings);
  const [appSettingsLoaded, setAppSettingsLoaded] = useState(false);
  const [backendSettingsChecked, setBackendSettingsChecked] = useState(false);
  const interstitialRef = useRef(null);
  const rewardedRef = useRef(null);
  const admobBannerUnitId = useMemo(
    () => getPlatformConfigValue(appConfig, 'admobIosBannerUnitId', 'admobAndroidBannerUnitId'),
    [appConfig]
  );
  const admobInterstitialUnitId = useMemo(
    () => getPlatformConfigValue(appConfig, 'admobIosInterstitialUnitId', 'admobAndroidInterstitialUnitId'),
    [appConfig]
  );
  const admobRewardedUnitId = useMemo(
    () => getPlatformConfigValue(appConfig, 'admobIosRewardedUnitId', 'admobAndroidRewardedUnitId'),
    [appConfig]
  );
  const revenueCatConfig = useMemo(
    () => getRevenueCatApiKey(appConfig),
    [appConfig]
  );

  // Expose app-level controls to screen modules without prop drilling.
  appBridge.setScreen = setScreen;
  appBridge.setErrorMessage = setErrorMessage;
  appBridge.setAdsRemoved = setAdsRemoved;
  appBridge.adsRemoved = adsRemoved;
  appBridge.anonymousUserId = anonymousUserId;
  appBridge.crownWallet = crownWallet;
  appBridge.setCrownWallet = setCrownWallet;
  appBridge.interstitialReady = interstitialReady;
  appBridge.setInterstitialReady = setInterstitialReady;
  appBridge.rewardedReady = rewardedReady;
  appBridge.setRewardedReady = setRewardedReady;
  appBridge.rewardedStatus = rewardedStatus;
  appBridge.setRewardedStatus = setRewardedStatus;
  appBridge.pendingInterstitial = pendingInterstitial;
  appBridge.setPendingInterstitial = setPendingInterstitial;
  appBridge.setShouldShowInterstitial = setPendingInterstitial;
  appBridge.interstitialRef = interstitialRef;
  appBridge.rewardedRef = rewardedRef;
  appBridge.appSettings = appSettings;
  appBridge.setAppSettings = setAppSettings;

  // Register global error handlers as soon as the root app mounts.
  useEffect(() => registerGlobalErrorLogger(), []);

  // Load backend-driven configuration before monetized services start.
  useEffect(() => {
    let isMounted = true;
    loadRemoteAppConfig()
      .then((config) => {
        if (isMounted) {
          setAppConfig(config);
          setAppConfigReady(true);
        }
      })
      .catch((error) => {
        logError('Remote app config load failed', error, {
          environment: __DEV__ ? 'development' : 'production',
          platform: Platform.OS,
        });
        if (isMounted) {
          setAppConfigReady(false);
          const details = error?.message ? ` ${error.message}` : '';
          const message = `App setup is incomplete. Supabase app-config could not provide the required configuration.${details}`;
          setErrorMessage(message);
          Alert.alert('App setup incomplete', message);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Hydrate saved app settings from local device storage.
  useEffect(() => {
    let isMounted = true;
    loadAppSettingsState(createDefaultAppSettings())
      .then((settings) => {
        if (isMounted) {
          setAppSettings(settings);
          setAppSettingsLoaded(true);
        }
      })
      .catch((error) => {
        logError('App settings hydration failed', error, {});
        if (isMounted) setAppSettingsLoaded(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Persist settings locally and sync them to the backend when available.
  useEffect(() => {
    if (!appSettingsLoaded) return;
    saveAppSettingsState(appSettings).catch((error) => {
      logError('App settings save failed', error, {});
    });
    if (!appSettingsLoaded || !anonymousUserId || !backendSettingsChecked) return;
    syncBackendUserSettings({ anonymousUserId, settings: appSettings }).catch((error) => {
      logWarn('Backend app settings sync failed', {
        message: error?.message || String(error),
        anonymousUserId,
      });
    });
  }, [anonymousUserId, appSettings, appSettingsLoaded, backendSettingsChecked]);

  // Hydrate anonymous identity and wallet state for commercial flows.
  useEffect(() => {
    let isMounted = true;
    const hydrateCommercialState = async () => {
      try {
        const [userId, savedWallet] = await Promise.all([
          loadAnonymousUserId(),
          loadCrownWalletState(),
        ]);
        if (!isMounted) return;
        setAnonymousUserId(userId);
        setCrownWallet(refreshDailyCrowns(savedWallet || createDefaultCrownWallet()));
      } catch (error) {
        logError('Commercial state hydration failed', error, {});
      }
    };
    hydrateCommercialState();
    return () => {
      isMounted = false;
    };
  }, []);

  // Persist wallet changes to local device storage.
  useEffect(() => {
    saveCrownWalletState(crownWallet).catch((error) => {
      logError('Crown wallet save failed', error, {});
    });
  }, [crownWallet]);

  // Initialise the ad SDK once.
  // Configure rewarded ad listeners and preload the next reward.
  useEffect(() => {
    if (adsRemoved) {
      setAdInitialized(false);
      return;
    }
    MobileAds().initialize().then(() => { setAdInitialized(true); }).catch((error) => {
        setAdInitialized(false);
        logError('AdMob SDK initialization failed', error, {
          platform: Platform.OS,
          hasBannerUnitId: Boolean(admobBannerUnitId),
          hasInterstitialUnitId: Boolean(admobInterstitialUnitId),
        });
      });
  }, [adsRemoved, admobBannerUnitId, admobInterstitialUnitId]);

  // Merge backend wallet updates when sync is available.
  useEffect(() => {
    if (!anonymousUserId) return;
    fetchBackendCrownWallet({ anonymousUserId })
      .then((wallet) => {
        if (wallet) {
          setCrownWallet((prev) => {
            return mergeCrownWallets(prev, wallet);
          });
        }
      })
      .catch((error) => {
        logError('Backend Crown wallet sync failed', error, {
          anonymousUserId,
        });
      });
  }, [anonymousUserId]);

  // Load backend settings once the anonymous user is known.
  useEffect(() => {
    if (!anonymousUserId || !appSettingsLoaded) return;
    setBackendSettingsChecked(false);
    fetchBackendUserSettings({ anonymousUserId })
      .then((settings) => {
        if (settings) setAppSettings({ ...createDefaultAppSettings(), ...settings });
      })
      .catch((error) => {
        logWarn('Backend app settings load failed', {
          message: error?.message || String(error),
          anonymousUserId,
        });
      })
      .finally(() => {
        setBackendSettingsChecked(true);
      });
  }, [anonymousUserId, appSettingsLoaded]);

  // Configure interstitial listeners and preload the first ad.
  useEffect(() => {
    if (adsRemoved || !admobInterstitialUnitId) {
      setInterstitialReady(false);
      interstitialRef.current = null;
      return;
    }
    interstitialRef.current = InterstitialAd.createForAdRequest(admobInterstitialUnitId, { requestNonPersonalizedAdsOnly: false, });
    const interstitial = interstitialRef.current;
    if (!interstitial) return;
    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => { setInterstitialReady(true); });
    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setInterstitialReady(false);
      try {
        interstitial.load();
      } catch (error) {
        logError('Interstitial ad reload failed after close', error, {
          platform: Platform.OS,
          adUnitId: admobInterstitialUnitId,
        });
      }
    });
    const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      setInterstitialReady(false);
      setPendingInterstitial(false);
      if (isAdNoFillError(error)) {
        logWarn('Interstitial ad returned no fill', {
          platform: Platform.OS,
          adUnitId: admobInterstitialUnitId,
          message: error?.message || String(error),
        });
        return;
      }
      logError('Interstitial ad event error', error, {
        platform: Platform.OS,
        adUnitId: admobInterstitialUnitId,
      });
    });

    try {
      interstitial.load();
    } catch (error) {
      logError('Interstitial ad initial load failed', error, {
        platform: Platform.OS,
        adUnitId: admobInterstitialUnitId,
      });
    }

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [adsRemoved, admobInterstitialUnitId]);

  useEffect(() => {
    if (adsRemoved) {
      setRewardedReady(false);
      setRewardedStatus('ads_removed');
      rewardedRef.current = null;
      return;
    }
    if (!adInitialized) {
      setRewardedReady(false);
      setRewardedStatus('sdk_initialising');
      rewardedRef.current = null;
      return;
    }
    if (!admobRewardedUnitId) {
      setRewardedReady(false);
      setRewardedStatus('missing_unit_id');
      rewardedRef.current = null;
      return;
    }
    setRewardedReady(false);
    setRewardedStatus('loading');
    rewardedRef.current = RewardedAd.createForAdRequest(admobRewardedUnitId);
    const rewarded = rewardedRef.current;
    const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setRewardedReady(true);
      setRewardedStatus('ready');
    });
    const unsubscribeClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      setRewardedReady(false);
      setRewardedStatus('loading');
    });
    const unsubscribeError = rewarded.addAdEventListener(AdEventType.ERROR, (error) => {
      setRewardedReady(false);
      setRewardedStatus('load_error');
      logError('Rewarded ad load failed', error, {
        adUnitId: admobRewardedUnitId,
      });
    });
    try {
      rewarded.load();
    } catch (error) {
      setRewardedStatus('load_error');
      logError('Rewarded ad initial load failed', error, {
        adUnitId: admobRewardedUnitId,
      });
    }
    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
      setRewardedReady(false);
    };
  }, [adInitialized, adsRemoved, admobRewardedUnitId]);

  // Show an interstitial after an ending when ready.
  useEffect(() => {
    if (adsRemoved || !pendingInterstitial || !interstitialReady) return;
    // Show the interstitial only after the new game begins.
    try {
      interstitialRef.current?.show();
    } catch (error) {
      logError('Interstitial ad show failed', error, {
        platform: Platform.OS,
        adUnitId: admobInterstitialUnitId,
      });
    }
    setPendingInterstitial(false);
    setInterstitialReady(false);
  }, [adsRemoved, interstitialReady, pendingInterstitial, admobInterstitialUnitId]);

  useEffect(() => {
    if (!adsRemoved) return;
    setPendingInterstitial(false);
    setInterstitialReady(false);
  }, [adsRemoved]);

  // Applies purchaser entitlement state to ads and Crown grants.
  const handleCustomerInfo = useCallback(({ tier, periodEnd, adsRemoved: entitlementRemovesAds }) => {
    setAdsRemoved(Boolean(entitlementRemovesAds));
    setCrownWallet((prev) => applySubscriptionTier(prev, tier, periodEnd));
  }, []);

  // Refreshes wallet state after purchases and grants local demo fallback top-ups.
  const refreshBackendWallet = useCallback(async (productId = '') => {
    let refreshedWallet = null;
    const isCrownPurse = productId === REVENUECAT_PRODUCT_IDS.crownPurse;
    const previousWallet = refreshDailyCrowns(appBridge.crownWallet || crownWallet || createDefaultCrownWallet());
    const previousTotal = getTotalCrowns(previousWallet);
    if (anonymousUserId) {
      try {
        const wallet = await fetchBackendCrownWallet({ anonymousUserId });
        if (wallet) {
          refreshedWallet = mergeCrownWallets(previousWallet, wallet);
        }
      } catch (error) {
        logError('Backend Crown wallet refresh failed', error, {
          anonymousUserId,
          productId,
        });
      }
    }
    if (isCrownPurse && (!refreshedWallet || getTotalCrowns(refreshedWallet) < previousTotal + CROWN_PURSE_CROWNS)) {
      const fallbackBase = refreshedWallet && getTotalCrowns(refreshedWallet) >= previousTotal
        ? refreshedWallet
        : previousWallet;
      refreshedWallet = refreshDailyCrowns({
        ...fallbackBase,
        topupCrowns: Number(fallbackBase?.topupCrowns || 0) + CROWN_PURSE_CROWNS,
      });
    }
    if (refreshedWallet) setCrownWallet(refreshedWallet);
    return refreshedWallet;
  }, [anonymousUserId]);

  useEffect(() => {
    if (screen !== 'removeAdverts') return;
    refreshBackendWallet('').catch((error) => {
      logError('Crown shop wallet refresh failed', error, {
        anonymousUserId,
      });
    });
  }, [anonymousUserId, refreshBackendWallet, screen]);

  // Grants Crowns after a rewarded ad, falling back locally without backend access.
  const grantRewardedCrownsAfterAd = useCallback(async (adReward = null) => {
    const rewardedCrowns = REWARDED_AD_CROWNS;
    try {
      const backendWallet = await grantBackendRewardedCrowns({
        anonymousUserId,
        adNetworkReceipt: adReward
          ? {
              source: 'admob',
              amount: rewardedCrowns,
              type: adReward.type || null,
            }
          : null,
      });
      if (backendWallet) {
        setCrownWallet((prev) => {
          const previousWallet = refreshDailyCrowns(prev || createDefaultCrownWallet());
          const mergedWallet = mergeCrownWallets(previousWallet, backendWallet);
          return refreshDailyCrowns({
            ...mergedWallet,
            rewardedCrowns: Math.max(
              Number(mergedWallet.rewardedCrowns || 0),
              Number(previousWallet.rewardedCrowns || 0) + rewardedCrowns
            ),
            rewardedAdsWatchedToday: Math.max(
              Number(mergedWallet.rewardedAdsWatchedToday || 0),
              Number(previousWallet.rewardedAdsWatchedToday || 0) + 1
            ),
          });
        });
        appBridge.showToast(`${rewardedCrowns} Crowns added.`);
        return;
      }
    } catch (error) {
      logError('Backend rewarded Crown grant failed; using local fallback', error, {
        anonymousUserId,
      });
    }
    setCrownWallet((prev) => {
      const result = grantRewardedAdCrowns(prev, rewardedCrowns);
      appBridge.showToast(result.granted ? `${result.crownsGranted} Crowns added.` : 'No rewarded adverts remain today.');
      return result.wallet;
    });
  }, [anonymousUserId]);

  // Shows a rewarded ad and waits for the earned reward callback.
  const handleRewardedAdGrant = useCallback(() => {
    const rewarded = rewardedRef.current;
    if (!rewarded) {
      appBridge.showToast('Rewarded adverts are not ready yet.');
      return;
    }
    if (!rewarded.loaded) {
      appBridge.showToast('The advert is being prepared. Please try again in a moment.');
      try {
        setRewardedStatus('loading');
        rewarded.load();
      } catch (error) {
        setRewardedStatus('load_error');
        logError('Rewarded ad preload retry failed', error, {
          adUnitId: admobRewardedUnitId,
        });
      }
      return;
    }
    let earnedReward = false;
    const unsubscribeEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      earnedReward = true;
      grantRewardedCrownsAfterAd(reward);
    });
    const unsubscribeClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      unsubscribeEarned();
      unsubscribeClosed();
      setRewardedReady(false);
      setRewardedStatus('loading');
      if (!earnedReward) appBridge.showToast('Advert closed before reward was earned.');
      try {
        rewarded.load();
      } catch (error) {
        logError('Rewarded ad reload failed after close', error, {
          adUnitId: admobRewardedUnitId,
        });
      }
    });
    try {
      setRewardedReady(false);
      setRewardedStatus('showing');
      rewarded.show();
    } catch (error) {
      unsubscribeEarned();
      unsubscribeClosed();
      setRewardedReady(false);
      setRewardedStatus('load_error');
      logError('Rewarded ad show failed', error, {
        adUnitId: admobRewardedUnitId,
      });
      appBridge.showToast('Rewarded advert is not ready yet.');
      try {
        setRewardedStatus('loading');
        rewarded.load();
      } catch (loadError) {
        setRewardedStatus('load_error');
        logError('Rewarded ad reload failed after show error', loadError, {
          adUnitId: admobRewardedUnitId,
        });
      }
    }
  }, [grantRewardedCrownsAfterAd, admobRewardedUnitId]);

  const getRelationshipBorderColor = useCallback((score) => {
    if (score >= 32) return colors.relationshipHigh;
    if (score <= 7) return colors.relationshipLow;
    return colors.relationshipNeutral;
  }, []);

  const getRelationshipLabel = useCallback((score) => {
    if (score <= 7) return 'Hated';
    if (score <= 15) return 'Disliked';
    if (score <= 20) return 'Neutral';
    if (score <= 31) return 'Liked';
    return 'Loved';
  }, []);

  const [toastMessage, setToastMessage] = useState('');
  const showToast = useCallback((message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage('');
    }, 2200);
  }, []);
  appBridge.toastMessage = toastMessage;
  appBridge.showToast = showToast;

  const theme = getSettingTheme(GameScreen?.activeSettingId || defaultSettingId) || {
    background: colors.background,
    header: colors.header,
    footer: colors.footer,
  };
  // Renders the shared banner ad placement for screens that allow ads.
  const renderBannerAd = () => {
    if (adsRemoved || !adInitialized || !admobBannerUnitId) return null;
    return (
      <View style={styles.bannerContainer}>
        <BannerAd
          unitId={admobBannerUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: false }}
          onAdFailedToLoad={(error) => {
            if (isAdNoFillError(error)) {
              logWarn('Banner ad returned no fill', {
                platform: Platform.OS,
                adUnitId: admobBannerUnitId,
                message: error?.message || String(error),
              });
              return;
            }
            logError('Banner ad load failed', error, {
              platform: Platform.OS,
              adUnitId: admobBannerUnitId,
            });
          }}
        />
      </View>
    );
  };

  if (screen === 'settings') {
    return (
      <SettingsScreen
        theme={theme}
        renderBannerAd={renderBannerAd}
        appSettings={appSettings}
        onSettingsChange={setAppSettings}
      />
    );
  }

  if (screen === 'removeAdverts') {
    return (
      <RemoveAdvertsScreen
        theme={theme}
        renderBannerAd={renderBannerAd}
        crownWallet={crownWallet}
        adsRemoved={adsRemoved}
        rewardedReady={rewardedReady}
        rewardedStatus={rewardedStatus}
        toastMessage={toastMessage}
        onRewardedAdGrant={handleRewardedAdGrant}
        onCustomerInfo={handleCustomerInfo}
        onPurchaseComplete={refreshBackendWallet}
        revenueCatApiKey={revenueCatConfig.apiKey}
        revenueCatApiKeySource={revenueCatConfig.source}
        appEnvironment={revenueCatConfig.environment}
        anonymousUserId={anonymousUserId}
      />
    );
  }

  if (screen === 'relationships') {

    return (
      <RelationshipsScreen
        theme={theme}
        getRelationshipBorderColor={getRelationshipBorderColor}
        getRelationshipLabel={getRelationshipLabel}
        renderBannerAd={renderBannerAd}
      />
    );
  }

  return (
    <GameScreen
      theme={theme}
      defaultSettingId={defaultSettingId}
      getSettingTheme={getSettingTheme}
      errorMessage={errorMessage}
      getRelationshipLabel={getRelationshipLabel}
      toastMessage={toastMessage}
      renderBannerAd={renderBannerAd}
      anonymousUserId={anonymousUserId}
      crownWallet={crownWallet}
      setCrownWallet={setCrownWallet}
      aiBackendReady={appConfigReady}
      appSettings={appSettings}
    />
  );
}
