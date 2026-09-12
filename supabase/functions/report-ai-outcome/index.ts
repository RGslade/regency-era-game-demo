import { restFetch, readJson } from '../_shared/db.ts';
import { handleOptions, jsonResponse, textResponse } from '../_shared/http.ts';

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  try {
    const report = await request.json();
    const anonymousUserId = String(report.anonymousUserId || report.anonymous_user_id || '').trim();
    if (!anonymousUserId) return textResponse('anonymousUserId is required.', 400);

    const response = await restFetch('ai_outcome_reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify([{
        anonymous_user_id: anonymousUserId,
        report_target: String(report.reportTarget || report.report_target || 'ai_output'),
        report_reason: String(report.reportReason || report.report_reason || 'unspecified'),
        current_scene: report.currentScene || report.current_scene || null,
        turn_count: Number.isFinite(Number(report.turnCount ?? report.turn_count)) ? Number(report.turnCount ?? report.turn_count) : null,
        location_id: report.locationId || report.location_id || null,
        payload: report,
      }]),
    });
    const rows = await readJson(response);
    return jsonResponse({ report: Array.isArray(rows) ? rows[0] : rows });
  } catch (error) {
    return textResponse(error instanceof Error ? error.message : String(error), 500);
  }
});

