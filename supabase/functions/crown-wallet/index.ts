import { getOrCreateUser, getWallet, insertLedger, saveWallet } from '../_shared/db.ts';
import { handleOptions, jsonResponse, textResponse } from '../_shared/http.ts';

const rewardCrowns = 20;
const maxRewardedAdsPerDay = 2;

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  try {
    const body = await request.json();
    const anonymousUserId = String(body.anonymousUserId || '').trim();
    if (!anonymousUserId) return textResponse('anonymousUserId is required.', 400);

    const user = await getOrCreateUser(anonymousUserId);
    const wallet = await getWallet(user.id);

    if (body.action === 'get_wallet') {
      const savedWallet = await saveWallet(user.id, wallet);
      return jsonResponse({ wallet: savedWallet });
    }

    if (body.action === 'grant_rewarded_ad') {
      if (wallet.rewardedAdsWatchedToday >= maxRewardedAdsPerDay) {
        return jsonResponse({ wallet, granted: false, crownsGranted: 0 });
      }
      const updatedWallet = {
        ...wallet,
        rewardedCrowns: wallet.rewardedCrowns + rewardCrowns,
        rewardedAdsWatchedToday: wallet.rewardedAdsWatchedToday + 1,
      };
      const savedWallet = await saveWallet(user.id, updatedWallet);
      await insertLedger(user.id, rewardCrowns, 'rewarded_ad', 'Rewarded ad completed.');
      return jsonResponse({ wallet: savedWallet, granted: true, crownsGranted: rewardCrowns });
    }

    return textResponse(`Unsupported wallet action: ${body.action || 'missing'}`, 400);
  } catch (error) {
    return textResponse(error instanceof Error ? error.message : String(error), 500);
  }
});

