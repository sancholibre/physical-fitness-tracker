# Fitness Coach Platform: Detailed Execution Plan

## Why This Vertical Wins

### Market Analysis

**The Problem Coaches Have:**
1. Can only handle 20-30 clients before burning out
2. Spend 60% of time on admin (writing programs, chasing check-ins, tracking progress)
3. No way to verify if clients actually did the work
4. Template programs don't retain clients (feel generic)
5. Scaling means hiring other coaches (margin killer)

**The Opportunity:**
- 300,000+ online fitness coaches in the US alone
- Average coach charges $150-400/month per client
- Coaches actively seeking tools to scale
- Current solutions (Trainerize, TrueCoach) are spreadsheets with a UI - no AI, no personalization

**Your Unfair Advantage:**
- Proof uploads = accountability (nobody else has this)
- AI personalization = every client feels like 1-on-1
- You've already proven it works (on yourself)

### Revenue Model

```
┌─────────────────────────────────────────────────────────────┐
│                    REVENUE PROJECTIONS                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PRICING                                                    │
│  ├── Starter: $99/month (up to 20 clients)                 │
│  ├── Pro: $199/month (up to 50 clients)                    │
│  └── Scale: $399/month (unlimited + white-label)           │
│                                                             │
│  YEAR 1 TARGETS                                             │
│  ├── Month 6: 50 coaches × $150 avg = $7,500 MRR           │
│  ├── Month 12: 200 coaches × $175 avg = $35,000 MRR        │
│  └── ARR: $420,000                                          │
│                                                             │
│  YEAR 2 TARGETS                                             │
│  ├── Month 18: 500 coaches × $200 avg = $100,000 MRR       │
│  ├── Month 24: 1,000 coaches × $225 avg = $225,000 MRR     │
│  └── ARR: $2,700,000                                        │
│                                                             │
│  ADDITIONAL REVENUE STREAMS                                 │
│  ├── Template marketplace (20% cut)                         │
│  ├── Client overage fees ($2/client over limit)            │
│  └── API access for enterprise                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Product Specification

### User Types

```
┌─────────────────────────────────────────────────────────────┐
│                       USER TYPES                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  COACH (Paying Customer)                                    │
│  ├── Creates client programs via AI                         │
│  ├── Monitors all clients from dashboard                    │
│  ├── Gets alerts for missed days/proof                      │
│  ├── Conducts check-ins (AI-assisted)                      │
│  ├── Manages billing (external or integrated)              │
│  └── Customizes branding                                    │
│                                                             │
│  CLIENT (Coach's Customer)                                  │
│  ├── Completes AI onboarding                               │
│  ├── Receives personalized program                          │
│  ├── Tracks daily activities/habits                         │
│  ├── Uploads proof (photos, screenshots)                    │
│  ├── Logs metrics (weight, measurements)                    │
│  └── Communicates with coach                                │
│                                                             │
│  ADMIN (Platform Operator - You)                           │
│  ├── Manages coaches                                        │
│  ├── Monitors platform health                               │
│  ├── Handles billing/support                                │
│  └── Analyzes aggregate data                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Core Features

#### 1. Coach Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  COACH DASHBOARD                                            │
│  ═══════════════════════════════════════════════════════    │
│                                                             │
│  [Today's Alerts]                              [+ New Client]│
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔴 Sarah M. - Missed 2 days, no proof since Tue     │   │
│  │ 🟡 Mike T. - Checkpoint due tomorrow                 │   │
│  │ 🟢 Jessica R. - Completed Week 8, ahead of target   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Client Grid]                          Sort: [Last Active] │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │  Sarah   │   Mike   │ Jessica  │   Tom    │  Amanda  │  │
│  │  Week 4  │  Week 7  │  Week 8  │  Week 2  │  Week 11 │  │
│  │  ⚠️ 67%  │  ✓ 89%   │  ✓ 94%   │  ✓ 100%  │  ✓ 91%   │  │
│  │  -3 lbs  │  -8 lbs  │  -12 lbs │  -1 lbs  │  -18 lbs │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│                                                             │
│  [Quick Stats]                                              │
│  Active Clients: 23    Avg Completion: 87%    Revenue: $4.2k│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 2. AI Client Onboarding

Coach invites client → Client receives link → AI conversation begins:

```
AI: "Hey Sarah! I'm here to build your personalized program with Coach Mike.
Let's make this fit YOUR life. First, what's your main goal?"

Sarah: "I want to lose 30 pounds for my wedding in September."

AI: "Congrats on the engagement! September gives us about 16 weeks - totally
doable for 30 lbs if we're strategic. Let me learn about your situation:

What does a typical week look like for you? Work schedule, gym access, etc."

Sarah: "I work 9-5 Monday to Friday. I have a gym membership but honestly
haven't gone in months. I also have a 2 year old so evenings are chaos."

AI: "Toddler mom with a desk job - got it! Evenings are out. What about:
- Early mornings before work?
- Lunch breaks?
- Weekends when partner can cover?

And does your gym have childcare?"

Sarah: "Mornings are possible, I'm usually up at 5:30 anyway. Gym has
childcare on weekends. Lunch break is only 30 min but I could do something."

AI: "Perfect, I'm seeing a pattern:
- 3x early morning gym sessions (before toddler wakes)
- 2x 20-min lunch workouts (bodyweight/walking)
- 1x weekend gym session (use childcare)

Before I finalize - any injuries? Dietary restrictions? Foods you hate?"

Sarah: "Bad lower back from pregnancy. I'm doing low carb. I hate fish."

AI: "Noted - I'll avoid heavy spinal loading and include core stability work.
Low carb friendly meals, no fish. Let me generate your 16-week program..."
```

**Extracted Spec Sheet:**
```json
{
  "client_id": "sarah_m",
  "coach_id": "coach_mike",
  "goal": {
    "type": "weight_loss",
    "target": "-30 lbs",
    "deadline": "2026-09-15",
    "event": "wedding"
  },
  "schedule": {
    "work": "9-5 M-F",
    "available_slots": [
      {"days": ["M", "W", "F"], "time": "5:30-7:00 AM", "location": "gym"},
      {"days": ["T", "Th"], "time": "12:00-12:30 PM", "location": "office"},
      {"days": ["Sa"], "time": "flexible", "location": "gym_childcare"}
    ]
  },
  "constraints": {
    "injuries": ["lower_back_postpartum"],
    "dietary": ["low_carb", "no_fish"],
    "lifestyle": ["toddler_mom", "desk_job"]
  },
  "equipment": {
    "gym": "full_access",
    "home": "minimal",
    "office": "none"
  }
}
```

#### 3. Program Generation Engine

```javascript
// Coach can customize generation parameters
const COACH_SETTINGS = {
  default_phases: ["Foundation", "Build", "Peak", "Maintain"],
  default_split: "upper_lower",  // or "push_pull_legs", "full_body"
  cardio_philosophy: "zone2_focused",  // or "hiit_focused", "hybrid"
  proof_requirements: {
    gym_sessions: "gym_selfie",
    meals: "food_photo",
    weigh_ins: "scale_photo"
  },
  checkpoint_frequency: "biweekly",
  habits: [
    { id: "protein", name: "Hit protein goal", default: true },
    { id: "water", name: "1 gallon water", default: true },
    { id: "sleep", name: "7+ hours sleep", default: true },
    { id: "steps", name: "8,000+ steps", default: false }
  ]
};

// Generation considers BOTH coach preferences AND client spec
function generateProgram(clientSpec, coachSettings) {
  // 1. Calculate timeline
  const weeks = calculateWeeks(clientSpec.goal.deadline);

  // 2. Design phases
  const phases = designPhases(weeks, clientSpec.goal.type, coachSettings);

  // 3. Map schedule to workout slots
  const weeklyTemplate = mapSchedule(clientSpec.schedule, coachSettings);

  // 4. Apply constraints
  const adjustedTemplate = applyConstraints(weeklyTemplate, clientSpec.constraints);

  // 5. Generate all days
  const days = generateAllDays(weeks, phases, adjustedTemplate);

  // 6. Insert checkpoints
  const programWithCheckpoints = insertCheckpoints(days, coachSettings);

  // 7. Add coach's required habits
  const finalProgram = addHabits(programWithCheckpoints, coachSettings.habits);

  return finalProgram;
}
```

#### 4. Client Tracker (Your Current GYST UI)

The client-facing tracker is essentially what you've already built:
- Daily view with activities and habits
- Proof uploads
- Weight tracking
- Progress visualization
- Streak tracking

**Additions for coach platform:**
- Coach branding (logo, colors)
- In-app messaging to coach
- Check-in prompts from coach
- Shared notes

#### 5. Proof & Accountability System

```
┌─────────────────────────────────────────────────────────────┐
│                    PROOF SYSTEM                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PROOF TYPES                                                │
│  ├── Gym selfie (shows they were there)                    │
│  ├── Workout screenshot (Apple Watch, Strava, etc.)        │
│  ├── Food photo (meal documentation)                        │
│  ├── Scale photo (weight verification)                      │
│  ├── Progress photo (weekly/biweekly)                      │
│  └── Metric screenshot (MyFitnessPal, Cronometer)          │
│                                                             │
│  COACH CONTROLS                                             │
│  ├── Which proof types required                             │
│  ├── Which days require proof                               │
│  ├── Grace period before flagging                           │
│  └── Auto-reminder settings                                 │
│                                                             │
│  ALERT SYSTEM                                               │
│  ├── 24hr no activity → Yellow flag                        │
│  ├── 48hr no activity → Red flag + coach alert             │
│  ├── Missed proof → Prompt to client                       │
│  ├── Pattern detection → "Client typically misses Mondays" │
│  └── Positive alerts → "Client on 14-day streak!"          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 6. Check-in System

AI-assisted check-ins save coaches hours:

```
┌─────────────────────────────────────────────────────────────┐
│  WEEKLY CHECK-IN: Sarah M. (Week 4)                        │
│  ═══════════════════════════════════════════════════════    │
│                                                             │
│  [AI Summary]                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Completion: 71% (5/7 days)                          │   │
│  │ Weight: 187.2 → 184.8 (-2.4 lbs this week)         │   │
│  │ Trend: On track for goal                            │   │
│  │                                                      │   │
│  │ Wins:                                                │   │
│  │ • Hit all gym sessions                               │   │
│  │ • Protein goal 6/7 days                             │   │
│  │                                                      │   │
│  │ Flags:                                               │   │
│  │ • Missed both lunch workouts                        │   │
│  │ • No proof uploaded Wednesday                       │   │
│  │ • Sleep under 6hrs twice                            │   │
│  │                                                      │   │
│  │ Suggested talking points:                           │   │
│  │ • Explore lunch workout barriers                    │   │
│  │ • Discuss sleep strategies with toddler             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Quick Actions]                                            │
│  [Send Encouragement] [Schedule Call] [Adjust Program]     │
│                                                             │
│  [Message]                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Great week Sarah! 2.4 lbs down 📉                   │   │
│  │ Your gym consistency is 💯                          │   │
│  │                                                      │   │
│  │ I noticed lunch workouts aren't happening - want to │   │
│  │ swap those for something else? We could...          │   │
│  │                              [AI Suggest] [Send]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │   Coach App     │     │   Client App    │               │
│  │   (Next.js)     │     │   (Next.js)     │               │
│  └────────┬────────┘     └────────┬────────┘               │
│           │                       │                         │
│           └───────────┬───────────┘                         │
│                       │                                     │
│                       ▼                                     │
│           ┌─────────────────────┐                          │
│           │     API Layer       │                          │
│           │  (Next.js Routes)   │                          │
│           └──────────┬──────────┘                          │
│                      │                                      │
│     ┌────────────────┼────────────────┐                    │
│     │                │                │                     │
│     ▼                ▼                ▼                     │
│  ┌──────┐      ┌──────────┐     ┌──────────┐              │
│  │ Auth │      │ Database │     │   AI     │              │
│  │Supa- │      │ Supabase │     │  Claude  │              │
│  │ base │      │ Postgres │     │   API    │              │
│  └──────┘      └──────────┘     └──────────┘              │
│                      │                                      │
│                      ▼                                      │
│              ┌──────────────┐                              │
│              │  Cloudinary  │                              │
│              │   (Files)    │                              │
│              └──────────────┘                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- =====================
-- MULTI-TENANT SCHEMA
-- =====================

-- Coaches (paying customers)
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  business_name TEXT,
  branding JSONB DEFAULT '{}',  -- logo_url, primary_color, etc.
  settings JSONB DEFAULT '{}',  -- default habits, proof requirements
  stripe_customer_id TEXT,
  subscription_tier TEXT DEFAULT 'starter',
  subscription_status TEXT DEFAULT 'active',
  client_limit INT DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients (belong to coaches)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  spec_sheet JSONB,  -- extracted from onboarding
  status TEXT DEFAULT 'onboarding',  -- onboarding, active, paused, completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coach_id, email)
);

-- Programs (one per client, can have history)
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal JSONB NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  phases JSONB NOT NULL,
  status TEXT DEFAULT 'active',  -- active, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Program Days
CREATE TABLE program_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
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
  coach_notes TEXT,  -- private notes from coach
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, date)
);

-- Checkpoints
CREATE TABLE checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  scheduled_date DATE NOT NULL,
  type TEXT NOT NULL,
  targets JSONB,
  actuals JSONB,
  coach_feedback TEXT,
  completed_at TIMESTAMPTZ
);

-- Messages (coach-client communication)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,  -- 'coach' or 'client'
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding Conversations (for context)
CREATE TABLE onboarding_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  messages JSONB NOT NULL,
  extracted_spec JSONB,
  status TEXT DEFAULT 'in_progress',  -- in_progress, completed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coach Templates (reusable program structures)
CREATE TABLE coach_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL,  -- weight_loss, muscle_gain, etc.
  duration_weeks INT NOT NULL,
  phases JSONB NOT NULL,
  weekly_structure JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,  -- for marketplace
  price DECIMAL,  -- if selling on marketplace
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_days ENABLE ROW LEVEL SECURITY;

-- Coaches can only see their own data
CREATE POLICY coaches_own_data ON coaches
  FOR ALL USING (user_id = auth.uid());

-- Coaches can only see their own clients
CREATE POLICY clients_own_coach ON clients
  FOR ALL USING (coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid()));

-- Clients can see their own programs
CREATE POLICY programs_own_client ON programs
  FOR ALL USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR
    client_id IN (SELECT id FROM clients WHERE coach_id IN
      (SELECT id FROM coaches WHERE user_id = auth.uid()))
  );
```

### API Endpoints

```typescript
// =====================
// COACH ENDPOINTS
// =====================

// Dashboard
GET  /api/coach/dashboard          // Overview stats, alerts, client grid
GET  /api/coach/clients            // List all clients
GET  /api/coach/clients/:id        // Single client detail
POST /api/coach/clients/invite     // Send invite to new client

// Programs
POST /api/coach/programs/generate  // AI generates program from spec
PUT  /api/coach/programs/:id       // Modify program
POST /api/coach/programs/:id/adjust // AI-assisted adjustment

// Check-ins
GET  /api/coach/checkins/pending   // Clients due for check-in
GET  /api/coach/checkins/:clientId/summary  // AI-generated summary
POST /api/coach/checkins/:clientId/complete // Mark check-in done

// Templates
GET  /api/coach/templates          // List coach's templates
POST /api/coach/templates          // Create new template
PUT  /api/coach/templates/:id      // Update template

// Settings
GET  /api/coach/settings           // Coach preferences
PUT  /api/coach/settings           // Update preferences
PUT  /api/coach/branding           // Update branding

// =====================
// CLIENT ENDPOINTS
// =====================

// Onboarding
POST /api/client/onboarding/start  // Begin AI conversation
POST /api/client/onboarding/message // Send message in conversation
POST /api/client/onboarding/complete // Finalize spec sheet

// Daily tracking
GET  /api/client/today             // Today's activities/habits
PUT  /api/client/days/:date        // Update day (toggle, weight, notes)
POST /api/client/days/:date/proof  // Upload proof file

// Progress
GET  /api/client/progress          // Overall progress stats
GET  /api/client/program           // Full program view

// Messages
GET  /api/client/messages          // Conversation with coach
POST /api/client/messages          // Send message to coach

// =====================
// AI ENDPOINTS
// =====================

POST /api/ai/onboarding/respond    // AI response in onboarding
POST /api/ai/generate-program      // Generate program from spec
POST /api/ai/adjust-program        // Adjust existing program
POST /api/ai/checkin-summary       // Generate check-in summary
POST /api/ai/suggest-message       // Suggest coach message
```

---

## Go-To-Market Strategy

### Phase 1: Founder-Led Sales (Months 1-3)

**Target:** 20 paying coaches

**Channels:**
1. **Your Network** - Do you know any coaches? Start there.
2. **Instagram DMs** - Find coaches with 5k-50k followers (big enough to have clients, small enough to respond)
3. **Facebook Groups** - Online fitness coach communities
4. **Reddit** - r/personaltraining, r/fitness (carefully, no spam)
5. **Cold Email** - Coaches with websites but clearly manual processes

**Pitch:**
> "I built a tool that turns your coaching programs into hyper-personalized experiences. Clients onboard through an AI conversation, get a program that fits their actual life, and upload daily proof so you know they're doing the work. You get a dashboard showing who needs attention. Want to try it with 3 clients for free?"

**Offer:**
- Free pilot for 30 days with 3 clients
- White-glove onboarding (you help them set up)
- Weekly calls to gather feedback
- Convert to paid after pilot

### Phase 2: Content & Community (Months 3-6)

**Target:** 100 paying coaches

**Content Strategy:**
1. **YouTube** - "How I Built an AI-Powered Coaching System" (your story)
2. **Twitter/X** - Build in public, share metrics, coach testimonials
3. **Blog** - SEO for "online coaching software", "client accountability tools"
4. **Case Studies** - Deep dives on coach success stories

**Community:**
- Private Slack/Discord for coaches using the platform
- Weekly office hours / Q&A
- Feature request voting

**Partnerships:**
- Fitness certifications (NASM, ACE) - affiliate or integration
- Fitness influencers - affiliate program
- Complementary tools (MyFitnessPal, Whoop) - integrations

### Phase 3: Scale (Months 6-12)

**Target:** 500+ paying coaches

**Paid Acquisition:**
- Meta ads targeting fitness coaches
- Google ads for "online coaching software"
- YouTube ads on fitness business content
- Podcast sponsorships (fitness business podcasts)

**Product-Led Growth:**
- Client-facing app shows "Powered by [Your Brand]"
- Coaches share client success stories (social proof)
- Template marketplace creates network effects

---

## Development Roadmap

### Sprint 1-2: Foundation (Weeks 1-4)

**Goal:** Multi-tenant architecture + coach auth

```
□ Set up Next.js 14 project with App Router
□ Configure Supabase (auth, database, RLS)
□ Implement coach signup/login flow
□ Create database schema (coaches, clients, programs)
□ Build basic coach dashboard shell
□ Deploy to Vercel
```

### Sprint 3-4: Client Onboarding (Weeks 5-8)

**Goal:** AI-powered onboarding conversation

```
□ Build conversational UI component
□ Implement Claude API integration
□ Design onboarding prompt engineering
□ Create spec sheet extraction logic
□ Build client invite flow
□ Test end-to-end onboarding
```

### Sprint 5-6: Program Generation (Weeks 9-12)

**Goal:** AI generates personalized programs

```
□ Design template schema
□ Build program generation engine
□ Implement constraint processors
□ Create coach template customization
□ Generate sample programs for testing
□ Connect onboarding → generation pipeline
```

### Sprint 7-8: Client Tracker (Weeks 13-16)

**Goal:** Daily tracking experience (adapt current GYST)

```
□ Adapt GYST UI for multi-tenant
□ Implement proof upload system
□ Build activity/habit tracking
□ Add weight logging
□ Create progress visualization
□ Connect to Supabase real-time
```

### Sprint 9-10: Coach Dashboard (Weeks 17-20)

**Goal:** Full coach management experience

```
□ Build client grid view
□ Implement alert system
□ Create AI check-in summaries
□ Build messaging system
□ Add analytics/reporting
□ Coach settings/branding
```

### Sprint 11-12: Payments & Polish (Weeks 21-24)

**Goal:** Launch-ready product

```
□ Integrate Stripe subscriptions
□ Implement usage limits
□ Build billing dashboard
□ Polish UI/UX
□ Performance optimization
□ Documentation
□ Launch! 🚀
```

---

## Financial Projections

### Costs

```
MONTHLY COSTS (at 100 coaches)
├── Vercel Pro: $20
├── Supabase Pro: $25
├── Cloudinary: $50 (estimated)
├── Claude API: $200 (estimated)
├── Stripe fees: ~3% of revenue
├── Domain/email: $15
└── Total: ~$310 + 3% rev

MONTHLY COSTS (at 500 coaches)
├── Vercel Pro: $20
├── Supabase Pro: $75 (higher tier)
├── Cloudinary: $200
├── Claude API: $800
├── Stripe fees: ~3%
├── Support tools: $100
└── Total: ~$1,200 + 3% rev
```

### Unit Economics

```
AVERAGE COACH
├── Monthly fee: $175
├── Stripe fee: -$5.25
├── Infra cost: -$3 (allocated)
├── AI cost: -$4 (per coach)
└── Gross margin: $162.75 (93%)

LIFETIME VALUE
├── Average retention: 18 months
├── LTV: $175 × 18 = $3,150
├── Target CAC: <$300 (10:1 LTV:CAC)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI costs spike | Cache common responses, batch operations, usage limits |
| Coaches churn | Onboarding support, success team, community |
| Client data security | SOC2 compliance roadmap, encryption, audits |
| Competition copies | Speed to market, community moat, brand |
| AI generates bad programs | Human review layer, coach override, feedback loops |
| Coaches can't sell | Provide marketing templates, case studies |

---

## Success Metrics

### North Star
**Client Program Completion Rate** - proves the product works

### Coach Metrics
- Activation rate (complete setup within 7 days)
- Client add rate (how many clients per coach)
- Retention rate (monthly cohort retention)
- NPS score

### Client Metrics
- Onboarding completion rate
- Daily active usage
- Proof upload rate
- Goal achievement rate

### Business Metrics
- MRR / ARR
- CAC / LTV
- Churn rate
- Expansion revenue (upgrades)

---

## Immediate Next Steps

1. **Validate pricing** - Talk to 10 coaches about willingness to pay
2. **Build landing page** - Capture early interest
3. **Create demo** - Screen recording of the vision
4. **Find 3 pilot coaches** - Free users for testing
5. **Start Sprint 1** - Foundation work

---

## Why This Wins

1. **You're the proof** - You used it on yourself, lost the weight, hit your goals
2. **Unique feature** - Proof uploads solve real accountability problem
3. **AI timing** - Market ready for AI-powered tools now
4. **Clear buyer** - Coaches have money, clear pain, active in communities
5. **Scalable model** - SaaS with high margins, network effects from marketplace
6. **Moat potential** - Data flywheel (more usage → better AI → better results)

The fitness coach market is ready for disruption. Current tools are glorified spreadsheets. You can be the Notion of fitness coaching - flexible, AI-powered, and delightful to use.
