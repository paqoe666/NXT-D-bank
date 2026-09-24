import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { LogOut, CreditCard, History, Settings as SettingsIcon, Moon, Sun, Globe, DollarSign, Lock, CheckCircle2, Crown, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const translations = {
  ru: {
    dash: 'Главная', hist: 'Операции', set: 'Настройки',
    title: 'Настройки', pref: 'Предпочтения', theme: 'Оформление', themeDesc: 'Светлая/Тёмная тема',
    lang: 'Язык', langDesc: 'Основной язык', curr: 'Валюта', currDesc: 'По умолчанию',
    sound: 'Звук уведомлений', soundDesc: 'Мелодия при переводах',
    s1: 'Звоночек', s2: 'Мягкий клик', s3: 'Двойной сигнал', off: 'Без звука',
    sec: 'Безопасность', oldPass: 'Текущий пароль', newPass: 'Новый пароль', confPass: 'Повторите новый пароль',
    updPass: 'Обновить пароль', logout: 'Выйти из аккаунта', ceo: 'Панель CEO', passMatchErr: 'Пароли не совпадают', passSuccess: 'Успешно'
  },
  en: {
    dash: 'Dashboard', hist: 'History', set: 'Settings',
    title: 'Settings', pref: 'Preferences', theme: 'Appearance', themeDesc: 'Light/Dark mode',
    lang: 'Language', langDesc: 'Main language', curr: 'Currency', currDesc: 'Default currency',
    sound: 'Notification Sound', soundDesc: 'Transfer alert melody',
    s1: 'Chime', s2: 'Soft Pop', s3: 'Double Beep', off: 'Muted',
    sec: 'Security', oldPass: 'Current password', newPass: 'New password', confPass: 'Confirm new password',
    updPass: 'Update password', logout: 'Sign out', ceo: 'CEO Panel', passMatchErr: 'Passwords do not match', passSuccess: 'Success'
  },
  es: {
    dash: 'Inicio', hist: 'Operaciones', set: 'Ajustes',
    title: 'Ajustes', pref: 'Preferencias', theme: 'Apariencia', themeDesc: 'Modo claro/oscuro',
    lang: 'Idioma', langDesc: 'Idioma principal', curr: 'Moneda', currDesc: 'Moneda predeterminada',
    sound: 'Sonido de notif.', soundDesc: 'Melodía de alerta',
    s1: 'Campana', s2: 'Clic suave', s3: 'Doble pitido', off: 'Silenciado',
    sec: 'Seguridad', oldPass: 'Contraseña actual', newPass: 'Nueva contraseña', confPass: 'Confirmar contraseña',
    updPass: 'Actualizar contraseña', logout: 'Cerrar sesión', ceo: 'Panel CEO', passMatchErr: 'Las contraseñas no coinciden', passSuccess: 'Éxito'
  }
};

export default function Settings() {
  const { token, userData, setUserData, logout, theme, setTheme, language, setLanguage, sound, setSound } = useStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('RUB');
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [passStatus, setPassStatus] = useState('');
  
  const [ceoPhone, setCeoPhone] = useState('');
  const [ceoAmount, setCeoAmount] = useState('');
  const [ceoStatus, setCeoStatus] = useState('');

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isCurrOpen, setIsCurrOpen] = useState(false);
  const [isSoundOpen, setIsSoundOpen] = useState(false);

  let userRole = 'user';
  if (token) {
    try { userRole = JSON.parse(atob(token.split('.')[1])).role; } catch (e) {}
  }

  const t = translations[language] || translations.ru;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/bank/dashboard', { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
          setCurrency(data.account?.currency || 'RUB');
        } else handleLogout();
      } catch (error) { console.error('Ошибка', error); } finally { setLoading(false); }
    };
    if (token) fetchData();
  }, [token]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleCurrencyChange = async (newCurr: string) => {
    setCurrency(newCurr); setIsCurrOpen(false);
    if (userData) setUserData({ ...userData, account: { ...userData.account, currency: newCurr } });
    try { await fetch('http://localhost:5001/api/bank/currency', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ currency: newCurr }) }); } catch (error) {}
  };

  const playTestSound = (type: string) => {
    if (type === 'off') return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) { setPassStatus(t.passMatchErr); return; }
    setPassStatus('...');
    try {
      const response = await fetch('http://localhost:5001/api/bank/password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ oldPassword: passwordForm.old, newPassword: passwordForm.new }) });
      const data = await response.json();
      if (response.ok) { setPassStatus('ok'); setTimeout(() => { setPassStatus(''); setPasswordForm({ old: '', new: '', confirm: '' }); }, 2000); } else { setPassStatus(data.message || 'Error'); }
    } catch (error) { setPassStatus('Error'); }
  };

  const handleCeoDeposit = async (e: React.FormEvent) => {
    e.preventDefault(); setCeoStatus('...');
    try {
      const response = await fetch('http://localhost:5001/api/bank/deposit', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ targetPhone: ceoPhone, amount: Number(ceoAmount) }) });
      if (response.ok) { setCeoStatus(`OK!`); setCeoPhone(''); setCeoAmount(''); setTimeout(() => setCeoStatus(''), 3000); } else setCeoStatus('Error');
    } catch (error) { setCeoStatus('Error'); }
  };

  if (loading || !userData) return <div className="min-h-screen bg-[#F3F6F8] dark:bg-slate-900 flex items-center justify-center"><div className="animate-pulse w-16 h-16 bg-blue-500/20 rounded-full"></div></div>;

  return (
    <div className="min-h-screen bg-[#F3F6F8] dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-300">
      
      <aside className="w-full md:w-64 bg-white dark:bg-[#0A192F] border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex flex-col justify-between md:min-h-screen z-10 relative transition-colors duration-300">
        <div>
          <div className="p-8 hidden md:block"><h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2"><div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center"><span className="text-white text-sm font-bold">N</span></div>NXT-D</h1></div>
          <nav className="p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
            <button onClick={() => navigate('/dashboard')} className="hover:bg-slate-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 w-full justify-center md:justify-start"><CreditCard className="w-5 h-5" /> <span className="hidden md:inline">{t.dash}</span></button>
            <button onClick={() => navigate('/history')} className="hover:bg-slate-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 w-full justify-center md:justify-start"><History className="w-5 h-5" /> <span className="hidden md:inline">{t.hist}</span></button>
            <button className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 w-full justify-center md:justify-start"><SettingsIcon className="w-5 h-5" /> <span className="hidden md:inline">{t.set}</span></button>
          </nav>
        </div>
        <div className="p-4 hidden md:block">
          <div className="bg-slate-50 dark:bg-[#112240] p-4 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 overflow-hidden"><div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">{userData.client.charAt(0)}</div><div className="truncate"><p className="text-slate-900 dark:text-white font-medium text-sm truncate">{userData.client.split(' ')[0]}</p>{userRole === 'ceo' && <p className="text-[10px] text-amber-500 font-bold uppercase mt-0.5">CEO Account</p>}</div></div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition p-2"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="md:hidden bg-white dark:bg-slate-800 p-4 flex justify-between items-center shadow-sm border-b border-slate-200 dark:border-slate-800"><h1 className="text-xl font-black text-slate-900 dark:text-white">NXT-D</h1><button onClick={handleLogout} className="text-sm font-medium text-red-500"><LogOut className="w-5 h-5" /></button></header>
        <div className="p-4 md:p-8 max-w-4xl w-full mx-auto relative flex flex-col h-full gap-8">
          <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{t.title}</motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <AnimatePresence>
              {userRole === 'ceo' && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="md:col-span-2 bg-gradient-to-br from-[#0A192F] via-[#112240] to-blue-900 p-8 rounded-[2rem] text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden border border-blue-500/20">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-400"><Crown className="w-6 h-6" /> {t.ceo}</h3>
                  <form onSubmit={handleCeoDeposit} className="flex flex-col md:flex-row gap-4 relative z-10">
                    <input type="text" placeholder="+7..." value={ceoPhone} onChange={(e) => setCeoPhone(e.target.value)} className="flex-1 bg-white/5 border border-blue-400/20 p-4 rounded-xl outline-none text-white focus:bg-white/10" required />
                    <input type="number" placeholder="10000" value={ceoAmount} onChange={(e) => setCeoAmount(e.target.value)} className="flex-1 bg-white/5 border border-blue-400/20 p-4 rounded-xl outline-none text-white focus:bg-white/10" required />
                    <button type="submit" className="bg-blue-500 hover:bg-blue-400 text-white font-bold py-4 px-8 rounded-xl transition">Отправить</button>
                  </form>
                  {ceoStatus && <div className="mt-4 text-emerald-400 font-bold">{ceoStatus}</div>}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-300">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white"><SettingsIcon className="w-5 h-5 text-blue-500" /> {t.pref}</h3>
                
                {/* ТЕМА */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-500">{theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}</div><div><p className="font-bold text-sm text-slate-900 dark:text-white">{t.theme}</p><p className="text-xs text-slate-500">{t.themeDesc}</p></div></div>
                  <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-14 h-8 bg-slate-200 dark:bg-blue-600 rounded-full relative transition-colors duration-300"><motion.div layout className="w-6 h-6 bg-white rounded-full absolute top-1 shadow-sm" animate={{ left: theme === 'dark' ? '30px' : '4px' }} transition={{ type: "spring", stiffness: 500, damping: 30 }} /></button>
                </div>

                {/* ЯЗЫК */}
                <div className="flex items-center justify-between mb-6 relative">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-500"><Globe className="w-5 h-5" /></div><div><p className="font-bold text-sm text-slate-900 dark:text-white">{t.lang}</p><p className="text-xs text-slate-500">{t.langDesc}</p></div></div>
                  <div className="relative">
                    <button onClick={() => { setIsLangOpen(!isLangOpen); setIsCurrOpen(false); setIsSoundOpen(false); }} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium text-slate-900 dark:text-white hover:border-blue-500/50 transition-colors min-w-[120px] justify-between">
                      {language === 'ru' ? 'Русский' : language === 'en' ? 'English' : 'Español'} <motion.div animate={{ rotate: isLangOpen ? 180 : 0 }}><ChevronDown className="w-4 h-4 text-slate-400" /></motion.div>
                    </button>
                    <AnimatePresence>
                      {isLangOpen && (
                        <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                          <button onClick={() => {setLanguage('ru'); setIsLangOpen(false);}} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Русский</button>
                          <button onClick={() => {setLanguage('en'); setIsLangOpen(false);}} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">English</button>
                          <button onClick={() => {setLanguage('es'); setIsLangOpen(false);}} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Español</button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* ВАЛЮТА */}
                <div className="flex items-center justify-between mb-6 relative">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-500"><DollarSign className="w-5 h-5" /></div><div><p className="font-bold text-sm text-slate-900 dark:text-white">{t.curr}</p><p className="text-xs text-slate-500">{t.currDesc}</p></div></div>
                  <div className="relative">
                    <button onClick={() => { setIsCurrOpen(!isCurrOpen); setIsLangOpen(false); setIsSoundOpen(false); }} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium text-slate-900 dark:text-white hover:border-blue-500/50 transition-colors min-w-[120px] justify-between">
                      {currency === 'RUB' ? 'Рубль (₽)' : currency === 'USD' ? 'Доллар ($)' : 'Евро (€)'} <motion.div animate={{ rotate: isCurrOpen ? 180 : 0 }}><ChevronDown className="w-4 h-4 text-slate-400" /></motion.div>
                    </button>
                    <AnimatePresence>
                      {isCurrOpen && (
                        <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                          <button onClick={() => handleCurrencyChange('RUB')} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Рубль (₽)</button>
                          <button onClick={() => handleCurrencyChange('USD')} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Доллар ($)</button>
                          <button onClick={() => handleCurrencyChange('EUR')} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Евро (€)</button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* НОВЫЙ БЛОК: ЗВУК */}
                <div className="flex items-center justify-between relative">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${sound === 'off' ? 'bg-red-50 text-red-500 dark:bg-red-900/20' : 'bg-slate-50 text-slate-500 dark:bg-slate-900'}`}>
                      {sound === 'off' ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </div>
                    <div><p className="font-bold text-sm text-slate-900 dark:text-white">{t.sound}</p><p className="text-xs text-slate-500">{t.soundDesc}</p></div>
                  </div>
                  <div className="relative">
                    <button onClick={() => { setIsSoundOpen(!isSoundOpen); setIsCurrOpen(false); setIsLangOpen(false); }} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium text-slate-900 dark:text-white hover:border-blue-500/50 transition-colors min-w-[120px] justify-between">
                      {sound === 's1' ? t.s1 : sound === 's2' ? t.s2 : sound === 's3' ? t.s3 : t.off} <motion.div animate={{ rotate: isSoundOpen ? 180 : 0 }}><ChevronDown className="w-4 h-4 text-slate-400" /></motion.div>
                    </button>
                    <AnimatePresence>
                      {isSoundOpen && (
                        <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className="absolute right-0 top-full mt-2 w-36 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                          <button onClick={() => { setSound('s1'); playTestSound('s1'); setIsSoundOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">{t.s1}</button>
                          <button onClick={() => { setSound('s2'); playTestSound('s2'); setIsSoundOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">{t.s2}</button>
                          <button onClick={() => { setSound('s3'); playTestSound('s3'); setIsSoundOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">{t.s3}</button>
                          <div className="h-px bg-slate-100 dark:bg-slate-700"></div>
                          <button onClick={() => { setSound('off'); setIsSoundOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">{t.off}</button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col gap-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-300">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white"><Lock className="w-5 h-5 text-blue-500" /> {t.sec}</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4 mb-6">
                  <input type="password" placeholder={t.oldPass} value={passwordForm.old} onChange={(e) => setPasswordForm({...passwordForm, old: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" required />
                  <input type="password" placeholder={t.newPass} value={passwordForm.new} onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" required />
                  <input type="password" placeholder={t.confPass} value={passwordForm.confirm} onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" required />
                  <button type="submit" className="w-full bg-[#0A192F] dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition">{t.updPass}</button>
                  {passStatus === 'ok' && <div className="p-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle2 className="w-4 h-4"/> {t.passSuccess}</div>}
                  {passStatus && passStatus !== 'ok' && <div className="p-3 rounded-xl text-xs font-bold text-center bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">{passStatus}</div>}
                </form>
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-100 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition font-bold text-sm"><LogOut className="w-4 h-4" /> {t.logout}</button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}