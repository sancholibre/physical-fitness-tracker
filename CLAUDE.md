# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm start          # Local development server
npm run build      # Production build
npm run serve      # Serve production build locally
```

## Project Overview

GYST Tracker - A multi-arc fitness tracker for continuous strength and longevity training. Built with Create React App, Supabase backend, and Cloudinary file storage.

### Multi-Arc System
- **Arc 1**: Jan 2 - Apr 1, 2026 (90 days) — Phases 1-3 (Base → Sharpening → Taper)
- **Arc 2**: Apr 2 - Jul 1, 2026 (91 days) — Phases 4-6 (Strength & Speed → Peak Performance → Consolidation)
- Arcs are self-contained with their own checkpoints, weight targets, and phase progressions
- New arcs can be added to continue indefinitely

### Weekly Schedule (March 16+ / New Schedule)
- **Sunday**: Rest
- **Monday-Saturday**: Training (Zone 2, lifting, intervals, tempo, GTG, long run/sprints)
- Saturday: "Long Run OR 5x800m + 4x200m Sprints" (single checkbox, user chooses)
- All lift days use premium compounds: Flat Bench, OHP, Weighted Dips, Back Squat, RDL, BSS, Conv. Deadlift, Weighted Pull-ups, Pendlay Row
- Pre-March 16 schedule: Mondays were rest days, different exercises

### Weight Targets
- Arc 1: 190 → 178
- Arc 2: 183 → 175

## Architecture

### Single-File Component Structure

All application logic lives in `src/App.jsx` (~1500+ lines). This is intentional for a simple single-page app with:
- 20+ components defined in the same file
- useState for all state management (no external state library)
- useCallback/useMemo for memoization

### Key Components in App.jsx

- **App** (L1121) - Main component, routes between embed view (`?embed=true`) and full app
- **Header** (L364) - Top header with stats summary and "Go to Today" button
- **Stats** (L385) - Training %, Habits %, Thru Arc %, Miles (from Strava)
- **DayCard** (L842) - Individual day with activities, habits, proof uploads, per-activity skip reasons
- **Week** (L976) - Container for 7 DayCards
- **Checkpoints** (L987) - Bi-weekly test milestones (Weeks 2,4,6,8,10,12)
- **LiftTracker** (L528) - Strength max tracking (bench, squat, deadlift, push-ups, pull-ups)
- **FileUpload** (L408) - Drag-drop file upload with progress tracking
- **ProofStatusBadge** (L482) - Visual badge for proof upload status
- **ProofCalendarGrid** (L490) - Calendar view of proof submissions
- **WeightSparkline** (L570) - Interactive SVG weight trend graph with clickable dots, fullscreen modal, projection & ideal pace lines
- **Weight** (L769) - Weight tracking and daily logging UI
- **PhaseInfo** (L553) - Training phase breakdown display
- **Meals** (L1007) - Pescatarian meal plan display
- **Modal** (L1022) - Checkpoint logging modal
- **MissingProofAlert** (L1039) - Alert for days missing proof uploads
- **SocialLinks** (L1058) - Social media links
- **Embed** (L1077) - Minimal widget view for iframe embedding

### Data Flow

1. **generateAllDays()** - Creates multi-arc schedule with pre-programmed workouts, habits, and phase info
2. **loadStateFromSupabase()** - Loads persisted state on mount
3. **saveStateToSupabase()** - Auto-saves on edit (1-second debounce)

### Progressive Workout Details

Helper functions generate week-appropriate workout details:
- **generateAllDays()** (L126) - Creates the full 89-day schedule
- **getConferenceDayActivities()** (L195) - Modified workouts for conference/travel days
- **getVacationDayActivities()** (L205) - Hotel-friendly vacation workouts
- **getRegularActivities()** (L219) - Standard weekly workout programming by phase
- **getIntervalDetail()** (L285) - Interval paces that progress through phases
- **getTempoDetail()** (L298) - Tempo run durations/paces
- **getGTGDetail()** (L311) - Push-up GTG volume that scales (4x15 → 4x25 across phases)

Key constants:
- **CHECKPOINT_TARGETS** (L326) - Target values for bi-weekly fitness tests
- **MEALS** (L335) - Pescatarian meal plans

### External Services

- **Supabase** - Database storing days, checkpoints, settings, lifts in `tracker_state` table (single user: `alec-santiago`)
- **Cloudinary** - File uploads for proof images/PDFs (configured via environment variables)
- **Strava API** (live) - OAuth2 integration for cumulative running miles, synced to `strava_activities` table
- **Health Auto Export** (live) - iOS app webhook for VO2 max, resting HR, HRV, active energy, steps, sleep, workouts from Apple Health

### Supabase Edge Functions

The `supabase/` directory is linked to project `cqpjytbpvmgzziqluhnz`. Deployed functions:
- `strava-auth` — OAuth redirect to Strava (no JWT verification)
- `strava-callback` — Token exchange + storage in `strava_tokens`, redirects to app
- `strava-sync` — Fetches all runs from Strava API (paginated), upserts to `strava_activities`, includes CORS headers and auto token refresh

- `health-webhook` — Receives Health Auto Export POST data, aggregates raw data points (sum for cumulative metrics like calories/steps, average for point-in-time like VO2/HR), upserts to `health_metrics` and `health_workouts` tables. Auth via `?key=<HEALTH_WEBHOOK_KEY>` query param. Handles HAE v2 format with Summarize Data OFF (raw disaggregated data points)

### Supabase Tables

- `tracker_state` — Main app state (days, checkpoints, settings, lifts) keyed by user_id
- `strava_tokens` — OAuth access/refresh tokens (RLS: service_role only, no anon access)
- `strava_activities` — Synced run activities with distance, time, date (RLS: anon SELECT allowed)
- `health_metrics` — Daily scalar values (VO2 max, resting HR, HRV, active energy, steps, sleep, basal energy, wrist temp). Unique on `(user_id, metric_name, date)`. RLS: anon SELECT, service_role writes
- `health_workouts` — Discrete workout events with type, duration, distance, HR, energy. Unique on `(user_id, source_id)`. RLS: anon SELECT, service_role writes

### Strava Integration Flow

1. User clicks "Connect Strava" (edit mode) → `strava-auth` redirects to Strava OAuth
2. Strava redirects back → `strava-callback` exchanges code for tokens, stores in `strava_tokens`
3. User clicks "Sync Strava" (1hr throttle via localStorage) → `strava-sync` fetches all runs, upserts to `strava_activities`
4. `fetchStravaMiles()` queries `strava_activities` filtered to 2026, sums distances → Miles stat
5. Miles also auto-loaded on page mount

### Health Auto Export Integration Flow

1. Health Auto Export (iOS) triggers automation (manual or scheduled) → POSTs JSON to `health-webhook?key=<secret>`
2. Webhook parses HAE v2 payload with **Summarize Data OFF** — receives raw disaggregated data points
3. Webhook aggregates per metric per day: `sum` for cumulative (active_energy, basal_energy, step_count, sleep_duration) and `avg` for point-in-time (vo2_max, resting_heart_rate, hrv, sleep_wrist_temp)
4. Metrics mapped via `METRIC_MAP`: vo2_max, resting_heart_rate, hrv, active_energy, step_count, sleep_duration, sleep_wrist_temp, basal_energy
5. Data upserted to `health_metrics` and `health_workouts` tables
6. Frontend loads health data on mount via `fetchHealthMetrics()` / `fetchHealthWorkouts()`
7. Auto-proof: days with health workout data auto-satisfy the Apple Health proof requirement (no screenshot needed). Legacy uploaded screenshots also still count.
8. HealthPanel in sidebar shows VO2/RHR/HRV summary; DayCard shows workout details + total calories (active + basal) inline
9. Two separate HAE automations required: one for Health Metrics, one for Workouts
10. **Hybrid proof system**: Apple Health screenshot upload slot shows for Jan 2 – Mar 15 (historical days before HAE was set up). Mar 16+ relies on HAE auto-proof only. Cronometer upload shows for all days.

### Health Auto Export — Known Issues & Next Steps (as of Mar 16, 2026)

- **HAE "Summarize Data" must be OFF** — webhook handles raw point aggregation server-side
- **HAE manual export is limited to 7 days** — cannot backfill historical data via the app
- **Missing metrics in current HAE automation**: Only active_energy, basal_energy, and vo2_max are flowing. Resting HR, HRV, step count, sleep duration, and wrist temp need to be added to the HAE Metrics automation config on iPhone
- **DB is sparse**: Only ~2 days of metric data as of Mar 16. Monitoring whether daily automations reliably fire going forward
- **Pre-Feb 28 data**: Apple Health may not retain granular data far enough back. For Jan 2 – Mar 15, screenshot uploads are the proof fallback
- **Verify after first full day (Mar 17)**: Confirm both automations (Metrics + Workouts) fire and data appears correctly in DB. Check that active_energy + basal_energy total looks reasonable (should be 2500-4500 kcal on training days)

### State Shape

```javascript
days[]        // Multi-arc day objects with activities, habits, proofs, weights, skipReasons
checkpoints{} // Bi-weekly test results keyed by week number
settings{}    // User preferences (showWeight, requireProof)
lifts{}       // Current strength maxes
```

### Activity/Habit Shape

```javascript
{
  id: string,
  type: string,        // zone2, lifting, intervals, tempo, gtg, rest, etc.
  name: string,
  completed: boolean,
  skipReason: string   // Per-activity reason for skipping (persisted to Supabase)
}
```

## Key Patterns

- **Edit mode** - Password-protected (via `REACT_APP_EDIT_PASSWORD` env var), enables mutations and auto-save
- **Immutable updates** - Always spread operators, never mutate state directly
- **Local date handling** - `getLocalDateStr()` avoids timezone issues
- **Embed mode** - Minimal widget view triggered by `?embed=true` URL param
- **Day completion states** - Cards show: green (complete), orange (mostly - missed 1-2 items), yellow (partial), red (missed)
- **Proof system** - Hybrid: Jan 2 – Mar 15 shows Apple Health screenshot upload + Cronometer upload; Mar 16+ Apple Health proof is auto-satisfied via HAE data (no screenshot slot). Travel days show ✈️. Proof calendar shows ✔ (both), 📱 (health only), 🥗 (cronometer only)
- **Per-activity skip reasons** - Uncompleted items on past days show inline "Why skipped?" input (edit mode) or italic amber text (read-only)
- **Weight projection** - Sparkline shows ideal pace line (purple) and projected trend line (amber) based on current loss rate
- **Clickable weight dots** - Click any data point on the sparkline to see exact date + weight tooltip
- **Fullscreen weight chart** - Expand button (⛶) opens a large modal with Y-axis labels, week markers, and click-to-inspect
- **Mobile FAB** - Floating "Go to Today" button (📍) at bottom-right on screens ≤900px

## Deployment

Configured for Railway (`railway.json`):
```json
{
  "build": { "command": "npm install && npm run build" },
  "deploy": { "startCommand": "npx serve -s build -l $PORT" }
}
```

**Live URL**: `physical-fitness-tracker-production.up.railway.app`

Supabase Edge Functions deployed separately via `supabase functions deploy <name> --no-verify-jwt`.

Also deployable to Vercel or Replit as standard Create React App.

## Domain-Specific Context

- **Pescatarian diet** - No meat, no salmon (allergy). Fish, eggs, dairy, tofu allowed.
- **Training phases** - P1 Base, P2 Sharpening, P3 Taper (Arc 1), P4 Strength & Speed, P5 Peak Performance, P6 Consolidation (Arc 2)
- **Travel adjustments** - Jan 12-22 SF trip has modified hotel-friendly workouts
- **Schedule cutover** - March 16, 2026: Sunday rest, premium compound lifts replace old schedule
- **80-minute workout windows** - All sessions designed to fit within ~80 minutes

## Business Build-Out Plans

The `Build Out Plans/` folder contains detailed plans for productizing this tracker:

- **01-General-Framework.md** - Universal architecture for AI-powered personalized program builders. Covers conversational onboarding → spec sheet extraction → program generation → ongoing adaptation. Applicable to fitness, exam prep, sobriety, creative challenges, etc.

- **02-Fitness-Coach-Platform.md** - Detailed execution plan for the highest-revenue vertical: selling to online fitness coaches. Includes product spec, database schema, API design, go-to-market strategy, development sprints, and financial projections.

### Core Innovation
The key differentiator is **conversational AI onboarding** that extracts a structured "spec sheet" (goals, schedule, constraints, preferences) and generates hyper-individualized programs. The proof upload system provides accountability that competitors lack.

### Target Market
Online fitness coaches ($99-399/month B2B SaaS) who need to scale beyond 20-30 clients without burning out. Current tools are spreadsheets with UIs - no AI, no real personalization.
