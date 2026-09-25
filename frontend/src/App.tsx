import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Operations from './pages/Operations';
import Settings from './pages/Settings'; 

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = useStore((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

// --- ГЛОБАЛЬНЫЕ УВЕДОМЛЕНИЯ ---
const GlobalNotifications = () => {
  const { token, sound, setUserData } = useStore();
  const navigate = useNavigate();
  const [toast, setToast] = useState<{title: string, message: string, transactionId?: string} | null>(null);

  const playNotificationSound = (type: string) => {
    if (type === 'off') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);

      if (type === 's1') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
      } else if (type === 's2') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.02); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(); osc.stop(ctx.currentTime + 0.1);
      } else if (type === 's3') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(600, ctx.currentTime); osc.frequency.setValueAtTime(800, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.15); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.log('Звук заблокирован');
    }
  };

  const fetchDashboardBg = async () => {
    try {
      const response = await fetch('https://nxt-d-bank-backend.onrender.com/api/bank/dashboard', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) setUserData(await response.json());
    } catch (error) {}
  };

  useEffect(() => { 
    if (token) {
      const sse = new EventSource(`https://nxt-d-bank-backend.onrender.com/api/bank/stream?token=${token}`);
      sse.onmessage = (event) => {
        const data = JSON.parse(event.data);
        playNotificationSound(sound || 's1');
        setToast({ title: data.title, message: data.message, transactionId: data.transactionId });
        setTimeout(() => setToast(null), 5000);
        fetchDashboardBg();
      };
      return () => sse.close();
    }
  }, [token, sound]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div 
          onClick={() => { setToast(null); navigate(toast.transactionId ? '/history' : '/history', { state: { openTxId: toast.transactionId } }); }}
          initial={{ opacity: 0, y: -50, scale: 0.9 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }} 
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4 min-w-[320px] cursor-pointer hover:scale-[1.02] transition-transform"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0"><Bell className="w-5 h-5" /></div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{toast.title}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{toast.message}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setToast(null); }} className="ml-auto p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"><X className="w-4 h-4"/></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function App() {
  const theme = useStore((state) => state.theme);
  const token = useStore((state) => state.token);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100">
        <GlobalNotifications />
        <Routes>
          <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><Operations /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;