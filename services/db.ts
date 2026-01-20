
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Goal, LogEntry } from '../types';

const getCredentials = () => {
  const storedUrl = localStorage.getItem('supabase_url');
  const storedKey = localStorage.getItem('supabase_key');
  
  return {
    url: (process.env as any).SUPABASE_URL || storedUrl || '',
    key: (process.env as any).SUPABASE_ANON_KEY || storedKey || ''
  };
};

const initClient = (): SupabaseClient | null => {
  const { url, key } = getCredentials();
  if (url && key) {
    try {
      return createClient(url, key);
    } catch (e) {
      console.error("Supabase init error", e);
      return null;
    }
  }
  return null;
};

const TABLE_NAME = 'goalkeeper_storage';

export const DB = {
  getClient: initClient,
  
  setCredentials(url: string, key: string) {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
    window.location.reload(); // Reload to re-init client
  },

  async saveGoals(goals: Goal[]): Promise<void> {
    const client = initClient();
    if (!client) {
      localStorage.setItem('goalkeeper_goals', JSON.stringify(goals));
      return;
    }
    
    const { error } = await client
      .from(TABLE_NAME)
      .upsert({ id: 'goals', data: goals }, { onConflict: 'id' });
    
    if (error) throw error;
  },

  async saveLogs(logs: LogEntry[]): Promise<void> {
    const client = initClient();
    if (!client) {
      localStorage.setItem('goalkeeper_logs', JSON.stringify(logs));
      return;
    }

    const { error } = await client
      .from(TABLE_NAME)
      .upsert({ id: 'logs', data: logs }, { onConflict: 'id' });

    if (error) throw error;
  },

  async loadGoals(): Promise<Goal[]> {
    const client = initClient();
    if (!client) {
      const saved = localStorage.getItem('goalkeeper_goals');
      return saved ? JSON.parse(saved) : [];
    }

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('data')
      .eq('id', 'goals')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.data || [];
  },

  async loadLogs(): Promise<LogEntry[]> {
    const client = initClient();
    if (!client) {
      const saved = localStorage.getItem('goalkeeper_logs');
      return saved ? JSON.parse(saved) : [];
    }

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('data')
      .eq('id', 'logs')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.data || [];
  }
};
