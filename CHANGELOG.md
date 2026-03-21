# Changelog

## Mar 21, 2026
- Fixed HAE metric name matching — webhook now normalizes incoming names (lowercase, underscores) and maps many aliases (vo2max, restingheartrate, etc.)
- VO2 Max data now flowing from HAE (54.48 ml/kg/min confirmed)
- Resting HR and HRV still not arriving — may need additional HAE config or different metric names
- Added debug logging to health-webhook for diagnosing unrecognized metrics
- Pushed all Health Auto Export frontend code to Railway (was sitting uncommitted since Mar 16)

## Mar 16, 2026
- **Health Auto Export Integration**: health-webhook edge function, health_metrics + health_workouts tables, HealthPanel sidebar, per-day workout/calorie blocks in DayCards
- **Hybrid proof system**: Apple Health screenshot upload for Jan 2 – Mar 15; HAE auto-proof for Mar 16+
- **Stats bar redesign**: Training %, Habits %, Thru Arc % replace old counters; Miles from Strava
- **Strava Integration**: 3 edge functions (strava-auth, strava-callback, strava-sync), strava_tokens + strava_activities tables, Miles stat
- **Schedule cutover**: Sunday rest days, premium compound lifts replace old schedule
- Railway URL changed to `physical-fitness-tracker-production.up.railway.app`

## Mar 2026 (early)
- Multi-arc system: Arc 1 preserved, Arc 2 added (Apr 2 – Jul 1) with phases 4-6
- Arc 2 progression functions for tempo, GTG at higher baselines
- WeightSparkline: dynamic x-axis scaling, per-arc ideal pace lines, arc separator
- Week nav grouped by Arc 1 / Arc 2; checkpoints Arc 2 uses longRun instead of sprint
- Header shows arc name + day number out of total

## Feb 2026
- Stats bar: "Full Days (x/y)" replaced broken streak counter
- WeightSparkline: clickable dots, fullscreen modal, ideal pace + projection lines
- Per-activity skip reasons with inline inputs
- Mobile FAB: floating "Go to Today" button on screens ≤900px
