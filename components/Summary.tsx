
import React, { useMemo, useState } from 'react';
import { Goal, LogEntry, TimeView } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SummaryProps {
  goals: Goal[];
  logs: LogEntry[];
  onDeleteLog: (id: string) => void;
  onEditLog: (log: LogEntry) => void;
}

const Summary: React.FC<SummaryProps> = ({ goals, logs, onDeleteLog, onEditLog }) => {
  const [view, setView] = useState<TimeView>('total');
  
  // Filter States
  const [goalFilter, setGoalFilter] = useState<string>('all');
  const [moveFilter, setMoveFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [quarterFilter, setQuarterFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [showMilestonesOnly, setShowMilestonesOnly] = useState(false);
  const [showAchievedOnly, setShowAchievedOnly] = useState(false);

  const getQuarter = (dateStr: string) => {
    const month = new Date(dateStr).getMonth();
    return Math.floor(month / 3) + 1;
  };

  const filterOptions = useMemo(() => {
    const months = new Set<string>();
    const quarters = new Set<string>();
    const years = new Set<string>();

    logs.forEach(log => {
      months.add(log.date.substring(0, 7));
      quarters.add(`Q${getQuarter(log.date)}`);
      years.add(new Date(log.date).getFullYear().toString());
    });

    let movesToShow: { id: string, title: string }[] = [];
    if (goalFilter === 'all') {
      const uniqueMoveTitles = new Set<string>();
      goals.forEach(g => g.majorMoves.forEach(m => uniqueMoveTitles.add(m.title)));
      movesToShow = Array.from(uniqueMoveTitles).map(title => ({ id: title, title }));
    } else {
      const selectedGoal = goals.find(g => g.id === goalFilter);
      movesToShow = selectedGoal?.majorMoves.map(m => ({ id: m.id, title: m.title })) || [];
    }

    return {
      months: Array.from(months).sort().reverse(),
      quarters: Array.from(quarters).sort(),
      years: Array.from(years).sort().reverse(),
      moves: movesToShow
    };
  }, [logs, goals, goalFilter]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const goal = goals.find(g => g.id === log.goalId);
      const matchGoal = goalFilter === 'all' || log.goalId === goalFilter;
      let matchMove = moveFilter === 'all';
      if (!matchMove) {
        if (goalFilter === 'all') {
          const move = goal?.majorMoves.find(m => m.id === log.moveId);
          matchMove = move?.title === moveFilter;
        } else {
          matchMove = log.moveId === moveFilter;
        }
      }
      const matchMonth = monthFilter === 'all' || log.date.startsWith(monthFilter);
      const matchQuarter = quarterFilter === 'all' || `Q${getQuarter(log.date)}` === quarterFilter;
      const matchYear = yearFilter === 'all' || log.date.startsWith(yearFilter);
      const matchMilestone = !showMilestonesOnly || log.isMilestone;
      const matchAchieved = !showAchievedOnly || (goal?.isAchieved || false);
      
      return matchGoal && matchMove && matchMonth && matchQuarter && matchYear && matchMilestone && matchAchieved;
    });
  }, [logs, goals, goalFilter, moveFilter, monthFilter, quarterFilter, yearFilter, showMilestonesOnly, showAchievedOnly]);

  const metrics = useMemo(() => {
    const uniqueMovesCount = new Set(filteredLogs.map(l => l.moveId)).size;
    const milestoneCount = filteredLogs.filter(l => l.isMilestone).length;

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    
    const curMonthStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;
    const prevMonthDate = new Date(curYear, curMonth - 1, 1);
    const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const getMonthHours = (monthStr: string) => {
      return logs
        .filter(l => {
          const goal = goals.find(g => g.id === l.goalId);
          const basicMatch = l.date.startsWith(monthStr) && (goalFilter === 'all' || l.goalId === goalFilter);
          const achievedMatch = !showAchievedOnly || (goal?.isAchieved || false);
          return basicMatch && achievedMatch;
        })
        .reduce((acc, l) => acc + l.hours + l.minutes / 60, 0);
    };

    const curHours = getMonthHours(curMonthStr);
    const prevHours = getMonthHours(prevMonthStr);
    const hourDiff = curHours - prevHours;
    const percentDiff = prevHours > 0 ? (hourDiff / prevHours) * 100 : 0;

    return {
      uniqueMovesCount,
      milestoneCount,
      hourDiff: parseFloat(hourDiff.toFixed(1)),
      percentDiff: parseFloat(percentDiff.toFixed(1)),
      trend: hourDiff >= 0 ? 'up' : 'down'
    };
  }, [filteredLogs, logs, goals, goalFilter, showAchievedOnly]);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ["Date", "Goal", "Major Move", "Activity", "Hours", "Minutes", "Is Milestone"];
    const rows = filteredLogs.map(log => {
      const goal = goals.find(g => g.id === log.goalId);
      const move = goal?.majorMoves.find(m => m.id === log.moveId);
      return [
        log.date,
        `"${goal?.title || 'Unknown'}"`,
        `"${move?.title || 'Unknown'}"`,
        `"${(log.activityDescription || '').replace(/"/g, '""')}"`,
        log.hours,
        log.minutes,
        log.isMilestone ? "Yes" : "No"
      ];
    });
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `goalkeeper_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    filteredLogs.forEach(log => {
      const goal = goals.find(g => g.id === log.goalId);
      if (!goal) return;
      const duration = log.hours + log.minutes / 60;
      let key = goal.title;
      if (view === 'day') key = log.date;
      else if (view === 'week') {
        const d = new Date(log.date);
        const firstDay = new Date(d.setDate(d.getDate() - d.getDay()));
        key = `W/C ${firstDay.toISOString().split('T')[0]}`;
      } else if (view === 'month') key = log.date.substring(0, 7);
      else if (view === 'quarter') key = `${new Date(log.date).getFullYear()}-Q${getQuarter(log.date)}`;
      else if (view === 'year') key = new Date(log.date).getFullYear().toString();
      dataMap[key] = (dataMap[key] || 0) + duration;
    });
    return Object.entries(dataMap)
      .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(2)) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredLogs, goals, view]);

  const totalFilteredHours = useMemo(() => {
    return filteredLogs.reduce((acc, log) => acc + log.hours + log.minutes / 60, 0).toFixed(1);
  }, [filteredLogs]);

  const resetFilters = () => {
    setGoalFilter('all');
    setMoveFilter('all');
    setMonthFilter('all');
    setQuarterFilter('all');
    setYearFilter('all');
    setShowMilestonesOnly(false);
    setShowAchievedOnly(false);
  };

  const isFiltered = goalFilter !== 'all' || moveFilter !== 'all' || monthFilter !== 'all' || quarterFilter !== 'all' || yearFilter !== 'all' || showMilestonesOnly || showAchievedOnly;
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Moves</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{metrics.uniqueMovesCount}</span>
            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Milestones</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-500">{metrics.milestoneCount}</span>
            <span className="text-xs font-bold text-amber-200">★</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">MoM Change (Time)</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-black ${metrics.trend === 'up' ? 'text-emerald-600' : 'text-rose-500'}`}>
              {metrics.hourDiff > 0 ? '+' : ''}{metrics.hourDiff}h
            </span>
            <span className="text-[10px] text-slate-400 font-medium">vs last mo.</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Effort Trend</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-black ${metrics.trend === 'up' ? 'text-emerald-600' : 'text-rose-500'}`}>
              {metrics.percentDiff > 0 ? '+' : ''}{metrics.percentDiff}%
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${metrics.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={metrics.trend === 'up' ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Achievement Summary</h2>
            <p className="text-sm text-slate-500">Filtered effort: <span className="font-bold text-indigo-600">{totalFilteredHours} hours</span></p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg self-start overflow-x-auto max-w-full">
            {(['day', 'week', 'month', 'quarter', 'year', 'total'] as TimeView[]).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1 text-[10px] md:text-xs font-semibold rounded-md transition-all whitespace-nowrap ${view === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} capitalize`}>{v}</button>
            ))}
          </div>
        </div>

        <div className="space-y-4 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter by Goal</label>
              <select value={goalFilter} onChange={(e) => { setGoalFilter(e.target.value); setMoveFilter('all'); }} className="w-full text-xs bg-white border border-slate-200 rounded-md p-2 outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option value="all">All Goals</option>
                {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter by Move</label>
              <select value={moveFilter} onChange={(e) => setMoveFilter(e.target.value)} className="w-full text-xs bg-white border border-slate-200 rounded-md p-2 outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option value="all">Any Move</option>
                {filterOptions.moves.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-600 cursor-pointer p-2 bg-white rounded-md border border-slate-200 w-full h-9">
                <input type="checkbox" checked={showMilestonesOnly} onChange={(e) => setShowMilestonesOnly(e.target.checked)} className="h-4 w-4 rounded text-indigo-600" />
                <span>Show Milestones Only</span>
              </label>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-600 cursor-pointer p-2 bg-white rounded-md border border-slate-200 w-full h-9">
                <input type="checkbox" checked={showAchievedOnly} onChange={(e) => setShowAchievedOnly(e.target.checked)} className="h-4 w-4 rounded text-emerald-600" />
                <span>Show Achieved Only</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Month</label>
              <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="w-full text-xs bg-white border border-slate-200 rounded-md p-2 outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option value="all">Any Month</option>
                {filterOptions.months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quarter</label>
              <select value={quarterFilter} onChange={(e) => setQuarterFilter(e.target.value)} className="w-full text-xs bg-white border border-slate-200 rounded-md p-2 outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option value="all">Any Quarter</option>
                {filterOptions.quarters.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Year</label>
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="w-full text-xs bg-white border border-slate-200 rounded-md p-2 outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option value="all">Any Year</option>
                {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              {isFiltered && (
                <button onClick={resetFilters} className="w-full text-[10px] font-bold text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:bg-indigo-50 rounded-md p-2 uppercase transition-colors">Clear All Filters</button>
              )}
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} unit="h" />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <p className="text-sm">No activity matches these filters.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-800">Detailed Activity Log</h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">{filteredLogs.length} entries</span>
          </div>
          <button 
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-colors border border-emerald-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to Sheets
          </button>
        </div>

        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-100">
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Goal / Move</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Activity</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.sort((a,b) => b.date.localeCompare(a.date)).map((log) => {
                  const goal = goals.find(g => g.id === log.goalId);
                  const move = goal?.majorMoves.find(m => m.id === log.moveId);
                  return (
                    <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{log.date}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-800">
                          {goal?.title}
                          {goal?.isAchieved && (
                            <span className="ml-2 text-[8px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded uppercase font-black">Achieved</span>
                          )}
                        </div>
                        <div className="text-xs text-indigo-500 font-medium">{move?.title}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          {log.isMilestone && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-700 uppercase border border-amber-200">
                              ★ Milestone
                            </span>
                          )}
                          <span className="truncate max-w-[200px]">{log.activityDescription || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">{log.hours}h {log.minutes}m</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => onEditLog(log)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition" title="Edit Log">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.707.707-2.828-2.828.707-.707zM11.36 6.75l2.828 2.828-7.328 7.328a4 4 0 01-1.207.879l-3.203 1.355a.5.5 0 01-.652-.652l1.355-3.203a4 4 0 01.879-1.207L11.36 6.75z" />
                            </svg>
                          </button>
                          <button onClick={() => onDeleteLog(log.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition" title="Delete Log">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">No entries found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Summary;
