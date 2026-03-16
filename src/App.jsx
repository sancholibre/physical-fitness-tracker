import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// ============================================
// GYST TRACKER - Alec Santiago
// Multi-Arc Fitness Tracker
// Arc 1: Jan 2 - Apr 1, 2026 | Arc 2: Apr 2 - Jul 1, 2026
// ============================================

// Supabase config
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USER_ID = 'alec-santiago'; // Single user for now
const EDIT_PASSWORD = process.env.REACT_APP_EDIT_PASSWORD;

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

const STRAVA_AUTH_URL = `${SUPABASE_URL}/functions/v1/strava-auth`;
const STRAVA_SYNC_URL = `${SUPABASE_URL}/functions/v1/strava-sync`;

const WEIGHT_START = 190;
const WEIGHT_TARGET = 178;
const ARC2_WEIGHT_START = 183;
const ARC2_WEIGHT_TARGET = 175;

const NEW_SCHEDULE_START = '2026-03-16';

const ARCS = {
  1: { name: 'The First Arc', startDay: 1, totalDays: 89 },
  2: { name: 'The Second Arc', startDay: 90, totalDays: 91 },
};

const PHASE_NAMES = {
  1: 'Base Building', 2: 'Sharpening', 3: 'Taper',
  4: 'Strength & Speed', 5: 'Peak Performance', 6: 'Consolidation',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getLocalDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ============================================
// SUPABASE DATA SERVICE
// ============================================

async function loadStateFromSupabase() {
  const { data, error } = await supabase
    .from('tracker_state')
    .select('*')
    .eq('user_id', USER_ID)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error loading state:', error);
    return null;
  }
  return data;
}

async function saveStateToSupabase(days, checkpoints, settings, lifts) {
  const { error } = await supabase
    .from('tracker_state')
    .upsert({
      user_id: USER_ID,
      days: days,
      checkpoints: checkpoints,
      settings: settings,
      lifts: lifts,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  
  if (error) {
    console.error('Error saving state:', error);
    return false;
  }
  return true;
}

// ============================================
// STRAVA DATA SERVICE
// ============================================

async function fetchStravaMiles() {
  const { data, error } = await supabase
    .from('strava_activities')
    .select('distance_meters')
    .eq('user_id', USER_ID);

  if (error || !data) return null;
  const totalMeters = data.reduce((sum, a) => sum + (a.distance_meters || 0), 0);
  return parseFloat((totalMeters / 1609.344).toFixed(1));
}

async function triggerStravaSync() {
  const res = await fetch(STRAVA_SYNC_URL, { method: 'POST' });
  if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
  return res.json();
}

// ============================================
// CLOUDINARY UPLOAD SERVICE
// ============================================

async function uploadToCloudinary(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'fbi-pft');
  
  // Use 'raw' endpoint for PDFs, 'image' for images
  const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
  const resourceType = isPdf ? 'raw' : 'image';
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        resolve(response.secure_url);
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
    
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`);
    xhr.send(formData);
  });
}

async function uploadWithRetry(file, onProgress, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await uploadToCloudinary(file, onProgress);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// ============================================
// DATA GENERATION
// ============================================

function generateAllDays() {
  const days = [];
  // Use local dates to avoid UTC/DST timezone bugs
  let dayNum = 1;

  // === ARC 1: Jan 2 - Apr 1, 2026 ===
  const arc1Start = new Date(2026, 0, 2);
  const arc1End = new Date(2026, 3, 1);

  for (let d = new Date(arc1Start); d <= arc1End; d.setDate(d.getDate() + 1)) {
    const dateStr = getLocalDateStr(d);
    const dow = d.getDay();
    const weekNum = Math.ceil(dayNum / 7);
    const phase = weekNum <= 6 ? 1 : weekNum <= 10 ? 2 : 3;
    const useNewSchedule = dateStr >= NEW_SCHEDULE_START;

    const day = {
      id: dateStr,
      date: dateStr,
      dayNumber: dayNum,
      weekNumber: weekNum,
      phase,
      arc: 1,
      dayOfWeek: dow,
      activities: [],
      habits: [],
      location: 'Denver',
      isTravel: false,
      isCheckpoint: weekNum % 2 === 0 && dow === 0 && weekNum <= 12,
      notes: '',
      weight: null,
      proofFiles: {
        appleHealth: null,
        cronometer: null,
        uploadedAt: null
      }
    };

    // TRAVEL ADJUSTMENTS (all before March 16)
    if (dateStr === '2026-01-12') {
      day.isTravel = true;
      day.location = 'Travel → SF';
      day.activities = [{ id: 'travel', type: 'travel', name: '✈️ Travel Day (DEN→SFO 7:47am) - Light activity only', completed: false }];
    } else if (dateStr >= '2026-01-13' && dateStr <= '2026-01-16') {
      day.location = 'SF: The Mosser';
      day.activities = getConferenceDayActivities(dateStr);
    } else if (dateStr >= '2026-01-17' && dateStr <= '2026-01-21') {
      day.location = 'SF: Castro';
      day.activities = getVacationDayActivities(dateStr);
    } else if (dateStr === '2026-01-22') {
      day.isTravel = true;
      day.location = 'Travel → Denver';
      day.activities = [{ id: 'travel', type: 'travel', name: '✈️ Travel Day (SFO→DEN) - Light activity only', completed: false }];
    } else if (useNewSchedule) {
      day.activities = getNewScheduleActivities(dow, weekNum, phase);
    } else {
      day.activities = getRegularActivities(dow, weekNum, phase);
    }

    // Daily habits (skip travel days and rest days on new schedule)
    const isRestDay = useNewSchedule && dow === 0;
    if (!day.isTravel && !isRestDay) {
      day.habits = [
        { id: 'protein', name: 'Protein 185g+', completed: false },
        { id: 'calories', name: 'Calorie Target', completed: false },
        { id: 'water', name: 'Water 1gal', completed: false },
        { id: 'sleep', name: 'Sleep 7+hrs', completed: false },
      ];
    }

    days.push(day);
    dayNum++;
  }

  // === ARC 2: Apr 2 - Jul 1, 2026 ===
  const arc2Start = new Date(2026, 3, 2);
  const arc2End = new Date(2026, 6, 1);

  for (let d = new Date(arc2Start); d <= arc2End; d.setDate(d.getDate() + 1)) {
    const dateStr = getLocalDateStr(d);
    const dow = d.getDay();
    const weekNum = Math.ceil(dayNum / 7);
    const phase = weekNum <= 19 ? 4 : weekNum <= 25 ? 5 : 6;

    const day = {
      id: dateStr,
      date: dateStr,
      dayNumber: dayNum,
      weekNumber: weekNum,
      phase,
      arc: 2,
      dayOfWeek: dow,
      activities: getNewScheduleActivities(dow, weekNum, phase),
      habits: [],
      location: 'Denver',
      isTravel: false,
      isCheckpoint: weekNum % 2 === 0 && dow === 6 && weekNum >= 16,
      notes: '',
      weight: null,
      proofFiles: {
        appleHealth: null,
        cronometer: null,
        uploadedAt: null
      }
    };

    // Daily habits (skip rest days - Sunday)
    if (dow !== 0) {
      day.habits = [
        { id: 'protein', name: 'Protein 185g+', completed: false },
        { id: 'calories', name: 'Calorie Target', completed: false },
        { id: 'water', name: 'Water 1gal', completed: false },
        { id: 'sleep', name: 'Sleep 7+hrs', completed: false },
      ];
    }

    days.push(day);
    dayNum++;
  }

  return days;
}

function getConferenceDayActivities(dateStr) {
  const map = {
    '2026-01-13': [{ id: 'z2-1', type: 'zone2', name: '🏃 Zone 2 - 40min (Embarcadero, before conference)', completed: false }],
    '2026-01-14': [{ id: 'lift-1', type: 'lifting', name: '🏋️ Lower Body - Fitness SF SOMA (Squat 3x5, RDL 2x6)', completed: false }],
    '2026-01-15': [{ id: 'z2-2', type: 'zone2', name: '🏃 Zone 2 - 45min (Embarcadero)', completed: false }],
    '2026-01-16': [{ id: 'lift-2', type: 'lifting', name: '🏋️ Pull Day - Fitness SF SOMA (Deadlift 3x5, Pull-ups 4x6, Rows 3x6)', completed: false }],
  };
  return map[dateStr] || [];
}

function getVacationDayActivities(dateStr) {
  const map = {
    '2026-01-17': [{ id: 'z2-3', type: 'zone2', name: '🏃 Zone 2 - 30min (Explore the Panhandle!)', completed: false }],
    '2026-01-18': [{ id: 'int-1', type: 'intervals', name: '🔥 Intervals - 6x400m (Golden Gate Park)', completed: false }],
    '2026-01-19': [{ id: 'rest-1', type: 'rest', name: '😴 Full Rest - Enjoy SF!', completed: false }],
    '2026-01-20': [
      { id: 'z2-4', type: 'zone2', name: '🏃 Zone 2 - 45min (Golden Gate Park)', completed: false },
      { id: 'lift-3', type: 'lifting', name: '🏋️ Upper Push - Fitness SF Castro', completed: false },
    ],
    '2026-01-21': [{ id: 'tempo-1', type: 'tempo', name: '🏃 Tempo - 20min @ 8:30 (Panhandle)', completed: false }],
  };
  return map[dateStr] || [];
}

function getRegularActivities(dow, weekNum, phase) {
  const intervalDetail = getIntervalDetail(weekNum, phase);
  const tempoDetail = getTempoDetail(weekNum, phase);
  const gtgDetail = getGTGDetail(weekNum, phase);
  
  if (phase === 3) {
    if (weekNum === 11) {
      const w11 = {
        0: [{ id: 'easy', type: 'zone2', name: '🏃 Easy Jog - 15min', completed: false }],
        1: [{ id: 'rest', type: 'rest', name: '😴 Full Rest', completed: false }],
        2: [{ id: 'z2', type: 'zone2', name: '🏃 Zone 2 - 30min (easy)', completed: false }, { id: 'lift', type: 'lifting', name: '🏋️ Upper Push (Light)', completed: false }],
        3: [{ id: 'lift', type: 'lifting', name: '🏋️ Lower (2 sets each)', completed: false }],
        4: [{ id: 'z2', type: 'zone2', name: '🏃 Zone 2 - 30min', completed: false }],
        5: [{ id: 'lift', type: 'lifting', name: '🏋️ Upper Pull (Light)', completed: false }],
        6: [{ id: 'int', type: 'intervals', name: '🔥 4x400m @ race pace', completed: false }],
      };
      return w11[dow] || [];
    }
    if (weekNum === 12) {
      const w12 = {
        0: [{ id: 'rest', type: 'rest', name: '😴 REST - Day before test', completed: false }],
        1: [{ id: 'rest', type: 'rest', name: '😴 REST', completed: false }],
        2: [{ id: 'easy', type: 'zone2', name: '🏃 Easy Jog - 20min', completed: false }],
        3: [{ id: 'lift', type: 'lifting', name: '🏋️ Light Full Body', completed: false }],
        4: [{ id: 'strides', type: 'strides', name: '🏃 Strides - 4x100m only', completed: false }],
        5: [{ id: 'rest', type: 'rest', name: '😴 REST', completed: false }],
        6: [{ id: 'rest', type: 'rest', name: '😴 REST', completed: false }],
      };
      return w12[dow] || [];
    }
  }
  
  if (phase === 2 && dow === 4 && (weekNum === 8 || weekNum === 10)) {
    return [
      { id: 'tt', type: 'timetrial', name: '⏱️ 1.5mi TIME TRIAL', completed: false },
      { id: 'gtg', type: 'gtg', name: `💪 Push-up GTG - ${gtgDetail}`, completed: false },
    ];
  }
  
  const schedule = {
    0: [
      { id: 'tempo', type: 'tempo', name: `🏃 Tempo - ${tempoDetail}`, completed: false },
      { id: 'max', type: 'maxtest', name: '📊 Max Push-up Test', completed: false },
    ],
    1: [{ id: 'rest', type: 'rest', name: '😴 Full Rest Day', completed: false }],
    2: [
      { id: 'z2', type: 'zone2', name: '🏃 Zone 2 - 45min (AM)', completed: false },
      { id: 'lift', type: 'lifting', name: '🏋️ Upper Push (Bench 3x5, OHP 3x6, Dips 2x10)', completed: false },
      { id: 'gtg', type: 'gtg', name: `💪 Push-up GTG - ${gtgDetail}`, completed: false },
    ],
    3: [{ id: 'lift', type: 'lifting', name: '🏋️ Lower (Squat 3x5, RDL 3x8, BSS 2x8)', completed: false }],
    4: [
      { id: 'z2', type: 'zone2', name: '🏃 Zone 2 - 50min', completed: false },
      { id: 'strides', type: 'strides', name: '🏃 Strides - 4x100m after', completed: false },
      { id: 'gtg', type: 'gtg', name: `💪 Push-up GTG - ${gtgDetail}`, completed: false },
    ],
    5: [{ id: 'lift', type: 'lifting', name: '🏋️ Pull Day (Deadlift 3x5, Pull-ups 4x8, Row 3x8)', completed: false }],
    6: [
      { id: 'int', type: 'intervals', name: `🔥 Intervals - ${intervalDetail}`, completed: false },
      { id: 'gtg', type: 'gtg', name: `💪 Push-up GTG - ${gtgDetail}`, completed: false },
    ],
  };
  
  return schedule[dow] || [];
}

function getIntervalDetail(weekNum, phase) {
  if (phase === 1) {
    if (weekNum <= 2) return '5x400m @ 1:55';
    if (weekNum <= 4) return '6x400m @ 1:52';
    return '6x400m @ 1:50';
  }
  if (phase === 2) {
    if (weekNum <= 8) return '5x800m @ 3:45';
    return '4x800m @ 3:40 + 2x400';
  }
  return '4x400m race pace';
}

function getTempoDetail(weekNum, phase) {
  if (phase === 1) {
    if (weekNum <= 2) return '15min @ 8:45';
    if (weekNum <= 4) return '20min @ 8:30';
    return '25min @ 8:15';
  }
  if (phase === 2) {
    if (weekNum <= 8) return '25min @ 8:00';
    return '2x12min @ 7:45';
  }
  return '15min easy';
}

function getGTGDetail(weekNum, phase) {
  // Progressive GTG: build volume from current 20/set baseline
  if (phase === 1) {
    if (weekNum <= 2) return '4x15 (60 total)';
    if (weekNum <= 4) return '4x18 (72 total)';
    return '4x20 (80 total)';
  }
  if (phase === 2) {
    if (weekNum <= 8) return '4x22 (88 total)';
    return '4x25 (100 total)';
  }
  // Phase 3: taper
  return '3x18 (54 total)';
}

// ============================================
// ARC 2 PROGRESSION FUNCTIONS
// ============================================

function getArc2TempoDetail(weekNum) {
  if (weekNum <= 16) return '25min @ 7:45';
  if (weekNum <= 18) return '30min @ 7:30';
  if (weekNum <= 20) return '30min @ 7:15';
  if (weekNum <= 24) return '2x15min @ 7:00';
  return '25min @ 7:30';
}

function getArc2GTGDetail(weekNum) {
  if (weekNum <= 16) return '4x25 (100 total)';
  if (weekNum <= 18) return '5x22 (110 total)';
  if (weekNum <= 20) return '5x25 (125 total)';
  if (weekNum <= 24) return '5x28 (140 total)';
  return '4x25 (100 total)';
}

// New weekly schedule used from March 16+ (late Arc 1) and all of Arc 2
function getNewScheduleActivities(dow, weekNum, phase) {
  const tempoDetail = phase >= 4 ? getArc2TempoDetail(weekNum) : getTempoDetail(weekNum, phase);
  const gtgDetail = phase >= 4 ? getArc2GTGDetail(weekNum) : getGTGDetail(weekNum, phase);

  const schedule = {
    0: [{ id: 'rest', type: 'rest', name: '😴 Full Rest Day', completed: false }],
    1: [
      { id: 'z2', type: 'zone2', name: '🏃 Zone 2 - 55min', completed: false },
      { id: 'gtg', type: 'gtg', name: `💪 Push-up GTG - ${gtgDetail}`, completed: false },
    ],
    2: [
      { id: 'lift', type: 'lifting', name: '🏋️ Upper Push (Flat Bench 3x5, OHP 3x5, Weighted Dips 3x8)', completed: false },
    ],
    3: [
      { id: 'tempo', type: 'tempo', name: `🏃 Tempo - ${tempoDetail}`, completed: false },
      { id: 'core', type: 'core', name: '🧱 Core Circuit (Plank 3x45s, Hanging Leg Raise 3x10, Pallof Press 3x10)', completed: false },
    ],
    4: [
      { id: 'lift', type: 'lifting', name: '🏋️ Lower Body (Back Squat 3x5, Romanian Deadlift 3x8, BSS 3x8/leg)', completed: false },
    ],
    5: [
      { id: 'lift', type: 'lifting', name: '🏋️ Pull Day (Conventional Deadlift 3x5, Weighted Pull-ups 4x6-8, Pendlay Row 3x8)', completed: false },
      { id: 'gtg', type: 'gtg', name: `💪 Push-up GTG - ${gtgDetail}`, completed: false },
    ],
    6: [
      { id: 'sat', type: 'endurance', name: '🏃 Long Run 70-80min easy OR 5x800m + 4x200m Sprints', completed: false },
    ],
  };

  return schedule[dow] || [];
}

const CHECKPOINT_TARGETS = {
  2: { run: '12:10', pushups: 38, pullups: 10, sprint: '50.5', weight: 188 },
  4: { run: '11:50', pushups: 41, pullups: 11, sprint: '50.0', weight: 185 },
  6: { run: '11:35', pushups: 44, pullups: 11, sprint: '49.5', weight: 183 },
  8: { run: '11:20', pushups: 47, pullups: 12, sprint: '49.0', weight: 180 },
  10: { run: '11:05', pushups: 50, pullups: 12, sprint: '48.5', weight: 179 },
  12: { run: '<11:00', pushups: '50+', pullups: 12, sprint: '<49', weight: 178 },
};

const ARC2_CHECKPOINT_TARGETS = {
  16: { run: '10:50', pushups: 52, pullups: 13, longRun: '12mi', weight: 181 },
  18: { run: '10:40', pushups: 55, pullups: 14, longRun: '13mi', weight: 179 },
  20: { run: '10:30', pushups: 58, pullups: 15, longRun: '14mi', weight: 178 },
  22: { run: '10:20', pushups: 60, pullups: 15, longRun: '15mi', weight: 177 },
  24: { run: '10:10', pushups: 62, pullups: 16, longRun: '15mi', weight: 176 },
  26: { run: '<10:00', pushups: '65+', pullups: 16, longRun: '15mi+', weight: 175 },
};

const MEALS = {
  breakfast: [
    '4 eggs + 2 whites + cheese (34g P, 420 cal)',
    'Greek yogurt 1.5c + protein powder + berries (45g P, 380 cal)',
    'Cottage cheese 2c + fruit (52g P, 400 cal)',
  ],
  lunch: [
    'Tuna salad 2 cans on greens (50g P, 450 cal)',
    'Tofu stir-fry + brown rice (35g P, 520 cal)',
    'Shrimp bowl + quinoa (42g P, 480 cal)',
  ],
  dinner: [
    'White fish 8oz + rice + veg (50g P, 550 cal)',
    'Tofu 14oz baked + stir-fry (45g P, 600 cal)',
    'Shrimp 10oz + zoodles (52g P, 450 cal)',
    'Tuna steak 8oz + sweet potato (58g P, 520 cal)',
  ],
  snacks: [
    'Protein shake 2 scoops (50g P, 240 cal)',
    'Greek yogurt 1c (20g P, 150 cal)',
    'String cheese x3 (21g P, 240 cal)',
    'Hard boiled eggs x3 (18g P, 210 cal)',
  ],
};

// ============================================
// COMPONENTS
// ============================================

function Header({ stats, onGoToToday }) {
  const arcName = ARCS[stats.currentArc]?.name || 'The First Arc';
  return (
    <header className="header">
      <div className="brand">
        <span className="brand-icon">🎯</span>
        <div>
          <h1>GYST TRACKER</h1>
          <span className="subtitle">Alec Santiago &bull; {arcName}</span>
        </div>
      </div>
      <button className="goto-today-btn" onClick={onGoToToday}>
        📍 Go To Today
      </button>
      <div className="countdown">
        <div className="cd-num">D{stats.currentDayNumber}</div>
        <div className="cd-label">OF {stats.totalDays}</div>
        <div className="cd-label">W{stats.currentWeek}</div>
      </div>
    </header>
  );
}

function Stats({ stats, stravaMiles }) {
  return (
    <div className="stats-bar">
      <div className="stat">
        <span className="stat-val">{stats.trainingPct}%</span>
        <span className="stat-lbl">Training</span>
      </div>
      <div className="stat">
        <span className="stat-val">{stats.habitsPct}%</span>
        <span className="stat-lbl">Habits</span>
      </div>
      <div className="stat">
        <span className="stat-val">{stats.arcProgressPct}%</span>
        <span className="stat-lbl">Thru Arc {stats.currentArc}</span>
      </div>
      <div className="stat">
        <span className="stat-val">{stravaMiles !== null ? stravaMiles : '--'}</span>
        <span className="stat-lbl">Miles</span>
      </div>
    </div>
  );
}

function FileUpload({ dayId, type, currentUrl, onUpload, onRemove, isEditing }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  
  const label = type === 'appleHealth' ? '📱 Health' : '🥗 Cronometer';
  const accept = type === 'appleHealth' ? 'image/*' : 'application/pdf,image/*';
  
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('File too large (max 5MB)'); return; }
    setUploading(true); setProgress(0); setError(null);
    try {
      const url = await uploadWithRetry(file, setProgress);
      onUpload(dayId, type, url);
    } catch (err) { setError('Upload failed. Try again.'); console.error('Upload error:', err); }
    finally { setUploading(false); setProgress(0); }
  }, [dayId, type, onUpload]);
  
  const handleDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); if (!isEditing) return; handleFile(e.dataTransfer.files[0]); }, [isEditing, handleFile]);
  const handleDragOver = useCallback((e) => { e.preventDefault(); if (isEditing) setDragOver(true); }, [isEditing]);
  const handleDragLeave = useCallback(() => { setDragOver(false); }, []);
  const handleInputChange = useCallback((e) => { handleFile(e.target.files[0]); e.target.value = ''; }, [handleFile]);
  const handleRemove = useCallback(() => { if (window.confirm('Remove this proof file?')) onRemove(dayId, type); }, [dayId, type, onRemove]);
  const [showPdfModal, setShowPdfModal] = useState(false);
  
  const isPdf = currentUrl?.toLowerCase().includes('.pdf');
  
  if (currentUrl) {
    return (
      <div className="proof-uploaded">
        <span className="proof-label">{label}</span>
        {isPdf ? (
          <>
            <button onClick={() => setShowPdfModal(true)} className="proof-pdf-link">
              📄 View PDF
            </button>
            {showPdfModal && (
              <div className="pdf-modal-bg" onClick={() => setShowPdfModal(false)}>
                <div className="pdf-modal" onClick={e => e.stopPropagation()}>
                  <div className="pdf-modal-header">
                    <span>{label}</span>
                    <button onClick={() => setShowPdfModal(false)}>×</button>
                  </div>
                  <iframe src={currentUrl} title={label} className="pdf-iframe" />
                </div>
              </div>
            )}
          </>
        ) : (
          // Images: thumbnail with click to view full
          <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="proof-thumb-link">
            <img src={currentUrl} alt={label} className="proof-thumb" loading="lazy" />
          </a>
        )}
        {isEditing && <button className="proof-remove" onClick={handleRemove} title="Remove">×</button>}
      </div>
    );
  }
  
  if (!isEditing) return <div className="proof-missing"><span className="proof-label">{label}</span><span className="proof-status missing">❌</span></div>;
  
  return (
    <div className={`proof-dropzone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => !uploading && inputRef.current?.click()}>
      <input ref={inputRef} type="file" accept={accept} onChange={handleInputChange} style={{ display: 'none' }} />
      <span className="proof-label">{label}</span>
      {uploading ? <div className="upload-progress"><div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }}></div></div><span className="progress-text">{progress}%</span></div> : <span className="proof-prompt">Drop or tap</span>}
      {error && <span className="proof-error">{error}</span>}
    </div>
  );
}

function ProofStatusBadge({ day }) {
  const hasHealth = !!day.proofFiles?.appleHealth;
  const hasCrono = !!day.proofFiles?.cronometer;
  if (hasHealth && hasCrono) return <span className="proof-badge complete" title="Proof uploaded">📸✔</span>;
  if (hasHealth || hasCrono) return <span className="proof-badge partial" title="Partial proof">{hasHealth ? '📱' : ''}{hasCrono ? '🥗' : ''}</span>;
  return null;
}

function ProofCalendarGrid({ days }) {
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const todayStr = getLocalDateStr();
  
  return (
    <div className="proof-calendar">
      <h4>📸 Proof Status</h4>
      <div className="proof-weeks">
        {weeks.map((week, wi) => (
          <div key={wi} className="proof-week">
            <span className="pw-label">W{wi + 1}</span>
            <div className="pw-days">
              {week.map(day => {
                const isPast = day.date < todayStr;
                // Travel days don't require proof - show airplane
                if (day.isTravel) {
                  return <span key={day.id} className="pd travel" title={`${day.date} - Travel`}>✈️</span>;
                }
                const hasHealth = !!day.proofFiles?.appleHealth;
                const hasCrono = !!day.proofFiles?.cronometer;
                const complete = hasHealth && hasCrono;
                const partial = hasHealth || hasCrono;
                let cls = 'pd';
                if (!isPast) cls += ' future';
                else if (complete) cls += ' complete';
                else if (partial) cls += ' partial';
                else cls += ' missing';
                return <span key={day.id} className={cls} title={day.date}>{complete ? '✔' : partial ? (hasHealth ? '📱' : '🥗') : isPast ? '❌' : '○'}</span>;
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiftTracker({ lifts, onUpdate, isEditing }) {
  const liftItems = [
    { id: 'bench', label: 'Bench', icon: '🏋️' },
    { id: 'squat', label: 'Squat', icon: '🦵' },
    { id: 'deadlift', label: 'Deadlift', icon: '💪' },
    { id: 'pushups', label: 'Push-Ups', icon: '👊' },
    { id: 'pullups', label: 'Pull-Ups', icon: '🔝' },
  ];
  
  return (
    <div className="lift-tracker">
      <h3>🏋️ Current Maxes</h3>
      <div className="lift-grid">
        {liftItems.map(item => (
          <div key={item.id} className="lift-item">
            <span className="lift-label">{item.icon} {item.label}</span>
            {isEditing ? <input type="text" className="lift-input" value={lifts[item.id] || ''} onChange={(e) => onUpdate(item.id, e.target.value)} placeholder="—" />
                       : <span className="lift-value">{lifts[item.id] || '—'}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function PhaseInfo() {
  return (
    <div className="phase-info">
      <h3>📋 Training Phases</h3>
      <div className="phase-list">
        <div className="phase-item"><span className="phase-num">P1</span><div className="phase-details"><span className="phase-name">Base Building</span><span className="phase-desc">Weeks 1-6 • Zone 2 volume, heavy lifts, push-up GTG</span></div></div>
        <div className="phase-item"><span className="phase-num">P2</span><div className="phase-details"><span className="phase-name">Sharpening</span><span className="phase-desc">Weeks 7-10 • Faster intervals, time trials, tempo runs</span></div></div>
        <div className="phase-item"><span className="phase-num">P3</span><div className="phase-details"><span className="phase-name">Taper</span><span className="phase-desc">Weeks 11-13 • Reduced volume, maintain intensity</span></div></div>
        <div className="phase-item"><span className="phase-num">P4</span><div className="phase-details"><span className="phase-name">Strength & Speed</span><span className="phase-desc">Weeks 14-19 • Maintain base, add speed, progressive overload</span></div></div>
        <div className="phase-item"><span className="phase-num">P5</span><div className="phase-details"><span className="phase-name">Peak Performance</span><span className="phase-desc">Weeks 20-25 • Race-pace intervals, PR attempts, peak long runs</span></div></div>
        <div className="phase-item"><span className="phase-num">P6</span><div className="phase-details"><span className="phase-name">Consolidation</span><span className="phase-desc">Week 26 • Maintain gains, deload</span></div></div>
      </div>
    </div>
  );
}

// ============================================
// WEIGHT SPARKLINE COMPONENT
// ============================================

function WeightSparkline({ days, show }) {
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);

  // Get all days with weight data
  const weightData = useMemo(() => {
    return days
      .filter(d => d.weight !== null && d.weight !== undefined && d.weight !== '')
      .map(d => ({
        dayNumber: d.dayNumber,
        date: d.date,
        weight: parseFloat(d.weight)
      }))
      .filter(d => !isNaN(d.weight))
      .sort((a, b) => a.dayNumber - b.dayNumber);
  }, [days]);

  if (!show || weightData.length === 0) return null;

  const totalDays = days.length;
  const weights = weightData.map(d => d.weight);
  const minW = Math.min(...weights, WEIGHT_TARGET, ARC2_WEIGHT_TARGET) - 2;
  const maxW = Math.max(...weights, WEIGHT_START) + 2;
  const range = maxW - minW;

  const renderChart = (isFullscreen) => {
    const w = isFullscreen ? 700 : 240;
    const h = isFullscreen ? 350 : (expanded ? 120 : 60);
    const pad = isFullscreen
      ? { top: 20, right: 30, bottom: 40, left: 50 }
      : { top: 10, right: 10, bottom: expanded ? 20 : 10, left: 30 };
    const gw = w - pad.left - pad.right;
    const gh = h - pad.top - pad.bottom;
    const xScale = (dayNum) => pad.left + ((dayNum - 1) / (totalDays - 1)) * gw;
    const yScale = (wt) => pad.top + gh - ((wt - minW) / range) * gh;
    const targetY = yScale(WEIGHT_TARGET);
    const startY = yScale(WEIGHT_START);
    const dotRadius = isFullscreen ? 6 : (expanded ? 4 : 3);

    // Build line path connecting all points
    const linePath = weightData.map((d, i) => {
      const x = xScale(d.dayNumber);
      const y = yScale(d.weight);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');

    return (
      <svg width={w} height={h} className="sparkline-svg" viewBox={`0 0 ${w} ${h}`}>
        {/* Grid lines */}
        {(expanded || isFullscreen) && (
          <>
            <line x1={pad.left} y1={targetY} x2={w - pad.right} y2={targetY} stroke="#22c55e" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
            <line x1={pad.left} y1={startY} x2={w - pad.right} y2={startY} stroke="#ef4444" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
            <text x={pad.left - 4} y={targetY + 3} fontSize={isFullscreen ? 12 : 9} fill="#22c55e" textAnchor="end">{WEIGHT_TARGET}</text>
            <text x={pad.left - 4} y={startY + 3} fontSize={isFullscreen ? 12 : 9} fill="#ef4444" textAnchor="end">{WEIGHT_START}</text>
          </>
        )}

        {/* Fullscreen: intermediate Y-axis labels */}
        {isFullscreen && (() => {
          const step = range > 10 ? 5 : 2;
          const labels = [];
          for (let v = Math.ceil(minW / step) * step; v <= maxW; v += step) {
            if (Math.abs(v - WEIGHT_TARGET) < step * 0.4 || Math.abs(v - WEIGHT_START) < step * 0.4) continue;
            labels.push(v);
          }
          return labels.map(v => (
            <g key={v}>
              <line x1={pad.left} y1={yScale(v)} x2={w - pad.right} y2={yScale(v)} stroke="#2a2a2d" strokeWidth="1" strokeDasharray="2,4" />
              <text x={pad.left - 4} y={yScale(v) + 4} fontSize="11" fill="#888" textAnchor="end">{v}</text>
            </g>
          ));
        })()}

        {/* Fullscreen: X-axis week labels */}
        {isFullscreen && (() => {
          const labels = [1];
          for (let dn = 14; dn < totalDays; dn += 14) labels.push(dn);
          if (labels[labels.length - 1] !== totalDays) labels.push(totalDays);
          return labels.map(dn => (
            <text key={dn} x={xScale(dn)} y={h - 8} fontSize="11" fill="#888" textAnchor="middle">
              {dn === 1 ? 'D1' : dn === totalDays ? `D${totalDays}` : `W${Math.ceil(dn / 7)}`}
            </text>
          ));
        })()}

        {/* Arc separator line */}
        {(expanded || isFullscreen) && totalDays > 89 && (
          <line x1={xScale(89)} y1={pad.top} x2={xScale(89)} y2={h - pad.bottom} stroke="#555" strokeWidth="1" strokeDasharray="4,4" opacity="0.4" />
        )}

        {/* Ideal pace lines (per-arc) */}
        {(expanded || isFullscreen) && (
          <>
            <line
              x1={xScale(1)} y1={yScale(WEIGHT_START)}
              x2={xScale(89)} y2={yScale(WEIGHT_TARGET)}
              stroke="#8b5cf6" strokeWidth="1" strokeDasharray="6,3" opacity="0.35"
            />
            {totalDays > 89 && (
              <line
                x1={xScale(90)} y1={yScale(ARC2_WEIGHT_START)}
                x2={xScale(totalDays)} y2={yScale(ARC2_WEIGHT_TARGET)}
                stroke="#8b5cf6" strokeWidth="1" strokeDasharray="6,3" opacity="0.35"
              />
            )}
          </>
        )}

        {/* Projection line from current trend */}
        {(expanded || isFullscreen) && weightData.length >= 2 && (() => {
          const first = weightData[0];
          const last = weightData[weightData.length - 1];
          const daysDiff = last.dayNumber - first.dayNumber;
          if (daysDiff <= 0) return null;
          const rate = (last.weight - first.weight) / daysDiff;
          const projectedEnd = last.weight + rate * (totalDays - last.dayNumber);
          const clampedEnd = Math.max(minW, Math.min(maxW, projectedEnd));
          return (
            <line
              x1={xScale(last.dayNumber)} y1={yScale(last.weight)}
              x2={xScale(totalDays)} y2={yScale(clampedEnd)}
              stroke="#f59e0b" strokeWidth={isFullscreen ? 2 : 1} strokeDasharray="4,4" opacity="0.6"
            />
          );
        })()}

        {/* Connecting line */}
        {weightData.length > 1 && (
          <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={isFullscreen ? 2 : 1.5} opacity="0.5" />
        )}

        {/* Data points — clickable */}
        {weightData.map((d, i) => {
          const isLast = i === weightData.length - 1;
          const isSelected = selectedPoint?.dayNumber === d.dayNumber;
          return (
            <g key={i} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setSelectedPoint(isSelected ? null : d); }}>
              <circle cx={xScale(d.dayNumber)} cy={yScale(d.weight)} r={dotRadius + (isFullscreen ? 6 : 4)} fill="transparent" />
              <circle
                cx={xScale(d.dayNumber)} cy={yScale(d.weight)}
                r={isSelected ? dotRadius + 2 : dotRadius}
                fill={isLast ? '#22c55e' : '#3b82f6'}
                stroke={isSelected ? '#fff' : '#0a0a0b'}
                strokeWidth={isSelected ? 2 : 1}
              />
              {/* Tooltip on selected */}
              {isSelected && (
                <>
                  <rect
                    x={xScale(d.dayNumber) - (isFullscreen ? 55 : 40)}
                    y={yScale(d.weight) - (isFullscreen ? 32 : 26)}
                    width={isFullscreen ? 110 : 80} height={isFullscreen ? 24 : 18}
                    rx="4" fill="#1a1a1d" stroke="#3b82f6" strokeWidth="1"
                  />
                  <text
                    x={xScale(d.dayNumber)} y={yScale(d.weight) - (isFullscreen ? 15 : 12)}
                    fontSize={isFullscreen ? 12 : 9} fill="#e5e5e5" textAnchor="middle" fontFamily="JetBrains Mono, monospace"
                  >
                    {new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {d.weight} lbs
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="weight-sparkline">
      <div className="sparkline-header" onClick={() => setExpanded(!expanded)}>
        <span>📈 Trend</span>
        <div className="sparkline-actions">
          <span className="sparkline-expand-btn" onClick={(e) => { e.stopPropagation(); setSelectedPoint(null); setFullscreen(true); }} title="View fullscreen">⛶</span>
          <span className="sparkline-toggle">{expanded ? '▼' : '▶'}</span>
        </div>
      </div>
      {renderChart(false)}
      {expanded && (
        <div className="sparkline-legend">
          <span className="legend-item"><span className="dot target"></span>Target: {WEIGHT_TARGET}</span>
          <span className="legend-item"><span className="dot start"></span>Start: {WEIGHT_START}</span>
          <span className="legend-item"><span className="dot pace"></span>Ideal</span>
          <span className="legend-item"><span className="dot projection"></span>Projected</span>
        </div>
      )}
      {/* Fullscreen modal */}
      {fullscreen && (
        <div className="weight-modal-bg" onClick={() => { setFullscreen(false); setSelectedPoint(null); }}>
          <div className="weight-modal" onClick={e => e.stopPropagation()}>
            <div className="weight-modal-header">
              <span>Weight Trend — {weightData.length} entries</span>
              <button onClick={() => { setFullscreen(false); setSelectedPoint(null); }}>&times;</button>
            </div>
            <div className="weight-modal-body">
              {renderChart(true)}
              <div className="weight-modal-legend">
                <span className="legend-item"><span className="dot target"></span>Target: {WEIGHT_TARGET} lbs</span>
                <span className="legend-item"><span className="dot start"></span>Start: {WEIGHT_START} lbs</span>
                <span className="legend-item"><span className="dot current"></span>Current: {weightData[weightData.length - 1].weight} lbs</span>
                <span className="legend-item"><span className="dot pace"></span>Ideal Pace</span>
                <span className="legend-item"><span className="dot projection"></span>Projected</span>
              </div>
              <div className="weight-modal-hint">Click any dot to see the exact weight and date</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// WEIGHT SIDEBAR COMPONENT (with quick-log)
// ============================================

function Weight({ current, show, days, onLogTodayWeight, isEditing, todayWeight, currentArc }) {
  const [quickWeight, setQuickWeight] = useState('');

  if (!show) return null;

  const wStart = currentArc === 2 ? ARC2_WEIGHT_START : WEIGHT_START;
  const wTarget = currentArc === 2 ? ARC2_WEIGHT_TARGET : WEIGHT_TARGET;
  const lost = wStart - current;
  const toGo = current - wTarget;
  const pct = Math.min(Math.max((lost / (wStart - wTarget)) * 100, 0), 100);
  
  const handleQuickLog = (e) => {
    e.preventDefault();
    const w = parseFloat(quickWeight);
    if (!isNaN(w) && w > 0 && w < 500) {
      onLogTodayWeight(w);
      setQuickWeight('');
    }
  };
  
  // Calculate weekly average loss
  const weightData = days
    .filter(d => d.weight !== null && d.weight !== undefined && d.weight !== '')
    .map(d => ({ dayNumber: d.dayNumber, weight: parseFloat(d.weight) }))
    .filter(d => !isNaN(d.weight))
    .sort((a, b) => a.dayNumber - b.dayNumber);
  
  let avgLossPerWeek = null;
  if (weightData.length >= 2) {
    const first = weightData[0];
    const last = weightData[weightData.length - 1];
    const daysDiff = last.dayNumber - first.dayNumber;
    if (daysDiff > 0) {
      const totalLoss = first.weight - last.weight;
      avgLossPerWeek = (totalLoss / daysDiff) * 7;
    }
  }
  
  return (
    <div className="weight">
      <h3>⚖️ Weight Progress</h3>
      <div className="wt-stats">
        <div><span className="wv">{lost > 0 ? lost.toFixed(1) : 0}</span><span className="wl">lbs lost</span></div>
        <div><span className="wv">{current.toFixed(1)}</span><span className="wl">lbs now</span></div>
        <div><span className="wv">{toGo > 0 ? toGo.toFixed(1) : 0}</span><span className="wl">lbs to go</span></div>
      </div>
      <div className="wt-bar"><div className="wt-fill" style={{ width: `${pct}%` }}></div></div>
      <div className="wt-range"><span>{wStart} lbs</span><span>→</span><span>{wTarget} lbs</span></div>
      
      {avgLossPerWeek !== null && (
        <div className="wt-rate">
          Avg: <strong>{avgLossPerWeek > 0 ? '-' : '+'}{Math.abs(avgLossPerWeek).toFixed(2)}</strong> lbs/week
        </div>
      )}
      
      {/* Quick-log for today */}
      {isEditing && (
        <form className="quick-weight-form" onSubmit={handleQuickLog}>
          <input 
            type="number" 
            step="0.1" 
            placeholder={todayWeight ? `Today: ${todayWeight}` : "Log today's weight"} 
            value={quickWeight} 
            onChange={e => setQuickWeight(e.target.value)}
            className="quick-weight-input"
          />
          <button type="submit" className="quick-weight-btn">Log</button>
        </form>
      )}
      
      <WeightSparkline days={days} show={true} />
    </div>
  );
}

function DayCard({ day, isToday, isEditing, onToggle, onUploadProof, onRemoveProof, onUpdateWeight, onUpdateNotes, onUpdateSkipReason }) {
  const dt = new Date(day.date + 'T12:00:00');
  const dayName = dt.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const items = [...(day.activities || []), ...(day.habits || [])];
  const done = items.filter(x => x.completed).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const todayStr = getLocalDateStr();
  const isPast = day.date < todayStr;
  const hasAllProof = day.proofFiles?.appleHealth && day.proofFiles?.cronometer;

  let cardClass = 'day-card';
  if (isToday) cardClass += ' today';
  if (day.isTravel) cardClass += ' travel';
  if (day.isCheckpoint) cardClass += ' checkpoint';
  if (isPast && pct === 100) cardClass += ' complete';
  else if (isPast && total > 0 && (total - done) <= 2 && done > 0) cardClass += ' mostly';
  else if (isPast && pct > 0 && pct < 100) cardClass += ' partial';
  else if (isPast && pct === 0 && total > 0) cardClass += ' missed';

  return (
    <div className={cardClass} data-day-id={day.id}>
      <div className="day-head">
        <div className="day-dt"><span className="dn">{dayName}</span><span className="md">{monthDay}</span></div>
        {day.location !== 'Denver' && <span className="loc">📍{day.location}</span>}
        {isToday && <span className="badge today">TODAY</span>}
        {day.isCheckpoint && <span className="badge cp">📊</span>}
        {hasAllProof && <ProofStatusBadge day={day} />}
        {total > 0 && <span className={`score ${pct === 100 ? 'full' : ''}`}>{done}/{total}</span>}
      </div>
      <div className="day-body">
        {/* Weight input row */}
        <div className="weight-row">
          <span className="weight-label">⚖️ Weight</span>
          {isEditing ? (
            <input
              type="number"
              step="0.1"
              className="weight-input"
              value={day.weight || ''}
              onChange={(e) => onUpdateWeight(day.id, e.target.value)}
              placeholder="—"
            />
          ) : (
            <span className="weight-display">{day.weight ? `${day.weight} lbs` : '—'}</span>
          )}
        </div>

        {day.activities?.map((a, i) => (
          <div key={a.id || i} className="item-wrapper">
            <div className={`item ${a.completed ? 'done' : ''} t-${a.type}`} onClick={() => isEditing && onToggle(day.id, 'activities', i)}>
              <span className="chk">{a.completed ? '✔' : '○'}</span><span className="nm">{a.name}</span>
            </div>
            {isPast && !a.completed && (
              isEditing ? (
                <input
                  type="text"
                  className="skip-input-inline"
                  value={a.skipReason || ''}
                  onChange={(e) => onUpdateSkipReason(day.id, 'activities', i, e.target.value)}
                  placeholder="Why skipped?"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : a.skipReason ? (
                <span className="skip-text-inline">{a.skipReason}</span>
              ) : null
            )}
          </div>
        ))}
        {day.habits?.length > 0 && (
          <div className="habits">
            <div className="hab-label">Daily</div>
            <div className="hab-grid">
              {day.habits.map((h, i) => (
                <div key={h.id || i} className="hab-wrapper">
                  <div className={`hab ${h.completed ? 'done' : ''}`} onClick={() => isEditing && onToggle(day.id, 'habits', i)}>
                    <span className="hchk">{h.completed ? '✔' : '○'}</span><span className="hnm">{h.name}</span>
                  </div>
                  {isPast && !h.completed && (
                    isEditing ? (
                      <input
                        type="text"
                        className="skip-input-inline hab-skip"
                        value={h.skipReason || ''}
                        onChange={(e) => onUpdateSkipReason(day.id, 'habits', i, e.target.value)}
                        placeholder="Why?"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : h.skipReason ? (
                      <span className="skip-text-inline">{h.skipReason}</span>
                    ) : null
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {!day.isTravel && (
          <div className="proof-section">
            <div className="proof-label-row">📸 Daily Proof</div>
            <div className="proof-uploads">
              <FileUpload dayId={day.id} type="appleHealth" currentUrl={day.proofFiles?.appleHealth} onUpload={onUploadProof} onRemove={onRemoveProof} isEditing={isEditing} />
              <FileUpload dayId={day.id} type="cronometer" currentUrl={day.proofFiles?.cronometer} onUpload={onUploadProof} onRemove={onRemoveProof} isEditing={isEditing} />
            </div>
          </div>
        )}
        {/* Day-level notes */}
        {day.notes ? (
          <div className="skip-reason">
            {isEditing ? (
              <>
                <span className="skip-label">📝 Notes</span>
                <input
                  type="text"
                  className="skip-input"
                  value={day.notes || ''}
                  onChange={(e) => onUpdateNotes(day.id, e.target.value)}
                  placeholder="Day notes..."
                />
              </>
            ) : (
              <div className="skip-display">
                <span className="skip-label">📝</span>
                <span className="skip-text">{day.notes}</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Week({ weekNum, days, isEditing, onToggle, onUploadProof, onRemoveProof, onUpdateWeight, onUpdateNotes, onUpdateSkipReason }) {
  const todayStr = getLocalDateStr();
  const phase = days[0]?.phase || 1;
  return (
    <div className="week">
      <div className="week-head"><h2>Week {weekNum}</h2><span className="ph">Phase {phase}: {PHASE_NAMES[phase] || ''}</span></div>
      <div className="week-days">{days.map(d => <DayCard key={d.id} day={d} isToday={d.date === todayStr} isEditing={isEditing} onToggle={onToggle} onUploadProof={onUploadProof} onRemoveProof={onRemoveProof} onUpdateWeight={onUpdateWeight} onUpdateNotes={onUpdateNotes} onUpdateSkipReason={onUpdateSkipReason} />)}</div>
    </div>
  );
}

function Checkpoints({ checkpoints, currentWeek, onLog, isEditing }) {
  const arc1Weeks = [2, 4, 6, 8, 10, 12];
  const arc2Weeks = [16, 18, 20, 22, 24, 26];
  return (
    <div className="checkpoints">
      <h3>📊 Checkpoints</h3>
      <div className="cp-arc-label">Arc 1</div>
      {arc1Weeks.map(w => {
        const t = CHECKPOINT_TARGETS[w];
        const a = checkpoints[w];
        const past = w <= currentWeek;
        return (
          <div key={w} className={`cp-row ${a ? 'logged' : ''}`}>
            <div className="cp-wk">Week {w}</div>
            {a ? <span className="cp-done">✔</span> : past && isEditing ? <button className="cp-btn" onClick={() => onLog(w)}>Log</button> : null}
            <div className="cp-tgts"><span>Run: {t.run}</span><span>Push: {t.pushups}</span><span>Pull: {t.pullups}</span></div>
          </div>
        );
      })}
      <div className="cp-arc-label" style={{ marginTop: '12px' }}>Arc 2</div>
      {arc2Weeks.map(w => {
        const t = ARC2_CHECKPOINT_TARGETS[w];
        const a = checkpoints[w];
        const past = w <= currentWeek;
        return (
          <div key={w} className={`cp-row ${a ? 'logged' : ''}`}>
            <div className="cp-wk">Week {w}</div>
            {a ? <span className="cp-done">✔</span> : past && isEditing ? <button className="cp-btn" onClick={() => onLog(w)}>Log</button> : null}
            <div className="cp-tgts"><span>Run: {t.run}</span><span>Push: {t.pushups}</span><span>Pull: {t.pullups}</span><span>Long: {t.longRun}</span></div>
          </div>
        );
      })}
    </div>
  );
}

function Meals() {
  const [open, setOpen] = useState(false);
  return (
    <div className="meals">
      <button onClick={() => setOpen(!open)}>🍽️ Meal Ideas (Pescatarian) {open ? '▼' : '▶'}</button>
      {open && (
        <div className="meal-list">
          <p className="note">⚠️ No salmon (allergy) • No meat • Target: 185g protein</p>
          {Object.entries(MEALS).map(([cat, items]) => <div key={cat} className="meal-cat"><h4>{cat}</h4><ul>{items.map((m, i) => <li key={i}>{m}</li>)}</ul></div>)}
        </div>
      )}
    </div>
  );
}

function Modal({ week, onSave, onCancel }) {
  const isArc2 = week >= 14;
  const [v, setV] = useState({ run: '', pushups: '', pullups: '', sprint: '', longRun: '', weight: '' });
  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Week {week} Results</h3>
        <label>Run (mm:ss)<input value={v.run} onChange={e => setV({...v, run: e.target.value})} /></label>
        <label>Push-ups<input type="number" value={v.pushups} onChange={e => setV({...v, pushups: e.target.value})} /></label>
        <label>Pull-ups<input type="number" value={v.pullups} onChange={e => setV({...v, pullups: e.target.value})} /></label>
        {isArc2 ? (
          <label>Long Run<input value={v.longRun} onChange={e => setV({...v, longRun: e.target.value})} placeholder="e.g. 12mi" /></label>
        ) : (
          <label>Sprint (s)<input value={v.sprint} onChange={e => setV({...v, sprint: e.target.value})} /></label>
        )}
        <label>Weight (lbs)<input type="number" value={v.weight} onChange={e => setV({...v, weight: e.target.value})} /></label>
        <div className="modal-btns"><button onClick={onCancel}>Cancel</button><button className="save" onClick={() => onSave(week, v)}>Save</button></div>
      </div>
    </div>
  );
}

function MissingProofAlert({ days, onScrollToDay }) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterday);
  const yesterdayDay = days.find(d => d.id === yesterdayStr);
  if (!yesterdayDay || yesterdayDay.isTravel) return null;
  const hasHealth = !!yesterdayDay.proofFiles?.appleHealth;
  const hasCrono = !!yesterdayDay.proofFiles?.cronometer;
  if (hasHealth && hasCrono) return null;
  return (
    <div className="missing-proof-alert" onClick={() => onScrollToDay(yesterdayStr)}>
      <span className="alert-icon">⚠️</span>
      <span className="alert-text">Yesterday missing proof: {!hasHealth && '📱'} {!hasCrono && '🥗'}</span>
      <span className="alert-action">Upload now →</span>
    </div>
  );
}

function SocialLinks() {
  return (
    <div className="social-links">
      <h4>🔗 Connect</h4>
      <div className="link-list">
        <a href="https://www.wayfindersalmanac.com" target="_blank" rel="noopener noreferrer" className="social-link">
          🌐 Check out my website
        </a>
        <a href="https://x.com/GroundedSanti" target="_blank" rel="noopener noreferrer" className="social-link">
          𝕏 Follow me on X
        </a>
        <a href="https://www.findtheways.com" target="_blank" rel="noopener noreferrer" className="social-link">
          ✍️ Read my writing
        </a>
      </div>
    </div>
  );
}

function Embed({ stats, days }) {
  const todayStr = getLocalDateStr();
  const recent = days.filter(d => d.date <= todayStr && d.date >= getLocalDateStr(new Date(Date.now() - 7*24*60*60*1000))).reverse();
  return (
    <div className="embed">
      <div className="emb-head"><span className="emb-icon">🎯</span><div><h2>GYST Journey</h2><span>Alec Santiago</span></div></div>
      <div className="emb-stats">
        <div><span className="ev">D{stats.currentDayNumber}</span><span className="el">Arc {stats.currentArc}</span></div>
        <div><span className="ev">{stats.trainingPct}%</span><span className="el">Training</span></div>
        <div><span className="ev">{stats.habitsPct}%</span><span className="el">Habits</span></div>
      </div>
      <div className="emb-bar"><div style={{ width: `${stats.trainingPct}%` }}></div></div>
      <div className="emb-recent">
        {recent.map(d => {
          const items = [...(d.activities||[]),...(d.habits||[])];
          const done = items.filter(x=>x.completed).length;
          const hasHealth = !!d.proofFiles?.appleHealth;
          const hasCrono = !!d.proofFiles?.cronometer;
          const hasProof = hasHealth && hasCrono;
          return (
            <div key={d.id} className={`er-row ${done===items.length&&items.length>0?'full':''}`}>
              <span>{new Date(d.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span>
              <span className="er-score">{done}/{items.length}</span>
              <span className="er-proof">
                {d.isTravel ? <span className="proof-na">✈️</span> : hasProof ? <><a href={d.proofFiles.appleHealth} target="_blank" rel="noopener noreferrer" className="proof-icon" title="Health">📱</a><a href={d.proofFiles.cronometer} target="_blank" rel="noopener noreferrer" className="proof-icon" title="Cronometer">🥗</a></> : <span className="proof-missing-embed">❌ No proof</span>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="emb-links">
        <a href="https://www.wayfindersalmanac.com" target="_blank" rel="noopener noreferrer">🌐 Website</a>
        <a href="https://x.com/GroundedSanti" target="_blank" rel="noopener noreferrer">𝕏 X</a>
        <a href="https://www.findtheways.com" target="_blank" rel="noopener noreferrer">✍️ Writing</a>
      </div>
      <div className="emb-foot"><a href="https://wayfindersalmanac.com">wayfindersalmanac.com</a></div>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================

export default function App() {
  const [days, setDays] = useState(generateAllDays());
  const [checkpoints, setCheckpoints] = useState({});
  const [settings, setSettings] = useState({ showWeight: true, requireProof: false });
  const [lifts, setLifts] = useState({ bench: '225', squat: '315', deadlift: '315', pushups: '35', pullups: '10' });
  const [isEditing, setIsEditing] = useState(false);
  const [pw, setPw] = useState('');
  const [modal, setModal] = useState(null);
  const [selWeek, setSelWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [stravaMiles, setStravaMiles] = useState(null);
  const [stravaSyncing, setStravaSyncing] = useState(false);
  
  const isEmbed = window.location.search.includes('embed=true') || window.location.pathname.includes('/embed');
  
  // Load from Supabase on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const stored = await loadStateFromSupabase();
      if (stored) {
        if (stored.days) {
          // Merge stored days with generated days (in case schema changed)
          const generated = generateAllDays();
          const merged = generated.map(genDay => {
            const storedDay = stored.days.find(d => d.id === genDay.id);
            if (storedDay) {
              return {
                ...genDay,
                activities: genDay.activities.map((act, i) => ({
                  ...act,
                  completed: storedDay.activities?.[i]?.completed || false,
                  skipReason: storedDay.activities?.[i]?.skipReason || ''
                })),
                habits: genDay.habits.map((hab, i) => ({
                  ...hab,
                  completed: storedDay.habits?.[i]?.completed || false,
                  skipReason: storedDay.habits?.[i]?.skipReason || ''
                })),
                proofFiles: storedDay.proofFiles || genDay.proofFiles,
                weight: storedDay.weight || null, // NEW: preserve weight
                notes: storedDay.notes || ''
              };
            }
            return genDay;
          });
          setDays(merged);
        }
        if (stored.checkpoints) setCheckpoints(stored.checkpoints);
        if (stored.settings) setSettings(stored.settings);
        if (stored.lifts) setLifts(stored.lifts);
        setLastSaved(stored.updated_at);
      }
      setLoading(false);
      // Load Strava miles in background
      fetchStravaMiles().then(miles => { if (miles !== null) setStravaMiles(miles); });
    }
    loadData();
  }, []);
  
  // Save to Supabase when state changes (debounced, only in edit mode)
  const saveTimeoutRef = useRef(null);
  useEffect(() => {
    if (loading || !isEditing) return;
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      const success = await saveStateToSupabase(days, checkpoints, settings, lifts);
      if (success) setLastSaved(new Date().toISOString());
      setSaving(false);
    }, 1000); // 1 second debounce
    
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [days, checkpoints, settings, lifts, loading, isEditing]);
  
  // Get current weight from daily logs (most recent entry)
  const currentWeight = useMemo(() => {
    const todayStr = getLocalDateStr();
    const daysWithWeight = days
      .filter(d => d.date <= todayStr && d.weight !== null && d.weight !== undefined && d.weight !== '')
      .sort((a, b) => b.date.localeCompare(a.date));
    
    if (daysWithWeight.length > 0) {
      return parseFloat(daysWithWeight[0].weight);
    }
    return WEIGHT_START;
  }, [days]);
  
  // Get today's weight for the quick-log placeholder
  const todayWeight = useMemo(() => {
    const todayStr = getLocalDateStr();
    const today = days.find(d => d.id === todayStr);
    return today?.weight || null;
  }, [days]);
  
  const stats = useMemo(() => {
    const todayStr = getLocalDateStr();
    const td = days.find(d => d.date === todayStr);
    const currentPhase = td?.phase || 1;
    const currentWeek = td?.weekNumber || 1;
    const currentArc = td?.arc || 1;
    const currentDayNumber = td?.dayNumber || 1;
    const totalDays = days.length;

    const past = days.filter(d => d.date <= todayStr);
    const totalDaysElapsed = past.length;

    // Separate training (activities) vs habits completion
    let actTot = 0, actDone = 0, habTot = 0, habDone = 0;
    past.forEach(d => {
      (d.activities || []).forEach(a => { actTot++; if (a.completed) actDone++; });
      (d.habits || []).forEach(h => { habTot++; if (h.completed) habDone++; });
    });
    const trainingPct = actTot > 0 ? Math.round((actDone / actTot) * 100) : 0;
    const habitsPct = habTot > 0 ? Math.round((habDone / habTot) * 100) : 0;

    // Arc progress: how far through current arc
    const arcConfig = ARCS[currentArc];
    const arcStartDay = arcConfig?.startDay || 1;
    const arcTotalDays = arcConfig?.totalDays || 90;
    const dayInArc = currentDayNumber - arcStartDay + 1;
    const arcProgressPct = Math.min(Math.round((dayInArc / arcTotalDays) * 100), 100);

    return { currentPhase, currentWeek, currentArc, currentDayNumber, totalDays, totalDaysElapsed, trainingPct, habitsPct, arcProgressPct, currentWeight };
  }, [days, currentWeight]);
  
  const weekGroups = useMemo(() => { const g = {}; days.forEach(d => { if (!g[d.weekNumber]) g[d.weekNumber] = []; g[d.weekNumber].push(d); }); return g; }, [days]);
  
  const onToggle = (dayId, section, idx) => { setDays(prev => prev.map(d => { if (d.id !== dayId) return d; const arr = [...d[section]]; arr[idx] = { ...arr[idx], completed: !arr[idx].completed }; return { ...d, [section]: arr }; })); };
  const onUploadProof = useCallback((dayId, type, url) => { setDays(prev => prev.map(d => { if (d.id !== dayId) return d; return { ...d, proofFiles: { ...d.proofFiles, [type]: url, uploadedAt: new Date().toISOString() } }; })); }, []);
  const onRemoveProof = useCallback((dayId, type) => { setDays(prev => prev.map(d => { if (d.id !== dayId) return d; return { ...d, proofFiles: { ...d.proofFiles, [type]: null } }; })); }, []);
  const onUpdateWeight = useCallback((dayId, weight) => {
    setDays(prev => prev.map(d => {
      if (d.id !== dayId) return d;
      return { ...d, weight: weight === '' ? null : weight };
    }));
  }, []);
  const onUpdateNotes = useCallback((dayId, notes) => {
    setDays(prev => prev.map(d => {
      if (d.id !== dayId) return d;
      return { ...d, notes };
    }));
  }, []);
  const onUpdateSkipReason = useCallback((dayId, section, idx, reason) => {
    setDays(prev => prev.map(d => {
      if (d.id !== dayId) return d;
      const arr = [...d[section]];
      arr[idx] = { ...arr[idx], skipReason: reason };
      return { ...d, [section]: arr };
    }));
  }, []);
  const onLogTodayWeight = useCallback((weight) => {
    const todayStr = getLocalDateStr();
    setDays(prev => prev.map(d => {
      if (d.id !== todayStr) return d;
      return { ...d, weight: weight };
    }));
  }, []);
  const onScrollToDay = useCallback((dayId) => { const dayData = days.find(d => d.id === dayId); if (dayData) { setSelWeek(dayData.weekNumber); setTimeout(() => { const el = document.querySelector(`[data-day-id="${dayId}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); } }, [days]);
  const onGoToToday = useCallback(() => {
    const todayStr = getLocalDateStr();
    const todayData = days.find(d => d.id === todayStr);
    if (todayData) {
      setSelWeek(todayData.weekNumber);
      setTimeout(() => {
        const el = document.querySelector(`[data-day-id="${todayStr}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [days]);
  const onSyncStrava = useCallback(async () => {
    const lastSync = localStorage.getItem('lastStravaSync');
    if (lastSync && Date.now() - parseInt(lastSync) < 3600000) {
      alert('Strava was synced less than an hour ago. Try again later.');
      return;
    }
    setStravaSyncing(true);
    try {
      const result = await triggerStravaSync();
      localStorage.setItem('lastStravaSync', String(Date.now()));
      const miles = await fetchStravaMiles();
      if (miles !== null) setStravaMiles(miles);
      alert(result.message || `Synced ${result.synced} runs`);
    } catch (err) {
      console.error('Strava sync error:', err);
      alert('Strava sync failed. Make sure Strava is connected.');
    } finally {
      setStravaSyncing(false);
    }
  }, []);
  const onUpdateLift = useCallback((id, value) => { setLifts(prev => ({ ...prev, [id]: value })); }, []);
  const onSaveCp = (wk, vals) => { setCheckpoints(p => ({...p, [wk]: vals})); setModal(null); };
  const onPw = e => { e.preventDefault(); if (pw === EDIT_PASSWORD) setIsEditing(true); else alert('Wrong'); setPw(''); };
  
  if (loading) {
    return (
      <div className="app loading-screen">
        <div className="loading-content">
          <span className="loading-icon">🎯</span>
          <h2>Loading tracker...</h2>
        </div>
      </div>
    );
  }
  
  if (isEmbed) return <Embed stats={stats} days={days} />;
  
  const displayWeek = selWeek || stats.currentWeek;
  
  return (
    <div className="app">
      <Header stats={stats} onGoToToday={onGoToToday} />
      <Stats stats={stats} stravaMiles={stravaMiles} />
      {saving && <div className="save-indicator">💾 Saving...</div>}
      {isEditing && <MissingProofAlert days={days} onScrollToDay={onScrollToDay} />}
      <div className="layout">
        <aside className="side">
          <div className="edit-box">
            {isEditing ? <div className="editing"><span>✏️ Editing</span><button onClick={() => setIsEditing(false)}>Lock</button></div>
                       : <form onSubmit={onPw}><input type="password" placeholder="Password" value={pw} onChange={e=>setPw(e.target.value)} /><button>Unlock</button></form>}
          </div>
          {lastSaved && <div className="last-saved">Last saved: {new Date(lastSaved).toLocaleString()}</div>}
          <Weight
            current={currentWeight}
            show={settings.showWeight}
            days={days}
            onLogTodayWeight={onLogTodayWeight}
            isEditing={isEditing}
            todayWeight={todayWeight}
            currentArc={stats.currentArc}
          />
          {isEditing && (
            <div className="settings-toggles">
              <label className="toggle"><input type="checkbox" checked={settings.showWeight} onChange={e=>setSettings({...settings,showWeight:e.target.checked})} /> Show weight</label>
              <label className="toggle"><input type="checkbox" checked={settings.requireProof} onChange={e=>setSettings({...settings,requireProof:e.target.checked})} /> Proof breaks streak</label>
            </div>
          )}
          {isEditing && (
            <div className="strava-controls">
              <a href={STRAVA_AUTH_URL} className="strava-btn connect" target="_blank" rel="noopener noreferrer">🔗 Connect Strava</a>
              <button className="strava-btn sync" onClick={onSyncStrava} disabled={stravaSyncing}>{stravaSyncing ? '⏳ Syncing...' : '🔄 Sync Strava'}</button>
            </div>
          )}
          <LiftTracker lifts={lifts} onUpdate={onUpdateLift} isEditing={isEditing} />
          <div className="week-nav">
            <h4>Arc 1</h4>
            <div className="wk-btns">{Object.keys(weekGroups).filter(w => +w <= 13).map(w => <button key={w} className={`wk-btn ${+w===displayWeek?'sel':''} ${+w===stats.currentWeek?'cur':''}`} onClick={()=>setSelWeek(+w)}>{w}</button>)}</div>
            <h4 style={{ marginTop: '8px' }}>Arc 2</h4>
            <div className="wk-btns">{Object.keys(weekGroups).filter(w => +w > 13).map(w => <button key={w} className={`wk-btn ${+w===displayWeek?'sel':''} ${+w===stats.currentWeek?'cur':''}`} onClick={()=>setSelWeek(+w)}>{w}</button>)}</div>
          </div>
          <ProofCalendarGrid days={days} />
          <Checkpoints checkpoints={checkpoints} currentWeek={stats.currentWeek} onLog={setModal} isEditing={isEditing} />
          <Meals />
          <PhaseInfo />
          <div className="share"><h4>📤 Embed</h4><code>?embed=true</code></div>
          <SocialLinks />
        </aside>
        <main className="main"><Week weekNum={displayWeek} days={weekGroups[displayWeek]||[]} isEditing={isEditing} onToggle={onToggle} onUploadProof={onUploadProof} onRemoveProof={onRemoveProof} onUpdateWeight={onUpdateWeight} onUpdateNotes={onUpdateNotes} onUpdateSkipReason={onUpdateSkipReason} /></main>
      </div>
      {modal && <Modal week={modal} onSave={onSaveCp} onCancel={()=>setModal(null)} />}
      <button className="fab-today" onClick={onGoToToday} title="Go to Today">📍</button>
    </div>
  );
}
