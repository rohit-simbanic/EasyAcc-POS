import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export const PwaInstallBanner: React.FC = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Hide inside Electron wrapper
    const isElectron = !!(window as any).electronAPI || navigator.userAgent.toLowerCase().includes('electron');
    if (isElectron) return;

    // Check if user dismissed it in this browser session/local storage
    const dismissed = localStorage.getItem('easyacc_pwa_dismissed') === 'true';
    if (dismissed) return;

    // Check if the event is already available
    if ((window as any).deferredPrompt) {
      setCanInstall(true);
      // Delay slightly for smooth entrance
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }

    const handleCanInstall = () => {
      setCanInstall(true);
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    };

    window.addEventListener('pwa-can-install', handleCanInstall);
    return () => {
      window.removeEventListener('pwa-can-install', handleCanInstall);
    };
  }, []);

  const handleInstall = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) return;

    // Trigger the standard PWA prompt
    promptEvent.prompt();

    // Wait for response
    const { outcome } = await promptEvent.userChoice;
    console.log(`User prompt choice outcome: ${outcome}`);

    // Clean up
    (window as any).deferredPrompt = null;
    setCanInstall(false);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('easyacc_pwa_dismissed', 'true');
    setVisible(false);
  };

  if (!canInstall || !visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-[340px] bg-slate-900/90 backdrop-blur-md border border-slate-800 p-4 rounded-xl shadow-2xl flex gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
      <div className="w-10 h-10 bg-indigo-900/60 text-indigo-400 rounded-lg flex items-center justify-center shrink-0 border border-indigo-500/20">
        <Download size={20} className="animate-bounce" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Install EasyACC App</h4>
          <button 
            onClick={handleDismiss}
            className="text-slate-500 hover:text-slate-300 transition -mt-1 -mr-1"
          >
            <X size={14} />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
          Access the sales checkout terminal directly from your desktop or home screen with offline support and custom shortcuts.
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-[10px] font-bold text-white rounded transition-all shadow-md"
          >
            Install Now
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-[10px] font-bold text-slate-300 rounded transition"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};
