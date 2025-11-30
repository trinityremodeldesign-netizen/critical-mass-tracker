'use client';

import { useState, useEffect, useCallback } from 'react';
import { WORKOUTS, CYCLE_DAYS, PROGRAM_START_DATE } from './programData';

// Generate a unique session ID if not present
function getSessionId() {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  let sessionId = urlParams.get('session');
  
  if (!sessionId) {
    sessionId = 'cm_' + Math.random().toString(36).substring(2, 15);
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('session', sessionId);
    window.history.replaceState({}, '', newUrl);
  }
  
  return sessionId;
}

// Calculate cycle day from program start date
function calculateCycleDay(dateString = null) {
  const startDate = new Date(PROGRAM_START_DATE + 'T00:00:00');
  const targetDate = dateString ? new Date(dateString + 'T00:00:00') : new Date();
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate - startDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 1; // Before program start
  
  // 9-day cycle, 1-indexed
  return (diffDays % 9) + 1;
}

// Icons as simple components
const Icons = {
  Home: () => <span>🏠</span>,
  Dumbbell: () => <span>🏋️</span>,
  History: () => <span>📊</span>,
  ChevronDown: () => <span>▼</span>,
  ChevronRight: () => <span>›</span>,
  Plus: () => <span>+</span>,
  Save: () => <span>💾</span>,
  Calendar: () => <span>📅</span>,
  Edit: () => <span>✏️</span>,
  Settings: () => <span>⚙️</span>,
};

export default function App() {
  const [view, setView] = useState('home');
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [viewingSession, setViewingSession] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [manualCycleDay, setManualCycleDay] = useState(null);

  // Initialize session ID
  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  // Fetch sessions when sessionId is ready
  const fetchSessions = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const res = await fetch(`/api/sessions?sessionId=${sessionId}`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Calculate current cycle day - use manual override if set, otherwise calculate from date
  const cycleDay = manualCycleDay || calculateCycleDay();
  const currentDayInfo = CYCLE_DAYS[cycleDay - 1];

  // Navigation
  const renderNav = () => (
    <nav className="nav">
      <button 
        className={`nav-item ${view === 'home' ? 'active' : ''}`}
        onClick={() => { setView('home'); setViewingSession(null); setEditingSession(null); }}
      >
        <span className="nav-icon"><Icons.Home /></span>
        Home
      </button>
      <button 
        className={`nav-item ${view === 'workout' ? 'active' : ''}`}
        onClick={() => setView('workout')}
      >
        <span className="nav-icon"><Icons.Dumbbell /></span>
        Workout
      </button>
      <button 
        className={`nav-item ${view === 'history' ? 'active' : ''}`}
        onClick={() => { setView('history'); setViewingSession(null); setEditingSession(null); }}
      >
        <span className="nav-icon"><Icons.History /></span>
        History
      </button>
    </nav>
  );

  if (loading) {
    return (
      <>
        <div className="container">
          <div className="loading">Loading...</div>
        </div>
        {renderNav()}
      </>
    );
  }

  return (
    <>
      <div className="container">
        {view === 'home' && (
          <HomeView 
            cycleDay={cycleDay}
            currentDayInfo={currentDayInfo}
            sessions={sessions}
            manualCycleDay={manualCycleDay}
            onSetManualCycleDay={setManualCycleDay}
            onStartWorkout={(workout) => {
              setCurrentWorkout(workout);
              setView('workout');
            }}
            onViewSession={(session) => {
              setViewingSession(session);
              setView('history');
            }}
          />
        )}
        
        {view === 'workout' && (
          <WorkoutView 
            cycleDay={cycleDay}
            currentDayInfo={currentDayInfo}
            currentWorkout={currentWorkout}
            sessions={sessions}
            sessionId={sessionId}
            onSave={() => {
              fetchSessions();
              setView('home');
              setCurrentWorkout(null);
            }}
            onBack={() => {
              setView('home');
              setCurrentWorkout(null);
            }}
          />
        )}
        
        {view === 'history' && (
          <HistoryView 
            sessions={sessions}
            viewingSession={viewingSession}
            editingSession={editingSession}
            sessionId={sessionId}
            onViewSession={setViewingSession}
            onEditSession={setEditingSession}
            onBack={() => { setViewingSession(null); setEditingSession(null); }}
            onSaveEdit={() => {
              fetchSessions();
              setEditingSession(null);
              setViewingSession(null);
            }}
          />
        )}
      </div>
      {renderNav()}
    </>
  );
}

// Home View Component
function HomeView({ cycleDay, currentDayInfo, sessions, manualCycleDay, onSetManualCycleDay, onStartWorkout, onViewSession }) {
  const [showDaySelector, setShowDaySelector] = useState(false);
  
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });

  const autoCycleDay = calculateCycleDay();

  return (
    <div className="fade-in">
      <div className="header">
        <div>
          <h1>Critical Mass</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>{today}</p>
        </div>
      </div>

      {/* Cycle Progress */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ color: 'var(--text-secondary)' }}>9-Day Cycle</h3>
          <button 
            className="btn btn-ghost btn-sm"
            onClick={() => setShowDaySelector(!showDaySelector)}
          >
            <Icons.Settings /> {manualCycleDay ? 'Manual' : 'Auto'}
          </button>
        </div>
        
        {showDaySelector && (
          <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <label className="form-label">Override Cycle Day</label>
            <select 
              value={manualCycleDay || ''}
              onChange={(e) => onSetManualCycleDay(e.target.value ? parseInt(e.target.value) : null)}
              style={{ marginBottom: '8px' }}
            >
              <option value="">Auto (Day {autoCycleDay})</option>
              {CYCLE_DAYS.map((day, idx) => (
                <option key={idx} value={idx + 1}>
                  Day {idx + 1}: {day.name}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Auto calculates from program start (Nov 26). Use manual override if you missed a day or need to adjust.
            </p>
          </div>
        )}

        <div className="cycle-indicator">
          {CYCLE_DAYS.map((day, idx) => (
            <div 
              key={idx}
              className={`cycle-dot ${day.type} ${idx + 1 === cycleDay ? 'current' : ''}`}
              title={day.name}
              onClick={() => onSetManualCycleDay(idx + 1)}
              style={{ cursor: 'pointer' }}
            >
              {idx + 1}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '12px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Day {cycleDay}: </span>
          <span className={currentDayInfo.type === 'training' ? 'pr-text' : ''} style={{ fontWeight: 600 }}>
            {currentDayInfo.name}
          </span>
        </div>
      </div>

      {/* Next Workout */}
      {currentDayInfo.type === 'training' && (
        <div className="card">
          <div className="card-header">
            <h3>Today's Workout</h3>
            <span className="badge badge-training">Training Day</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
            {WORKOUTS[currentDayInfo.workout]?.focus}
          </p>
          <button 
            className="btn btn-primary btn-block"
            onClick={() => onStartWorkout(currentDayInfo.workout)}
          >
            <Icons.Dumbbell /> Start {currentDayInfo.name}
          </button>
        </div>
      )}

      {currentDayInfo.type === 'rest' && (
        <div className="card">
          <div className="card-header">
            <h3>Rest Day</h3>
            <span className="badge badge-rest">Recovery</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px' }}>
            Focus on recovery, nutrition, and sleep.
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Tap a day number above or use the override to select a different workout.
          </p>
        </div>
      )}

      {/* Quick Access to Any Workout */}
      <div className="card" style={{ marginTop: '16px' }}>
        <h3 style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>Quick Start</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {CYCLE_DAYS.filter(d => d.type === 'training').map((day) => (
            <button
              key={day.workout}
              className="btn btn-secondary btn-sm"
              onClick={() => onStartWorkout(day.workout)}
            >
              {day.name}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>Recent Sessions</h3>
          {sessions.slice(0, 3).map((session) => (
            <div 
              key={session.id} 
              className="history-item"
              onClick={() => onViewSession(session)}
            >
              <div>
                <div className="history-date">{formatDate(session.date)}</div>
                <div className="history-workout">{session.workoutName} (Day {session.cycleDay})</div>
              </div>
              <span className="history-arrow"><Icons.ChevronRight /></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Workout View Component
function WorkoutView({ cycleDay, currentDayInfo, currentWorkout, sessions, sessionId, onSave, onBack }) {
  const workoutId = currentWorkout || currentDayInfo.workout;
  const workout = WORKOUTS[workoutId];
  
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [exerciseData, setExerciseData] = useState({});
  const [additionalData, setAdditionalData] = useState({});
  const [replacementData, setReplacementData] = useState({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Find previous session for this workout type
  const previousSession = sessions.find(s => s.workoutId === workoutId);

  // Initialize exercise data structure
  useEffect(() => {
    if (!workout) return;
    
    const initialData = {};
    workout.coreExercises.forEach(ex => {
      const numSets = typeof ex.sets === 'number' ? ex.sets : parseInt(ex.sets) || 3;
      
      if (ex.isMechanicalDropSet) {
        // For mechanical drop sets, each set has multiple phases
        initialData[ex.id] = {
          variation: ex.variations ? ex.variations[0] : null,
          sets: Array(numSets).fill(null).map(() => ({
            weight: '',
            phases: ex.dropSetPhases.map(() => ''),
          })),
          exerciseNotes: '',
        };
      } else if (ex.isSuperset) {
        // For supersets, each set has multiple exercises
        initialData[ex.id] = {
          variation: ex.variations ? ex.variations[0] : null,
          sets: Array(numSets).fill(null).map(() => ({
            exercises: ex.supersetExercises.map(() => ({ weight: '', reps: '' })),
          })),
          exerciseNotes: '',
        };
      } else {
        initialData[ex.id] = {
          variation: ex.variations ? ex.variations[0] : null,
          sets: Array(numSets).fill(null).map(() => ({ weight: '', reps: '' })),
          exerciseNotes: '',
        };
      }
    });
    
    // Initialize additional exercises data
    const initialAdditional = {};
    if (workout.additionalExercises) {
      workout.additionalExercises.forEach(ex => {
        const numSets = typeof ex.sets === 'number' ? ex.sets : parseInt(ex.sets) || 2;
        initialAdditional[ex.id] = {
          selected: false,
          sets: Array(numSets).fill(null).map(() => ({ weight: '', reps: '' })),
          exerciseNotes: '',
        };
      });
    }
    
    // Initialize replacement exercises data
    const initialReplacement = {};
    if (workout.replacementExercises) {
      workout.replacementExercises.forEach(ex => {
        const numSets = typeof ex.sets === 'number' ? ex.sets : parseInt(ex.sets) || 1;
        initialReplacement[ex.id] = {
          selected: false,
          sets: Array(numSets).fill(null).map(() => ({ weight: '', reps: '' })),
          exerciseNotes: '',
        };
      });
    }
    
    setExerciseData(initialData);
    setAdditionalData(initialAdditional);
    setReplacementData(initialReplacement);
  }, [workout]);

  const updateExerciseData = (exerciseId, field, value, setIndex = null, subIndex = null) => {
    setExerciseData(prev => {
      const updated = { ...prev };
      if (setIndex !== null) {
        if (subIndex !== null) {
          // Mechanical drop set phase or superset exercise update
          const newSets = [...updated[exerciseId].sets];
          const exercise = workout.coreExercises.find(e => e.id === exerciseId);
          
          if (exercise?.isMechanicalDropSet) {
            const newPhases = [...newSets[setIndex].phases];
            newPhases[subIndex] = value;
            newSets[setIndex] = { ...newSets[setIndex], phases: newPhases };
          } else if (exercise?.isSuperset) {
            const newExercises = [...newSets[setIndex].exercises];
            newExercises[subIndex] = { ...newExercises[subIndex], [field]: value };
            newSets[setIndex] = { ...newSets[setIndex], exercises: newExercises };
          }
          updated[exerciseId] = { ...updated[exerciseId], sets: newSets };
        } else {
          // Regular set update
          updated[exerciseId] = {
            ...updated[exerciseId],
            sets: updated[exerciseId].sets.map((s, i) => 
              i === setIndex ? { ...s, [field]: value } : s
            ),
          };
        }
      } else {
        updated[exerciseId] = {
          ...updated[exerciseId],
          [field]: value,
        };
      }
      return updated;
    });
  };

  const updateAdditionalData = (exerciseId, field, value, setIndex = null) => {
    setAdditionalData(prev => {
      const updated = { ...prev };
      if (setIndex !== null) {
        updated[exerciseId] = {
          ...updated[exerciseId],
          sets: updated[exerciseId].sets.map((s, i) => 
            i === setIndex ? { ...s, [field]: value } : s
          ),
        };
      } else {
        updated[exerciseId] = {
          ...updated[exerciseId],
          [field]: value,
        };
      }
      return updated;
    });
  };

  const updateReplacementData = (exerciseId, field, value, setIndex = null) => {
    setReplacementData(prev => {
      const updated = { ...prev };
      if (setIndex !== null) {
        updated[exerciseId] = {
          ...updated[exerciseId],
          sets: updated[exerciseId].sets.map((s, i) => 
            i === setIndex ? { ...s, [field]: value } : s
          ),
        };
      } else {
        updated[exerciseId] = {
          ...updated[exerciseId],
          [field]: value,
        };
      }
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    
    const sessionData = {
      id: Date.now().toString(),
      sessionId,
      workoutId,
      workoutName: workout.name,
      date: workoutDate,
      cycleDay,
      exercises: exerciseData,
      additionalExercises: additionalData,
      replacementExercises: replacementData,
      notes,
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, session: sessionData }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error + (result.details ? ': ' + result.details : ''));
      }
      
      onSave();
    } catch (err) {
      console.error('Failed to save session:', err);
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!workout) {
    return (
      <div className="fade-in">
        <div className="empty-state">
          <p>Select a workout to begin</p>
          <button className="btn btn-secondary" onClick={onBack}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="header">
        <div>
          <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        </div>
        <h2 className="header-title">{workout.name}</h2>
        <button 
          className="btn btn-primary btn-sm" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '...' : 'Save'}
        </button>
      </div>

      {/* Date Input */}
      <div className="form-group">
        <label className="form-label"><Icons.Calendar /> Training Date</label>
        <input 
          type="date" 
          className="date-input"
          value={workoutDate}
          onChange={(e) => setWorkoutDate(e.target.value)}
        />
      </div>

      {/* Focus */}
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>
        {workout.focus}
      </p>

      {/* Warm Up if specified */}
      {workout.warmUp && (
        <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Warm Up:</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{workout.warmUp}</div>
        </div>
      )}

      {/* Core Exercises */}
      {workout.coreExercises.map((exercise) => (
        <ExerciseCard 
          key={exercise.id}
          exercise={exercise}
          data={exerciseData[exercise.id]}
          previousData={previousSession?.exercises?.[exercise.id]}
          onUpdate={(field, value, setIndex, subIndex) => updateExerciseData(exercise.id, field, value, setIndex, subIndex)}
        />
      ))}

      {/* Additional Exercises */}
      {workout.additionalExercises && workout.additionalExercises.length > 0 && (
        <div className="additional-section">
          <div className="additional-header">
            <span className="additional-title">Additional Exercises (Pick 1-2)</span>
          </div>
          {workout.additionalExercises.map((ex) => (
            <AdditionalExerciseCard
              key={ex.id}
              exercise={ex}
              data={additionalData[ex.id]}
              previousData={previousSession?.additionalExercises?.[ex.id]}
              onUpdate={(field, value, setIndex) => updateAdditionalData(ex.id, field, value, setIndex)}
            />
          ))}
        </div>
      )}

      {/* Replacement Exercises */}
      {workout.replacementExercises && workout.replacementExercises.length > 0 && (
        <div className="additional-section">
          <div className="additional-header">
            <span className="additional-title">Replacement Movements</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Use when you hit a sticking point on core movements
          </p>
          {workout.replacementExercises.map((ex) => (
            <AdditionalExerciseCard
              key={ex.id}
              exercise={ex}
              data={replacementData[ex.id]}
              previousData={previousSession?.replacementExercises?.[ex.id]}
              onUpdate={(field, value, setIndex) => updateReplacementData(ex.id, field, value, setIndex)}
            />
          ))}
        </div>
      )}

      {/* Notes */}
      <div className="form-group" style={{ marginTop: '24px' }}>
        <label className="form-label">Session Notes</label>
        <textarea 
          className="notes-input"
          placeholder="How did it feel? Any adjustments for next time?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Save Button */}
      <button 
        className="btn btn-primary btn-block"
        onClick={handleSave}
        disabled={saving}
        style={{ marginTop: '16px', marginBottom: '24px' }}
      >
        {saving ? 'Saving...' : '💾 Save Workout'}
      </button>
    </div>
  );
}

// Exercise Card Component
function ExerciseCard({ exercise, data, previousData, onUpdate }) {
  const [showNotes, setShowNotes] = useState(false);
  const numSets = typeof exercise.sets === 'number' ? exercise.sets : parseInt(exercise.sets) || 3;
  const isMechanicalDropSet = exercise.isMechanicalDropSet;
  const isSuperset = exercise.isSuperset;
  
  if (!data) return null;

  return (
    <div className="exercise-card">
      <div className={`exercise-header ${exercise.isPR ? 'pr' : ''}`}>
        <div>
          <div className={`exercise-name ${exercise.isPR ? 'pr' : ''}`}>
            {exercise.name}
          </div>
          <div className="exercise-meta">
            {exercise.sets} × {exercise.repRange}
          </div>
        </div>
        {exercise.isPR && <span className="pr-badge">PR Set</span>}
      </div>
      
      <div className="exercise-body">
        {exercise.notes && (
          <div className="exercise-notes">{exercise.notes}</div>
        )}

        {/* Previous Performance */}
        {previousData && previousData.sets && (
          <div className="previous-performance">
            <div className="previous-label">Previous:</div>
            <div className="previous-data">
              {previousData.variation && `${previousData.variation} • `}
              {isSuperset
                ? previousData.sets.map((s, i) => 
                    s.exercises ? s.exercises.map((e, j) => `${e.weight || '?'}×${e.reps || '?'}`).join(' + ') : null
                  ).filter(Boolean).join(' | ')
                : isMechanicalDropSet 
                  ? previousData.sets.map((s, i) => 
                      s.weight ? `${s.weight}lb: ${s.phases?.join('/')}` : null
                    ).filter(Boolean).join(' | ')
                  : previousData.sets.map((s, i) => 
                      s.weight || s.reps ? `${s.weight || '?'}×${s.reps || '?'}` : null
                    ).filter(Boolean).join(' / ')
              }
            </div>
          </div>
        )}

        {/* Variation Selector */}
        {exercise.variations && (
          <div className="form-group">
            <label className="form-label">Variation</label>
            <select 
              value={data.variation || exercise.variations[0]}
              onChange={(e) => onUpdate('variation', e.target.value)}
            >
              {exercise.variations.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        )}

        {/* Set Inputs */}
        <div style={{ marginTop: '12px' }}>
          {isSuperset ? (
            // Superset UI
            <>
              {data.sets.map((set, setIdx) => (
                <div key={setIdx} style={{ marginBottom: '12px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Set {setIdx + 1}</div>
                  {exercise.supersetExercises.map((ssEx, exIdx) => (
                    <div key={exIdx} style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        {ssEx.name} ({ssEx.repRange} reps)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input 
                          type="number"
                          className="set-input"
                          placeholder="Weight"
                          value={set.exercises[exIdx]?.weight || ''}
                          onChange={(e) => onUpdate('weight', e.target.value, setIdx, exIdx)}
                        />
                        <input 
                          type="number"
                          className="set-input"
                          placeholder="Reps"
                          value={set.exercises[exIdx]?.reps || ''}
                          onChange={(e) => onUpdate('reps', e.target.value, setIdx, exIdx)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </>
          ) : isMechanicalDropSet ? (
            // Mechanical Drop Set UI
            <>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Phases: {exercise.dropSetPhases.join(' → ')}
              </div>
              {data.sets.map((set, setIdx) => (
                <div key={setIdx} style={{ marginBottom: '12px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="set-number">Set {setIdx + 1}</span>
                    <input 
                      type="number"
                      className="set-input"
                      placeholder="Weight (lbs)"
                      value={set.weight}
                      onChange={(e) => onUpdate('weight', e.target.value, setIdx)}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {exercise.dropSetPhases.map((phase, phaseIdx) => (
                      <div key={phaseIdx}>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                          {phase.length > 15 ? phase.substring(0, 12) + '...' : phase}
                        </label>
                        <input 
                          type="number"
                          className="set-input"
                          placeholder="reps"
                          value={set.phases[phaseIdx]}
                          onChange={(e) => onUpdate('phases', e.target.value, setIdx, phaseIdx)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            // Regular Set UI
            <>
              <div className="set-row" style={{ marginBottom: '4px' }}>
                <span></span>
                <span className="form-label" style={{ textAlign: 'center', margin: 0 }}>Weight</span>
                <span className="form-label" style={{ textAlign: 'center', margin: 0 }}>Reps</span>
              </div>
              {data.sets.map((set, idx) => (
                <div key={idx} className="set-row">
                  <span className="set-number">{idx + 1}</span>
                  <input 
                    type="number"
                    className="set-input"
                    placeholder="lbs"
                    value={set.weight}
                    onChange={(e) => onUpdate('weight', e.target.value, idx)}
                  />
                  <input 
                    type="number"
                    className="set-input"
                    placeholder="reps"
                    value={set.reps}
                    onChange={(e) => onUpdate('reps', e.target.value, idx)}
                  />
                </div>
              ))}
            </>
          )}
        </div>

        {/* Per-Exercise Notes */}
        <div style={{ marginTop: '12px' }}>
          <button 
            className="btn btn-ghost btn-sm"
            onClick={() => setShowNotes(!showNotes)}
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
          >
            {showNotes ? '− Hide Notes' : '+ Add Notes'}
          </button>
          {showNotes && (
            <textarea 
              className="notes-input"
              placeholder="Notes for this exercise..."
              value={data.exerciseNotes || ''}
              onChange={(e) => onUpdate('exerciseNotes', e.target.value)}
              style={{ marginTop: '8px', minHeight: '60px' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Additional/Replacement Exercise Card Component
function AdditionalExerciseCard({ exercise, data, previousData, onUpdate }) {
  const [showNotes, setShowNotes] = useState(false);
  
  if (!data) return null;

  const numSets = typeof exercise.sets === 'number' ? exercise.sets : parseInt(exercise.sets) || 2;

  return (
    <div className="exercise-card" style={{ opacity: data.selected ? 1 : 0.7 }}>
      <div className="exercise-header" style={{ padding: '12px 16px' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', flex: 1 }}>
          <input 
            type="checkbox"
            checked={data.selected}
            onChange={(e) => onUpdate('selected', e.target.checked)}
            style={{ width: 'auto', marginTop: '3px' }}
          />
          <div>
            <div style={{ fontWeight: 600 }}>{exercise.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {exercise.sets} × {exercise.repRange}
            </div>
            {exercise.notes && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                {exercise.notes}
              </div>
            )}
          </div>
        </label>
      </div>
      
      {data.selected && (
        <div className="exercise-body">
          {/* Previous Performance */}
          {previousData && previousData.selected && previousData.sets && (
            <div className="previous-performance">
              <div className="previous-label">Previous:</div>
              <div className="previous-data">
                {previousData.sets.map((s, i) => 
                  s.weight || s.reps ? `${s.weight || '?'}×${s.reps || '?'}` : null
                ).filter(Boolean).join(' / ')}
              </div>
            </div>
          )}

          {/* Set Inputs */}
          <div className="set-row" style={{ marginBottom: '4px' }}>
            <span></span>
            <span className="form-label" style={{ textAlign: 'center', margin: 0 }}>Weight</span>
            <span className="form-label" style={{ textAlign: 'center', margin: 0 }}>Reps</span>
          </div>
          {data.sets.map((set, idx) => (
            <div key={idx} className="set-row">
              <span className="set-number">{idx + 1}</span>
              <input 
                type="number"
                className="set-input"
                placeholder="lbs"
                value={set.weight}
                onChange={(e) => onUpdate('weight', e.target.value, idx)}
              />
              <input 
                type="number"
                className="set-input"
                placeholder="reps"
                value={set.reps}
                onChange={(e) => onUpdate('reps', e.target.value, idx)}
              />
            </div>
          ))}

          {/* Per-Exercise Notes */}
          <div style={{ marginTop: '12px' }}>
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => setShowNotes(!showNotes)}
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            >
              {showNotes ? '− Hide Notes' : '+ Add Notes'}
            </button>
            {showNotes && (
              <textarea 
                className="notes-input"
                placeholder="Notes for this exercise..."
                value={data.exerciseNotes || ''}
                onChange={(e) => onUpdate('exerciseNotes', e.target.value)}
                style={{ marginTop: '8px', minHeight: '60px' }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// History View Component
function HistoryView({ sessions, viewingSession, editingSession, sessionId, onViewSession, onEditSession, onBack, onSaveEdit }) {
  if (editingSession) {
    return (
      <EditSessionView 
        session={editingSession} 
        sessionId={sessionId}
        onBack={onBack} 
        onSave={onSaveEdit}
      />
    );
  }
  
  if (viewingSession) {
    return (
      <SessionDetail 
        session={viewingSession} 
        onBack={onBack}
        onEdit={() => onEditSession(viewingSession)}
      />
    );
  }

  return (
    <div className="fade-in">
      <div className="header">
        <h1>History</h1>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <p>No workouts logged yet</p>
          <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
            Complete your first workout to see it here
          </p>
        </div>
      ) : (
        <div>
          {sessions.map((session) => (
            <div 
              key={session.id} 
              className="history-item"
              onClick={() => onViewSession(session)}
            >
              <div>
                <div className="history-date">{formatDate(session.date)}</div>
                <div className="history-workout">{session.workoutName} (Day {session.cycleDay})</div>
              </div>
              <span className="history-arrow"><Icons.ChevronRight /></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Session Detail Component
function SessionDetail({ session, onBack, onEdit }) {
  const workout = WORKOUTS[session.workoutId];

  return (
    <div className="fade-in">
      <div className="header">
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <h2 className="header-title">{session.workoutName}</h2>
        <button className="btn btn-ghost btn-sm" onClick={onEdit}>
          <Icons.Edit />
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div className="form-label">Date</div>
            <div className="mono">{formatDate(session.date)}</div>
          </div>
          <div>
            <div className="form-label">Cycle Day</div>
            <div className="mono">{session.cycleDay}</div>
          </div>
        </div>
      </div>

      {workout?.coreExercises.map((exercise) => {
        const data = session.exercises?.[exercise.id];
        if (!data) return null;

        return (
          <div key={exercise.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className={`exercise-name ${exercise.isPR ? 'pr' : ''}`} style={{ fontSize: '0.95rem' }}>
                  {exercise.name}
                </div>
                {data.variation && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {data.variation}
                  </div>
                )}
              </div>
              {exercise.isPR && <span className="pr-badge">PR</span>}
            </div>
            <div className="mono" style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
              {exercise.isSuperset
                ? data.sets.map((s, i) => 
                    s.exercises ? s.exercises.map((e, j) => `${e.weight || '?'}×${e.reps || '?'}`).join(' + ') : null
                  ).filter(Boolean).join(' | ')
                : exercise.isMechanicalDropSet
                  ? data.sets.map((s, i) => 
                      s.weight ? `${s.weight}lb: ${s.phases?.join('/')}` : null
                    ).filter(Boolean).join(' | ')
                  : data.sets.map((s, i) => 
                      s.weight || s.reps ? `${s.weight || '?'}×${s.reps || '?'}` : null
                    ).filter(Boolean).join(' / ') || 'No data recorded'
              }
            </div>
            {data.exerciseNotes && (
              <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {data.exerciseNotes}
              </div>
            )}
          </div>
        );
      })}

      {session.notes && (
        <div className="card">
          <div className="form-label">Session Notes</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
            {session.notes}
          </p>
        </div>
      )}
    </div>
  );
}

// Edit Session View Component
function EditSessionView({ session, sessionId, onBack, onSave }) {
  const workout = WORKOUTS[session.workoutId];
  const [editData, setEditData] = useState(JSON.parse(JSON.stringify(session)));
  const [saving, setSaving] = useState(false);

  const updateField = (path, value) => {
    setEditData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, session: editData }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save');
      }
      
      onSave();
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="header">
        <button className="btn btn-ghost" onClick={onBack}>← Cancel</button>
        <h2 className="header-title">Edit Session</h2>
        <button 
          className="btn btn-primary btn-sm" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '...' : 'Save'}
        </button>
      </div>

      {/* Date */}
      <div className="form-group">
        <label className="form-label">Date</label>
        <input 
          type="date"
          value={editData.date}
          onChange={(e) => updateField('date', e.target.value)}
        />
      </div>

      {/* Exercises */}
      {workout?.coreExercises.map((exercise) => {
        const data = editData.exercises?.[exercise.id];
        if (!data) return null;

        return (
          <div key={exercise.id} className="card">
            <div className={`exercise-name ${exercise.isPR ? 'pr' : ''}`} style={{ marginBottom: '12px' }}>
              {exercise.name}
              {exercise.isPR && <span className="pr-badge" style={{ marginLeft: '8px' }}>PR</span>}
            </div>

            {exercise.isSuperset ? (
              // Superset edit
              data.sets.map((set, setIdx) => (
                <div key={setIdx} style={{ marginBottom: '12px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Set {setIdx + 1}</div>
                  {exercise.supersetExercises.map((ssEx, exIdx) => (
                    <div key={exIdx} style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{ssEx.name}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input 
                          type="number"
                          className="set-input"
                          placeholder="Weight"
                          value={set.exercises?.[exIdx]?.weight || ''}
                          onChange={(e) => updateField(`exercises.${exercise.id}.sets.${setIdx}.exercises.${exIdx}.weight`, e.target.value)}
                        />
                        <input 
                          type="number"
                          className="set-input"
                          placeholder="Reps"
                          value={set.exercises?.[exIdx]?.reps || ''}
                          onChange={(e) => updateField(`exercises.${exercise.id}.sets.${setIdx}.exercises.${exIdx}.reps`, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : exercise.isMechanicalDropSet ? (
              // Mechanical drop set edit
              data.sets.map((set, setIdx) => (
                <div key={setIdx} style={{ marginBottom: '12px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span>Set {setIdx + 1}</span>
                    <input 
                      type="number"
                      className="set-input"
                      placeholder="Weight"
                      value={set.weight || ''}
                      onChange={(e) => updateField(`exercises.${exercise.id}.sets.${setIdx}.weight`, e.target.value)}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {exercise.dropSetPhases.map((phase, phaseIdx) => (
                      <div key={phaseIdx}>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{phase}</label>
                        <input 
                          type="number"
                          className="set-input"
                          placeholder="reps"
                          value={set.phases?.[phaseIdx] || ''}
                          onChange={(e) => {
                            const newPhases = [...(set.phases || [])];
                            newPhases[phaseIdx] = e.target.value;
                            updateField(`exercises.${exercise.id}.sets.${setIdx}.phases`, newPhases);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              // Regular sets edit
              <>
                <div className="set-row" style={{ marginBottom: '4px' }}>
                  <span></span>
                  <span className="form-label" style={{ textAlign: 'center', margin: 0 }}>Weight</span>
                  <span className="form-label" style={{ textAlign: 'center', margin: 0 }}>Reps</span>
                </div>
                {data.sets.map((set, idx) => (
                  <div key={idx} className="set-row">
                    <span className="set-number">{idx + 1}</span>
                    <input 
                      type="number"
                      className="set-input"
                      value={set.weight || ''}
                      onChange={(e) => updateField(`exercises.${exercise.id}.sets.${idx}.weight`, e.target.value)}
                    />
                    <input 
                      type="number"
                      className="set-input"
                      value={set.reps || ''}
                      onChange={(e) => updateField(`exercises.${exercise.id}.sets.${idx}.reps`, e.target.value)}
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })}

      {/* Session Notes */}
      <div className="form-group">
        <label className="form-label">Session Notes</label>
        <textarea 
          className="notes-input"
          value={editData.notes || ''}
          onChange={(e) => updateField('notes', e.target.value)}
        />
      </div>

      <button 
        className="btn btn-primary btn-block"
        onClick={handleSave}
        disabled={saving}
        style={{ marginBottom: '24px' }}
      >
        {saving ? 'Saving...' : '💾 Save Changes'}
      </button>
    </div>
  );
}

// Utility function
function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}
