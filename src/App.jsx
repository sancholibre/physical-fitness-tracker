import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// ============================================
// FBI PFT TRACKER - Alec Santiago
// 89 Days to Pass | Jan 2 - April 1, 2026
// ============================================

// Supabase config
const SUPABASE_URL = 'https://cqpjytbpvmgzziqluhnz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hLb04cYlJp9CASk_jk7pYQ_U43VNPFq';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USER_ID = 'alec-santiago'; // Single user for now
const EDIT_PASSWORD = 'agent195';

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = 'djbznowhf';
const CLOUDINARY_UPLOAD_PRESET = 'fbi_pft_proof';

const WEIGHT_START = 190;
const WEIGHT_TARGET = 178;

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
  const start = new Date('2026-01-02');
  const end = new Date('2026-04-01');
  let dayNum = 1;
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dow = d.getDay();
    const weekNum = Math.ceil(dayNum / 7);
    const phase = weekNum <= 6 ? 1 : weekNum <= 10 ? 2 : 3;
    
    const day = {
      id: dateStr,
      date: dateStr,
      dayNumber: dayNum,
      weekNumber: weekNum,
      phase,
      dayOfWeek: dow,
      activities: [],
      habits: [],
      location: 'Denver',
      isTravel: false,
      isCheckpoint: weekNum % 2 === 0 && dow === 6 && weekNum <= 12,
      notes: '',
      weight: null, // NEW: daily weight tracking
      proofFiles: {
        appleHealth: null,
        cronometer: null,
        uploadedAt: null
      }
    };
    
    // TRAVEL ADJUSTMENTS
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
    } else {
      day.activities = getRegularActivities(dow, weekNum, phase);
    }
    
    // Daily habits (skip pure travel days)
    if (!day.isTravel) {
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
    '2026-01-16': [{ id: 'lift-2', type: 'lifting', name: '🏋️ Upper Pull - Fitness SF SOMA (Pull-ups 4x6, Rows 3x6)', completed: false }],
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
  
  if (phase === 3) {
    if (weekNum === 11) {
      const w11 = {
        0: [{ id: 'rest', type: 'rest', name: '😴 Full Rest', completed: false }],
        1: [{ id: 'z2', type: 'zone2', name: '🏃 Zone 2 - 30min (easy)', completed: false }, { id: 'lift', type: 'lifting', name: '🏋️ Upper Push (Light)', completed: false }],
        2: [{ id: 'lift', type: 'lifting', name: '🏋️ Lower (2 sets each)', completed: false }],
        3: [{ id: 'z2', type: 'zone2', name: '🏃 Zone 2 - 30min', completed: false }],
        4: [{ id: 'lift', type: 'lifting', name: '🏋️ Upper Pull (Light)', completed: false }],
        5: [{ id: 'int', type: 'intervals', name: '🔥 4x400m @ race pace', completed: false }],
        6: [{ id: 'easy', type: 'zone2', name: '🏃 Easy Jog - 15min', completed: false }],
      };
      return w11[dow] || [];
    }
    if (weekNum === 12) {
      const w12 = {
        0: [{ id: 'rest', type: 'rest', name: '😴 REST', completed: false }],
        1: [{ id: 'easy', type: 'zone2', name: '🏃 Easy Jog - 20min', completed: false }],
        2: [{ id: 'lift', type: 'lifting', name: '🏋️ Light Full Body', completed: false }],
        3: [{ id: 'strides', type: 'strides', name: '🏃 Strides - 4x100m only', completed: false }],
        4: [{ id: 'rest', type: 'rest', name: '😴 REST', completed: false }],
        5: [{ id: 'rest', type: 'rest', name: '😴 REST', completed: false }],
        6: [{ id: 'rest', type: 'rest', name: '😴 REST - Day before test', completed: false }],
      };
      return w12[dow] || [];
    }
  }
  
  if (phase === 2 && dow === 3 && (weekNum === 8 || weekNum === 10)) {
    return [
      { id: 'tt', type: 'timetrial', name: '⏱️ 1.5mi TIME TRIAL', completed: false },
      { id: 'gtg', type: 'gtg', name: '💪 Push-up GTG (4 sets)', completed: false },
    ];
  }
  
  const schedule = {
    0: [{ id: 'rest', type: 'rest', name: '😴 Full Rest Day', completed: false }],
    1: [
      { id: 'z2', type: 'zone2', name: '🏃 Zone 2 - 45min (AM)', completed: false },
      { id: 'lift', type: 'lifting', name: '🏋️ Upper Push (Bench 3x5, OHP 3x6, Dips 2x10)', completed: false },
      { id: 'gtg', type: 'gtg', name: '💪 Push-up GTG (4 sets)', completed: false },
    ],
    2: [{ id: 'lift', type: 'lifting', name: '🏋️ Lower (Squat 3x5, RDL 3x8, BSS 2x8)', completed: false }],
    3: [
      { id: 'z2', type: 'zone2', name: '🏃 Zone 2 - 50min', completed: false },
      { id: 'strides', type: 'strides', name: '🏃 Strides - 4x100m after', completed: false },
      { id: 'gtg', type: 'gtg', name: '💪 Push-up GTG (4 sets)', completed: false },
    ],
    4: [{ id: 'lift', type: 'lifting', name: '🏋️ Upper Pull (Pull-ups 4x8, Row 3x8)', completed: false }],
    5: [
      { id: 'int', type: 'intervals', name: `🔥 Intervals - ${intervalDetail}`, completed: false },
      { id: 'gtg', type: 'gtg', name: '💪 Push-up GTG (4 sets)', completed: false },
    ],
    6: [
      { id: 'tempo', type: 'tempo', name: `🏃 Tempo - ${tempoDetail}`, completed: false },
      { id: 'max', type: 'maxtest', name: '📊 Max Push-up Test', completed: false },
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

const CHECKPOINT_TARGETS = {
  2: { run: '12:10', pushups: 38, pullups: 10, sprint: '50.5', weight: 188 },
  4: { run: '11:50', pushups: 41, pullups: 11, sprint: '50.0', weight: 185 },
  6: { run: '11:35', pushups: 44, pullups: 11, sprint: '49.5', weight: 183 },
  8: { run: '11:20', pushups: 47, pullups: 12, sprint: '49.0', weight: 180 },
  10: { run: '11:05', pushups: 50, pullups: 12, sprint: '48.5', weight: 179 },
  12: { run: '<11:00', pushups: '50+', pullups: 12, sprint: '<49', weight: 178 },
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
  return (
    <header className="header">
      <div className="brand">
        <span className="brand-icon">🎯</span>
        <div>
          <h1>FBI PFT TRACKER</h1>
          <span className="subtitle">Alec Santiago • 89 Days to Agent</span>
        </div>
      </div>
      <button className="goto-today-btn" onClick={onGoToToday}>
        📍 Go To Today
      </button>
      <div className="countdown">
        <div className="cd-num">{stats.daysRemaining}</div>
        <div className="cd-label">DAYS LEFT</div>
      </div>
    </header>
  );
}

function Stats({ stats }) {
  return (
    <div className="stats-bar">
      <div className="stat">
        <span className="stat-val">{stats.currentStreak}🔥</span>
        <span className="stat-lbl">Streak</span>
      </div>
      <div className="stat">
        <span className="stat-val">P{stats.currentPhase}</span>
        <span className="stat-lbl">{stats.currentPhase === 1 ? 'Base' : stats.currentPhase === 2 ? 'Sharp' : 'Taper'}</span>
      </div>
      <div className="stat">
        <span className="stat-val">{stats.totalCompletion}%</span>
        <span className="stat-lbl">Done</span>
      </div>
      <div className="stat">
        <span className="stat-val">W{stats.currentWeek}</span>
        <span className="stat-lbl">of 13</span>
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
        <div className="phase-item"><span className="phase-num">P3</span><div className="phase-details"><span className="phase-name">Taper</span><span className="phase-desc">Weeks 11-12 • Reduced volume, maintain intensity, peak fresh</span></div></div>
      </div>
    </div>
  );
}

// ============================================
// WEIGHT SPARKLINE COMPONENT
// ============================================

function WeightSparkline({ days, show }) {
  const [expanded, setExpanded] = useState(false);
  
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
  
  const weights = weightData.map(d => d.weight);
  const minW = Math.min(...weights, WEIGHT_TARGET) - 2;
  const maxW = Math.max(...weights, WEIGHT_START) + 2;
  const range = maxW - minW;
  
  // SVG dimensions
  const width = 240;
  const height = expanded ? 120 : 60;
  const padding = { top: 10, right: 10, bottom: expanded ? 20 : 10, left: 30 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  
  // Scale functions
  const xScale = (dayNum) => padding.left + ((dayNum - 1) / 88) * graphWidth;
  const yScale = (w) => padding.top + graphHeight - ((w - minW) / range) * graphHeight;
  
  // Create path
  const pathData = weightData.map((d, i) => {
    const x = xScale(d.dayNumber);
    const y = yScale(d.weight);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  
  // Target line y position
  const targetY = yScale(WEIGHT_TARGET);
  const startY = yScale(WEIGHT_START);
  
  return (
    <div className="weight-sparkline">
      <div className="sparkline-header" onClick={() => setExpanded(!expanded)}>
        <span>📈 Trend</span>
        <span className="sparkline-toggle">{expanded ? '▼' : '▶'}</span>
      </div>
      <svg width={width} height={height} className="sparkline-svg">
        {/* Grid lines (expanded only) */}
        {expanded && (
          <>
            <line x1={padding.left} y1={targetY} x2={width - padding.right} y2={targetY} stroke="#22c55e" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
            <line x1={padding.left} y1={startY} x2={width - padding.right} y2={startY} stroke="#ef4444" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
            <text x={padding.left - 4} y={targetY + 3} fontSize="9" fill="#22c55e" textAnchor="end">{WEIGHT_TARGET}</text>
            <text x={padding.left - 4} y={startY + 3} fontSize="9" fill="#ef4444" textAnchor="end">{WEIGHT_START}</text>
          </>
        )}
        
        {/* Weight line */}
        <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Data points (expanded only) */}
        {expanded && weightData.map((d, i) => (
          <circle key={i} cx={xScale(d.dayNumber)} cy={yScale(d.weight)} r="3" fill="#3b82f6" stroke="#0a0a0b" strokeWidth="1">
            <title>Day {d.dayNumber}: {d.weight} lbs</title>
          </circle>
        ))}
        
        {/* Latest point */}
        {weightData.length > 0 && (
          <circle 
            cx={xScale(weightData[weightData.length - 1].dayNumber)} 
            cy={yScale(weightData[weightData.length - 1].weight)} 
            r="4" 
            fill="#22c55e" 
            stroke="#0a0a0b" 
            strokeWidth="2"
          />
        )}
      </svg>
      {expanded && (
        <div className="sparkline-legend">
          <span className="legend-item"><span className="dot target"></span>Target: {WEIGHT_TARGET}</span>
          <span className="legend-item"><span className="dot start"></span>Start: {WEIGHT_START}</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// WEIGHT SIDEBAR COMPONENT (with quick-log)
// ============================================

function Weight({ current, show, days, onLogTodayWeight, isEditing, todayWeight }) {
  const [quickWeight, setQuickWeight] = useState('');
  
  if (!show) return null;
  
  const lost = WEIGHT_START - current;
  const toGo = current - WEIGHT_TARGET;
  const pct = Math.min(Math.max((lost / (WEIGHT_START - WEIGHT_TARGET)) * 100, 0), 100);
  
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
      <div className="wt-range"><span>{WEIGHT_START} lbs</span><span>→</span><span>{WEIGHT_TARGET} lbs</span></div>
      
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

function DayCard({ day, isToday, isEditing, onToggle, onUploadProof, onRemoveProof, onUpdateWeight }) {
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
  if (isPast && pct > 0 && pct < 100) cardClass += ' partial';
  if (isPast && pct === 0 && total > 0) cardClass += ' missed';
  
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
          <div key={a.id || i} className={`item ${a.completed ? 'done' : ''} t-${a.type}`} onClick={() => isEditing && onToggle(day.id, 'activities', i)}>
            <span className="chk">{a.completed ? '✔' : '○'}</span><span className="nm">{a.name}</span>
          </div>
        ))}
        {day.habits?.length > 0 && (
          <div className="habits">
            <div className="hab-label">Daily</div>
            <div className="hab-grid">
              {day.habits.map((h, i) => (
                <div key={h.id || i} className={`hab ${h.completed ? 'done' : ''}`} onClick={() => isEditing && onToggle(day.id, 'habits', i)}>
                  <span className="hchk">{h.completed ? '✔' : '○'}</span><span className="hnm">{h.name}</span>
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
      </div>
    </div>
  );
}

function Week({ weekNum, days, isEditing, onToggle, onUploadProof, onRemoveProof, onUpdateWeight }) {
  const todayStr = getLocalDateStr();
  const phase = days[0]?.phase || 1;
  return (
    <div className="week">
      <div className="week-head"><h2>Week {weekNum}</h2><span className="ph">Phase {phase}: {phase === 1 ? 'Base Building' : phase === 2 ? 'Sharpening' : 'Taper'}</span></div>
      <div className="week-days">{days.map(d => <DayCard key={d.id} day={d} isToday={d.date === todayStr} isEditing={isEditing} onToggle={onToggle} onUploadProof={onUploadProof} onRemoveProof={onRemoveProof} onUpdateWeight={onUpdateWeight} />)}</div>
    </div>
  );
}

function Checkpoints({ checkpoints, currentWeek, onLog, isEditing }) {
  return (
    <div className="checkpoints">
      <h3>📊 Checkpoints</h3>
      {[2, 4, 6, 8, 10, 12].map(w => {
        const t = CHECKPOINT_TARGETS[w];
        const a = checkpoints[w];
        const past = w * 7 <= currentWeek * 7;
        return (
          <div key={w} className={`cp-row ${a ? 'logged' : ''}`}>
            <div className="cp-wk">Week {w}</div>
            {a ? <span className="cp-done">✔</span> : past && isEditing ? <button className="cp-btn" onClick={() => onLog(w)}>Log</button> : null}
            <div className="cp-tgts"><span>Run: {t.run}</span><span>Push: {t.pushups}</span><span>Pull: {t.pullups}</span></div>
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
  const [v, setV] = useState({ run: '', pushups: '', pullups: '', sprint: '', weight: '' });
  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Week {week} Results</h3>
        <label>Run (mm:ss)<input value={v.run} onChange={e => setV({...v, run: e.target.value})} /></label>
        <label>Push-ups<input type="number" value={v.pushups} onChange={e => setV({...v, pushups: e.target.value})} /></label>
        <label>Pull-ups<input type="number" value={v.pullups} onChange={e => setV({...v, pullups: e.target.value})} /></label>
        <label>Sprint (s)<input value={v.sprint} onChange={e => setV({...v, sprint: e.target.value})} /></label>
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
      <div className="emb-head"><span className="emb-icon">🎯</span><div><h2>FBI PFT Journey</h2><span>Alec Santiago</span></div></div>
      <div className="emb-stats">
        <div><span className="ev">{stats.daysRemaining}</span><span className="el">Days</span></div>
        <div><span className="ev">{stats.currentStreak}🔥</span><span className="el">Streak</span></div>
        <div><span className="ev">{stats.totalCompletion}%</span><span className="el">Done</span></div>
      </div>
      <div className="emb-bar"><div style={{ width: `${stats.totalCompletion}%` }}></div></div>
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
                  completed: storedDay.activities?.[i]?.completed || false
                })),
                habits: genDay.habits.map((hab, i) => ({
                  ...hab,
                  completed: storedDay.habits?.[i]?.completed || false
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
    const today = new Date();
    const todayStr = getLocalDateStr(today);
    const test = new Date('2026-04-01');
    const daysRemaining = Math.max(0, Math.ceil((test - today) / 86400000));
    const td = days.find(d => d.date === todayStr);
    const currentPhase = td?.phase || 1;
    const currentWeek = td?.weekNumber || 1;
    
    let currentStreak = 0;
    const sorted = days.filter(d => d.date <= todayStr).sort((a,b) => b.date.localeCompare(a.date));
    for (const d of sorted) {
      const items = [...(d.activities||[]),...(d.habits||[])];
      const allItemsDone = items.length === 0 || items.every(x=>x.completed);
      const proofDone = settings.requireProof && !d.isTravel ? (d.proofFiles?.appleHealth && d.proofFiles?.cronometer) : true;
      if (allItemsDone && proofDone) { if (items.length) currentStreak++; } else break;
    }
    
    const past = days.filter(d => d.date <= todayStr);
    let tot = 0, done = 0;
    past.forEach(d => { const i = [...(d.activities||[]),...(d.habits||[])]; tot += i.length; done += i.filter(x=>x.completed).length; });
    const totalCompletion = tot > 0 ? Math.round((done/tot)*100) : 0;
    
    return { daysRemaining, currentPhase, currentWeek, currentStreak, totalCompletion, currentWeight };
  }, [days, settings.requireProof, currentWeight]);
  
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
      <Stats stats={stats} />
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
          />
          {isEditing && (
            <div className="settings-toggles">
              <label className="toggle"><input type="checkbox" checked={settings.showWeight} onChange={e=>setSettings({...settings,showWeight:e.target.checked})} /> Show weight</label>
              <label className="toggle"><input type="checkbox" checked={settings.requireProof} onChange={e=>setSettings({...settings,requireProof:e.target.checked})} /> Proof breaks streak</label>
            </div>
          )}
          <LiftTracker lifts={lifts} onUpdate={onUpdateLift} isEditing={isEditing} />
          <div className="week-nav"><h4>Weeks</h4><div className="wk-btns">{Object.keys(weekGroups).map(w => <button key={w} className={`wk-btn ${+w===displayWeek?'sel':''} ${+w===stats.currentWeek?'cur':''}`} onClick={()=>setSelWeek(+w)}>{w}</button>)}</div></div>
          <ProofCalendarGrid days={days} />
          <Checkpoints checkpoints={checkpoints} currentWeek={stats.currentWeek} onLog={setModal} isEditing={isEditing} />
          <Meals />
          <PhaseInfo />
          <div className="share"><h4>📤 Embed</h4><code>?embed=true</code></div>
          <SocialLinks />
        </aside>
        <main className="main"><Week weekNum={displayWeek} days={weekGroups[displayWeek]||[]} isEditing={isEditing} onToggle={onToggle} onUploadProof={onUploadProof} onRemoveProof={onRemoveProof} onUpdateWeight={onUpdateWeight} /></main>
      </div>
      {modal && <Modal week={modal} onSave={onSaveCp} onCancel={()=>setModal(null)} />}
    </div>
  );
}
