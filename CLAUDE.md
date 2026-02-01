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

All application logic lives in `src/App.jsx` (~1157 lines). This is intentional for a simple single-page app with:
- 15+ components defined in the same file
- useState for all state management (no external state library)
- useCallback/useMemo for memoization

### Key Components in App.jsx

- **App** - Main component, routes between embed view (`?embed=true`) and full app
- **DayCard** - Individual day with activities, habits, proof uploads
- **Week** - Container for 7 DayCards
- **Checkpoints** - Bi-weekly test milestones (Weeks 2,4,6,8,10,12)
- **LiftTracker** - Strength max tracking (bench, squat, deadlift, push-ups, pull-ups)
- **FileUpload** - Drag-drop file upload with progress tracking
- **WeightSparkline** - Custom SVG weight trend graph

### Data Flow

1. **generateAllDays()** - Creates 89-day schedule with pre-programmed workouts, habits, and phase info
2. **loadStateFromSupabase()** - Loads persisted state on mount
3. **saveStateToSupabase()** - Auto-saves on edit (1-second debounce)

### Progressive Workout Details

Helper functions generate week-appropriate workout details:
- **getIntervalDetail()** - Interval paces that progress through phases
- **getTempoDetail()** - Tempo run durations/paces
- **getGTGDetail()** - Push-up GTG volume that scales (4x15 → 4x25 across phases)

### External Services

- **Supabase** - Database storing days, checkpoints, settings, lifts in `tracker_state` table (single user: `alec-santiago`)
- **Cloudinary** - File uploads for proof images/PDFs (cloud: `djbznowhf`, preset: `fbi_pft_proof`)

### State Shape

```javascript
days[]        // 89 day objects with activities, habits, proofs, weights
checkpoints{} // Bi-weekly test results keyed by week number
settings{}    // User preferences (showWeight, requireProof)
lifts{}       // Current strength maxes
```

## Key Patterns

- **Edit mode** - Password-protected (`agent195`), enables mutations and auto-save
- **Immutable updates** - Always spread operators, never mutate state directly
- **Local date handling** - `getLocalDateStr()` avoids timezone issues
- **Embed mode** - Minimal widget view triggered by `?embed=true` URL param
- **Day completion states** - Cards show: green (complete), orange (mostly - missed 1-2 items), yellow (partial), red (missed)
- **Proof calendar** - Travel days show ✈️ instead of requiring proof uploads

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
