
import React, { useState, useEffect } from 'react';
import { Goal, LogEntry } from '../types';

interface TrackerProps {
  goals: Goal[];
  onAddLog: (log: LogEntry) => void;
  editingLog?: LogEntry | null;
  onCancelEdit?: () => void;
}

const Tracker: React.FC<TrackerProps> = ({ goals, onAddLog, editingLog, onCancelEdit }) => {
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [selectedMoveId, setSelectedMoveId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [activity, setActivity] = useState('');
  const [isMilestone, setIsMilestone] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (editingLog) {
      setSelectedGoalId(editingLog.goalId);
      setSelectedMoveId(editingLog.moveId);
      setDate(editingLog.date);
      setHours(editingLog.hours);
      setMinutes(editingLog.minutes);
      setActivity(editingLog.activityDescription);
      setIsMilestone(editingLog.isMilestone || false);
    }
  }, [editingLog]);

  const selectedGoal = goals.find(g => g.id === selectedGoalId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId || !selectedMoveId || (hours === 0 && minutes === 0)) return;

    const newLog: LogEntry = {
      id: editingLog ? editingLog.id : crypto.randomUUID(),
      goalId: selectedGoalId,
      moveId: selectedMoveId,
      date,
      hours,
      minutes,
      activityDescription: activity,
      isMilestone,
    };

    onAddLog(newLog);
    
    if (!editingLog) {
      setHours(0);
      setMinutes(0);
      setActivity('');
      setIsMilestone(false);
    }
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border relative ${editingLog ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          {editingLog ? 'Update Activity' : 'Activity Tracker'}
        </h2>
        
        {showSuccess && (
          <div className="absolute top-4 right-6 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 animate-bounce border border-emerald-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Activity Logged!
          </div>
        )}

        {editingLog && (
          <button onClick={onCancelEdit} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider">
            Cancel Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Goal</label>
            <select
              value={selectedGoalId}
              onChange={(e) => {
                setSelectedGoalId(e.target.value);
                setSelectedMoveId('');
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Choose a Goal...</option>
              {goals.map(g => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Major Move</label>
            <select
              value={selectedMoveId}
              onChange={(e) => setSelectedMoveId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={!selectedGoalId}
              required
            >
              <option value="">Choose a Move...</option>
              {selectedGoal?.majorMoves.map(m => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hours</label>
            <input
              type="number"
              min="0"
              value={hours}
              onChange={(e) => setHours(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Minutes</label>
            <input
              type="number"
              min="0"
              max="59"
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Activity Description</label>
          <input
            type="text"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="What exactly did you do?"
          />
        </div>

        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <input
            type="checkbox"
            id="milestone"
            checked={isMilestone}
            onChange={(e) => setIsMilestone(e.target.checked)}
            className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
          />
          <label htmlFor="milestone" className="text-sm font-semibold text-slate-700 cursor-pointer">
            Mark this activity as a Major Milestone achievement
          </label>
        </div>

        <button
          type="submit"
          className={`w-full py-3 text-white rounded-lg font-bold transition shadow-lg flex justify-center items-center gap-2 ${
            editingLog ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
          }`}
        >
          {editingLog ? 'Save Changes' : 'Log Activity'}
        </button>
      </form>
    </div>
  );
};

export default Tracker;
