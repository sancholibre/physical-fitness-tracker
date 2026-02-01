# General Framework: AI-Powered Personalized Program Builder

## The Core Innovation

**Current State:** Programs are templates. Users adapt their lives to fit the program.

**Future State:** Users describe their lives. AI generates a program that fits them perfectly.

The magic is the **conversational onboarding** → **structured program generation** pipeline. Users talk naturally about their goals, constraints, and preferences. The system extracts structured data and generates a hyper-individualized plan.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER EXPERIENCE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Onboarding  │───▶│   Program    │───▶│   Tracker    │      │
│  │ Conversation │    │  Generation  │    │   (Daily)    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Spec Sheet  │    │  Day-by-Day  │    │   Progress   │      │
│  │   (JSON)     │    │    Plan      │    │    Data      │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         └───────────────────┴───────────────────┘               │
│                             │                                   │
│                             ▼                                   │
│                   ┌──────────────────┐                         │
│                   │  Re-planning AI  │                         │
│                   │  (Adjustments)   │                         │
│                   └──────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Conversational Onboarding

### How It Works

User opens the app and starts a conversation:

```
AI: "Hey! Let's build your personalized program. First, what's your main goal?"

User: "I want to run a marathon in October. I've never run more than 5 miles."

AI: "Got it - marathon in October, starting from a 5-mile base. That gives us
about 20 weeks. A few quick questions:

1. How many days per week can you realistically train?
2. Do you have any injuries or physical limitations?
3. Any trips or events coming up that would disrupt training?"

User: "I can do 5 days. Bad left knee from college soccer. I have a work
conference June 10-15 in Austin and a wedding July 4th weekend."

AI: "Perfect. For your knee, I'll emphasize low-impact cross-training and
avoid back-to-back hard running days. I'll build in reduced training for
the Austin conference (hotel gym options) and a rest week around July 4th.

What about nutrition? Any dietary restrictions or preferences?"

User: "Vegetarian. I also intermittent fast until noon."

AI: "Noted. I'll time your morning runs for fasted cardio days and make sure
your long runs fall when you can fuel properly. Let me generate your plan..."
```

### Data Extraction

The conversation extracts a **Spec Sheet** - structured JSON that powers generation:

```json
{
  "goal": {
    "type": "endurance_event",
    "event": "marathon",
    "target_date": "2026-10-15",
    "current_level": "5_mile_base"
  },
  "schedule": {
    "available_days_per_week": 5,
    "preferred_training_times": ["morning"],
    "blackout_dates": [
      {"start": "2026-06-10", "end": "2026-06-15", "reason": "conference", "location": "Austin", "accommodation": "hotel"},
      {"start": "2026-07-03", "end": "2026-07-05", "reason": "wedding", "availability": "rest_only"}
    ]
  },
  "constraints": {
    "injuries": ["left_knee_chronic"],
    "equipment_access": ["home_none", "gym_full"],
    "dietary": ["vegetarian", "intermittent_fasting_16_8"]
  },
  "preferences": {
    "fasted_cardio": true,
    "long_run_day": "saturday"
  },
  "metrics": {
    "track": ["mileage", "pace", "weight", "sleep", "nutrition"]
  }
}
```

### Conversation Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ONBOARDING MODULES                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. GOAL DEFINITION                                         │
│     ├── Goal type (transformation, event, habit, skill)     │
│     ├── Target date or duration                             │
│     ├── Current baseline                                    │
│     └── Success criteria                                    │
│                                                             │
│  2. SCHEDULE MAPPING                                        │
│     ├── Available days/times                                │
│     ├── Work schedule pattern                               │
│     ├── Travel/events (blackout dates)                      │
│     └── Time zone considerations                            │
│                                                             │
│  3. CONSTRAINT COLLECTION                                   │
│     ├── Physical limitations                                │
│     ├── Equipment/location access                           │
│     ├── Dietary restrictions                                │
│     ├── Budget constraints                                  │
│     └── Prior experience/skill level                        │
│                                                             │
│  4. PREFERENCE ELICITATION                                  │
│     ├── Training style preferences                          │
│     ├── Intensity tolerance                                 │
│     ├── Social vs solo                                      │
│     └── Habit stacking opportunities                        │
│                                                             │
│  5. ACCOUNTABILITY SETUP                                    │
│     ├── Proof requirements                                  │
│     ├── Check-in frequency                                  │
│     ├── Coach/accountability partner                        │
│     └── Public sharing preferences                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 2: Program Generation

### Generation Engine

The Spec Sheet feeds into a **Program Generation Engine** that:

1. **Selects a base template** (periodization pattern for the goal type)
2. **Calculates timeline** (weeks until target, phases, milestones)
3. **Generates day-by-day activities** (respecting constraints)
4. **Builds habit tracking** (custom to user's goals)
5. **Inserts checkpoints** (assessment points for progress)
6. **Applies adjustments** (travel, events, constraints)

### Template System

Base templates are expert-designed program structures:

```javascript
const MARATHON_TEMPLATE = {
  phases: [
    { name: "Base Building", weeks: 6, focus: "aerobic_foundation" },
    { name: "Build", weeks: 6, focus: "volume_increase" },
    { name: "Peak", weeks: 4, focus: "race_specific" },
    { name: "Taper", weeks: 3, focus: "recovery_sharpening" }
  ],
  weekly_structure: {
    easy_runs: 2,
    quality_sessions: 2,  // tempo, intervals
    long_run: 1,
    cross_training: 1,
    rest: 1
  },
  progression_rules: {
    weekly_mileage_increase: 0.10,  // 10% max
    cutback_week_frequency: 4,      // every 4th week
    long_run_cap_percentage: 0.30   // 30% of weekly volume
  }
};
```

### Personalization Layers

Templates are modified by constraint processors:

```javascript
// Injury processor
if (spec.constraints.injuries.includes('knee')) {
  // Reduce high-impact days
  // Add cross-training
  // Never schedule back-to-back runs
  // Emphasize strength work for stability
}

// Travel processor
for (const blackout of spec.schedule.blackout_dates) {
  if (blackout.accommodation === 'hotel') {
    // Generate hotel-friendly alternatives
    // Reduce volume, maintain some activity
  } else if (blackout.availability === 'rest_only') {
    // Full rest, adjust surrounding days
  }
}

// Dietary processor
if (spec.constraints.dietary.includes('intermittent_fasting')) {
  // Schedule easy runs for fasted periods
  // Schedule fueled runs for long/hard sessions
  // Adjust meal timing recommendations
}
```

### Output: The Personalized Program

```javascript
{
  "program": {
    "name": "Chicago Marathon 2026 - Custom Plan",
    "duration_weeks": 20,
    "start_date": "2026-06-01",
    "target_date": "2026-10-15",
    "phases": [...],
    "days": [
      {
        "date": "2026-06-01",
        "day_number": 1,
        "week_number": 1,
        "phase": "Base Building",
        "activities": [
          {
            "type": "easy_run",
            "name": "Easy Run - 3 miles",
            "details": "Zone 2, conversational pace",
            "fasted_ok": true
          }
        ],
        "habits": [
          { "id": "hydration", "name": "64oz water" },
          { "id": "sleep", "name": "7+ hours sleep" },
          { "id": "protein", "name": "Protein goal (vegetarian sources)" }
        ],
        "notes": "First day! Keep it easy, focus on form."
      },
      // ... 139 more days
    ],
    "checkpoints": [
      { "week": 4, "type": "time_trial", "distance": "5K" },
      { "week": 8, "type": "assessment", "metrics": ["weekly_mileage", "long_run_pace"] },
      // ...
    ]
  }
}
```

---

## Phase 3: Ongoing Adaptation

### Re-planning Triggers

The system continuously monitors for re-planning needs:

1. **Missed Days** - "I see you missed 3 days. Life happens! Want me to adjust the next two weeks?"

2. **Life Changes** - "Add a constraint" button opens mini-conversation: "I just found out I have to travel next week..."

3. **Progress Deviation** - "Your checkpoint showed you're ahead of pace. Want to adjust your target or add challenge?"

4. **Injury/Setback** - "I tweaked my hamstring" → AI adjusts plan, adds recovery protocol

5. **Scheduled Check-ins** - Weekly or bi-weekly conversational check-ins: "How did this week feel?"

### Adaptation Conversation

```
AI: "Quick weekly check-in! How did Week 4 go?"

User: "Honestly rough. Work was crazy, only got 3 runs in instead of 5."

AI: "No worries - you still hit your long run which is the most important.
I'm adjusting Week 5 to be a mini-recovery week instead of pushing volume.
We'll get back on track Week 6.

Also noticed your Tuesday tempo was faster than prescribed - feeling strong?"

User: "Yeah actually, I felt great on that one."

AI: "Nice! Your fitness is building. I'll slightly increase your tempo paces
for the next block. Keep listening to your body."
```

---

## Technical Implementation

### Stack Recommendation

```
┌─────────────────────────────────────────────────────────────┐
│                       TECH STACK                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FRONTEND                                                   │
│  ├── Next.js 14 (App Router)                               │
│  ├── React Server Components                                │
│  ├── Tailwind CSS                                          │
│  └── Vercel AI SDK (streaming chat UI)                     │
│                                                             │
│  BACKEND                                                    │
│  ├── Next.js API Routes / Server Actions                   │
│  ├── Supabase (Postgres + Auth + Realtime)                 │
│  └── Cloudinary (proof uploads)                            │
│                                                             │
│  AI LAYER                                                   │
│  ├── Claude API (onboarding conversation)                  │
│  ├── Claude API (program generation)                       │
│  ├── Claude API (re-planning)                              │
│  └── Structured outputs for spec sheet extraction          │
│                                                             │
│  INFRASTRUCTURE                                             │
│  ├── Vercel (hosting + edge functions)                     │
│  ├── Supabase (managed Postgres)                           │
│  └── Stripe (payments)                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spec Sheets (the extracted user profile)
CREATE TABLE spec_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  goal JSONB NOT NULL,
  schedule JSONB NOT NULL,
  constraints JSONB NOT NULL,
  preferences JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programs (generated plans)
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  spec_sheet_id UUID REFERENCES spec_sheets(id),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  phases JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Days (individual day plans)
CREATE TABLE program_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  date DATE NOT NULL,
  day_number INT NOT NULL,
  week_number INT NOT NULL,
  phase TEXT NOT NULL,
  activities JSONB NOT NULL,
  habits JSONB NOT NULL,
  completed_activities JSONB DEFAULT '[]',
  completed_habits JSONB DEFAULT '[]',
  proof_files JSONB DEFAULT '{}',
  weight DECIMAL,
  notes TEXT,
  UNIQUE(program_id, date)
);

-- Checkpoints
CREATE TABLE checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  week_number INT NOT NULL,
  type TEXT NOT NULL,
  targets JSONB,
  actuals JSONB,
  completed_at TIMESTAMPTZ
);

-- Conversations (for context continuity)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL, -- 'onboarding', 'check_in', 'adjustment'
  messages JSONB NOT NULL,
  extracted_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### AI Prompting Strategy

**Onboarding System Prompt:**
```
You are an expert program designer helping users create personalized plans.

Your job is to:
1. Understand their goal deeply
2. Map their schedule and availability
3. Uncover constraints (injuries, diet, equipment, budget)
4. Learn their preferences
5. Set up accountability

Ask questions conversationally, one topic at a time. When you have enough
information, confirm the spec sheet with the user before generation.

Extract structured data into this JSON format:
{spec_sheet_schema}

Be warm, encouraging, and thorough. Missing information leads to bad programs.
```

**Generation System Prompt:**
```
You are a program generation engine. Given a spec sheet and a base template,
generate a complete day-by-day program.

Rules:
1. Respect ALL constraints - never schedule around injuries incorrectly
2. Apply progressive overload appropriately for the goal
3. Build in recovery (rest days, deload weeks)
4. Adjust for travel/blackout dates with appropriate alternatives
5. Create habits that support the main goal
6. Place checkpoints at logical progress points

Output the complete program in this JSON format:
{program_schema}
```

---

## Monetization Framework

### B2C Model (Direct to Consumer)

```
FREE TIER
├── 1 active program
├── Basic templates only
├── No proof uploads
└── Community support

PRO ($12/month)
├── Unlimited programs
├── AI re-planning
├── Proof uploads
├── Progress analytics
└── Email support

PREMIUM ($29/month)
├── Everything in Pro
├── Weekly AI check-ins
├── Coach matching
├── Priority support
└── Custom templates
```

### B2B Model (Sell to Coaches)

```
COACH STARTER ($99/month)
├── Up to 20 clients
├── White-label branding
├── Client dashboard
├── Basic templates
└── Email support

COACH PRO ($199/month)
├── Up to 50 clients
├── Custom template builder
├── Client progress alerts
├── API access
└── Priority support

COACH ENTERPRISE ($499/month)
├── Unlimited clients
├── Full white-label
├── Custom integrations
├── Dedicated support
└── Revenue share on templates
```

### Marketplace Model

Coaches create and sell templates:
- Platform takes 20% cut
- Templates priced $20-200
- Passive income for coaches
- Library grows organically

---

## Universal Applicability

This framework applies to ANY goal-oriented program:

| Domain | Goal Types | Key Constraints | Checkpoints |
|--------|-----------|-----------------|-------------|
| Fitness | Weight loss, muscle gain, event training | Injuries, equipment, diet | Body metrics, performance tests |
| Exam Prep | Pass certification, improve score | Study time, learning style | Practice tests, topic assessments |
| Sobriety | Days sober, habit replacement | Triggers, support system | Milestone celebrations, sponsor check-ins |
| Creative | Complete project, build skill | Time, tools, experience | Portfolio reviews, word counts |
| Business | Launch product, hit revenue | Budget, team, timeline | KPI reviews, milestone demos |
| Language | Fluency level, conversation ability | Time, immersion access | Proficiency tests, conversation evals |

The spec sheet structure adapts:
- Goal types change
- Constraint categories change
- Checkpoint types change
- But the FLOW remains identical

---

## Development Phases

### Phase 1: MVP (4-6 weeks)
- Single-domain focus (pick one vertical)
- Basic onboarding conversation
- Simple program generation (template + customization)
- Core tracker functionality (current GYST feature set)
- Stripe integration for payments

### Phase 2: Intelligence (4-6 weeks)
- Advanced AI generation
- Re-planning and adaptation
- Weekly check-in conversations
- Progress analytics

### Phase 3: Scale (4-6 weeks)
- Multi-user architecture
- Coach dashboard
- White-label capabilities
- Template marketplace

### Phase 4: Expand (Ongoing)
- Additional verticals
- Mobile apps
- Integrations (wearables, calendars, etc.)
- Enterprise features

---

## Success Metrics

### North Star Metric
**Program Completion Rate** - What % of users finish their programs?

### Supporting Metrics
- Onboarding completion rate
- Daily active users / Weekly active users
- Proof upload rate
- Re-planning trigger rate (too high = poor initial generation)
- NPS score
- Revenue per user
- Coach activation rate (B2B)
- Client retention per coach (B2B)
