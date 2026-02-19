# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm start          # Local development server
npm run build      # Production build
npm run serve      # Serve production build locally
```

## Project Overview

GYST Tracker - A React app tracking an 89-day training program to peak physical fitness. Built with Create React App, Supabase backend, and Cloudinary file storage.

## Architecture

### Single-File Component Structure

All application logic lives in `src/App.jsx` (~1347 lines). This is intentional for a simple single-page app with:
- 20+ components defined in the same file
- useState for all state management (no external state library)
- useCallback/useMemo for memoization

### Key Components in App.jsx

- **App** (L1121) - Main component, routes between embed view (`?embed=true`) and full app
- **Header** (L364) - Top header with stats summary and "Go to Today" button
- **Stats** (L385) - Full Days (x/y) progress, phase, completion %, week counter
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

1. **generateAllDays()** - Creates 89-day schedule with pre-programmed workouts, habits, and phase info
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

### State Shape

```javascript
days[]        // 89 day objects with activities, habits, proofs, weights, skipReasons
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
- **Proof calendar** - Travel days show ✈️ instead of requiring proof uploads
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

Also deployable to Vercel or Replit as standard Create React App.

## Domain-Specific Context

- **Pescatarian diet** - No meat, no salmon (allergy). Fish, eggs, dairy, tofu allowed.
- **Training phases** - Phase 1 (base building), Phase 2 (sharpening), Phase 3 (taper)
- **Travel adjustments** - Jan 12-22 SF trip has modified hotel-friendly workouts
- **Test date** - April 1, 2026

## Business Build-Out Plans

The `Build Out Plans/` folder contains detailed plans for productizing this tracker:

- **01-General-Framework.md** - Universal architecture for AI-powered personalized program builders. Covers conversational onboarding → spec sheet extraction → program generation → ongoing adaptation. Applicable to fitness, exam prep, sobriety, creative challenges, etc.

- **02-Fitness-Coach-Platform.md** - Detailed execution plan for the highest-revenue vertical: selling to online fitness coaches. Includes product spec, database schema, API design, go-to-market strategy, development sprints, and financial projections.

### Core Innovation
The key differentiator is **conversational AI onboarding** that extracts a structured "spec sheet" (goals, schedule, constraints, preferences) and generates hyper-individualized programs. The proof upload system provides accountability that competitors lack.

### Target Market
Online fitness coaches ($99-399/month B2B SaaS) who need to scale beyond 20-30 clients without burning out. Current tools are spreadsheets with UIs - no AI, no real personalization.
