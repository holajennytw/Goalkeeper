
import React, { useState } from 'react';
import { Goal, MajorMove } from '../types';

interface EditGoalModalProps {
  goal: Goal;
  onSave: (updatedGoal: Goal) => void;
  onClose: () => void;
}

const EditGoalModal: React.FC<EditGoalModalProps> = ({ goal, onSave, onClose }) => {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description);
  const [startDate, setStartDate] = useState(goal.startDate || new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState(goal.targetDate);
  const [isAchieved, setIsAchieved] = useState(goal.isAchieved || false);
  const [moves, setMoves] = useState<MajorMove[]>(goal.majorMoves);

  const handleMoveChange = (id: string, value: string) => {
    setMoves(moves.map(m => m.id === id ? { ...m, title: value } : m));
  };

  const handleAddMove = () => {
    setMoves([...moves, { id: crypto.randomUUID(), title: '', description: '', isCompleted: false }]);
  };

  const handleRemoveMove = (id: string) => {
    setMoves(moves.filter(m => m.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...goal,
      title,
      description,
      startDate,
      targetDate,
      isAchieved,
      majorMoves: moves.filter(m => m.title.trim() !== '')
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Edit Goal</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Goal Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
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
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
            <input
              type="checkbox"
              id="isAchieved"
              checked={isAchieved}
              onChange={(e) => setIsAchieved(e.target.checked)}
              className="h-5 w-5 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <label htmlFor="isAchieved" className="text-sm font-bold text-emerald-800 cursor-pointer">
              Goal Achieved & Completed
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Major Moves</label>
            <div className="space-y-2">
              {moves.map((move) => (
                <div key={move.id} className="flex gap-2">
                  <input
                    type="text"
                    value={move.title}
                    onChange={(e) => handleMoveChange(move.id, e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Move title"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveMove(move.id)}
                    className="p-2 text-red-400 hover:text-red-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddMove}
              className="mt-2 text-sm text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1"
            >
              + Add move
            </button>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditGoalModal;
