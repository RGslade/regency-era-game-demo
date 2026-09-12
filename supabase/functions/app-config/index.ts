import { handleOptions, jsonResponse } from '../_shared/http.ts';

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  return jsonResponse({
    openAiModel: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini',
    revenueCatIosApiKey: Deno.env.get('REVENUECAT_IOS_API_KEY') || '',
    revenueCatAndroidApiKey: Deno.env.get('REVENUECAT_ANDROID_API_KEY') || '',
    admobIosBannerUnitId: Deno.env.get('ADMOB_IOS_BANNER_UNIT_ID') || '',
    admobAndroidBannerUnitId: Deno.env.get('ADMOB_ANDROID_BANNER_UNIT_ID') || '',
    admobIosInterstitialUnitId: Deno.env.get('ADMOB_IOS_INTERSTITIAL_UNIT_ID') || '',
    admobAndroidInterstitialUnitId: Deno.env.get('ADMOB_ANDROID_INTERSTITIAL_UNIT_ID') || '',
    admobIosRewardedUnitId: Deno.env.get('ADMOB_IOS_REWARDED_UNIT_ID') || '',
    admobAndroidRewardedUnitId: Deno.env.get('ADMOB_ANDROID_REWARDED_UNIT_ID') || '',
  });
});

