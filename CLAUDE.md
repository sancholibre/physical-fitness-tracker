# CLAUDE.md

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

### Weekly Schedule (March 16+)
- **Sunday**: Rest
- **Monday-Saturday**: Training (Zone 2, lifting, intervals, tempo, GTG, long run/sprints)
- All lift days use premium compounds: Flat Bench, OHP, Weighted Dips, Back Squat, RDL, BSS, Conv. Deadlift, Weighted Pull-ups, Pendlay Row
- Pre-March 16: Mondays were rest days, different exercises

### Weight Targets
- Arc 1: 190 → 178 | Arc 2: 183 → 175

## Architecture

### Single-File Component Structure

All application logic lives in `src/App.jsx` (~1700 lines). This is intentional for a simple single-page app with:
- 20+ components defined in the same file
- useState for all state management
- useCallback/useMemo for memoization

### Data Flow

1. **generateAllDays()** - Creates multi-arc schedule with pre-programmed workouts, habits, and phase info
2. **loadStateFromSupabase()** - Loads persisted state on mount
3. **saveStateToSupabase()** - Auto-saves on edit (1-second debounce)

### External Services

- **Supabase** - Database (single user: `alec-santiago`), edge functions
- **Cloudinary** - File uploads for proof images/PDFs
- **Strava API** - OAuth2 integration for cumulative running miles
- **Health Auto Export** - iOS app webhook for VO2 max, resting HR, HRV, calories, steps, workouts from Apple Health

### Supabase Edge Functions

Project: `cqpjytbpvmgzziqluhnz`. All deployed with `--no-verify-jwt`.
- `strava-auth` — OAuth redirect to Strava
- `strava-callback` — Token exchange + storage, redirects to app
- `strava-sync` — Fetches all runs (paginated), upserts to `strava_activities`, auto token refresh
- `health-webhook` — Receives HAE v2 POST data (Summarize Data OFF), normalizes metric names, aggregates raw data points, upserts to `health_metrics` + `health_workouts`. Auth via `?key=<HEALTH_WEBHOOK_KEY>` query param

### Supabase Tables

- `tracker_state` — Main app state (days, checkpoints, settings, lifts) keyed by user_id
- `strava_tokens` — OAuth tokens (RLS: service_role only)
- `strava_activities` — Run activities with distance, time, date (RLS: anon SELECT)
- `health_metrics` — Daily scalar values. Unique on `(user_id, metric_name, date)`. RLS: anon SELECT, service_role writes
- `health_workouts` — Workout events with type, duration, distance, HR, energy. Unique on `(user_id, source_id)`. RLS: anon SELECT, service_role writes

### Health Auto Export Integration

- HAE v2 format with **Summarize Data OFF** — webhook aggregates raw points server-side
- METRIC_MAP normalizes incoming names (lowercase + underscores) and maps many aliases
- Two separate HAE automations on iPhone: one for Health Metrics, one for Workouts
- **Hybrid proof system**: Apple Health screenshot upload for Jan 2 – Mar 15; HAE auto-proof for Mar 16+
- HealthPanel in sidebar shows VO2/RHR/HRV; DayCard shows workout details + calories inline

## Key Patterns

- **Edit mode** - Password-protected (`REACT_APP_EDIT_PASSWORD`), enables mutations and auto-save
- **Proof system** - Hybrid: pre-Mar 16 screenshot upload + Cronometer; Mar 16+ HAE auto-proof + Cronometer
- **Per-activity skip reasons** - Inline "Why skipped?" for uncompleted past-day items
- **Weight sparkline** - Interactive SVG with clickable dots, fullscreen modal, ideal pace + projection lines
- **Embed mode** - `?embed=true` for iframe widget view
- **Mobile FAB** - Floating "Go to Today" button on screens ≤900px

## Deployment

Railway (`railway.json`): `physical-fitness-tracker-production.up.railway.app`

Supabase Edge Functions deployed separately via `supabase functions deploy <name> --no-verify-jwt`.

## Domain-Specific Context

- **Pescatarian diet** - No meat, no salmon (allergy). Fish, eggs, dairy, tofu allowed.
- **80-minute workout windows** - All sessions designed to fit within ~80 minutes

## Business Build-Out Plans

The `Build Out Plans/` folder contains productization plans for an AI-powered fitness coach platform (B2B SaaS targeting online fitness coaches, $99-399/month).
