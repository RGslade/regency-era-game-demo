import { getOrCreateUser, getWallet, insertLedger, restFetch, readJson, saveWallet } from '../_shared/db.ts';
import { handleOptions, jsonResponse, textResponse } from '../_shared/http.ts';

const tierForEntitlement = (entitlementId: string | null) => {
  if (entitlementId === 'court_favourite') return { tier: 'court_favourite', crowns: 2000 };
  if (entitlementId === 'society_patron') return { tier: 'society_patron', crowns: 750 };
  return { tier: 'free', crowns: 0 };
};

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  try {
    const configuredSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') || '';
    if (configuredSecret) {
      const suppliedSecret = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
      if (suppliedSecret !== configuredSecret) return textResponse('Unauthorized.', 401);
    }

    const body = await request.json();
    const event = body.event || body;
    const appUserId = String(event.app_user_id || event.appUserId || '').trim();
    if (!appUserId) return textResponse('RevenueCat app_user_id is required.', 400);

    const revenuecatEventId = event.id ? String(event.id) : null;
    const eventType = String(event.type || 'unknown');
    const entitlementId = event.entitlement_id ? String(event.entitlement_id) : null;
    const productId = event.product_id ? String(event.product_id) : null;

    const eventResponse = await restFetch('revenuecat_events?on_conflict=revenuecat_event_id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=representation',
      },
      body: JSON.stringify([{
        revenuecat_event_id: revenuecatEventId,
        app_user_id: appUserId,
        event_type: eventType,
        product_id: productId,
        entitlement_id: entitlementId,
        purchased_at: event.purchased_at_ms ? new Date(Number(event.purchased_at_ms)).toISOString() : null,
        expiration_at: event.expiration_at_ms ? new Date(Number(event.expiration_at_ms)).toISOString() : null,
        raw_event: body,
      }]),
    });
    await readJson(eventResponse);

    const user = await getOrCreateUser(appUserId);
    const wallet = await getWallet(user.id);

    if (productId === 'crown_purse' && ['NON_RENEWING_PURCHASE', 'INITIAL_PURCHASE'].includes(eventType)) {
      const savedWallet = await saveWallet(user.id, { ...wallet, topupCrowns: wallet.topupCrowns + 500 });
      await insertLedger(user.id, 500, 'topup', 'RevenueCat Crown Purse purchase.');
      return jsonResponse({ wallet: savedWallet, processed: true });
    }

    const subscription = tierForEntitlement(entitlementId);
    if (subscription.tier !== 'free' && ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION'].includes(eventType)) {
      const savedWallet = await saveWallet(user.id, {
        ...wallet,
        subscriptionTier: subscription.tier,
        subscriptionCrowns: wallet.subscriptionCrowns + subscription.crowns,
        subscriptionPeriodEnd: event.expiration_at_ms ? new Date(Number(event.expiration_at_ms)).toISOString() : wallet.subscriptionPeriodEnd,
      });
      await insertLedger(user.id, subscription.crowns, 'subscription', `RevenueCat ${subscription.tier} grant.`);
      return jsonResponse({ wallet: savedWallet, processed: true });
    }

    if (['EXPIRATION', 'CANCELLATION', 'BILLING_ISSUE'].includes(eventType)) {
      const savedWallet = await saveWallet(user.id, { ...wallet, subscriptionTier: 'free', subscriptionPeriodEnd: null });
      return jsonResponse({ wallet: savedWallet, processed: true });
    }

    return jsonResponse({ processed: false });
  } catch (error) {
    return textResponse(error instanceof Error ? error.message : String(error), 500);
  }
});

