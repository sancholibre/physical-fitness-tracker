import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRAVA_API = "https://www.strava.com/api/v3";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (_req) => {
  if (_req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. Load tokens
  const { data: tokenRow, error: tokenErr } = await supabase
    .from("strava_tokens")
    .select("*")
    .eq("user_id", "alec-santiago")
    .single();

  if (tokenErr || !tokenRow) {
    return jsonResponse(
      { error: "No Strava tokens found. Connect Strava first." },
      401
    );
  }

  let { access_token, refresh_token, expires_at } = tokenRow;

  // 2. Refresh token if expired
  const now = Math.floor(Date.now() / 1000);
  if (expires_at < now) {
    const refreshRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: Deno.env.get("STRAVA_CLIENT_ID")!,
        client_secret: Deno.env.get("STRAVA_CLIENT_SECRET")!,
        grant_type: "refresh_token",
        refresh_token,
      }),
    });

    if (!refreshRes.ok) {
      return jsonResponse({ error: "Token refresh failed" }, 500);
    }

    const newTokens = await refreshRes.json();
    access_token = newTokens.access_token;
    refresh_token = newTokens.refresh_token;
    expires_at = newTokens.expires_at;

    await supabase.from("strava_tokens").update({
      access_token,
      refresh_token,
      expires_at,
      updated_at: new Date().toISOString(),
    }).eq("user_id", "alec-santiago");
  }

  // 3. Fetch activities (paginated, runs only)
  const allActivities: any[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const res = await fetch(
      `${STRAVA_API}/athlete/activities?per_page=${perPage}&page=${page}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!res.ok) {
      return jsonResponse({ error: `Strava API error: ${res.status}` }, 500);
    }

    const activities = await res.json();
    if (activities.length === 0) break;

    // Filter to runs only
    const runs = activities.filter(
      (a: any) => a.type === "Run" || a.sport_type === "Run"
    );
    allActivities.push(...runs);
    page++;

    if (activities.length < perPage) break;
  }

  // 4. Upsert into strava_activities
  if (allActivities.length > 0) {
    const rows = allActivities.map((a: any) => ({
      id: a.id,
      user_id: "alec-santiago",
      activity_type: a.type,
      distance_meters: a.distance,
      moving_time_seconds: a.moving_time,
      start_date: a.start_date,
      name: a.name,
    }));

    const { error: upsertErr } = await supabase
      .from("strava_activities")
      .upsert(rows, { onConflict: "id" });

    if (upsertErr) {
      return jsonResponse({ error: `Upsert failed: ${upsertErr.message}` }, 500);
    }
  }

  // 5. Return summary
  const totalMeters = allActivities.reduce(
    (sum: number, a: any) => sum + a.distance,
    0
  );
  const totalMiles = (totalMeters / 1609.344).toFixed(1);

  return jsonResponse({
    synced: allActivities.length,
    totalMiles,
    message: `Synced ${allActivities.length} runs (${totalMiles} mi)`,
  });
});
