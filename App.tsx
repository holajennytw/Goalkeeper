
import React, { useState, useEffect, useMemo } from 'react';
import { Goal, LogEntry } from './types';
import GoalForm from './components/GoalForm';
import Tracker from './components/Tracker';
import Summary from './components/Summary';
import EditGoalModal from './components/EditGoalModal';
import ConfirmationModal from './components/ConfirmationModal';
import { DB } from './services/db';

const App: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'goals' | 'tracker' | 'summary'>('goals');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local'>('local');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showDbSetup, setShowDbSetup] = useState(false);
  const [goalGroupFilter, setGoalGroupFilter] = useState<'all' | 'ongoing' | 'achieved'>('all');
  
  const [dbUrl, setDbUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [dbKey, setDbKey] = useState(localStorage.getItem('supabase_key') || '');
  
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'goal' | 'log' } | null>(null);

  useEffect(() => {
    const initData = async () => {
      const client = DB.getClient();
      if (!client) {
        setSyncStatus('local');
        const [lg, ll] = [await DB.loadGoals(), await DB.loadLogs()];
        setGoals(lg);
        setLogs(ll);
        setIsInitialLoading(false);
        return;
      }

      setSyncStatus('syncing');
      try {
        const [loadedGoals, loadedLogs] = await Promise.all([DB.loadGoals(), DB.loadLogs()]);
        setGoals(loadedGoals || []);
        setLogs(loadedLogs || []);
        setSyncStatus('synced');
      } catch (error) {
        console.error("Failed to load data from Supabase:", error);
        setSyncStatus('error');
      } finally {
        setIsInitialLoading(false);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    if (isInitialLoading) return;

    const syncData = async () => {
      const client = DB.getClient();
      if (!client) {
        setSyncStatus('local');
        await Promise.all([DB.saveGoals(goals), DB.saveLogs(logs)]);
        return;
      }

      setSyncStatus('syncing');
      try {
        await Promise.all([DB.saveGoals(goals), DB.saveLogs(logs)]);
        setSyncStatus('synced');
      } catch (error) {
        console.error("Failed to sync to Supabase:", error);
        setSyncStatus('error');
      }
    };
    const timeoutId = setTimeout(syncData, 1500);
    return () => clearTimeout(timeoutId);
  }, [goals, logs, isInitialLoading]);

  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => {
      if (a.isAchieved === b.isAchieved) return 0;
      return a.isAchieved ? 1 : -1;
    });
  }, [goals]);

  const ongoingGoals = useMemo(() => {
    return goals.filter(g => !g.isAchieved);
  }, [goals]);

  const achievedGoals = useMemo(() => {
    return goals.filter(g => g.isAchieved);
  }, [goals]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    DB.setCredentials(dbUrl, dbKey);
  };

  const addGoal = (goal: Goal) => {
    setGoals(prev => [...prev, goal]);
  };

  const updateGoal = (updatedGoal: Goal) => {
    setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
    setEditingGoal(null);
  };

  const addOrUpdateLog = (log: LogEntry) => {
    setLogs(prev => {
      const exists = prev.find(l => l.id === log.id);
      if (exists) {
        return prev.map(l => l.id === log.id ? log : l);
      }
      return [...prev, log];
    });
    setEditingLog(null);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'goal') {
      setGoals(prev => prev.filter(g => g.id !== itemToDelete.id));
      setLogs(prev => prev.filter(l => l.goalId !== itemToDelete.id));
    } else if (itemToDelete.type === 'log') {
      setLogs(prev => prev.filter(l => l.id !== itemToDelete.id));
    }
    setItemToDelete(null);
  };

  const getCountdown = (targetDate: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(targetDate);
    const targetNormalized = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    
    const diffTime = targetNormalized.getTime() - today.getTime();
    const diffDaysTotal = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDaysTotal < 0) return "overdue";
    if (diffDaysTotal === 0) return "due today";
    
    const months = Math.floor(diffDaysTotal / 30);
    const days = diffDaysTotal % 30;
    
    if (months > 0) {
      const monthPart = `${months} ${months === 1 ? 'month' : 'months'}`;
      const dayPart = days > 0 ? `, ${days} ${days === 1 ? 'day' : 'days'}` : '';
      return `${monthPart}${dayPart} left`;
    }
    return `${days} ${days === 1 ? 'day' : 'days'} left`;
  };

  const getTimeSpent = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffTime = end.getTime() - start.getTime();
    const diffDaysTotal = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    const months = Math.floor(diffDaysTotal / 30);
    const days = diffDaysTotal % 30;
    
    if (months > 0) {
      return `Achieved in ${months} ${months === 1 ? 'month' : 'months'}${days > 0 ? `, ${days} ${days === 1 ? 'day' : 'days'}` : ''}`;
    }
    return `Achieved in ${diffDaysTotal} ${diffDaysTotal === 1 ? 'day' : 'days'}`;
  };

  const renderGoalCard = (goal: Goal) => {
    const countdown = getCountdown(goal.targetDate);
    const isOverdue = countdown === "overdue";
    
    return (
      <div 
        key={goal.id} 
        className={`bg-white p-6 rounded-xl shadow-sm border transition-all ${
          goal.isAchieved 
            ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-300' 
            : 'border-slate-200 hover:border-indigo-200'
        }`}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`text-xl font-bold ${goal.isAchieved ? 'text-emerald-700' : 'text-slate-800'}`}>{goal.title}</h4>
              {goal.isAchieved && (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border border-emerald-200 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Achieved
                </span>
              )}
            </div>
            <p className={`text-sm mb-3 ${goal.isAchieved ? 'text-emerald-800/80' : 'text-slate-500'}`}>{goal.description}</p>
            
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Start:</span>
                <span className="text-[10px] font-bold text-slate-600">{new Date(goal.startDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Target:</span>
                <span className="text-[10px] font-bold text-slate-600">{new Date(goal.targetDate).toLocaleDateString()}</span>
              </div>
              {goal.isAchieved && goal.achieveDate && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase">Achieved:</span>
                    <span className="text-[10px] font-bold text-emerald-700">{new Date(goal.achieveDate).toLocaleDateString()}</span>
                  </div>
                  <div className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-black tracking-tight shadow-sm">
                    {getTimeSpent(goal.startDate, goal.achieveDate)}
                  </div>
                </>
              )}
              {!goal.isAchieved && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-tight shadow-sm border ${isOverdue ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  {countdown}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditingGoal(goal)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Edit Goal">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.707.707-2.828-2.828.707-.707zM11.36 6.75l2.828 2.828-7.328 7.328a4 4 0 01-1.207.879l-3.203 1.355a.5.5 0 01-.652-.652l1.355-3.203a4 4 0 01.879-1.207L11.36 6.75z" /></svg>
            </button>
            <button onClick={() => setItemToDelete({ id: goal.id, type: 'goal' })} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Delete Goal">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {goal.majorMoves.map(move => {
            const isInitiated = logs.some(l => l.goalId === goal.id && l.moveId === move.id);
            return (
              <div key={move.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isInitiated ? (goal.isAchieved ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm' : 'bg-indigo-50 border-indigo-100 text-indigo-900 shadow-sm') : (goal.isAchieved ? 'bg-slate-200/70 border-slate-300 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-500')}`}>
                <div className={`h-2 w-2 rounded-full ${isInitiated ? (goal.isAchieved ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.4)]') : 'bg-slate-300'}`} />
                <span className="text-sm font-medium">{move.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const startEditLog = (log: LogEntry) => {
    setEditingLog(log);
    setActiveTab('tracker');
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-bold animate-pulse">Initializing GoalKeeper...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <header className="bg-indigo-700 text-white pt-8 pb-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight">GoalKeeper Pro</h1>
              <button 
                onClick={() => setShowDbSetup(true)}
                className={`mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105 ${
                  syncStatus === 'synced' ? 'bg-emerald-500/20 text-emerald-300' : 
                  syncStatus === 'syncing' ? 'bg-amber-500/20 text-amber-300 animate-pulse' : 
                  syncStatus === 'local' ? 'bg-slate-500/20 text-slate-300' : 'bg-red-500/20 text-red-300'
                }`}
              >
                <div className={`h-1.5 w-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-400' : syncStatus === 'syncing' ? 'bg-amber-400' : syncStatus === 'local' ? 'bg-slate-400' : 'bg-red-400'}`} />
                {syncStatus === 'local' ? 'Offline (Click to link DB)' : syncStatus}
              </button>
            </div>
            <p className="text-indigo-100 opacity-80">Track major moves to achieve your goals.</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-indigo-600/50 p-4 rounded-xl backdrop-blur-sm border border-indigo-400/30 text-center min-w-[100px]">
              <p className="text-xs uppercase font-bold opacity-60">Goals</p>
              <p className="text-2xl font-bold">{goals.length}</p>
            </div>
            <div className="bg-indigo-600/50 p-4 rounded-xl backdrop-blur-sm border border-indigo-400/30 text-center min-w-[100px]">
              <p className="text-xs uppercase font-bold opacity-60">Logs</p>
              <p className="text-2xl font-bold">{logs.length}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 -mt-6">
        <div className="sticky bottom-4 left-0 right-0 z-50 md:relative md:bottom-auto mb-6 flex justify-center">
          <nav className="flex gap-2 bg-white p-2 rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm md:max-w-none md:w-auto">
            <button onClick={() => setActiveTab('goals')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'goals' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              <span>Goals</span>
            </button>
            <button onClick={() => { setActiveTab('tracker'); setEditingLog(null); }} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'tracker' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              <span>Track</span>
            </button>
            <button onClick={() => setActiveTab('summary')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'summary' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              <span>Stats</span>
            </button>
          </nav>
        </div>

        <div className="grid grid-cols-1 gap-6 items-start">
          {activeTab === 'goals' && (
            <>
              <GoalForm onAddGoal={addGoal} />
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <h3 className="text-xl font-bold text-slate-800">Your Goals</h3>
                  
                  {/* Toggles to group on-going goals and achieved goals */}
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setGoalGroupFilter('all')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                        goalGroupFilter === 'all'
                          ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60 font-extrabold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>All</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${goalGroupFilter === 'all' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'}`}>
                        {goals.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoalGroupFilter('ongoing')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                        goalGroupFilter === 'ongoing'
                          ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60 font-extrabold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                      <span>On-going</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${goalGroupFilter === 'ongoing' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'}`}>
                        {ongoingGoals.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoalGroupFilter('achieved')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                        goalGroupFilter === 'achieved'
                          ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/60 font-extrabold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      <span>Achieved</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${goalGroupFilter === 'achieved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                        {achievedGoals.length}
                      </span>
                    </button>
                  </div>
                </div>

                {goals.length === 0 ? (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-12 text-center text-slate-400">
                    <p>Start your journey by adding your first goal above!</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* On-going Goals Group */}
                    {(goalGroupFilter === 'all' || goalGroupFilter === 'ongoing') && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                            On-going Goals <span className="text-slate-400 font-normal">({ongoingGoals.length})</span>
                          </h4>
                        </div>

                        {ongoingGoals.length === 0 ? (
                          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 text-center text-slate-400 text-sm">
                            No on-going goals at the moment.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {ongoingGoals.map(goal => renderGoalCard(goal))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Achieved Goals Group */}
                    {(goalGroupFilter === 'all' || goalGroupFilter === 'achieved') && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                          <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-800">
                            Achieved Goals <span className="text-emerald-600/70 font-normal">({achievedGoals.length})</span>
                          </h4>
                        </div>

                        {achievedGoals.length === 0 ? (
                          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 text-center text-slate-400 text-sm">
                            No achieved goals yet. Keep making major moves!
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {achievedGoals.map(goal => renderGoalCard(goal))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'tracker' && (
            <Tracker goals={goals} onAddLog={addOrUpdateLog} editingLog={editingLog} onCancelEdit={() => { setEditingLog(null); setActiveTab('summary'); }} />
          )}

          {activeTab === 'summary' && (
            <Summary goals={goals} logs={logs} onDeleteLog={(id) => setItemToDelete({ id, type: 'log' })} onEditLog={startEditLog} />
          )}
        </div>
      </main>

      {/* DB Setup Modal */}
      {showDbSetup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <form onSubmit={handleSaveConfig}>
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-1">Supabase Connection</h3>
                <p className="text-slate-500 text-xs mb-4">Enter your Project URL and Anon Key from your Supabase dashboard settings.</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Project URL</label>
                    <input 
                      type="url" 
                      value={dbUrl} 
                      onChange={(e) => setDbUrl(e.target.value)} 
                      placeholder="https://xyz.supabase.co" 
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Anon API Key</label>
                    <input 
                      type="password" 
                      value={dbKey} 
                      onChange={(e) => setDbKey(e.target.value)} 
                      placeholder="eyJhbG..." 
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 p-4 flex gap-3">
                <button type="button" onClick={() => setShowDbSetup(false)} className="flex-1 px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">Connect & Sync</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingGoal && <EditGoalModal goal={editingGoal} onSave={updateGoal} onClose={() => setEditingGoal(null)} />}
      <ConfirmationModal
        isOpen={!!itemToDelete}
        title={itemToDelete?.type === 'goal' ? 'Delete Goal?' : 'Delete Activity?'}
        message={itemToDelete?.type === 'goal' ? 'Delete this goal and all logs?' : 'Delete this log?'}
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};

export default App;
