import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Extract local date (Pacific Time) from Health Auto Export timestamp
// Input formats: "2026-03-16 14:30:00 -0600" or ISO 8601
function extractLocalDate(dateStr: string): string {
  const normalized = dateStr.replace(" +", "+").replace(" -", "-");
  const d = new Date(normalized.includes("T") ? normalized : normalized.replace(" ", "T"));
  return d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }); // YYYY-MM-DD
}

// Metrics we care about — maps HAE names to our stored names
// agg: "sum" for cumulative daily totals, "avg" for point-in-time measurements
const METRIC_MAP: Record<string, { name: string; units: string; agg: "sum" | "avg" }> = {
  vo2_max: { name: "vo2_max", units: "ml/kg/min", agg: "avg" },
  resting_heart_rate: { name: "resting_heart_rate", units: "bpm", agg: "avg" },
  heart_rate_variability: { name: "hrv", units: "ms", agg: "avg" },
  active_energy: { name: "active_energy", units: "kcal", agg: "sum" },
  step_count: { name: "step_count", units: "count", agg: "sum" },
  sleep_analysis: { name: "sleep_duration", units: "hr", agg: "sum" },
  apple_sleeping_wrist_temperature: { name: "sleep_wrist_temp", units: "°C", agg: "avg" },
  basal_energy_burned: { name: "basal_energy", units: "kcal", agg: "sum" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Auth check via query param
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (key !== Deno.env.get("HEALTH_WEBHOOK_KEY")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const data = body.data || body;
  let metricsUpserted = 0;
  let workoutsUpserted = 0;

  // Process metrics — aggregate multiple data points per metric per day
  // HAE with "Summarize Data" OFF sends many raw data points (e.g. active_energy
  // comes in dozens of small increments). We sum cumulative metrics and average
  // point-in-time metrics before upserting one row per metric per day.
  if (data.metrics && Array.isArray(data.metrics)) {
    // Collect raw points grouped by metric+date
    const buckets = new Map<string, { mapped: typeof METRIC_MAP[string]; date: string; values: number[]; lastSourceDate: string }>();

    for (const metric of data.metrics) {
      const mapped = METRIC_MAP[metric.name];
      if (!mapped) continue;

      for (const point of metric.data || []) {
        if (typeof point.qty !== "number") continue;
        const localDate = extractLocalDate(point.date);
        const key = `${mapped.name}|${localDate}`;
        if (!buckets.has(key)) {
          buckets.set(key, { mapped, date: localDate, values: [], lastSourceDate: point.date });
        }
        const bucket = buckets.get(key)!;
        bucket.values.push(point.qty);
        bucket.lastSourceDate = point.date;
      }
    }

    // Aggregate each bucket into a single row
    const metricRows = Array.from(buckets.values()).map(({ mapped, date, values, lastSourceDate }) => {
      const aggregated = mapped.agg === "sum"
        ? values.reduce((a, b) => a + b, 0)
        : values.reduce((a, b) => a + b, 0) / values.length; // average
      return {
        user_id: "alec-santiago",
        metric_name: mapped.name,
        value: aggregated,
        units: mapped.units,
        date,
        source_date: lastSourceDate,
      };
    });

    if (metricRows.length > 0) {
      const { error } = await supabase
        .from("health_metrics")
        .upsert(metricRows, { onConflict: "user_id,metric_name,date" });
      if (error) return jsonResponse({ error: `Metrics upsert failed: ${error.message}` }, 500);
      metricsUpserted = metricRows.length;
    }
  }

  // Process workouts — handles real HAE v2 workout format
  if (data.workouts && Array.isArray(data.workouts)) {
    const workoutRows = data.workouts
      .filter((w: any) => w.name && (w.start || w.end))
      .map((w: any) => {
        const startStr = w.start || w.end; // fallback to end if no start
        return {
          user_id: "alec-santiago",
          source_id: w.id || `${w.name}-${startStr}`,
          workout_type: w.name,
          start_time: startStr,
          end_time: w.end || null,
          duration_seconds: w.duration ? Math.round(w.duration) : null,
          // HAE v2: totalDistance is an object {qty, units} or may not exist
          distance_meters: w.totalDistance?.qty
            ? w.totalDistance.units === "km" ? w.totalDistance.qty * 1000 : w.totalDistance.qty
            : (w.distance ? w.distance * 1000 : null),
          // HAE v2: heartRate may not exist on all workout types
          avg_heart_rate: w.heartRate?.avg || w.avgHeartRate?.qty || null,
          max_heart_rate: w.heartRate?.max || w.maxHeartRate?.qty || null,
          // HAE v2: activeEnergyBurned is {units, qty}
          active_energy_kcal: w.activeEnergyBurned?.qty || w.energy?.active || null,
          date: extractLocalDate(startStr),
        };
      });

    if (workoutRows.length > 0) {
      const { error } = await supabase
        .from("health_workouts")
        .upsert(workoutRows, { onConflict: "user_id,source_id" });
      if (error) return jsonResponse({ error: `Workouts upsert failed: ${error.message}` }, 500);
      workoutsUpserted = workoutRows.length;
    }
  }

  return jsonResponse({
    metrics: metricsUpserted,
    workouts: workoutsUpserted,
    message: `Processed ${metricsUpserted} metrics, ${workoutsUpserted} workouts`,
  });
});
