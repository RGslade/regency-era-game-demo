import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY || '';

export const APP_ENVIRONMENT = __DEV__ ? 'development' : 'production';
const LOCAL_BUILD_CONFIG_ENABLED = APP_ENVIRONMENT === 'development';
const LOCAL_BUILD_ADMOB_BANNER_UNIT_ID = LOCAL_BUILD_CONFIG_ENABLED ? process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID || TestIds.BANNER : '';
const LOCAL_BUILD_ADMOB_INTERSTITIAL_UNIT_ID = LOCAL_BUILD_CONFIG_ENABLED ? process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID || TestIds.INTERSTITIAL : '';
const LOCAL_BUILD_ADMOB_REWARDED_UNIT_ID = LOCAL_BUILD_CONFIG_ENABLED ? process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID || TestIds.REWARDED : '';

// Normalizes backend base URLs before function paths are appended.
const normalizeSupabaseUrl = (url) => String(url || '').replace(/\/$/, '');

// Verifies whether a Supabase key can be sent as a bearer token.
export const isJwtFormat = (value) => {
  const parts = String(value || '').split('.');
  return parts.length === 3 && parts.every(Boolean);
};

export const hasSupabaseFunctionAuth = () => Boolean(SUPABASE_ANON_KEY);

// Builds public client headers for Supabase Edge Function calls.
export const buildSupabaseFunctionHeaders = (extraHeaders = {}) => ({
  ...extraHeaders,
  ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}),
  ...(isJwtFormat(SUPABASE_ANON_KEY) ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
});

export const SUPABASE_FUNCTION_URLS = {
  config: SUPABASE_URL ? `${normalizeSupabaseUrl(SUPABASE_URL)}/functions/v1/app-config` : '',
  story: SUPABASE_URL ? `${normalizeSupabaseUrl(SUPABASE_URL)}/functions/v1/generate-story-turn` : '',
  wallet: SUPABASE_URL ? `${normalizeSupabaseUrl(SUPABASE_URL)}/functions/v1/crown-wallet` : '',
  report: SUPABASE_URL ? `${normalizeSupabaseUrl(SUPABASE_URL)}/functions/v1/report-ai-outcome` : '',
  settings: SUPABASE_URL ? `${normalizeSupabaseUrl(SUPABASE_URL)}/functions/v1/user-settings` : '',
};

export const SUPABASE_BOOTSTRAP_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
};

export const DEFAULT_APP_CONFIG = {
  openAiModel: '',
  revenueCatIosApiKey: '',
  revenueCatAndroidApiKey: '',
  admobIosBannerUnitId: LOCAL_BUILD_ADMOB_BANNER_UNIT_ID,
  admobAndroidBannerUnitId: LOCAL_BUILD_ADMOB_BANNER_UNIT_ID,
  admobIosInterstitialUnitId: LOCAL_BUILD_ADMOB_INTERSTITIAL_UNIT_ID,
  admobAndroidInterstitialUnitId: LOCAL_BUILD_ADMOB_INTERSTITIAL_UNIT_ID,
  admobIosRewardedUnitId: LOCAL_BUILD_ADMOB_REWARDED_UNIT_ID,
  admobAndroidRewardedUnitId: LOCAL_BUILD_ADMOB_REWARDED_UNIT_ID,
};

// Converts common Supabase auth failures into actionable developer errors.
const buildSupabaseFunctionError = (functionName, responseText) => {
  if (
    responseText.includes('UNAUTHORIZED_NO_AUTH_HEADER') ||
    responseText.includes('UNAUTHORIZED_INVALID_JWT_FORMAT')
  ) {
    const keyType = isJwtFormat(SUPABASE_ANON_KEY) ? 'JWT anon key' : 'publishable key';
    return new Error(
      `Supabase ${functionName} rejected the app ${keyType}. ` +
      'If EXPO_PUBLIC_SUPABASE_ANON_KEY starts with sb_publishable_, deploy this Edge Function with verify_jwt=false. ' +
      'If you want verify_jwt=true, use the JWT-style Supabase anon key instead. ' +
      `Supabase response: ${responseText}`
    );
  }
  return new Error(responseText || `Supabase ${functionName} request failed.`);
};

export const getPlatformConfigValue = (config, iosKey, androidKey, fallback = '') =>
  Platform.select({
    ios: config?.[iosKey] || fallback,
    android: config?.[androidKey] || fallback,
    default: fallback,
  }) || fallback;

// Chooses the RevenueCat key for the current platform or local test mode.
export const getRevenueCatApiKey = (config = {}) => {
  if (APP_ENVIRONMENT === 'development' && REVENUECAT_TEST_API_KEY) {
    return {
      apiKey: REVENUECAT_TEST_API_KEY,
      source: 'test',
      environment: APP_ENVIRONMENT,
    };
  }
  return {
    apiKey: getPlatformConfigValue(config, 'revenueCatIosApiKey', 'revenueCatAndroidApiKey'),
    source: Platform.OS,
    environment: APP_ENVIRONMENT,
  };
};

// Lists config values required before production monetization can run.
const getRequiredRemoteConfigKeys = () => {
  const keys = ['openAiModel'];
  if (APP_ENVIRONMENT !== 'development') {
    if (Platform.OS === 'ios') {
      keys.push('revenueCatIosApiKey', 'admobIosBannerUnitId', 'admobIosInterstitialUnitId', 'admobIosRewardedUnitId');
    } else if (Platform.OS === 'android') {
      keys.push(
        'revenueCatAndroidApiKey',
        'admobAndroidBannerUnitId',
        'admobAndroidInterstitialUnitId',
        'admobAndroidRewardedUnitId'
      );
    }
  }
  return keys;
};

// Ensures remote config has every platform-specific value the app needs.
const validateRemoteAppConfig = (config = {}) => {
  const missingKeys = getRequiredRemoteConfigKeys().filter((key) => !config[key]);
  if (missingKeys.length > 0) {
    throw new Error(`Supabase app-config is missing required key(s): ${missingKeys.join(', ')}`);
  }
};

// Lets local builds override ad units without committing private IDs.
const applyLocalBuildAdMobOverrides = (config = {}) => {
  if (!LOCAL_BUILD_CONFIG_ENABLED) return config;
  return {
    ...config,
    ...(LOCAL_BUILD_ADMOB_BANNER_UNIT_ID ? {
      admobIosBannerUnitId: LOCAL_BUILD_ADMOB_BANNER_UNIT_ID,
      admobAndroidBannerUnitId: LOCAL_BUILD_ADMOB_BANNER_UNIT_ID,
    } : {}),
    ...(LOCAL_BUILD_ADMOB_INTERSTITIAL_UNIT_ID ? {
      admobIosInterstitialUnitId: LOCAL_BUILD_ADMOB_INTERSTITIAL_UNIT_ID,
      admobAndroidInterstitialUnitId: LOCAL_BUILD_ADMOB_INTERSTITIAL_UNIT_ID,
    } : {}),
    ...(LOCAL_BUILD_ADMOB_REWARDED_UNIT_ID ? {
      admobIosRewardedUnitId: LOCAL_BUILD_ADMOB_REWARDED_UNIT_ID,
      admobAndroidRewardedUnitId: LOCAL_BUILD_ADMOB_REWARDED_UNIT_ID,
    } : {}),
  };
};

// Loads public-safe runtime configuration from the configured backend.
export const loadRemoteAppConfig = async () => {
  if (!SUPABASE_FUNCTION_URLS.config) {
    return DEFAULT_APP_CONFIG;
  }
  if (!hasSupabaseFunctionAuth()) {
    return DEFAULT_APP_CONFIG;
  }

  const response = await fetch(SUPABASE_FUNCTION_URLS.config, {
    headers: buildSupabaseFunctionHeaders(),
  });
  if (!response.ok) {
    throw buildSupabaseFunctionError('app-config', await response.text());
  }
  const config = applyLocalBuildAdMobOverrides({
    ...DEFAULT_APP_CONFIG,
    ...(await response.json()),
  });
  validateRemoteAppConfig(config);
  return config;
};
