import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return new Response(`Strava authorization denied: ${error}`, {
      status: 400,
    });
  }

  const clientId = Deno.env.get("STRAVA_CLIENT_ID")!;
  const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET")!;

  // Exchange code for tokens
  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return new Response(`Token exchange failed: ${text}`, { status: 500 });
  }

  const tokens = await tokenRes.json();

  // Store tokens in Supabase (using service_role to bypass RLS)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error: dbError } = await supabase.from("strava_tokens").upsert(
    {
      user_id: "alec-santiago",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      athlete_id: tokens.athlete?.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (dbError) {
    return new Response(`DB error: ${dbError.message}`, { status: 500 });
  }

  // Redirect back to the app
  return new Response(null, {
    status: 302,
    headers: { Location: "https://physical-fitness-tracker.up.railway.app/" },
  });
});
