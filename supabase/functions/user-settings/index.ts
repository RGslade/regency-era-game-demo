import { restFetch, readJson } from '../_shared/db.ts';
import { handleOptions, jsonResponse, textResponse } from '../_shared/http.ts';

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  try {
    const body = await request.json();
    const anonymousUserId = String(body.anonymousUserId || '').trim();
    if (!anonymousUserId) return textResponse('anonymousUserId is required.', 400);

    if (body.action === 'get') {
      const response = await restFetch(`user_settings?anonymous_user_id=eq.${encodeURIComponent(anonymousUserId)}&select=settings`);
      const rows = await readJson<{ settings: Record<string, unknown> }[]>(response);
      return jsonResponse({ settings: rows?.[0]?.settings || null });
    }

    if (body.action === 'save') {
      const response = await restFetch('user_settings?on_conflict=anonymous_user_id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify([{ anonymous_user_id: anonymousUserId, settings: body.settings || {} }]),
      });
      const rows = await readJson<{ settings: Record<string, unknown> }[]>(response);
      return jsonResponse({ settings: rows?.[0]?.settings || {} });
    }

    return textResponse(`Unsupported settings action: ${body.action || 'missing'}`, 400);
  } catch (error) {
    return textResponse(error instanceof Error ? error.message : String(error), 500);
  }
});

