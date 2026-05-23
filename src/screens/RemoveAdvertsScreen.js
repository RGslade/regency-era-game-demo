import { useCallback, useEffect, useState } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { Alert, Platform, SafeAreaView, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { appStyles as styles } from '../styles/appStyles';
import {
  REVENUECAT_ENTITLEMENTS,
  REVENUECAT_PRODUCT_IDS,
  REWARDED_AD_CROWNS,
  CROWN_PURSE_CROWNS,
  SOCIETY_PATRON_MONTHLY_CROWNS,
  COURT_FAVOURITE_MONTHLY_CROWNS,
} from '../constants/game';
import { appBridge } from '../services/appBridge';
import { buildUserErrorMessage, logError, logInfo, logWarn } from '../services/logger';
import { getRewardedAdsRemaining, getTotalCrowns } from '../services/crowns';

const purchasePlans = {
  society_patron: {
    productId: REVENUECAT_PRODUCT_IDS.societyPatron,
    purchaseType: 'package',
    title: 'Society Patron - Monthly subscription',
    body: `${SOCIETY_PATRON_MONTHLY_CROWNS} Crowns each month and adverts removed while active.`,
  },
  court_favourite: {
    productId: REVENUECAT_PRODUCT_IDS.courtFavourite,
    purchaseType: 'package',
    title: 'Court Favourite - Monthly subscription',
    body: `${COURT_FAVOURITE_MONTHLY_CROWNS} Crowns each month and adverts removed while active.`,
  },
  crown_purse: {
    productId: REVENUECAT_PRODUCT_IDS.crownPurse,
    purchaseType: 'store_product',
    title: `Crown Purse - ${CROWN_PURSE_CROWNS} Crowns`,
    body: 'One-time Crown top-up.',
  },
};

const summarizeProduct = (product = {}) => ({
  identifier: product.identifier || null,
  title: product.title || null,
  description: product.description || null,
  priceString: product.priceString || null,
  currencyCode: product.currencyCode || null,
});

const summarizeCustomerInfo = (customerInfo = {}) => ({
  activeEntitlements: Object.keys(customerInfo?.entitlements?.active || {}),
  allPurchasedProductIdentifiers: customerInfo?.allPurchasedProductIdentifiers || [],
  latestExpirationDate: customerInfo?.latestExpirationDate || null,
  originalAppUserId: customerInfo?.originalAppUserId || null,
});

const formatProductPrice = (product = null) => {
  if (!product) return '';
  if (product.priceString) return product.priceString;
  if (typeof product.price === 'number') {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: product.currencyCode || 'USD',
      }).format(product.price);
    } catch {
      return `${product.currencyCode || 'USD'} ${product.price}`;
    }
  }
  return '';
};

const getPlanRewardText = (planKey) => {
  if (planKey === 'crown_purse') return `${CROWN_PURSE_CROWNS} Crowns`;
  return '';
};

export const RemoveAdvertsScreen = ({
  theme,
  renderBannerAd,
  crownWallet,
  adsRemoved = false,
  rewardedReady = false,
  rewardedStatus = 'idle',
  toastMessage = '',
  onRewardedAdGrant,
  onCustomerInfo,
  onPurchaseComplete,
  revenueCatApiKey = '',
  revenueCatApiKeySource = '',
  appEnvironment = 'production',
  anonymousUserId = '',
}) => {
  const [purchasesReady, setPurchasesReady] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [packagesByProductId, setPackagesByProductId] = useState({});
  const [storeProductsById, setStoreProductsById] = useState({});
  const hasRevenueCatKey = Boolean(revenueCatApiKey);
  const hasAnonymousUserId = Boolean(anonymousUserId);
  const totalCrowns = getTotalCrowns(crownWallet);
  const rewardedAdsRemaining = getRewardedAdsRemaining(crownWallet);
  const rewardedButtonText =
    rewardedReady
      ? 'Watch advert'
      : rewardedStatus === 'ads_removed'
        ? 'Adverts removed'
        : rewardedStatus === 'load_error'
          ? 'Advert unavailable'
          : 'Preparing advert';
  const rewardedStatusText =
    rewardedStatus === 'load_error'
      ? 'The advert has not loaded from AdMob. Check the rewarded ad unit, app/ad-unit approval, test device setup, and fill availability in AdMob.'
      : rewardedStatus === 'missing_unit_id'
        ? 'Rewarded advert setup is missing an ad unit ID.'
        : rewardedStatus === 'sdk_initialising'
          ? 'The advert service is still initialising.'
          : '';
  const activeSubscriptionTier = crownWallet?.subscriptionTier || 'free';
  const hasActiveSubscription = adsRemoved || activeSubscriptionTier !== 'free';
  const purchaseCuePlayer = useAudioPlayer(require('../../assets/sounds/handleCoins.wav'));
  const soundEnabled = appBridge.appSettings?.soundEnabled !== false;

  useEffect(() => {
    purchaseCuePlayer.volume = 0.65;
  }, [purchaseCuePlayer]);

  const playPurchaseCue = useCallback(() => {
    if (!soundEnabled) return;
    purchaseCuePlayer.seekTo(0)
      .then(() => purchaseCuePlayer.play())
      .catch((error) => {
        logError('Purchase sound effect playback failed', error, {});
      });
  }, [purchaseCuePlayer, soundEnabled]);

  const handleCustomerInfo = useCallback((customerInfo) => {
    const active = customerInfo?.entitlements?.active || {};
    const tier = active[REVENUECAT_ENTITLEMENTS.courtFavourite]
      ? 'court_favourite'
      : active[REVENUECAT_ENTITLEMENTS.societyPatron]
        ? 'society_patron'
        : 'free';
    const entitlement = active[REVENUECAT_ENTITLEMENTS.courtFavourite] || active[REVENUECAT_ENTITLEMENTS.societyPatron];
    const revenueCatAppUserId = customerInfo?.originalAppUserId || null;
    if (anonymousUserId && revenueCatAppUserId && revenueCatAppUserId !== anonymousUserId) {
      logWarn('RevenueCat App User ID does not match local Supabase wallet user', {
        environment: appEnvironment,
        keySource: revenueCatApiKeySource,
        platform: Platform.OS,
        anonymousUserId,
        revenueCatAppUserId,
      });
    }
    logInfo('RevenueCat customer info received', {
      environment: appEnvironment,
      keySource: revenueCatApiKeySource,
      platform: Platform.OS,
      anonymousUserId,
      revenueCatAppUserId,
      tier,
      adsRemoved: tier !== 'free',
      customerInfo: summarizeCustomerInfo(customerInfo),
    });
    onCustomerInfo?.({
      tier,
      periodEnd: entitlement?.expirationDate || null,
      adsRemoved: tier !== 'free',
    });
  }, [anonymousUserId, appEnvironment, onCustomerInfo, revenueCatApiKeySource]);

  useEffect(() => {
    let isMounted = true;
    const configurePurchases = async () => {
      if (!revenueCatApiKey || !anonymousUserId) {
        logWarn('RevenueCat setup skipped; required configuration missing', {
          environment: appEnvironment,
          keySource: revenueCatApiKeySource,
          platform: Platform.OS,
          hasRevenueCatKey,
          hasAnonymousUserId,
        });
        setPurchasesReady(false);
        return;
      }
      try {
        logInfo('RevenueCat setup started', {
          environment: appEnvironment,
          keySource: revenueCatApiKeySource,
          platform: Platform.OS,
          hasRevenueCatKey,
          anonymousUserId,
        });
        Purchases.setLogLevel(LOG_LEVEL.INFO);
        Purchases.configure({ apiKey: revenueCatApiKey, appUserID: anonymousUserId });
        logInfo('RevenueCat configured', {
          environment: appEnvironment,
          keySource: revenueCatApiKeySource,
          platform: Platform.OS,
          anonymousUserId,
        });
        const customerInfo = await Purchases.getCustomerInfo();
        handleCustomerInfo(customerInfo);
        const offerings = await Purchases.getOfferings();
        const defaultOffering = offerings?.all?.default || offerings?.current;
        const packages = defaultOffering?.availablePackages || [];
        logInfo('RevenueCat offerings fetched', {
          environment: appEnvironment,
          keySource: revenueCatApiKeySource,
          currentOfferingIdentifier: offerings?.current?.identifier || null,
          offeringIdentifiers: Object.keys(offerings?.all || {}),
          packages: packages.map((pkg) => ({
            identifier: pkg?.identifier || null,
            packageType: pkg?.packageType || null,
            product: summarizeProduct(pkg?.product),
          })),
        });
        const mapped = {};
        packages.forEach((pkg) => {
          const productId = pkg?.product?.identifier || pkg?.identifier;
          if (productId) mapped[productId] = pkg;
        });
        const storeProducts = await Purchases.getProducts(
          [REVENUECAT_PRODUCT_IDS.crownPurse],
          Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION
        );
        const mappedStoreProducts = {};
        storeProducts.forEach((product) => {
          if (product?.identifier) mappedStoreProducts[product.identifier] = product;
        });
        logInfo('RevenueCat store products fetched', {
          environment: appEnvironment,
          keySource: revenueCatApiKeySource,
          products: storeProducts.map(summarizeProduct),
          localeCurrencyNote: 'RevenueCat priceString is supplied by the store and should already match the user storefront locale.',
        });
        if (isMounted) {
          setPackagesByProductId(mapped);
          setStoreProductsById(mappedStoreProducts);
          setPurchasesReady(true);
        }
      } catch (error) {
        logError('RevenueCat Crown shop setup failed', error, {
          hasRevenueCatKey,
          hasAnonymousUserId,
          anonymousUserId,
          environment: appEnvironment,
          keySource: revenueCatApiKeySource,
          platform: Platform.OS,
        });
        if (isMounted) {
          setPurchasesReady(false);
          appBridge.setErrorMessage(buildUserErrorMessage(
            'Purchases setup failed. Check RevenueCat product and entitlement IDs.',
            error
          ));
        }
      }
    };

    Purchases.addCustomerInfoUpdateListener(handleCustomerInfo);
    configurePurchases();
    return () => {
      isMounted = false;
      Purchases.removeCustomerInfoUpdateListener(handleCustomerInfo);
    };
  }, [anonymousUserId, appEnvironment, handleCustomerInfo, hasAnonymousUserId, hasRevenueCatKey, revenueCatApiKey, revenueCatApiKeySource]);

  const purchaseProduct = useCallback(async (planKey) => {
    const plan = purchasePlans[planKey];
    const productPackage = packagesByProductId[plan.productId];
    const storeProduct = storeProductsById[plan.productId];
    const purchaseTarget = plan.purchaseType === 'store_product' ? storeProduct : productPackage;
    if (!purchasesReady || !purchaseTarget) {
      logWarn('RevenueCat purchase blocked; target unavailable', {
        environment: appEnvironment,
        keySource: revenueCatApiKeySource,
        planKey,
        productId: plan.productId,
        purchasesReady,
        hasProductPackage: Boolean(productPackage),
        hasStoreProduct: Boolean(storeProduct),
      });
      appBridge.showToast('Purchases are not ready yet. Check RevenueCat setup.');
      return;
    }
    if (planKey === 'crown_purse' && totalCrowns > 0) {
      appBridge.showToast('You still have Crowns. This top-up will be added if you continue.');
    }
    setPurchaseBusy(true);
    try {
      logInfo('RevenueCat purchase started', {
        environment: appEnvironment,
        keySource: revenueCatApiKeySource,
        planKey,
        productId: plan.productId,
        purchaseType: plan.purchaseType,
        anonymousUserId,
      });
      const result = plan.purchaseType === 'store_product'
        ? await Purchases.purchaseStoreProduct(storeProduct)
        : await Purchases.purchasePackage(productPackage);
      const refreshedWallet = await onPurchaseComplete?.(plan.productId);
      logInfo('RevenueCat purchase completed', {
        environment: appEnvironment,
        keySource: revenueCatApiKeySource,
        planKey,
        productId: plan.productId,
        anonymousUserId,
        customerInfo: summarizeCustomerInfo(result?.customerInfo),
        walletRefreshed: Boolean(refreshedWallet),
      });
      handleCustomerInfo(result?.customerInfo);
      playPurchaseCue();
      if (planKey === 'crown_purse') {
        const refreshedTotal = getTotalCrowns(refreshedWallet || crownWallet);
        appBridge.showToast(`A purse of ${CROWN_PURSE_CROWNS} Crowns has been placed in your keeping. Balance: ${refreshedTotal}.`);
      } else {
        appBridge.showToast('Your patronage is accepted. Crowns refreshed and adverts dismissed.');
      }
    } catch (error) {
      if (!error?.userCancelled) {
        logError('Crown shop purchase failed', error, {
          productId: plan.productId,
          environment: appEnvironment,
          keySource: revenueCatApiKeySource,
          anonymousUserId,
        });
        appBridge.setErrorMessage(buildUserErrorMessage('Purchase failed. Please try again.', error));
      } else {
        logInfo('RevenueCat purchase cancelled by user', {
          environment: appEnvironment,
          keySource: revenueCatApiKeySource,
          planKey,
          productId: plan.productId,
        });
      }
      await onPurchaseComplete?.('');
    } finally {
      setPurchaseBusy(false);
    }
  }, [anonymousUserId, appEnvironment, crownWallet, handleCustomerInfo, onPurchaseComplete, packagesByProductId, playPurchaseCue, purchasesReady, revenueCatApiKeySource, storeProductsById, totalCrowns]);

  const restorePurchases = useCallback(async () => {
    if (!purchasesReady) {
      logWarn('RevenueCat restore blocked; purchases not ready', {
        environment: appEnvironment,
        keySource: revenueCatApiKeySource,
      });
      appBridge.showToast('Purchases are not ready yet.');
      Alert.alert('Restore Failed', 'Purchases are not ready yet. Please try again shortly.');
      return;
    }
    setPurchaseBusy(true);
    try {
      logInfo('RevenueCat restore started', {
        environment: appEnvironment,
        keySource: revenueCatApiKeySource,
        anonymousUserId,
      });
      const customerInfo = await Purchases.restorePurchases();
      const active = customerInfo?.entitlements?.active || {};
      const tier = active[REVENUECAT_ENTITLEMENTS.courtFavourite]
        ? REVENUECAT_PRODUCT_IDS.courtFavourite
        : active[REVENUECAT_ENTITLEMENTS.societyPatron]
          ? REVENUECAT_PRODUCT_IDS.societyPatron
          : '';
      handleCustomerInfo(customerInfo);
      const refreshedWallet = await onPurchaseComplete?.(tier);
      logInfo('RevenueCat restore completed', {
        environment: appEnvironment,
        keySource: revenueCatApiKeySource,
        anonymousUserId,
        customerInfo: summarizeCustomerInfo(customerInfo),
        walletRefreshed: Boolean(refreshedWallet),
      });
      appBridge.showToast('Purchases restored.');
      Alert.alert('Restore Successful', 'Your purchases have been restored.');
    } catch (error) {
      logError('Crown shop restore failed', error, {
        environment: appEnvironment,
        keySource: revenueCatApiKeySource,
        anonymousUserId,
      });
      const message = buildUserErrorMessage('Restore failed. Please try again.', error);
      appBridge.setErrorMessage(message);
      Alert.alert('Restore Failed', message);
    } finally {
      setPurchaseBusy(false);
    }
  }, [anonymousUserId, appEnvironment, handleCustomerInfo, onPurchaseComplete, purchasesReady, revenueCatApiKeySource]);

  const renderPlan = (planKey) => {
    const plan = purchasePlans[planKey];
    const productPackage = packagesByProductId[plan.productId];
    const storeProduct = storeProductsById[plan.productId];
    const product = productPackage?.product || storeProduct;
    if (plan.purchaseType === 'package' && hasActiveSubscription) return null;
    const title = plan.title || product?.title || product?.identifier || plan.productId;
    const rewardText = getPlanRewardText(planKey);
    const body = plan.body || product?.description || '';
    const price = formatProductPrice(product);
    const isUnavailable = purchaseBusy || !product;
    return (
      <View key={planKey} style={styles.shopPlan}>
        <Text style={styles.shopPlanTitle}>{rewardText && !title.includes(rewardText) ? `${title} - ${rewardText}` : title}</Text>
        {body ? <Text style={styles.shopPlanBody}>{body}</Text> : null}
        <TouchableOpacity
          style={[styles.settingButton, isUnavailable ? styles.buttonDisabled : null]}
          disabled={isUnavailable}
          onPress={() => purchaseProduct(planKey)}
        >
          <Text style={styles.settingButtonText}>{price || 'Unavailable'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.settingsHeader, { backgroundColor: theme.header }]}>
        <TouchableOpacity onPress={() => appBridge.setScreen('settings')} style={styles.menuButton}>
          <Text style={styles.menuButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.settingsTitle}>Crowns</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView contentContainerStyle={styles.shopScrollContent}>
        <View style={styles.crownBalanceCard}>
          <Text style={styles.crownIcon}>C</Text>
          <Text style={styles.crownBalanceValue}>{totalCrowns}</Text>
          <Text style={styles.crownBalanceLabel}>Crowns remaining</Text>
        </View>

        <View style={styles.shopPlan}>
          <Text style={styles.shopPlanTitle}>Earn with an advert</Text>
          <Text style={styles.shopPlanBody}>
            Watch a rewarded advert for {REWARDED_AD_CROWNS} Crowns. {rewardedAdsRemaining} advert{rewardedAdsRemaining === 1 ? '' : 's'} remaining today.
          </Text>
          <TouchableOpacity
            style={[styles.settingButton, rewardedAdsRemaining <= 0 || !rewardedReady ? styles.buttonDisabled : null]}
            disabled={rewardedAdsRemaining <= 0 || !rewardedReady}
            onPress={onRewardedAdGrant}
          >
            <Text style={styles.settingButtonText}>{rewardedButtonText}</Text>
          </TouchableOpacity>
          {rewardedStatusText ? (
            <Text style={styles.settingDescription}>{rewardedStatusText}</Text>
          ) : null}
        </View>

        {hasActiveSubscription ? (
          <View style={styles.shopPlan}>
            <Text style={styles.shopPlanTitle}>Subscription active</Text>
            <Text style={styles.shopPlanBody}>
              Your current subscription is active. Subscription options are hidden while you are subscribed.
            </Text>
          </View>
        ) : (
          <>
            {renderPlan('society_patron')}
            {renderPlan('court_favourite')}
          </>
        )}
        {renderPlan('crown_purse')}

        <TouchableOpacity
          style={[styles.settingButton, purchaseBusy ? styles.buttonDisabled : null]}
          disabled={purchaseBusy}
          onPress={restorePurchases}
        >
          <Text style={styles.settingButtonText}>Restore Purchases</Text>
        </TouchableOpacity>
        {!hasRevenueCatKey ? (
          <Text style={styles.settingDescription}>
            RevenueCat API key missing. Add it to Supabase secrets.
          </Text>
        ) : null}
      </ScrollView>
      {toastMessage ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}
      {renderBannerAd?.()}
    </SafeAreaView>
  );
};
