import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { LogOut, Send, CreditCard, History, Settings, Bell, X, Smartphone, FileText, Lock, Snowflake, Copy, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, Globe, Download } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const cardDesigns = [
  { id: 'blue', classes: 'from-[#0A192F] via-[#112240] to-blue-900', name: 'Classic Blue' },
  { id: 'orange', classes: 'from-orange-600 via-orange-500 to-yellow-500', name: 'Sunset Orange' },
  { id: 'pink', classes: 'from-pink-600 via-rose-500 to-red-500', name: 'Neon Pink' },
  { id: 'green', classes: 'from-emerald-700 via-emerald-500 to-teal-500', name: 'Forest Green' },
  { id: 'purple', classes: 'from-indigo-800 via-purple-600 to-fuchsia-600', name: 'Deep Purple' },
  { id: 'ru', classes: 'bg-slate-900', flag: 'https://flagcdn.com/w640/ru.png', name: 'Россия', currency: 'RUB' },
  { id: 'us', classes: 'bg-slate-900', flag: 'https://flagcdn.com/w640/us.png', name: 'США', currency: 'USD' },
  { id: 'eu', classes: 'bg-slate-900', flag: 'https://flagcdn.com/w640/eu.png', name: 'Евросоюз', currency: 'EUR' },
  { id: 'gb', classes: 'bg-slate-900', flag: 'https://flagcdn.com/w640/gb.png', name: 'Великобритания', currency: 'GBP' },
  { id: 'ua', classes: 'bg-slate-900', flag: 'https://flagcdn.com/w640/ua.png', name: 'Украина', currency: 'UAH' },
  { id: 'cn', classes: 'bg-slate-900', flag: 'https://flagcdn.com/w640/cn.png', name: 'Китай', currency: 'CNY' },
  { id: 'ch', classes: 'bg-slate-900', flag: 'https://flagcdn.com/w640/ch.png', name: 'Швейцария', currency: 'CHF' },
  { id: 'jp', classes: 'bg-slate-900', flag: 'https://flagcdn.com/w640/jp.png', name: 'Япония', currency: 'JPY' },
  { id: 'by', classes: 'bg-slate-900', flag: 'https://flagcdn.com/w640/by.png', name: 'Беларусь', currency: 'BYN' },
  { id: 'ae', classes: 'bg-slate-900', flag: 'https://flagcdn.com/w640/ae.png', name: 'ОАЭ', currency: 'AED' },
  { id: 'kz', classes: 'bg-slate-900', flag: 'https://flagcdn.com/w640/kz.png', name: 'Казахстан', currency: 'KZT' },
];

const countries = [
  { code: '+7', flag: '🇷🇺', name: 'Россия / Казахстан', length: 10, placeholder: '999 000 00 00' },
  { code: '+375', flag: '🇧🇾', name: 'Беларусь', length: 9, placeholder: '99 000 00 00' },
  { code: '+1', flag: '🇺🇸', name: 'США', length: 10, placeholder: '999 000 0000' },
  { code: '+49', flag: '🇩🇪', name: 'Германия', length: 11, placeholder: '999 00000000' }
];

const BANKS = [
  { id: 'nxt', name: 'NXT D-Bank', bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-500', logo: <span className="font-black italic text-xl">N</span> },
  { id: 'tbank', name: 'Т-Банк', bg: 'bg-yellow-400', text: 'text-black', border: 'border-yellow-400', logo: <span className="font-bold text-xl">T</span> },
  { id: 'sber', name: 'Сбербанк', bg: 'bg-[#21A038]', text: 'text-white', border: 'border-[#21A038]', logo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M8 12l3 3 5-5"/></svg> },
  { id: 'alfa', name: 'Альфа-Банк', bg: 'bg-[#EF3124]', text: 'text-white', border: 'border-[#EF3124]', logo: <span className="font-black text-xl tracking-tighter border-b-[3px] border-white pb-0.5 leading-none mt-1">A</span> },
];

const translations = {
  ru: { dash: 'Главная', hist: 'Операции', set: 'Настройки', acc: 'Основной счет', transfers: 'Переводы', transDesc: 'Мгновенная отправка средств.', newTrans: 'Новый перевод', notif: 'Уведомления', readAll: 'Прочитать все', noNotif: 'Нет новых уведомлений', cardManage: 'Управление картой', lock: 'Блок.', freeze: 'Замор.', details: 'Реквизиты', exp: 'Срок', phone: 'По телефону', card: 'По номеру карты', amount: 'Сумма', comment: 'Сообщение получателю', send: 'Перевести', morning: 'Доброе утро', day: 'Добрый день', evening: 'Добрый вечер', night: 'Доброй ночи', soon: 'Ожидайте в обновлениях!', copied: 'Скопировано!', recipientFound: 'Получатель', recent: 'Недавние переводы', logoutTitle: 'Выйти из аккаунта?', logoutDesc: 'Вам потребуется заново ввести данные для входа.', cancel: 'Отмена', logoutBtn: 'Выйти', pinTitle: 'Защита аккаунта', pinDesc1: 'Придумайте 4-значный PIN-код для входа', pinDesc2: 'Повторите придуманный PIN-код', pinMismatch: 'Не совпадает. Попробуйте еще раз', pinSuccess: 'PIN-код установлен!', cardNameLabel: 'Название счета', saveBtn: 'Сохранить', changeBtn: 'Изменить', currTitle: 'Смена валюты', currDesc: 'Вы выбрали карту страны. Изменить вашу основную валюту на', yes: 'Да', no: 'Нет', continue: 'Продолжить', receipt: 'Квитанция', done: 'Готово', selectMethod: 'Куда перевести?', close: 'Закрыть' },
  en: { dash: 'Dashboard', hist: 'History', set: 'Settings', acc: 'Main Account', transfers: 'Transfers', transDesc: 'Instant money transfers.', newTrans: 'New Transfer', notif: 'Notifications', readAll: 'Read all', noNotif: 'No new notifications', cardManage: 'Card Management', lock: 'Lock', freeze: 'Freeze', details: 'Details', exp: 'Expiry', phone: 'By Phone', card: 'By Card Number', amount: 'Amount', comment: 'Message to recipient', send: 'Send', morning: 'Good morning', day: 'Good afternoon', evening: 'Good evening', night: 'Good night', soon: 'Coming soon!', copied: 'Copied!', recipientFound: 'Recipient', recent: 'Recent transfers', logoutTitle: 'Log out?', logoutDesc: 'You will need to enter your credentials again.', cancel: 'Cancel', logoutBtn: 'Log out', pinTitle: 'Account Security', pinDesc1: 'Create a 4-digit PIN for login', pinDesc2: 'Confirm your new PIN', pinMismatch: 'Does not match. Try again', pinSuccess: 'PIN code set!', cardNameLabel: 'Account Name', saveBtn: 'Save', changeBtn: 'Change', currTitle: 'Change currency?', currDesc: 'You selected a country card. Change your main currency to', yes: 'Yes', no: 'No', continue: 'Continue', receipt: 'Receipt', done: 'Done', selectMethod: 'Where to transfer?', close: 'Close' },
  es: { dash: 'Inicio', hist: 'Operaciones', set: 'Ajustes', acc: 'Cuenta Principal', transfers: 'Transferencias', transDesc: 'Envío instantáneo de fondos.', newTrans: 'Nueva transferencia', notif: 'Notificaciones', readAll: 'Leer todo', noNotif: 'No hay notificaciones', cardManage: 'Gestión de Tarjeta', lock: 'Bloq.', freeze: 'Congel.', details: 'Detalles', exp: 'Caduca', phone: 'Por Teléfono', card: 'Por Tarjeta', amount: 'Cantidad', comment: 'Mensaje al destinatario', send: 'Enviar', morning: 'Buenos días', day: 'Buenas tardes', evening: 'Buenas noches', night: 'Buenas noches', soon: '¡Próximamente!', copied: '¡Copiado!', recipientFound: 'Destinatario', recent: 'Transferencias recientes', logoutTitle: '¿Cerrar sesión?', logoutDesc: 'Deberá volver a introducir sus credenciales.', cancel: 'Cancelar', logoutBtn: 'Salir', pinTitle: 'Seguridad', pinDesc1: 'Cree un PIN de 4 dígitos', pinDesc2: 'Confirme su nuevo PIN', pinMismatch: 'No coincide. Inténtalo de nuevo', pinSuccess: '¡PIN configurado!', cardNameLabel: 'Nombre de la cuenta', saveBtn: 'Guardar', changeBtn: 'Cambiar', currTitle: 'Cambiar moneda?', currDesc: 'Ha seleccionado una tarjeta de país. ¿Desea cambiar su moneda a', yes: 'Sí', no: 'No', continue: 'Continuar', receipt: 'Recibo', done: 'Hecho', selectMethod: '¿A dónde transferir?', close: 'Cerrar' }
};

type TransferStep = 'select' | 'phone_input' | 'phone_details' | 'card_details' | 'processing' | 'success_phone' | 'success_card';

export default function Dashboard() {
  const { token, userData, setUserData, logout, language, sound } = useStore();
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
  
  const [currencyPrompt, setCurrencyPrompt] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newCardName, setNewCardName] = useState('');

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferStep, setTransferStep] = useState<TransferStep>('select');
  const [selectedBank, setSelectedBank] = useState(BANKS[0]);
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

  const [inAppNotif, setInAppNotif] = useState<{title: string, message: string} | null>(null);

  const isFirstLoadRef = useRef(true);
  const latestNotifIdRef = useRef<string | null>(null);
  const isTransferModalOpenRef = useRef(false);
  const pendingNotifRef = useRef<any>(null); 
  
  const receiptRef = useRef<HTMLDivElement>(null); 
  
  const t = translations[language as keyof typeof translations] || translations.ru;

  useEffect(() => { isTransferModalOpenRef.current = isTransferModalOpen; }, [isTransferModalOpen]);

  const playSound = (type: string) => {
    if (!type || type === 'off') return;
    try {
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
    } catch (e) {}
  };

  const showInAppNotification = (title: string, message: string) => {
    setInAppNotif({ title, message });
    playSound(sound || 's1'); 
    setTimeout(() => setInAppNotif(null), 4000);
  };

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
      const savedPin = localStorage.getItem(`pin_${userData?.account?.userId}`);
      if (!savedPin && !isPinSetupOpen) setIsPinSetupOpen(true);
    };
    const interval = setInterval(checkPin, 15000);
    setTimeout(checkPin, 2000);
    return () => clearInterval(interval);
  }, [userData?.account?.userId, isPinSetupOpen]);

  const handlePinPress = (num: string) => {
    setPinError('');
    if (pinStep === 1) {
      setPinCode(prev => {
        const newCode = prev + num;
        if (newCode.length === 4) setTimeout(() => setPinStep(2), 300);
        return newCode;
      });
    } else {
      setPinConfirm(prev => {
        const newConfirm = prev + num;
        if (newConfirm.length === 4) {
          if (newConfirm === pinCode && userData?.account?.userId) {
            localStorage.setItem(`pin_${userData.account.userId}`, pinCode);
            setTimeout(() => { setIsPinSetupOpen(false); setPinStep(1); setPinCode(''); setPinConfirm(''); }, 500);
          } else { setPinError(t.pinMismatch); return ''; }
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
      if (/^[0-9]$/.test(e.key)) handlePinPress(e.key);
      else if (e.key === 'Backspace') handlePinDelete();
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

  const getGreeting = (fullName: string | undefined) => {
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
        
        const newNotifs = data.notifications || [];
        
        if (newNotifs.length > 0) {
          const currentLatestId = newNotifs[0].id;
          if (!isFirstLoadRef.current && latestNotifIdRef.current !== currentLatestId) {
            if (isTransferModalOpenRef.current) {
              pendingNotifRef.current = newNotifs[0];
            } else {
              showInAppNotification('NXT-D Bank', newNotifs[0].message);
            }
          }
          latestNotifIdRef.current = currentLatestId;
        } else {
          latestNotifIdRef.current = null;
        }
        
        isFirstLoadRef.current = false;
        setNotifications(newNotifs);
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
            if (tx.receiver) { displayName = `${tx.receiver.firstName} ${tx.receiver.lastName.charAt(0)}.`; initial = tx.receiver.firstName.charAt(0); } 
            else { displayName = tx.target.slice(-4); initial = '#'; }
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
      setTransferData({ ...transferData, cardOrAccount: target });
      setTransferStep('card_details');
    } else {
      const matchedCountry = countries.find(c => target.startsWith(c.code)) || countries[0];
      setSelectedCountry(matchedCountry);
      const rawPhone = target.replace(matchedCountry.code, '');
      setTransferData({ ...transferData, rawPhone });
      setTransferStep('phone_details');
    }
  };

  useEffect(() => {
    if (!loading && location.state?.repeatTx) {
      const { target, amount } = location.state.repeatTx;
      const safeTarget = target || '';
      setIsTransferModalOpen(true);
      if (safeTarget.length >= 16 && !safeTarget.includes('+')) {
        setTransferData(prev => ({ ...prev, cardOrAccount: safeTarget, amount: String(amount) }));
        setTransferStep('card_details');
      } else {
        const matchedCountry = countries.find(c => safeTarget.startsWith(c.code)) || countries[0];
        setSelectedCountry(matchedCountry);
        const rawPhone = safeTarget.replace(matchedCountry.code, '');
        setTransferData(prev => ({ ...prev, rawPhone, amount: String(amount) }));
        setTransferStep('phone_details');
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state, loading]);

  useEffect(() => {
    const fetchRecipient = async () => {
      const isPhoneStep = transferStep === 'phone_input' || transferStep === 'phone_details' || transferStep === 'success_phone';
      const target = isPhoneStep ? (transferData.rawPhone.length >= selectedCountry.length ? `${selectedCountry.code}${transferData.rawPhone}` : '') : (transferData.cardOrAccount.length >= 16 ? transferData.cardOrAccount : '');
      
      if (target && token) {
        try {
          const res = await fetch(`https://nxt-d-bank-backend.onrender.com/api/bank/resolve-recipient?target=${encodeURIComponent(target)}`, { headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) { const data = await res.json(); setRecipientName(data.name); }
        } catch (e) { setRecipientName(null); }
      } else setRecipientName(null);
    };
    const delay = setTimeout(fetchRecipient, 300);
    return () => clearTimeout(delay);
  }, [transferData.rawPhone, transferData.cardOrAccount, transferStep, selectedCountry, token]);

  useEffect(() => { 
    if (token) {
      fetchDashboard(); 
      fetchRecentRecipients(); 
      const intervalId = setInterval(() => { fetchDashboard(); }, 5000);
      const handleFocus = () => { fetchDashboard(); fetchRecentRecipients(); };
      window.addEventListener('focus', handleFocus);
      return () => {
        clearInterval(intervalId);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [token]);

  const handleLogout = () => { setIsLogoutModalOpen(false); logout(); navigate('/login'); };

  const changeDesign = async (direction: number) => {
    let newIndex = activeDesignIndex + direction;
    if (newIndex < 0) newIndex = cardDesigns.length - 1;
    if (newIndex >= cardDesigns.length) newIndex = 0;
    setActiveDesignIndex(newIndex);
    try { await fetch('https://nxt-d-bank-backend.onrender.com/api/bank/card/design', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ designIndex: newIndex }) }); } catch (e) {}
  };

  const handleCloseCardModal = () => {
    setIsCardModalOpen(false);
    const activeDesign = cardDesigns[activeDesignIndex];
    if (activeDesign.currency && userData?.account?.currency !== activeDesign.currency) {
      setTimeout(() => setCurrencyPrompt(activeDesign.currency), 300);
    }
  };

  const handleCloseTransferModal = () => {
    setIsTransferModalOpen(false);
    setTimeout(() => {
      setTransferStep('select');
      setTransferData({ rawPhone: '', cardOrAccount: '', amount: '', comment: '' });
      setTransferStatus('');
      
      if (pendingNotifRef.current) {
        showInAppNotification('NXT-D Bank', pendingNotifRef.current.message);
        pendingNotifRef.current = null;
      }
    }, 300);
  };

  const handleAcceptCurrencyChange = async () => {
    if (!currencyPrompt) return;
    try {
      await fetch('https://nxt-d-bank-backend.onrender.com/api/bank/currency', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ currency: currencyPrompt }) });
      await fetchDashboard();
    } catch (error) {}
    setCurrencyPrompt(null);
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
    setTransferStatus('');
    const isPhone = transferStep === 'phone_details' || transferStep === 'phone_input';
    const finalTarget = isPhone ? `${selectedCountry.code}${transferData.rawPhone}` : transferData.cardOrAccount;
    
    try {
      const response = await fetch('https://nxt-d-bank-backend.onrender.com/api/bank/transfer', { 
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ receiverPhone: finalTarget, amount: Number(transferData.amount), comment: transferData.comment }) 
      });
      if (response.ok) {
        setTransferStep('processing');
        fetchRecentRecipients(); 
        fetchDashboard(); 

        setTimeout(() => {
          setTransferStep(isPhone ? 'success_phone' : 'success_card');
        }, 1500);

      } else { 
        const err = await response.json();
        setTransferStatus(err.message || 'Ошибка'); 
      }
    } catch (error) { setTransferStatus('Ошибка сети'); }
  };

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`NXT_Receipt_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Ошибка создания PDF', err);
    }
  };

  const handleSaveCardName = async () => {
    setIsEditingName(false);
    if (!newCardName.trim()) return;
    const card = userData.cards?.[0];
    if (!card) return;
    const updatedCards = [...userData.cards];
    updatedCards[0] = { ...card, cardName: newCardName.trim() };
    setUserData({ ...userData, cards: updatedCards });
    try { await fetch('https://nxt-d-bank-backend.onrender.com/api/bank/card/name', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ cardId: card.id, cardName: newCardName.trim() }) }); } catch (error) {}
  };

  if (loading || !userData) return <div className="min-h-screen bg-[#F3F6F8] dark:bg-slate-900 flex items-center justify-center"><div className="animate-pulse w-16 h-16 bg-blue-500/20 rounded-full"></div></div>;
  
  const currentDesign = cardDesigns[activeDesignIndex] || cardDesigns[0];
  const pinCurrentLength = pinStep === 1 ? pinCode.length : pinConfirm.length;
  const myCardSystem = getCardSystem(userData?.cards?.[0]?.number || '');
  const transferCardSystem = getCardSystem(transferData.cardOrAccount);

  const safeCurrency = userData?.account?.currency || 'RUB';
  const safeBalance = userData?.account?.balance || 0;

  return (
    <div className="min-h-screen bg-[#F3F6F8] dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-300">
      
      <AnimatePresence>
        {inAppNotif && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 24, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[9999] w-[90%] max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-4 flex items-start gap-4"
          >
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shrink-0 shadow-md">
              <span className="text-white font-black text-lg">N</span>
            </div>
            <div className="flex-1 mt-0.5">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight mb-1">{inAppNotif.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">{inAppNotif.message}</p>
            </div>
            <button onClick={() => setInAppNotif(null)} className="text-slate-400 hover:text-slate-600 transition p-1">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <aside className="w-full md:w-64 bg-white dark:bg-[#0A192F] border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex flex-col justify-between md:min-h-screen z-10 relative transition-colors duration-300">
        <div>
          <div className="p-8 hidden md:block">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3"><img src="/logo.png" alt="NXT Logo" className="w-8 h-8 object-contain drop-shadow-md" />NXT-D</h1>
          </div>
          <nav className="p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
            <button className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 w-full justify-center md:justify-start"><CreditCard className="w-5 h-5" /> <span className="hidden md:inline">{t.dash}</span></button>
            <button onClick={() => navigate('/history')} className="hover:bg-slate-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 w-full justify-center md:justify-start"><History className="w-5 h-5" /> <span className="hidden md:inline">{t.hist}</span></button>
            <button onClick={() => navigate('/settings')} className="hover:bg-slate-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 w-full justify-center md:justify-start"><Settings className="w-5 h-5" /> <span className="hidden md:inline">{t.set}</span></button>
          </nav>
        </div>
        <div className="p-4 hidden md:block">
          <div className="bg-slate-50 dark:bg-[#112240] p-4 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 overflow-hidden"><div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">{userData?.client?.charAt(0) || 'U'}</div><div className="truncate"><p className="text-slate-900 dark:text-white font-medium text-sm truncate">{userData?.client?.split(' ')[0]}</p></div></div>
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
            <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{getGreeting(userData?.client)}</motion.h2>
            
            <div className="relative z-40">
              <button 
                onMouseEnter={() => setIsBellHovered(true)} 
                onMouseLeave={() => setIsBellHovered(false)} 
                onClick={() => setIsNotifOpen(!isNotifOpen)} 
                className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm relative text-slate-500 hover:text-blue-500 transition focus:outline-none"
              >
                <motion.div animate={isBellHovered ? { rotate: [0, 15, -15, 15, -15, 0] } : {}} transition={{ duration: 0.5 }}><Bell className="w-6 h-6" /></motion.div>
                {notifications.length > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>}
              </button>
              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50"><h3 className="font-bold text-sm">{t.notif}</h3>{notifications.length > 0 && <button onClick={handleMarkAllRead} className="text-xs text-blue-500 font-medium hover:text-blue-700">{t.readAll}</button>}</div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">{t.noNotif}</div> : notifications.map((notif: any) => (
                        <div key={notif.id} onClick={() => handleNotificationClick(notif.transactionId)} className="p-4 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition cursor-pointer">
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
              
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsCardModalOpen(true)} className={`relative overflow-hidden bg-gradient-to-br ${currentDesign.classes || 'bg-slate-900'} p-8 rounded-[2rem] text-white shadow-2xl shadow-blue-900/10 cursor-pointer group transform-gpu`}>
                
                {currentDesign.flag ? (
                  <>
                    <img src={currentDesign.flag} alt="flag" className="absolute inset-0 w-full h-full object-cover z-0 opacity-50 transition-opacity duration-500" />
                    <div className="absolute inset-0 bg-black/50 z-0"></div>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300 pointer-events-none z-0"></div>
                    <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-bl from-white/20 to-transparent pointer-events-none z-0"></div>
                  </>
                )}

                <div className="relative z-10 flex justify-between items-start mb-10">
                  <div>
                    <p className="text-white/80 text-sm font-medium mb-1">{userData?.cards?.[0]?.cardName || t.acc}</p>
                    <h3 className="text-4xl md:text-5xl font-light tracking-tight">{formatMoney(safeBalance)} <span className="font-normal opacity-80">{safeCurrency}</span></h3>
                  </div>
                  <span className="text-2xl font-black tracking-widest opacity-90">NXT</span>
                </div>
                <div className="relative z-10 flex justify-between items-end">
                  <div>
                    <p className="font-mono text-lg md:text-xl tracking-[0.15em] mb-1 drop-shadow-md">{userData?.cards?.[0]?.number?.match(/.{1,4}/g)?.join(' ')}</p>
                    <p className="text-sm text-white/80 uppercase tracking-widest">{userData?.cards?.[0]?.ownerName}</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="font-mono mb-2">{userData?.cards?.[0]?.expiryDate}</p>
                    {myCardSystem?.logo ? <img src={myCardSystem.logo} alt={myCardSystem.name} className={`${myCardSystem.customClass} object-contain drop-shadow-md`} /> : myCardSystem ? <div className={`tracking-wider text-xl md:text-2xl ${myCardSystem.icon}`}>{myCardSystem.name}</div> : <div className="flex -space-x-3"><div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-500/90 mix-blend-multiply"></div><div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-yellow-400/90 mix-blend-multiply"></div></div>}
                  </div>
                </div>
              </motion.div>
            </div>
            
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4"><Send className="w-6 h-6" /></div>
                <h3 className="text-xl font-bold mb-2">{t.transfers}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t.transDesc}</p>
                <button 
                  onClick={() => { setIsTransferModalOpen(true); setTransferStep('select'); }}
                  className="w-full bg-[#0A192F] dark:bg-blue-600 hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition"
                >
                  {t.newTrans}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isCardModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh]">
              
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white"><CreditCard className="w-6 h-6 text-blue-500" /> {t.cardManage}</h2>
                <button onClick={handleCloseCardModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition text-slate-500 dark:text-slate-400"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex-1 overflow-y-auto">
                <div className="relative flex items-center justify-center mb-6 group">
                  <button onClick={() => changeDesign(-1)} className="absolute left-[-10px] z-20 p-2 bg-white dark:bg-slate-800 rounded-full shadow-md text-slate-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition"><ChevronLeft className="w-5 h-5" /></button>
                  
                  <div className={`w-full bg-gradient-to-br ${currentDesign.classes || 'bg-slate-900'} p-6 rounded-2xl text-white shadow-lg shadow-blue-900/10 relative overflow-hidden transition-all duration-500`}>
                    
                    {currentDesign.flag ? (
                      <>
                        <img src={currentDesign.flag} alt="flag" className="absolute inset-0 w-full h-full object-cover z-0 opacity-50" />
                        <div className="absolute inset-0 bg-black/50 z-0"></div>
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-white/5 z-0"></div>
                    )}

                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div>
                        <p className="text-white/80 text-xs font-medium mb-1">{userData?.cards?.[0]?.cardName || t.acc}</p>
                        <h3 className="text-xl font-light">{formatMoney(safeBalance)} {safeCurrency}</h3>
                      </div>
                      <span className="font-bold">NXT</span>
                    </div>
                    <div className="flex justify-between items-end relative z-10">
                      <div><p className="font-mono text-sm tracking-widest">{userData?.cards?.[0]?.number?.slice(-4).padStart(19, '• ')}</p></div>
                      {myCardSystem?.logo ? <img src={myCardSystem.logo} alt={myCardSystem.name} className={`${myCardSystem.customClass} scale-75 transform origin-bottom-right object-contain drop-shadow-md`} /> : myCardSystem ? <div className={`tracking-wider text-sm ${myCardSystem.icon} scale-75 transform origin-bottom-right`}>{myCardSystem.name}</div> : <div className="flex -space-x-2"><div className="w-6 h-6 rounded-full bg-red-500/90 mix-blend-multiply"></div><div className="w-6 h-6 rounded-full bg-yellow-400/90 mix-blend-multiply"></div></div>}
                    </div>
                  </div>

                  <button onClick={() => changeDesign(1)} className="absolute right-[-10px] z-20 p-2 bg-white dark:bg-slate-800 rounded-full shadow-md text-slate-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition"><ChevronRight className="w-5 h-5" /></button>
                </div>

                <div className="mb-6">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">{t.cardNameLabel}</h4>
                  <div className="bg-white dark:bg-slate-800 p-2 pl-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center transition-colors">
                    {isEditingName ? <input type="text" value={newCardName} onChange={(e) => setNewCardName(e.target.value)} className="bg-transparent outline-none text-slate-900 dark:text-white font-medium w-full" placeholder={t.acc} maxLength={20} autoFocus /> : <span className="font-medium text-slate-700 dark:text-slate-200 truncate pr-4">{userData?.cards?.[0]?.cardName || t.acc}</span>}
                    {isEditingName ? <button onClick={handleSaveCardName} className="p-2 ml-2 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg font-bold text-xs shrink-0 transition hover:bg-blue-100 dark:hover:bg-blue-500/30">{t.saveBtn}</button> : <button onClick={() => { setNewCardName(userData?.cards?.[0]?.cardName || t.acc); setIsEditingName(true); }} className="p-2 ml-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-500 transition text-xs font-bold uppercase shrink-0">{t.changeBtn}</button>}
                  </div>
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
                      <span className="font-mono text-lg text-slate-700 dark:text-slate-200">{userData?.cards?.[0]?.number?.match(/.{1,4}/g)?.join(' ')}</span>
                      <button onClick={() => copyToClipboard(userData?.cards?.[0]?.number || '')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition" title={t.copied}>{copied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-slate-400 hover:text-blue-500 transition" />}</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center"><span className="font-mono text-lg text-slate-700 dark:text-slate-200">{userData?.cards?.[0]?.expiryDate}</span><span className="text-xs text-slate-400 font-bold uppercase">{t.exp}</span></div>
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center group relative overflow-hidden"><span className="font-mono text-lg text-slate-700 dark:text-slate-200 opacity-0 group-hover:opacity-100 transition">{userData?.cards?.[0]?.cvv}</span><span className="absolute left-4 font-mono text-lg text-slate-700 dark:text-slate-200 group-hover:opacity-0 transition">***</span><span className="text-xs text-slate-400 font-bold uppercase z-10">CVV</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛЬНОЕ ОКНО ПЕРЕВОДА */}
      <AnimatePresence>
        {isTransferModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#1C1C1E] w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative border border-white/10">
              
              {(transferStep !== 'processing' && transferStep !== 'success_phone' && transferStep !== 'success_card') && (
                <div className="p-5 flex items-center justify-between shrink-0 relative border-b border-white/5">
                  {transferStep !== 'select' ? (
                    <button onClick={() => setTransferStep('select')} className="p-2 -ml-2 text-blue-500 font-medium flex items-center gap-1 z-10 transition hover:opacity-80"><ChevronLeft className="w-5 h-5" /> Назад</button>
                  ) : (
                    <div className="w-10"></div>
                  )}
                  <h2 className="text-[17px] font-semibold text-white absolute left-1/2 -translate-x-1/2">{
                    transferStep === 'select' ? t.selectMethod : 
                    transferStep === 'phone_input' ? t.phone :
                    transferStep === 'card_details' ? t.card : 'Перевод'
                  }</h2>
                  <button onClick={handleCloseTransferModal} className="p-2 -mr-2 text-slate-400 hover:text-white transition z-10"><X className="w-5 h-5" /></button>
                </div>
              )}

              {/* ШАГ 1 */}
              {transferStep === 'select' && (
                <div className="p-6 flex-1 flex flex-col gap-4">
                  <button onClick={() => setTransferStep('phone_input')} className="bg-[#2C2C2E] hover:bg-[#3C3C3E] p-6 rounded-3xl flex flex-col items-center justify-center gap-4 transition">
                    <div className="w-16 h-16 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center"><Smartphone className="w-8 h-8"/></div>
                    <span className="text-white font-semibold text-lg">{t.phone}</span>
                  </button>
                  <button onClick={() => setTransferStep('card_details')} className="bg-[#2C2C2E] hover:bg-[#3C3C3E] p-6 rounded-3xl flex flex-col items-center justify-center gap-4 transition">
                    <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center"><CreditCard className="w-8 h-8"/></div>
                    <span className="text-white font-semibold text-lg">{t.card}</span>
                  </button>
                </div>
              )}

              {/* ШАГ 2 */}
              {transferStep === 'phone_input' && (
                <div className="p-6 flex-1 overflow-y-auto scrollbar-hide">
                  <div className="flex relative bg-[#2C2C2E] rounded-2xl mb-6">
                    <div className="relative">
                      <button type="button" onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)} className="flex items-center gap-2 h-full px-4 border-r border-[#3C3C3E] transition hover:opacity-80"><span className="text-xl">{selectedCountry.flag}</span><span className="font-medium text-white">{selectedCountry.code}</span><ChevronDown className="w-4 h-4 text-slate-400" /></button>
                      {isCountryDropdownOpen && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-[#2C2C2E] rounded-xl shadow-xl z-50 overflow-hidden border border-[#3C3C3E]">
                          {countries.map(c => <button key={c.code} type="button" onClick={() => { setSelectedCountry(c); setIsCountryDropdownOpen(false); setTransferData({...transferData, rawPhone: ''}); }} className="w-full flex items-center gap-3 p-3 hover:bg-[#3C3C3E] text-left transition"><span className="text-xl">{c.flag}</span><div><p className="font-bold text-sm text-white">{c.code}</p><p className="text-xs text-slate-400">{c.name}</p></div></button>)}
                        </div>
                      )}
                    </div>
                    <input type="text" placeholder={selectedCountry.placeholder} value={formatPhoneDisplay(transferData.rawPhone)} onChange={handlePhoneInput} className="w-full bg-transparent p-4 outline-none text-xl font-medium text-white" autoFocus />
                  </div>

                  <button 
                    disabled={transferData.rawPhone.length < selectedCountry.length} 
                    onClick={() => { setTransferStep('phone_details'); }} 
                    className="w-full bg-blue-600 disabled:bg-[#2C2C2E] disabled:text-slate-500 text-white font-semibold py-4 rounded-xl transition hover:bg-blue-700 mb-8"
                  >
                    {t.continue}
                  </button>

                  {recentRecipients.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-400 mb-4">{t.recent}</h4>
                      <div className="flex flex-col gap-2">
                        {recentRecipients.map((rec, i) => (
                          <button key={i} onClick={() => handleSelectRecent(rec.target)} className="flex items-center gap-4 p-3 bg-[#2C2C2E] hover:bg-[#3C3C3E] rounded-2xl transition text-left">
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-lg font-bold">{rec.initial}</div>
                            <div>
                              <span className="block font-medium text-white">{rec.displayName}</span>
                              <span className="block text-xs text-slate-400">{rec.target}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ШАГ 3 */}
              {transferStep === 'phone_details' && (
                <div className="p-4 flex-1 overflow-y-auto scrollbar-hide">
                  <form onSubmit={handleTransfer}>
                    
                    <div className="bg-[#2C2C2E] border border-white/5 rounded-3xl p-5 mb-6 shadow-lg">
                      <p className="text-sm text-slate-400 font-medium mb-1">{userData?.cards?.[0]?.cardName || 'Счет'}</p>
                      <h3 className="text-3xl font-bold text-white tracking-tight">{formatMoney(safeBalance)} <span className="text-slate-500">{safeCurrency}</span></h3>
                    </div>

                    <div className="mb-6 px-2">
                      <p className="text-lg text-white font-medium">{recipientName || 'Неизвестный'}</p>
                      <p className="text-slate-400 font-mono text-sm">{selectedCountry.code} {formatPhoneDisplay(transferData.rawPhone)}</p>
                    </div>

                    {/* Банки - горизонтальный скролл */}
                    <div className="flex gap-3 overflow-x-auto pb-4 mb-2 px-2 snap-x" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                      {BANKS.map(bank => (
                        <div key={bank.id} onClick={() => setSelectedBank(bank)} className={`w-[104px] h-[104px] rounded-[1.25rem] flex flex-col p-3 cursor-pointer shrink-0 border-2 transition-all snap-start ${selectedBank.id === bank.id ? bank.border : 'border-transparent bg-[#2C2C2E] hover:bg-[#3C3C3E]'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-auto ${selectedBank.id === bank.id || bank.id === 'nxt' ? bank.bg : 'bg-[#1C1C1E]'} ${selectedBank.id === bank.id || bank.id === 'nxt' ? bank.text : 'text-slate-400'}`}>
                            {bank.logo}
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-white leading-tight">{bank.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{recipientName?.split(' ')[0] || ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mb-4">
                      <div className="relative">
                        <input type="number" placeholder={`Сумма от 0,01 ${safeCurrency}`} value={transferData.amount} onChange={(e) => setTransferData({...transferData, amount: e.target.value})} className="w-full bg-[#2C2C2E] p-4 rounded-2xl outline-none font-medium text-white transition focus:ring-1 focus:ring-white/20" required />
                      </div>
                    </div>

                    <div className="mb-8">
                      <input type="text" placeholder={t.comment} value={transferData.comment} onChange={(e) => setTransferData({...transferData, comment: e.target.value})} className="w-full bg-[#2C2C2E] p-4 rounded-2xl outline-none text-white transition focus:ring-1 focus:ring-white/20" />
                    </div>

                    <button type="submit" disabled={!transferData.amount} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-[#2C2C2E] disabled:text-slate-500 text-white font-semibold py-4 rounded-2xl text-lg transition shadow-lg shadow-blue-900/20">
                      {t.send} {transferData.amount ? `${formatMoney(transferData.amount)} ${safeCurrency}` : ''}
                    </button>
                    {transferStatus && <p className="text-red-500 text-center mt-4 font-medium">{transferStatus}</p>}
                  </form>
                </div>
              )}

              {/* ШАГ 4 */}
              {transferStep === 'card_details' && (
                <div className="p-4 flex-1 overflow-y-auto scrollbar-hide">
                  <form onSubmit={handleTransfer}>
                    <div className="bg-[#2C2C2E] border border-white/5 rounded-3xl p-5 mb-8 shadow-lg">
                      <p className="text-sm text-slate-400 font-medium mb-1">{userData?.cards?.[0]?.cardName || 'Счет'}</p>
                      <h3 className="text-3xl font-bold text-white tracking-tight">{formatMoney(safeBalance)} <span className="text-slate-500">{safeCurrency}</span></h3>
                    </div>

                    <div className="mb-4 relative">
                      <input type="text" placeholder="0000 0000 0000 0000" value={formatCardDisplay(transferData.cardOrAccount)} onChange={(e) => setTransferData({...transferData, cardOrAccount: e.target.value.replace(/\D/g, '')})} className={`w-full bg-[#2C2C2E] h-14 pr-4 rounded-2xl outline-none font-medium text-white transition-all duration-300 focus:ring-1 focus:ring-white/20 ${transferCardSystem ? 'pl-[70px]' : 'pl-4'}`} required />
                      <AnimatePresence>
                        {transferCardSystem && (
                          <motion.div initial={{ opacity: 0, x: -10, y: '-50%' }} animate={{ opacity: 1, x: 0, y: '-50%' }} exit={{ opacity: 0, x: -10, y: '-50%' }} className={`absolute left-3 top-1/2 px-2 flex items-center justify-center h-8 rounded-lg shadow-sm pointer-events-none ${transferCardSystem.style}`}>
                            {transferCardSystem.logo ? <img src={transferCardSystem.logo} alt={transferCardSystem.name} className="h-3 object-contain" /> : <span className={`text-[10px] font-black italic`}>{transferCardSystem.name}</span>}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {recipientName && (
                      <div className="mb-4 px-2 text-white font-medium">{recipientName}</div>
                    )}

                    <div className="mb-8">
                      <input type="number" placeholder={`Сумма в ${safeCurrency}`} value={transferData.amount} onChange={(e) => setTransferData({...transferData, amount: e.target.value})} className="w-full bg-[#2C2C2E] p-4 rounded-2xl outline-none font-medium text-white transition focus:ring-1 focus:ring-white/20" required />
                    </div>

                    <button type="submit" disabled={!transferData.amount || transferData.cardOrAccount.length < 16} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-[#2C2C2E] disabled:text-slate-500 text-white font-semibold py-4 rounded-2xl text-lg transition shadow-lg shadow-blue-900/20">
                      {t.send} {transferData.amount ? `${formatMoney(transferData.amount)} ${safeCurrency}` : ''}
                    </button>
                    {transferStatus && <p className="text-red-500 text-center mt-4 font-medium">{transferStatus}</p>}
                  </form>
                </div>
              )}

              {/* ШАГ 5 (Анимация) */}
              {transferStep === 'processing' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-10 min-h-[400px]">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: [0, 10, 0] }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.4)]">
                    <CheckCircle2 className="w-14 h-14 text-white" />
                  </motion.div>
                  <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-2xl font-bold text-white mt-6">
                    {formatMoney(transferData.amount)} {safeCurrency}
                  </motion.p>
                </motion.div>
              )}

              {/* ШАГ 6 (Успех Телефон - NXT Стиль) */}
              {transferStep === 'success_phone' && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col h-full bg-[#1C1C1E] min-h-[500px] overflow-hidden">
                  <div className="p-5 flex justify-between shrink-0">
                    <button onClick={handleCloseTransferModal} className="text-blue-500 font-medium hover:text-blue-400 transition">{t.close}</button>
                  </div>
                  <div className="flex-1 overflow-y-auto flex flex-col items-center px-6 pt-4 pb-8 scrollbar-hide">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-4 relative ${selectedBank.bg} ${selectedBank.text}`}>
                      {selectedBank.logo}
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 border-2 border-[#1C1C1E] rounded-full flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-white"/></div>
                    </div>
                    <h3 className="text-xl font-medium text-white mb-1">{recipientName || 'Неизвестный'}</h3>
                    <p className="text-slate-400 font-mono mb-6">{selectedCountry.code} {formatPhoneDisplay(transferData.rawPhone)}</p>
                    <h2 className="text-4xl font-bold text-white tracking-tight mb-8">-{formatMoney(transferData.amount)} <span className="text-slate-400">{safeCurrency}</span></h2>
                    
                    <button onClick={handleDownloadReceipt} className="flex flex-col items-center gap-2 p-3 bg-[#2C2C2E] hover:bg-[#3C3C3E] rounded-2xl w-24 transition mb-auto">
                      <FileText className="w-6 h-6 text-blue-500" />
                      <span className="text-xs font-medium text-blue-500">{t.receipt}</span>
                    </button>

                    <div className="w-full bg-[#2C2C2E] border border-white/5 rounded-3xl p-4 mt-8">
                      <p className="text-slate-400 text-sm mb-2">Перевод со счета</p>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold">{safeCurrency.charAt(0)}</div>
                        <div className="flex-1">
                          <p className="text-white font-medium">{userData?.cards?.[0]?.cardName || 'Счет'}</p>
                          <p className="text-slate-400 text-xs font-mono">{formatMoney(Number(safeBalance) + Number(transferData.amount))} → {formatMoney(safeBalance)}</p>
                        </div>
                      </div>
                    </div>

                    <button onClick={handleCloseTransferModal} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl text-lg mt-4 transition shadow-lg shadow-blue-900/20">
                      {t.done}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ШАГ 7 (Успех Карта - NXT Стиль) */}
              {transferStep === 'success_card' && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col h-full bg-[#1C1C1E] min-h-[500px] overflow-hidden">
                  <div className="p-5 flex justify-center border-b border-white/5 shrink-0">
                    <span className="font-semibold text-white">Перевод</span>
                  </div>
                  <div className="flex-1 overflow-y-auto flex flex-col items-center px-6 pt-10 pb-8 scrollbar-hide">
                    <p className="text-slate-400 mb-2">со счета <span className="text-white font-medium">{userData?.cards?.[0]?.cardName || 'cash'}</span></p>
                    <p className="text-slate-500 text-sm font-mono mb-6 line-through decoration-slate-500">{formatMoney(Number(safeBalance) + Number(transferData.amount))} {safeCurrency}</p>
                    
                    <h2 className="text-5xl font-bold text-white tracking-tight mb-12">-{formatMoney(transferData.amount)} <span className="text-slate-400">{safeCurrency}</span></h2>
                    
                    <div className="w-full bg-gradient-to-br from-[#2C2C2E] to-[#1C1C1E] rounded-[2rem] overflow-hidden shadow-xl border border-white/5 mb-auto relative">
                      <div className="h-20 bg-blue-600 w-full relative flex justify-center">
                         <span className="text-white font-medium mt-4">{recipientName || 'Неизвестный'}</span>
                         <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-[#1C1C1E] rounded-full flex items-center justify-center p-1.5 shadow-sm">
                           <div className="w-full h-full bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center font-black italic text-xl">N</div>
                         </div>
                      </div>
                      <div className="pt-12 pb-6 text-center">
                         <p className="text-slate-400 text-sm">Карта получателя</p>
                         <p className="text-white font-mono font-bold text-lg mt-1">220070******{transferData.cardOrAccount.slice(-4)}</p>
                      </div>
                    </div>

                    <div className="w-full flex justify-center mt-6 mb-4">
                      <button onClick={handleDownloadReceipt} className="text-blue-500 flex items-center gap-2 font-medium hover:text-blue-400 transition"><Download className="w-5 h-5"/> Скачать квитанцию</button>
                    </div>

                    <button onClick={handleCloseTransferModal} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl text-lg mt-4 transition shadow-lg shadow-blue-900/20">
                      {t.done}
                    </button>
                  </div>
                </motion.div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {currencyPrompt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2rem] shadow-2xl p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t.currTitle}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {t.currDesc} <span className="font-bold text-slate-900 dark:text-white">{currencyPrompt}</span>?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setCurrencyPrompt(null)} className="flex-1 py-3 font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition">
                  {t.no}
                </button>
                <button onClick={handleAcceptCurrencyChange} className="flex-1 py-3 font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition">
                  {t.yes}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLogoutModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2rem] shadow-2xl p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><LogOut className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t.logoutTitle}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t.logoutDesc}</p>
              <div className="flex gap-3">
                <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 py-3 font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition">{t.cancel}</button>
                <button onClick={handleLogout} className="flex-1 py-3 font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition">{t.logoutBtn}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPinSetupOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white dark:bg-slate-800 w-full max-w-xs rounded-[2rem] shadow-2xl p-6 relative flex flex-col items-center">
              <button onClick={() => setIsPinSetupOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><X className="w-5 h-5" /></button>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4"><Lock className="w-6 h-6" /></div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t.pinTitle}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6 h-10">{pinError ? <span className="text-red-500 font-bold">{pinError}</span> : (pinStep === 1 ? t.pinDesc1 : t.pinDesc2)}</p>
              <div className="flex gap-4 justify-center mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`w-4 h-4 rounded-full transition-colors duration-300 ${i < pinCurrentLength ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4 mb-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button key={num} onClick={() => handlePinPress(num.toString())} className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white text-2xl font-light hover:bg-blue-50 dark:hover:bg-slate-700 transition active:scale-95">{num}</button>
                ))}
                <div />
                <button onClick={() => handlePinPress('0')} className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white text-2xl font-light hover:bg-blue-50 dark:hover:bg-slate-700 transition active:scale-95">0</button>
                <button onClick={handlePinDelete} className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900/50 text-slate-400 hover:text-red-500 text-2xl font-light hover:bg-red-50 dark:hover:bg-slate-700 transition active:scale-95 flex items-center justify-center">⌫</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute left-[-10000px] top-[-10000px]">
        <div ref={receiptRef} className="w-[800px] bg-white p-12 text-black font-sans box-border relative">
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full text-white font-black text-2xl tracking-tighter text-center block" style={{ lineHeight: '64px' }}>NXT</div>
              <div>
                <h1 className="text-2xl font-bold text-blue-600 uppercase tracking-wide">NXT D-BANK</h1>
                <p className="text-slate-500 text-sm mt-1">Квитанция о переводе</p>
              </div>
            </div>
            <div className="text-right text-sm text-slate-600 leading-relaxed">NXT D-Bank Ltd.<br/>Global Financial District, 1<br/>support@nxtdbank.com</div>
          </div>
          <h2 className="text-2xl font-bold mb-8">Подтверждение платежа</h2>
          <div className="grid grid-cols-2 gap-y-8 gap-x-12 mb-16">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Отправитель</p>
              <p className="font-semibold text-lg">{userData?.client || 'Клиент'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Сумма платежа</p>
              <p className="font-bold text-2xl">{formatMoney(transferData.amount)} {safeCurrency}</p>
            </div>
            <div className="col-span-2 border-t border-slate-200 pt-8 mt-4">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Получатель</p>
              <p className="font-semibold text-lg">{recipientName || 'Неизвестный'}</p>
              <p className="text-sm text-slate-600 mt-1">{transferStep === 'success_phone' ? `${selectedCountry.code} ${transferData.rawPhone}` : transferData.cardOrAccount}</p>
            </div>
          </div>
          <div className="mt-20 pt-8 border-t border-slate-200 flex justify-between items-end relative">
            <div><p className="text-sm text-slate-600 mb-2">Оператор / Автоматизированная система</p><div className="w-48 border-b border-black mb-1"></div><p className="text-xs text-slate-500">Документ сгенерирован автоматически</p></div>
            <div className="absolute right-10 bottom-4 w-36 h-36 rounded-full border-4 border-blue-600/70 flex flex-col items-center justify-center text-blue-600/70 transform -rotate-12">
              <div className="w-32 h-32 rounded-full border border-blue-600/70 flex flex-col items-center justify-center p-2 text-center">
                <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">NXT D-Bank</span>
                <span className="text-[8px] font-bold uppercase leading-tight border-t border-b border-blue-600/70 py-1 my-1">Операция<br/>Проведена</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}