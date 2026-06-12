import React, { useState, useEffect } from 'react';
import { getDatabase } from './db/localDb';
import { initSyncManager } from './sync/syncManager';
import { useStore } from './store/useStore';
import Billing from './components/Billing';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { setDb } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        const database = await getDatabase();
        
        // Save database instance to Zustand store
        setDb(database);

        // Initialize real-time synchronization manager
        initSyncManager(database);

        setLoading(false);
      } catch (err: any) {
        console.error('Failed to initialize database:', err);
        setError('Error initializing database: ' + err.message);
        setLoading(false);
      }
    };

    initApp();
  }, [setDb]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-100 font-sans">
        <Loader2 className="icon-spin text-indigo-500 mb-4 animate-spin" size={48} />
        <p className="text-lg font-medium text-slate-200">
          Initializing Offline Database Engine (TS + Zustand)...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-100 p-6 text-center font-sans">
        <h2 className="text-rose-500 text-xl font-bold mb-3">Database Connection Error</h2>
        <p className="text-slate-400 text-sm max-w-md">{error}</p>
      </div>
    );
  }

  return <Billing />;
}
