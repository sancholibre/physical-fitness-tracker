import "@supabase/functions-js/edge-runtime.d.ts";

Deno.serve((_req) => {
  const clientId = Deno.env.get("STRAVA_CLIENT_ID");
  const redirectUri =
    "https://cqpjytbpvmgzziqluhnz.supabase.co/functions/v1/strava-callback";

  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "activity:read_all",
    approval_prompt: "auto",
  });

  return new Response(null, {
    status: 302,
    headers: { Location: `https://www.strava.com/oauth/authorize?${params}` },
  });
});
