import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './App.css';

// ============================================
// FBI PFT TRACKER - Alec Santiago
// 89 Days to Pass | Jan 2 - April 1, 2026
// ============================================

const STORAGE_KEY = 'fbi-pft-tracker-alec';
const EDIT_PASSWORD = 'agent195';

// Cloudinary config - UPDATE THESE with your actual values
const CLOUDINARY_CLOUD_NAME = 'djbznowhf'; // TODO: Replace with your Cloudinary cloud name
const CLOUDINARY_UPLOAD_PRESET = 'fbi_pft_proof'; // Create this unsigned preset in Cloudinary

// ============================================
// CLOUDINARY UPLOAD SERVICE
// ============================================

async function uploadToCloudinary(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'fbi-pft');
  
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
    
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`);
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
        { id: 'protein', name: 'Protein 195g+', completed: false },
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
    '2026-01-13': [
      { id: 'z2-1', type: 'zone2', name: '🏃 Zone 2 - 40min (Embarcadero, before conference)', completed: false },
    ],
    '2026-01-14': [
      { id: 'lift-1', type: 'lifting', name: '🏋️ Lower Body - Fitness SF SOMA (Squat 3x5, RDL 2x6)', completed: false },
    ],
    '2026-01-15': [
      { id: 'z2-2', type: 'zone2', name: '🏃 Zone 2 - 45min (Embarcadero)', completed: false },
    ],
    '2026-01-16': [
      { id: 'lift-2', type: 'lifting', name: '🏋️ Upper Pull - Fitness SF SOMA (Pull-ups 4x6, Rows 3x6)', completed: false },
    ],
  };
  return map[dateStr] || [];
}

function getVacationDayActivities(dateStr) {
  const map = {
    '2026-01-17': [
      { id: 'z2-3', type: 'zone2', name: '🏃 Zone 2 - 30min (Explore the Panhandle!)', completed: false },
    ],
    '2026-01-18': [
      { id: 'int-1', type: 'intervals', name: '🔥 Intervals - 6x400m (Golden Gate Park)', completed: false },
    ],
    '2026-01-19': [
      { id: 'rest-1', type: 'rest', name: '😴 Full Rest - Enjoy SF!', completed: false },
    ],
    '2026-01-20': [
      { id: 'z2-4', type: 'zone2', name: '🏃 Zone 2 - 45min (Golden Gate Park)', completed: false },
      { id: 'lift-3', type: 'lifting', name: '🏋️ Upper Push - Fitness SF Castro', completed: false },
    ],
    '2026-01-21': [
      { id: 'tempo-1', type: 'tempo', name: '🏃 Tempo - 20min @ 8:30 (Panhandle)', completed: false },
    ],
  };
  return map[dateStr] || [];
}

function getRegularActivities(dow, weekNum, phase) {
  const intervalDetail = getIntervalDetail(weekNum, phase);
  const tempoDetail = getTempoDetail(weekNum, phase);
  
  // PHASE 3 TAPER
  if (phase === 3) {
    if (weekNum === 11) {
      const w11 = {
        0: [{ id: 'rest', type: 'rest', name: '😴 Full Rest', completed: false }],
        1: [
          { id: 'z2', type: 'zone2', name: '🏃 Zone 2 - 30min (easy)', completed: false },
          { id: 'lift', type: 'lifting', name: '🏋️ Upper Push (Light)', completed: false },
        ],
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
  
  // TIME TRIALS in Phase 2
  if (phase === 2 && dow === 3 && (weekNum === 8 || weekNum === 10)) {
    return [
      { id: 'tt', type: 'timetrial', name: '⏱️ 1.5mi TIME TRIAL', completed: false },
      { id: 'gtg', type: 'gtg', name: '💪 Push-up GTG (4 sets)', completed: false },
    ];
  }
  
  // REGULAR SCHEDULE
  const schedule = {
    0: [{ id: 'rest', type: 'rest', name: '😴 Full Rest Day', completed: false }],
    1: [
      { id: 'z2', type: 'zone2', name: '🏃 Zone 2 - 45min (AM)', completed: false },
      { id: 'lift', type: 'lifting', name: '🏋️ Upper Push (Bench 3x5, OHP 3x6, Dips 2x10)', completed: false },
      { id: 'gtg', type: 'gtg', name: '💪 Push-up GTG (4 sets)', completed: false },
    ],
    2: [
      { id: 'lift', type: 'lifting', name: '🏋️ Lower (Squat 3x5, RDL 3x8, BSS 2x8)', completed: false },
    ],
    3: [
      { id: 'z2', type: 'zone2', name: '🏃 Zone 2 - 50min', completed: false },
      { id: 'strides', type: 'strides', name: '🏃 Strides - 4x100m after', completed: false },
      { id: 'gtg', type: 'gtg', name: '💪 Push-up GTG (4 sets)', completed: false },
    ],
    4: [
      { id: 'lift', type: 'lifting', name: '🏋️ Upper Pull (Pull-ups 4x8, Row 3x8)', completed: false },
    ],
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
  10: { run: '11:05', pushups: 50, pullups: 12, sprint: '48.5', weight: 178 },
  12: { run: '<11:00', pushups: '50+', pullups: 12, sprint: '<49', weight: 175 },
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

function Header({ stats }) {
  return (
    <header className="header">
      <div className="brand">
        <span className="brand-icon">🎯</span>
        <div>
          <h1>FBI PFT TRACKER</h1>
          <span className="subtitle">Alec Santiago • 89 Days to Agent</span>
        </div>
      </div>
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

// ============================================
// FILE UPLOAD COMPONENT
// ============================================

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
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large (max 5MB)');
      return;
    }
    
    setUploading(true);
    setProgress(0);
    setError(null);
    
    try {
      const url = await uploadWithRetry(file, setProgress);
      onUpload(dayId, type, url);
    } catch (err) {
      setError('Upload failed. Try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [dayId, type, onUpload]);
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (!isEditing) return;
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [isEditing, handleFile]);
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (isEditing) setDragOver(true);
  }, [isEditing]);
  
  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);
  
  const handleInputChange = useCallback((e) => {
    const file = e.target.files[0];
    handleFile(file);
    e.target.value = ''; // Reset input
  }, [handleFile]);
  
  const handleRemove = useCallback(() => {
    if (window.confirm('Remove this proof file?')) {
      onRemove(dayId, type);
    }
  }, [dayId, type, onRemove]);
  
  const isPdf = currentUrl?.toLowerCase().includes('.pdf');
  
  if (currentUrl) {
    return (
      <div className="proof-uploaded">
        <span className="proof-label">{label}</span>
        {isPdf ? (
          <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="proof-link">
            📄 View PDF
          </a>
        ) : (
          <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="proof-thumb-link">
            <img src={currentUrl} alt={label} className="proof-thumb" loading="lazy" />
          </a>
        )}
        {isEditing && (
          <button className="proof-remove" onClick={handleRemove} title="Remove">×</button>
        )}
      </div>
    );
  }
  
  if (!isEditing) {
    return (
      <div className="proof-missing">
        <span className="proof-label">{label}</span>
        <span className="proof-status missing">❌</span>
      </div>
    );
  }
  
  return (
    <div 
      className={`proof-dropzone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
      <span className="proof-label">{label}</span>
      {uploading ? (
        <div className="upload-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <span className="progress-text">{progress}%</span>
        </div>
      ) : (
        <span className="proof-prompt">Drop or tap</span>
      )}
      {error && <span className="proof-error">{error}</span>}
    </div>
  );
}

// ============================================
// PROOF STATUS COMPONENTS
// ============================================

function ProofStatusBadge({ day }) {
  const hasHealth = !!day.proofFiles?.appleHealth;
  const hasCrono = !!day.proofFiles?.cronometer;
  const complete = hasHealth && hasCrono;
  
  if (complete) {
    return <span className="proof-badge complete" title="Proof uploaded">📸✓</span>;
  }
  if (hasHealth || hasCrono) {
    return <span className="proof-badge partial" title="Partial proof">{hasHealth ? '📱' : ''}{hasCrono ? '🥗' : ''}</span>;
  }
  return null;
}

function ProofCalendarGrid({ days }) {
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  
  return (
    <div className="proof-calendar">
      <h4>📸 Proof Status</h4>
      <div className="proof-weeks">
        {weeks.map((week, wi) => (
          <div key={wi} className="proof-week">
            <span className="pw-label">W{wi + 1}</span>
            <div className="pw-days">
              {week.map(day => {
                const isPast = new Date(day.date) < new Date(new Date().toDateString());
                const hasHealth = !!day.proofFiles?.appleHealth;
                const hasCrono = !!day.proofFiles?.cronometer;
                const complete = hasHealth && hasCrono;
                const partial = hasHealth || hasCrono;
                
                let cls = 'pd';
                if (!isPast) cls += ' future';
                else if (complete) cls += ' complete';
                else if (partial) cls += ' partial';
                else cls += ' missing';
                
                return (
                  <span key={day.id} className={cls} title={day.date}>
                    {complete ? '✓' : partial ? (hasHealth ? '📱' : '🥗') : isPast ? '❌' : '○'}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// DAY CARD COMPONENT
// ============================================

function DayCard({ day, isToday, isEditing, onToggle, onUploadProof, onRemoveProof }) {
  const dt = new Date(day.date + 'T12:00:00');
  const dayName = dt.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  const items = [...(day.activities || []), ...(day.habits || [])];
  const done = items.filter(x => x.completed).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isPast = new Date(day.date) < new Date(new Date().toDateString());
  
  const hasAllProof = day.proofFiles?.appleHealth && day.proofFiles?.cronometer;
  
  let cardClass = 'day-card';
  if (isToday) cardClass += ' today';
  if (day.isTravel) cardClass += ' travel';
  if (day.isCheckpoint) cardClass += ' checkpoint';
  if (isPast && pct === 100) cardClass += ' complete';
  if (isPast && pct > 0 && pct < 100) cardClass += ' partial';
  if (isPast && pct === 0 && total > 0) cardClass += ' missed';
  
  return (
    <div className={cardClass}>
      <div className="day-head">
        <div className="day-dt">
          <span className="dn">{dayName}</span>
          <span className="md">{monthDay}</span>
        </div>
        {day.location !== 'Denver' && <span className="loc">📍{day.location}</span>}
        {isToday && <span className="badge today">TODAY</span>}
        {day.isCheckpoint && <span className="badge cp">📊</span>}
        {hasAllProof && <ProofStatusBadge day={day} />}
        {total > 0 && <span className={`score ${pct === 100 ? 'full' : ''}`}>{done}/{total}</span>}
      </div>
      
      <div className="day-body">
        {day.activities?.map((a, i) => (
          <div 
            key={a.id || i}
            className={`item ${a.completed ? 'done' : ''} t-${a.type}`}
            onClick={() => isEditing && onToggle(day.id, 'activities', i)}
          >
            <span className="chk">{a.completed ? '✓' : '○'}</span>
            <span className="nm">{a.name}</span>
          </div>
        ))}
        
        {day.habits?.length > 0 && (
          <div className="habits">
            <div className="hab-label">Daily</div>
            <div className="hab-grid">
              {day.habits.map((h, i) => (
                <div 
                  key={h.id || i}
                  className={`hab ${h.completed ? 'done' : ''}`}
                  onClick={() => isEditing && onToggle(day.id, 'habits', i)}
                >
                  <span className="hchk">{h.completed ? '✓' : '○'}</span>
                  <span className="hnm">{h.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* PROOF UPLOAD SECTION */}
        {!day.isTravel && (
          <div className="proof-section">
            <div className="proof-label-row">📸 Daily Proof</div>
            <div className="proof-uploads">
              <FileUpload
                dayId={day.id}
                type="appleHealth"
                currentUrl={day.proofFiles?.appleHealth}
                onUpload={onUploadProof}
                onRemove={onRemoveProof}
                isEditing={isEditing}
              />
              <FileUpload
                dayId={day.id}
                type="cronometer"
                currentUrl={day.proofFiles?.cronometer}
                onUpload={onUploadProof}
                onRemove={onRemoveProof}
                isEditing={isEditing}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Week({ weekNum, days, isEditing, onToggle, onUploadProof, onRemoveProof }) {
  const today = new Date().toISOString().split('T')[0];
  const phase = days[0]?.phase || 1;
  
  return (
    <div className="week">
      <div className="week-head">
        <h2>Week {weekNum}</h2>
        <span className="ph">Phase {phase}: {phase === 1 ? 'Base Building' : phase === 2 ? 'Sharpening' : 'Taper'}</span>
      </div>
      <div className="week-days">
        {days.map(d => (
          <DayCard 
            key={d.id} 
            day={d} 
            isToday={d.date === today} 
            isEditing={isEditing} 
            onToggle={onToggle}
            onUploadProof={onUploadProof}
            onRemoveProof={onRemoveProof}
          />
        ))}
      </div>
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
            {a ? (
              <span className="cp-done">✓</span>
            ) : past && isEditing ? (
              <button className="cp-btn" onClick={() => onLog(w)}>Log</button>
            ) : null}
            <div className="cp-tgts">
              <span>Run: {t.run}</span>
              <span>Push: {t.pushups}</span>
              <span>Pull: {t.pullups}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Weight({ start, current, target, show }) {
  if (!show) return null;
  const lost = start - current;
  const pct = Math.min(Math.max((lost / (start - target)) * 100, 0), 100);
  return (
    <div className="weight">
      <h3>⚖️ Progress</h3>
      <div className="wt-stats">
        <div><span className="wv">{lost > 0 ? lost : 0}</span><span className="wl">lost</span></div>
        <div><span className="wv">{current}</span><span className="wl">now</span></div>
        <div><span className="wv">{target - current > 0 ? target - current : 0}</span><span className="wl">to go</span></div>
      </div>
      <div className="wt-bar"><div className="wt-fill" style={{ width: `${pct}%` }}></div></div>
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
          <p className="note">⚠️ No salmon (allergy) • No meat • Target: 195g protein</p>
          {Object.entries(MEALS).map(([cat, items]) => (
            <div key={cat} className="meal-cat">
              <h4>{cat}</h4>
              <ul>{items.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          ))}
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
        <label>Weight<input type="number" value={v.weight} onChange={e => setV({...v, weight: e.target.value})} /></label>
        <div className="modal-btns">
          <button onClick={onCancel}>Cancel</button>
          <button className="save" onClick={() => onSave(week, v)}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MISSING PROOF ALERT COMPONENT
// ============================================

function MissingProofAlert({ days, onScrollToDay }) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Find yesterday if it's missing proof
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const yesterdayDay = days.find(d => d.id === yesterdayStr);
  
  if (!yesterdayDay || yesterdayDay.isTravel) return null;
  
  const hasHealth = !!yesterdayDay.proofFiles?.appleHealth;
  const hasCrono = !!yesterdayDay.proofFiles?.cronometer;
  
  if (hasHealth && hasCrono) return null;
  
  return (
    <div className="missing-proof-alert" onClick={() => onScrollToDay(yesterdayStr)}>
      <span className="alert-icon">⚠️</span>
      <span className="alert-text">
        Yesterday missing proof: {!hasHealth && '📱'} {!hasCrono && '🥗'}
      </span>
      <span className="alert-action">Upload now →</span>
    </div>
  );
}

// ============================================
// EMBED VIEW
// ============================================

function Embed({ stats, days }) {
  const recent = days
    .filter(d => new Date(d.date) <= new Date() && new Date(d.date) >= new Date(Date.now() - 7*24*60*60*1000))
    .reverse();
  
  return (
    <div className="embed">
      <div className="emb-head">
        <span className="emb-icon">🎯</span>
        <div><h2>FBI PFT Journey</h2><span>Alec Santiago</span></div>
      </div>
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
                {d.isTravel ? (
                  <span className="proof-na">✈️</span>
                ) : hasProof ? (
                  <>
                    <a href={d.proofFiles.appleHealth} target="_blank" rel="noopener noreferrer" className="proof-icon" title="Health">📱</a>
                    <a href={d.proofFiles.cronometer} target="_blank" rel="noopener noreferrer" className="proof-icon" title="Cronometer">🥗</a>
                  </>
                ) : (
                  <span className="proof-missing-embed">❌ No proof</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
      <div className="emb-foot"><a href="https://wayfindersalmanac.com">wayfindersalmanac.com</a></div>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================

export default function App() {
  const [days, setDays] = useState(() => {
    try { 
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (stored) {
        // Migrate old data: add proofFiles if missing
        return stored.map(d => ({
          ...d,
          proofFiles: d.proofFiles || { appleHealth: null, cronometer: null, uploadedAt: null }
        }));
      }
      return generateAllDays(); 
    }
    catch { return generateAllDays(); }
  });
  const [checkpoints, setCheckpoints] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY+'-cp')) || {}; }
    catch { return {}; }
  });
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY+'-set')) || { showWeight: true, requireProof: false }; }
    catch { return { showWeight: true, requireProof: false }; }
  });
  const [isEditing, setIsEditing] = useState(false);
  const [pw, setPw] = useState('');
  const [modal, setModal] = useState(null);
  const [selWeek, setSelWeek] = useState(null);
  
  const isEmbed = window.location.search.includes('embed=true') || window.location.pathname.includes('/embed');
  
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(days)); }, [days]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY+'-cp', JSON.stringify(checkpoints)); }, [checkpoints]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY+'-set', JSON.stringify(settings)); }, [settings]);
  
  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const test = new Date('2026-04-01');
    const daysRemaining = Math.max(0, Math.ceil((test - today) / 86400000));
    const td = days.find(d => d.date === todayStr);
    const currentPhase = td?.phase || 1;
    const currentWeek = td?.weekNumber || 1;
    
    // Calculate streak with optional proof requirement
    let currentStreak = 0;
    const sorted = days.filter(d => new Date(d.date) <= today).sort((a,b) => new Date(b.date) - new Date(a.date));
    for (const d of sorted) {
      const items = [...(d.activities||[]),...(d.habits||[])];
      const allItemsDone = items.length === 0 || items.every(x=>x.completed);
      const proofDone = settings.requireProof && !d.isTravel ? 
        (d.proofFiles?.appleHealth && d.proofFiles?.cronometer) : true;
      
      if (allItemsDone && proofDone) { 
        if (items.length) currentStreak++; 
      } else {
        break;
      }
    }
    
    const past = days.filter(d => new Date(d.date) <= today);
    let tot = 0, done = 0;
    past.forEach(d => { const i = [...(d.activities||[]),...(d.habits||[])]; tot += i.length; done += i.filter(x=>x.completed).length; });
    const totalCompletion = tot > 0 ? Math.round((done/tot)*100) : 0;
    
    const latestCp = Object.entries(checkpoints).filter(([_,v])=>v.weight).sort(([a],[b])=>b-a)[0];
    const currentWeight = latestCp ? Number(latestCp[1].weight) : 190;
    
    return { daysRemaining, currentPhase, currentWeek, currentStreak, totalCompletion, currentWeight };
  }, [days, checkpoints, settings.requireProof]);
  
  const weekGroups = useMemo(() => {
    const g = {};
    days.forEach(d => { if (!g[d.weekNumber]) g[d.weekNumber] = []; g[d.weekNumber].push(d); });
    return g;
  }, [days]);
  
  const onToggle = (dayId, section, idx) => {
    setDays(prev => prev.map(d => {
      if (d.id !== dayId) return d;
      const arr = [...d[section]];
      arr[idx] = { ...arr[idx], completed: !arr[idx].completed };
      return { ...d, [section]: arr };
    }));
  };
  
  const onUploadProof = useCallback((dayId, type, url) => {
    setDays(prev => prev.map(d => {
      if (d.id !== dayId) return d;
      return {
        ...d,
        proofFiles: {
          ...d.proofFiles,
          [type]: url,
          uploadedAt: new Date().toISOString()
        }
      };
    }));
  }, []);
  
  const onRemoveProof = useCallback((dayId, type) => {
    setDays(prev => prev.map(d => {
      if (d.id !== dayId) return d;
      return {
        ...d,
        proofFiles: {
          ...d.proofFiles,
          [type]: null
        }
      };
    }));
  }, []);
  
  const onScrollToDay = useCallback((dayId) => {
    const dayData = days.find(d => d.id === dayId);
    if (dayData) {
      setSelWeek(dayData.weekNumber);
      // Small delay to let React render the week, then scroll
      setTimeout(() => {
        const el = document.querySelector(`[data-day-id="${dayId}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [days]);
  
  const onSaveCp = (wk, vals) => { setCheckpoints(p => ({...p, [wk]: vals})); setModal(null); };
  const onPw = e => { e.preventDefault(); if (pw === EDIT_PASSWORD) setIsEditing(true); else alert('Wrong'); setPw(''); };
  
  if (isEmbed) return <Embed stats={stats} days={days} />;
  
  const displayWeek = selWeek || stats.currentWeek;
  
  return (
    <div className="app">
      <Header stats={stats} />
      <Stats stats={stats} />
      
      {/* Missing proof alert */}
      {isEditing && <MissingProofAlert days={days} onScrollToDay={onScrollToDay} />}
      
      <div className="layout">
        <aside className="side">
          <div className="edit-box">
            {isEditing ? (
              <div className="editing"><span>✏️ Editing</span><button onClick={() => setIsEditing(false)}>Lock</button></div>
            ) : (
              <form onSubmit={onPw}><input type="password" placeholder="Password" value={pw} onChange={e=>setPw(e.target.value)} /><button>Unlock</button></form>
            )}
          </div>
          <Weight start={190} current={stats.currentWeight} target={175} show={settings.showWeight} />
          {isEditing && (
            <div className="settings-toggles">
              <label className="toggle">
                <input type="checkbox" checked={settings.showWeight} onChange={e=>setSettings({...settings,showWeight:e.target.checked})} /> 
                Show weight
              </label>
              <label className="toggle">
                <input type="checkbox" checked={settings.requireProof} onChange={e=>setSettings({...settings,requireProof:e.target.checked})} /> 
                Proof breaks streak
              </label>
            </div>
          )}
          <div className="week-nav">
            <h4>Weeks</h4>
            <div className="wk-btns">
              {Object.keys(weekGroups).map(w => (
                <button key={w} className={`wk-btn ${+w===displayWeek?'sel':''} ${+w===stats.currentWeek?'cur':''}`} onClick={()=>setSelWeek(+w)}>{w}</button>
              ))}
            </div>
          </div>
          
          {/* Proof calendar grid */}
          <ProofCalendarGrid days={days} />
          
          <Checkpoints checkpoints={checkpoints} currentWeek={stats.currentWeek} onLog={setModal} isEditing={isEditing} />
          <Meals />
          <div className="share">
            <h4>📤 Embed</h4>
            <code>?embed=true</code>
          </div>
        </aside>
        <main className="main">
          <Week 
            weekNum={displayWeek} 
            days={weekGroups[displayWeek]||[]} 
            isEditing={isEditing} 
            onToggle={onToggle}
            onUploadProof={onUploadProof}
            onRemoveProof={onRemoveProof}
          />
        </main>
      </div>
      {modal && <Modal week={modal} onSave={onSaveCp} onCancel={()=>setModal(null)} />}
    </div>
  );
}
