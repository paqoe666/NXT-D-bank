import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { LogOut, Send, CreditCard, History, Settings, Bell, X, Smartphone, FileText, Lock, Snowflake, Copy, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const cardDesigns = [
  { id: 'blue', classes: 'from-[#0A192F] via-[#112240] to-blue-900', name: 'Classic Blue' },
  { id: 'orange', classes: 'from-orange-600 via-orange-500 to-yellow-500', name: 'Sunset Orange' },
  { id: 'pink', classes: 'from-pink-600 via-rose-500 to-red-500', name: 'Neon Pink' },
  { id: 'green', classes: 'from-emerald-700 via-emerald-500 to-teal-500', name: 'Forest Green' },
  { id: 'purple', classes: 'from-indigo-800 via-purple-600 to-fuchsia-600', name: 'Deep Purple' }
];

const countries = [
  { code: '+7', flag: '🇷🇺', name: 'Россия / Казахстан', length: 10, placeholder: '999 000 00 00' },
  { code: '+375', flag: '🇧🇾', name: 'Беларусь', length: 9, placeholder: '99 000 00 00' },
  { code: '+1', flag: '🇺🇸', name: 'США', length: 10, placeholder: '999 000 0000' },
  { code: '+49', flag: '🇩🇪', name: 'Германия', length: 11, placeholder: '999 00000000' }
];

const translations = {
  ru: { dash: 'Главная', hist: 'Операции', set: 'Настройки', acc: 'Основной счет', transfers: 'Переводы', transDesc: 'Мгновенная отправка средств.', newTrans: 'Новый перевод', notif: 'Уведомления', readAll: 'Прочитать все', noNotif: 'Нет новых уведомлений', cardManage: 'Управление картой', lock: 'Блок.', freeze: 'Замор.', details: 'Реквизиты', exp: 'Срок', phone: 'По телефону', card: 'По карте', amount: 'Сумма', comment: 'Комментарий', send: 'Перевести', morning: 'Доброе утро', day: 'Добрый день', evening: 'Добрый вечер', night: 'Доброй ночи', soon: 'Ожидайте в обновлениях!', copied: 'Скопировано!', recipientFound: 'Получатель', recent: 'Недавние переводы', logoutTitle: 'Выйти из аккаунта?', logoutDesc: 'Вам потребуется заново ввести данные для входа.', cancel: 'Отмена', logoutBtn: 'Выйти', pinTitle: 'Защита аккаунта', pinDesc1: 'Придумайте 4-значный PIN-код для входа', pinDesc2: 'Повторите придуманный PIN-код', pinMismatch: 'Не совпадает. Попробуйте еще раз', pinSuccess: 'PIN-код установлен!' },
  en: { dash: 'Dashboard', hist: 'History', set: 'Settings', acc: 'Main Account', transfers: 'Transfers', transDesc: 'Instant money transfers.', newTrans: 'New Transfer', notif: 'Notifications', readAll: 'Read all', noNotif: 'No new notifications', cardManage: 'Card Management', lock: 'Lock', freeze: 'Freeze', details: 'Details', exp: 'Expiry', phone: 'By Phone', card: 'By Card', amount: 'Amount', comment: 'Comment', send: 'Send', morning: 'Good morning', day: 'Good afternoon', evening: 'Good evening', night: 'Good night', soon: 'Coming soon!', copied: 'Copied!', recipientFound: 'Recipient', recent: 'Recent transfers', logoutTitle: 'Log out?', logoutDesc: 'You will need to enter your credentials again.', cancel: 'Cancel', logoutBtn: 'Log out', pinTitle: 'Account Security', pinDesc1: 'Create a 4-digit PIN for login', pinDesc2: 'Confirm your new PIN', pinMismatch: 'Does not match. Try again', pinSuccess: 'PIN code set!' },
  es: { dash: 'Inicio', hist: 'Operaciones', set: 'Ajustes', acc: 'Cuenta Principal', transfers: 'Transferencias', transDesc: 'Envío instantáneo de fondos.', newTrans: 'Nueva transferencia', notif: 'Notificaciones', readAll: 'Leer todo', noNotif: 'No hay notificaciones', cardManage: 'Gestión de Tarjeta', lock: 'Bloq.', freeze: 'Congel.', details: 'Detalles', exp: 'Caduca', phone: 'Por Teléfono', card: 'Por Tarjeta', amount: 'Cantidad', comment: 'Comentario', send: 'Enviar', morning: 'Buenos días', day: 'Buenas tardes', evening: 'Buenas noches', night: 'Buenas noches', soon: '¡Próximamente!', copied: '¡Copiado!', recipientFound: 'Destinatario', recent: 'Transferencias recientes', logoutTitle: '¿Cerrar sesión?', logoutDesc: 'Deberá volver a introducir sus credenciales.', cancel: 'Cancelar', logoutBtn: 'Salir', pinTitle: 'Seguridad', pinDesc1: 'Cree un PIN de 4 dígitos', pinDesc2: 'Confirme su nuevo PIN', pinMismatch: 'No coincide. Inténtalo de nuevo', pinSuccess: '¡PIN configurado!' }
};

export default function Dashboard() {
  const { token, userData, setUserData, logout, language } = useStore();
  const navigate = useNavigate();
  const location = useLocation(); 
  const [loading, setLoading] = useState(true);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isBellHovered, setIsBellHovered] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false); 
  const [copied, setCopied] = useState(false);
  
  const [activeDesignIndex, setActiveDesignIndex] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTab, setTransferTab] = useState<'phone' | 'card'>('phone');
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [transferData, setTransferData] = useState({ rawPhone: '', cardOrAccount: '', amount: '', comment: '' });
  const [transferStatus, setTransferStatus] = useState('');
  
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [recentRecipients, setRecentRecipients] = useState<any[]>([]); 

  const [isPinSetupOpen, setIsPinSetupOpen] = useState(false);
  const [pinStep, setPinStep] = useState<1 | 2>(1);
  const [pinCode, setPinCode] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  
  const t = translations[language as keyof typeof translations] || translations.ru;

  const formatMoney = (val: number | string | undefined) => {
    if (val === undefined || val === null) return '0';
    const num = Number(val);
    return isNaN(num) ? String(val) : num.toLocaleString('ru-RU');
  };

  const formatTextNumbers = (text: string) => {
    if (!text) return '';
    return text.replace(/\b\d{4,}(?:\.\d+)?\b/g, (match) => Number(match).toLocaleString('ru-RU'));
  };

  const getCardSystem = (cardNumber: string) => {
    if (!cardNumber) return null;
    const cleanNum = cardNumber.replace(/\D/g, '');
    if (cleanNum.startsWith('7777')) return { name: 'N-Cards', logo: null, style: 'bg-blue-600 text-white', icon: 'text-blue-200 font-black italic drop-shadow-md', customClass: '' };
    if (cleanNum.startsWith('4029') || cleanNum.startsWith('4')) return { name: 'VISA', logo: '/visa.svg', style: 'bg-indigo-600 text-white', icon: '', customClass: 'h-5 md:h-6' }; 
    if (cleanNum.startsWith('5067') || cleanNum.startsWith('5')) return { name: 'MASTERCARD', logo: '/mastercard.svg', style: 'bg-orange-500 text-white', icon: '', customClass: 'h-8 md:h-10' }; 
    if (cleanNum.startsWith('2202') || cleanNum.startsWith('2')) return { name: 'МИР', logo: '/mir.svg', style: 'bg-emerald-500 text-white', icon: '', customClass: 'h-6 md:h-7' }; 
    if (cleanNum.length > 0) return { name: 'CARD', logo: null, style: 'bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300', icon: 'text-white font-bold', customClass: '' };
    return null;
  };

  useEffect(() => {
    if (!userData?.account?.userId) return;
    const checkPin = () => {
      const savedPin = localStorage.getItem(`pin_${userData.account.userId}`);
      if (!savedPin && !isPinSetupOpen) {
        setIsPinSetupOpen(true);
      }
    };
    const interval = setInterval(checkPin, 15000);
    setTimeout(checkPin, 2000);
    return () => clearInterval(interval);
  }, [userData?.account?.userId, isPinSetupOpen]);

  const handlePinPress = (num: string) => {
    setPinError('');
    if (pinStep === 1) {
      setPinCode(prev => {
        if (prev.length >= 4) return prev;
        const newCode = prev + num;
        if (newCode.length === 4) {
          setTimeout(() => setPinStep(2), 300);
        }
        return newCode;
      });
    } else {
      setPinConfirm(prev => {
        if (prev.length >= 4) return prev;
        const newConfirm = prev + num;
        if (newConfirm.length === 4) {
          if (newConfirm === pinCode) {
            localStorage.setItem(`pin_${userData.account.userId}`, pinCode);
            setTimeout(() => {
              setIsPinSetupOpen(false);
              setPinStep(1);
              setPinCode('');
              setPinConfirm('');
            }, 500);
          } else {
            setPinError(t.pinMismatch);
            return '';
          }
        }
        return newConfirm;
      });
    }
  };

  const handlePinDelete = () => {
    setPinError('');
    if (pinStep === 1) setPinCode(prev => prev.slice(0, -1));
    else setPinConfirm(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPinSetupOpen) return;
      if (/^[0-9]$/.test(e.key)) {
        handlePinPress(e.key);
      } else if (e.key === 'Backspace') {
        handlePinDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPinSetupOpen, pinStep, pinCode]);


  const handleNotificationClick = (txId?: string) => {
    setIsNotifOpen(false);
    if (txId) navigate('/history', { state: { openTxId: txId } });
    else navigate('/history');
  };

  const formatPhoneDisplay = (val: string) => {
    let res = '';
    for (let i = 0; i < val.length; i++) {
      if (i === 3 || i === 6 || i === 8) res += ' ';
      res += val[i];
    }
    return res;
  };

  const formatCardDisplay = (val: string) => val.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();

  const getGreeting = (fullName: string) => {
    const firstName = fullName?.split(' ')[0] || '';
    const mskHour = new Date().getHours();
    if (mskHour >= 6 && mskHour < 12) return `${t.morning}, ${firstName} 👋`;
    if (mskHour >= 12 && mskHour < 18) return `${t.day}, ${firstName} 👋`;
    if (mskHour >= 18) return `${t.evening}, ${firstName} 👋`;
    return `${t.night}, ${firstName} 👋`;
  };

  const fetchDashboard = async () => {
    try {
      const response = await fetch('https://nxt-d-bank-backend.onrender.com/api/bank/dashboard', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        setActiveDesignIndex(data.cards?.[0]?.designIndex || 0);
        setNotifications(data.notifications || []);
      } else logout();
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchRecentRecipients = async () => {
    if (!token || !userData?.account?.userId) return;
    try {
      const response = await fetch('https://nxt-d-bank-backend.onrender.com/api/bank/history', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        const history = await response.json();
        const myId = userData.account.userId;
        
        const outTx = history.filter((tx: any) => tx.senderId === myId && tx.status === 'completed');
        const uniqueRecipients = new Map();
        
        outTx.forEach((tx: any) => {
          if (!uniqueRecipients.has(tx.target)) {
            let displayName = 'Неизвестный';
            let initial = '?';
            
            if (tx.receiver) {
              displayName = `${tx.receiver.firstName} ${tx.receiver.lastName.charAt(0)}.`;
              initial = tx.receiver.firstName.charAt(0);
            } else {
              displayName = tx.target.slice(-4); 
              initial = '#';
            }
            
            uniqueRecipients.set(tx.target, { target: tx.target, displayName, initial });
          }
        });
        
        setRecentRecipients(Array.from(uniqueRecipients.values()).slice(0, 5));
      }
    } catch (error) { console.error(error); }
  };

  const handleSelectRecent = (target: string) => {
    const isCard = target.length >= 16 && !target.includes('+');
    if (isCard) {
      setTransferTab('card');
      setTransferData({ ...transferData, cardOrAccount: target });
    } else {
      setTransferTab('phone');
      const matchedCountry = countries.find(c => target.startsWith(c.code)) || countries[0];
      setSelectedCountry(matchedCountry);
      const rawPhone = target.replace(matchedCountry.code, '');
      setTransferData({ ...transferData, rawPhone });
    }
  };

  useEffect(() => {
    if (!loading && location.state?.repeatTx) {
      const { target, amount } = location.state.repeatTx;
      const safeTarget = target || '';
      
      setIsTransferModalOpen(true);

      if (safeTarget.length >= 16 && !safeTarget.includes('+')) {
        setTransferTab('card');
        setTransferData(prev => ({ ...prev, cardOrAccount: safeTarget, amount: String(amount) }));
      } else {
        setTransferTab('phone');
        const matchedCountry = countries.find(c => safeTarget.startsWith(c.code)) || countries[0];
        setSelectedCountry(matchedCountry);
        const rawPhone = safeTarget.replace(matchedCountry.code, '');
        setTransferData(prev => ({ ...prev, rawPhone, amount: String(amount) }));
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state, loading]);

  useEffect(() => {
    const fetchRecipient = async () => {
      const target = transferTab === 'phone' 
        ? (transferData.rawPhone.length >= selectedCountry.length ? `${selectedCountry.code}${transferData.rawPhone}` : '')
        : (transferData.cardOrAccount.length >= 16 ? transferData.cardOrAccount : '');

      if (target && token) {
        try {
          const res = await fetch(`https://nxt-d-bank-backend.onrender.com/api/bank/resolve-recipient?target=${encodeURIComponent(target)}`, { headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) {
            const data = await res.json();
            setRecipientName(data.name);
          }
        } catch (e) { setRecipientName(null); }
      } else setRecipientName(null);
    };
    const delay = setTimeout(fetchRecipient, 300);
    return () => clearTimeout(delay);
  }, [transferData.rawPhone, transferData.cardOrAccount, transferTab, selectedCountry, token]);

  useEffect(() => { 
    if (token) {
      fetchDashboard(); 
      fetchRecentRecipients(); 
      const handleFocus = () => { fetchDashboard(); fetchRecentRecipients(); };
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [token]);

  const handleLogout = () => { 
    setIsLogoutModalOpen(false);
    logout(); 
    navigate('/login'); 
  };

  const changeDesign = async (direction: number) => {
    let newIndex = activeDesignIndex + direction;
    if (newIndex < 0) newIndex = cardDesigns.length - 1;
    if (newIndex >= cardDesigns.length) newIndex = 0;
    setActiveDesignIndex(newIndex);
    try { await fetch('https://nxt-d-bank-backend.onrender.com/api/bank/card/design', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ designIndex: newIndex }) }); } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    setNotifications([]);
    try { await fetch('https://nxt-d-bank-backend.onrender.com/api/bank/notifications/read', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }); } catch (e) {}
  };

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); 
    if (val.length <= selectedCountry.length) setTransferData({ ...transferData, rawPhone: val });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setTransferStatus('...');
    const finalTarget = transferTab === 'phone' ? `${selectedCountry.code}${transferData.rawPhone}` : transferData.cardOrAccount;
    
    try {
      const response = await fetch('https://nxt-d-bank-backend.onrender.com/api/bank/transfer', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
        body: JSON.stringify({ receiverPhone: finalTarget, amount: Number(transferData.amount), comment: transferData.comment }) 
      });
      
      if (response.ok) {
        setIsTransferModalOpen(false); 
        setTransferData({ rawPhone: '', cardOrAccount: '', amount: '', comment: '' }); 
        setTransferStatus(''); 
        fetchRecentRecipients(); 
      } else {
        setTransferStatus('Ошибка');
      }
    } catch (error) { 
      setTransferStatus('Ошибка сети'); 
    }
  };

  if (loading || !userData) return <div className="min-h-screen bg-[#F3F6F8] dark:bg-slate-900 flex items-center justify-center"><div className="animate-pulse w-16 h-16 bg-blue-500/20 rounded-full"></div></div>;
  
  const currentDesign = cardDesigns[activeDesignIndex] || cardDesigns[0];
  const pinCurrentLength = pinStep === 1 ? pinCode.length : pinConfirm.length;
  
  const myCardSystem = getCardSystem(userData.cards?.[0]?.number || '');
  const transferCardSystem = getCardSystem(transferData.cardOrAccount);

  return (
    <div className="min-h-screen bg-[#F3F6F8] dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-300">
      <aside className="w-full md:w-64 bg-white dark:bg-[#0A192F] border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex flex-col justify-between md:min-h-screen z-10 relative transition-colors duration-300">
        <div>
          <div className="p-8 hidden md:block">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <img src="/logo.png" alt="NXT Logo" className="w-8 h-8 object-contain drop-shadow-md" />
              NXT-D
            </h1>
          </div>
          <nav className="p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
            <button className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 w-full justify-center md:justify-start"><CreditCard className="w-5 h-5" /> <span className="hidden md:inline">{t.dash}</span></button>
            <button onClick={() => navigate('/history')} className="hover:bg-slate-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 w-full justify-center md:justify-start"><History className="w-5 h-5" /> <span className="hidden md:inline">{t.hist}</span></button>
            <button onClick={() => navigate('/settings')} className="hover:bg-slate-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 w-full justify-center md:justify-start"><Settings className="w-5 h-5" /> <span className="hidden md:inline">{t.set}</span></button>
          </nav>
        </div>
        <div className="p-4 hidden md:block">
          <div className="bg-slate-50 dark:bg-[#112240] p-4 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">{userData.client.charAt(0)}</div>
              <div className="truncate"><p className="text-slate-900 dark:text-white font-medium text-sm truncate">{userData.client.split(' ')[0]}</p></div>
            </div>
            <button onClick={() => setIsLogoutModalOpen(true)} className="text-slate-400 hover:text-red-500 transition p-2"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="md:hidden bg-white dark:bg-slate-800 p-4 flex justify-between items-center shadow-sm">
          <h1 className="text-xl font-black text-slate-900 dark:text-white">NXT-D</h1>
          <button onClick={() => setIsLogoutModalOpen(true)} className="text-sm font-medium text-red-500"><LogOut className="w-5 h-5" /></button>
        </header>
        <div className="p-4 md:p-8 max-w-6xl w-full mx-auto relative">
          <div className="flex justify-between items-end mb-8 relative">
            <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{getGreeting(userData.client)}</motion.h2>
            
            <div className="relative z-40">
              <button onMouseEnter={() => setIsBellHovered(true)} onMouseLeave={() => setIsBellHovered(false)} onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm relative text-slate-500 hover:text-blue-500 transition focus:outline-none"><motion.div animate={isBellHovered ? { rotate: [0, 15, -15, 15, -15, 0] } : {}} transition={{ duration: 0.5 }}><Bell className="w-6 h-6" /></motion.div>{notifications.length > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>}</button>
              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50"><h3 className="font-bold text-sm">{t.notif}</h3>{notifications.length > 0 && <button onClick={handleMarkAllRead} className="text-xs text-blue-500 font-medium hover:text-blue-700">{t.readAll}</button>}</div>
                    
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">{t.noNotif}</div> : notifications.map((notif: any) => (
                        <div 
                          key={notif.id} 
                          onClick={() => handleNotificationClick(notif.transactionId)} 
                          className="p-4 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition cursor-pointer"
                        >
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{formatTextNumbers(notif.message)}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{new Date(notif.createdAt || Date.now()).toLocaleString(language === 'ru' ? 'ru-RU' : language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      ))}
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsCardModalOpen(true)} className={`relative overflow-hidden bg-gradient-to-br ${currentDesign.classes} p-8 rounded-[2rem] text-white shadow-2xl shadow-blue-900/10 cursor-pointer group transform-gpu`}>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300 pointer-events-none"></div>
                <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-bl from-white/20 to-transparent pointer-events-none"></div>
                <div className="relative z-10 flex justify-between items-start mb-10">
                  <div>
                    <p className="text-white/80 text-sm font-medium mb-1">{t.acc}</p>
                    <h3 className="text-4xl md:text-5xl font-light tracking-tight">{formatMoney(userData.account?.balance)} <span className="font-normal opacity-80">{userData.account?.currency}</span></h3>
                  </div>
                  <span className="text-2xl font-black tracking-widest opacity-90">NXT</span>
                </div>
                <div className="relative z-10 flex justify-between items-end">
                  <div>
                    <p className="font-mono text-lg md:text-xl tracking-[0.15em] mb-1 drop-shadow-md">{userData.cards?.[0]?.number.match(/.{1,4}/g)?.join(' ')}</p>
                    <p className="text-sm text-white/80 uppercase tracking-widest">{userData.cards?.[0]?.ownerName}</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="font-mono mb-2">{userData.cards?.[0]?.expiryDate}</p>
                    
                    {myCardSystem?.logo ? (
                      <img src={myCardSystem.logo} alt={myCardSystem.name} className={`${myCardSystem.customClass} object-contain drop-shadow-md`} />
                    ) : myCardSystem ? (
                      <div className={`tracking-wider text-xl md:text-2xl ${myCardSystem.icon}`}>{myCardSystem.name}</div>
                    ) : (
                      <div className="flex -space-x-3"><div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-500/90 mix-blend-multiply"></div><div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-yellow-400/90 mix-blend-multiply"></div></div>
                    )}

                  </div>
                </div>
              </motion.div>
            </div>
            <div className="lg:col-span-1 flex flex-col gap-6"><div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none"><div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4"><Send className="w-6 h-6" /></div><h3 className="text-xl font-bold mb-2">{t.transfers}</h3><p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t.transDesc}</p><button onClick={() => setIsTransferModalOpen(true)} className="w-full bg-[#0A192F] dark:bg-blue-600 hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20">{t.newTrans}</button></div></div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isCardModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white"><CreditCard className="w-6 h-6 text-blue-500" /> {t.cardManage}</h2>
                <button onClick={() => setIsCardModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition text-slate-500 dark:text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex-1 overflow-y-auto">
                <div className="relative flex items-center justify-center mb-6 group">
                  <button onClick={() => changeDesign(-1)} className="absolute left-[-10px] z-20 p-2 bg-white dark:bg-slate-800 rounded-full shadow-md text-slate-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition"><ChevronLeft className="w-5 h-5" /></button>
                  <div className={`w-full bg-gradient-to-br ${currentDesign.classes} p-6 rounded-2xl text-white shadow-lg shadow-blue-900/10 relative overflow-hidden transition-all duration-500`}>
                    <div className="absolute inset-0 bg-white/5"></div>
                    <div className="flex justify-between items-start mb-6 relative z-10"><h3 className="text-xl font-light">{formatMoney(userData.account?.balance)} {userData.account?.currency}</h3><span className="font-bold">NXT</span></div>
                    <div className="flex justify-between items-end relative z-10">
                      <div><p className="font-mono text-sm tracking-widest">{userData.cards?.[0]?.number.slice(-4).padStart(19, '• ')}</p></div>
                      
                      {myCardSystem?.logo ? (
                        <img src={myCardSystem.logo} alt={myCardSystem.name} className={`${myCardSystem.customClass} scale-75 transform origin-bottom-right object-contain drop-shadow-md`} />
                      ) : myCardSystem ? (
                        <div className={`tracking-wider text-sm ${myCardSystem.icon} scale-75 transform origin-bottom-right`}>{myCardSystem.name}</div>
                      ) : (
                        <div className="flex -space-x-2"><div className="w-6 h-6 rounded-full bg-red-500/90 mix-blend-multiply"></div><div className="w-6 h-6 rounded-full bg-yellow-400/90 mix-blend-multiply"></div></div>
                      )}

                    </div>
                  </div>
                  <button onClick={() => changeDesign(1)} className="absolute right-[-10px] z-20 p-2 bg-white dark:bg-slate-800 rounded-full shadow-md text-slate-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition"><ChevronRight className="w-5 h-5" /></button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="relative group cursor-not-allowed">
                    <button disabled className="w-full flex flex-col items-center p-3 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl opacity-60 pointer-events-none"><Lock className="w-6 h-6 mb-2 text-slate-400" /><span className="text-[10px] font-bold uppercase text-slate-500">{t.lock}</span></button>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-xl z-50">{t.soon}<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div></div>
                  </div>
                  <div className="relative group cursor-not-allowed">
                    <button disabled className="w-full flex flex-col items-center p-3 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl opacity-60 pointer-events-none"><Snowflake className="w-6 h-6 mb-2 text-slate-400" /><span className="text-[10px] font-bold uppercase text-slate-500">{t.freeze}</span></button>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-xl z-50">{t.soon}<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div></div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">{t.details}</h4>
                  <div className="space-y-3">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center transition-colors">
                      <span className="font-mono text-lg text-slate-700 dark:text-slate-200">{userData.cards?.[0]?.number.match(/.{1,4}/g)?.join(' ')}</span>
                      <button onClick={() => copyToClipboard(userData.cards?.[0]?.number)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition" title={t.copied}>{copied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-slate-400 hover:text-blue-500 transition" />}</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center"><span className="font-mono text-lg text-slate-700 dark:text-slate-200">{userData.cards?.[0]?.expiryDate}</span><span className="text-xs text-slate-400 font-bold uppercase">{t.exp}</span></div>
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center group relative overflow-hidden"><span className="font-mono text-lg text-slate-700 dark:text-slate-200 opacity-0 group-hover:opacity-100 transition">{userData.cards?.[0]?.cvv}</span><span className="absolute left-4 font-mono text-lg text-slate-700 dark:text-slate-200 group-hover:opacity-0 transition">***</span><span className="text-xs text-slate-400 font-bold uppercase z-10">CVV</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTransferModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.newTrans}</h2>
                <button onClick={() => setIsTransferModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition text-slate-500 dark:text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                
                {recentRecipients.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{t.recent}</h4>
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                      {recentRecipients.map((rec, i) => (
                        <button key={i} onClick={() => handleSelectRecent(rec.target)} className="flex flex-col items-center gap-2 shrink-0 group">
                          <div className="w-14 h-14 rounded-full bg-blue-500 text-white flex items-center justify-center text-lg font-bold shadow-sm group-hover:scale-105 transition-transform">
                            {rec.initial}
                          </div>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{rec.displayName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 mb-6">
                  <button onClick={() => setTransferTab('phone')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 ${transferTab === 'phone' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-white' : 'text-slate-500'}`}><Smartphone className="w-4 h-4"/> {t.phone}</button>
                  <button onClick={() => setTransferTab('card')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 ${transferTab === 'card' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-white' : 'text-slate-500'}`}><CreditCard className="w-4 h-4"/> {t.card}</button>
                </div>
                
                <form onSubmit={handleTransfer}>
                  <div className="mb-4">
                    {transferTab === 'phone' ? (
                      <div className="flex relative bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 transition">
                        <div className="relative">
                          <button type="button" onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 h-full px-4 border-r border-slate-200 dark:border-slate-700 rounded-l-xl"><span className="text-lg">{selectedCountry.flag}</span><span className="font-bold text-slate-900 dark:text-white">{selectedCountry.code}</span><ChevronDown className="w-4 h-4 text-slate-400" /></button>
                          {isCountryDropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                              {countries.map(c => <button key={c.code} type="button" onClick={() => { setSelectedCountry(c); setIsCountryDropdownOpen(false); setTransferData({...transferData, rawPhone: ''}); }} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left"><span className="text-xl">{c.flag}</span><div><p className="font-bold text-sm text-slate-900 dark:text-white">{c.code}</p><p className="text-xs text-slate-400">{c.name}</p></div></button>)}
                            </div>
                          )}
                        </div>
                        <input type="text" placeholder={selectedCountry.placeholder} value={formatPhoneDisplay(transferData.rawPhone)} onChange={handlePhoneInput} className="w-full bg-transparent p-4 outline-none text-lg font-medium text-slate-900 dark:text-white" required />
                      </div>
                    ) : (
                      <div className="relative flex-1">
                        <input 
                          type="text" 
                          placeholder="0000 0000 0000 0000" 
                          value={formatCardDisplay(transferData.cardOrAccount)} 
                          onChange={(e) => setTransferData({...transferData, cardOrAccount: e.target.value.replace(/\D/g, '')})} 
                          className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 h-14 pr-4 rounded-xl outline-none font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all duration-300 ease-out ${transferCardSystem ? 'pl-[90px]' : 'pl-4'}`} 
                          required 
                        />
                        <AnimatePresence>
                          {transferCardSystem && (
                            <motion.div 
                              initial={{ opacity: 0, x: -10, y: '-50%' }} 
                              animate={{ opacity: 1, x: 0, y: '-50%' }} 
                              exit={{ opacity: 0, x: -10, y: '-50%' }} 
                              className={`absolute left-3 top-1/2 px-2.5 flex items-center justify-center h-8 rounded-lg shadow-sm pointer-events-none ${transferCardSystem.style}`}
                            >
                              {transferCardSystem.logo ? (
                                <img src={transferCardSystem.logo} alt={transferCardSystem.name} className="h-4 object-contain" />
                              ) : (
                                <span className={`text-[11px] leading-none tracking-widest ${transferCardSystem.icon}`}>{transferCardSystem.name}</span>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    
                    <AnimatePresence>
                      {recipientName && (
                        <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 12 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden">
                          <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 p-3 rounded-xl"><div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">{recipientName.charAt(0)}</div><div><p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">{t.recipientFound}</p><p className="text-sm font-bold text-slate-900 dark:text-white">{recipientName}</p></div><CheckCircle2 className="w-5 h-5 text-blue-500 ml-auto" /></div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">{t.amount}</label>
                    <div className="relative"><input type="number" placeholder="0" value={transferData.amount} onChange={(e) => setTransferData({...transferData, amount: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 pr-16 rounded-xl outline-none font-medium text-slate-900 dark:text-white" required /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{userData.account.currency}</span></div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">{t.comment}</label>
                    <div className="relative"><FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><input type="text" value={transferData.comment} onChange={(e) => setTransferData({...transferData, comment: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 pl-12 rounded-xl outline-none text-slate-900 dark:text-white" /></div>
                  </div>

                  <button type="submit" className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl">{t.send} {transferData.amount ? `${formatMoney(transferData.amount)} ${userData.account.currency}` : ''}</button>

                  {transferStatus && <div className="p-4 mt-4 rounded-xl font-bold text-center bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">{transferStatus}</div>}
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLogoutModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2rem] shadow-2xl p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t.logoutTitle}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t.logoutDesc}</p>
              <div className="flex gap-3">
                <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 py-3 font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition">
                  {t.cancel}
                </button>
                <button onClick={handleLogout} className="flex-1 py-3 font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition">
                  {t.logoutBtn}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPinSetupOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white dark:bg-slate-800 w-full max-w-xs rounded-[2rem] shadow-2xl p-6 relative flex flex-col items-center">
              
              <button onClick={() => setIsPinSetupOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition">
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-6 h-6" />
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t.pinTitle}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6 h-10">
                {pinError ? <span className="text-red-500 font-bold">{pinError}</span> : (pinStep === 1 ? t.pinDesc1 : t.pinDesc2)}
              </p>

              <div className="flex gap-4 justify-center mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`w-4 h-4 rounded-full transition-colors duration-300 ${i < pinCurrentLength ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button key={num} onClick={() => handlePinPress(num.toString())} className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white text-2xl font-light hover:bg-blue-50 dark:hover:bg-slate-700 transition active:scale-95">
                    {num}
                  </button>
                ))}
                <div />
                <button onClick={() => handlePinPress('0')} className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white text-2xl font-light hover:bg-blue-50 dark:hover:bg-slate-700 transition active:scale-95">
                  0
                </button>
                <button onClick={handlePinDelete} className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900/50 text-slate-400 hover:text-red-500 text-2xl font-light hover:bg-red-50 dark:hover:bg-slate-700 transition active:scale-95 flex items-center justify-center">
                  ⌫
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
// фикс