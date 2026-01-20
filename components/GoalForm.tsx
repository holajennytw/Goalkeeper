
import React, { useState } from 'react';
import { Goal, MajorMove } from '../types';

interface GoalFormProps {
  onAddGoal: (goal: Goal) => void;
}

const GoalForm: React.FC<GoalFormProps> = ({ onAddGoal }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState('');
  const [moves, setMoves] = useState<string[]>(['']);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddMoveInput = () => {
    setMoves([...moves, '']);
  };

  const handleMoveChange = (index: number, value: string) => {
    const newMoves = [...moves];
    newMoves[index] = value;
    setMoves(newMoves);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetDate || !startDate) return;

    const majorMoves: MajorMove[] = moves
      .filter(m => m.trim() !== '')
      .map(m => ({
        id: crypto.randomUUID(),
        title: m,
        description: '',
        isCompleted: false,
      }));

    const newGoal: Goal = {
      id: crypto.randomUUID(),
      title,
      description,
      startDate,
      targetDate,
      majorMoves,
      isAchieved: false
    };

    onAddGoal(newGoal);
    setTitle('');
    setDescription('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setTargetDate('');
    setMoves(['']);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Set a New Goal</h2>
      
      {showSuccess && (
        <div className="absolute top-4 right-6 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 animate-bounce border border-emerald-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Goal Saved Successfully!
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Goal Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
            placeholder="e.g., Master React"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
            placeholder="What does success look like?"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target Date</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Major Moves</label>
          <div className="space-y-2">
            {moves.map((move, index) => (
              <input
                key={index}
                type="text"
                value={move}
                onChange={(e) => handleMoveChange(index, e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                placeholder={`Move #${index + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddMoveInput}
            className="mt-2 text-sm text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1"
          >
            <span className="text-lg">+</span> Add another move
          </button>
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
        >
          Create Goal
        </button>
      </div>
    </form>
  );
};

export default GoalForm;
