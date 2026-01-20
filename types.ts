
export interface MajorMove {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  startDate: string;
  targetDate: string;
  majorMoves: MajorMove[];
  isAchieved?: boolean;
}

export interface LogEntry {
  id: string;
  goalId: string;
  moveId: string;
  date: string;
  hours: number;
  minutes: number;
  activityDescription: string;
  isMilestone?: boolean;
}

export type TimeView = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'total';
