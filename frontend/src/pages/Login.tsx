import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { ShieldCheck, ArrowRight, UserPlus, LogIn, Lock, CreditCard } from 'lucide-react';

const cardSystems = [
  { id: 'n-cards', label: 'N-cards' },
  { id: 'visa', label: 'VISA' },
  { id: 'mastercard', label: 'MasterCard' },
  { id: 'mir', label: 'МИР' }
];

export default function Login() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const setToken = useStore((state) => state.setToken);

  const [isPinMode, setIsPinMode] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [savedPin, setSavedPin] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [pinError, setPinError] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    login: '',
    password: '',
    cardSystem: 'n-cards' // По умолчанию N-cards
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
    const payload = isLoginMode 
      ? { login: formData.login, password: formData.password }
      : formData;

    try {
      const response = await fetch(`https://nxt-d-bank-backend.onrender.com${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();

      if (response.ok) {
        if (isLoginMode) {
          try {
            const dashRes = await fetch(`https://nxt-d-bank-backend.onrender.com/api/bank/dashboard`, {
              headers: { 'Authorization': `Bearer ${data.token}` }
            });
            if (dashRes.ok) {
              const dashData = await dashRes.json();
              const userId = dashData.account?.userId;
              const localPin = localStorage.getItem(`pin_${userId}`);
              
              if (localPin) {
                setSavedPin(localPin);
                setTempToken(data.token);
                setIsPinMode(true);
              } else {
                setToken(data.token);
              }
            } else {
              setToken(data.token);
            }
          } catch (err) {
            setToken(data.token);
          }
        } else {
          setMessage({ type: 'success', text: 'Аккаунт создан! Теперь вы можете войти.' });
          setIsLoginMode(true);
          setFormData({ ...formData, password: '' });
        }
      } else {
        setMessage({ type: 'error', text: data.message || 'Произошла ошибка' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка подключения к серверу' });
    } finally {
      setLoading(false);
    }
  };

  const handlePinPress = (num: string) => {
    setPinError('');
    setPinCode(prev => {
      if (prev.length >= 4) return prev;
      const newCode = prev + num;
      if (newCode.length === 4) {
        if (newCode === savedPin) {
          setToken(tempToken);
        } else {
          setPinError('Неверный PIN-код');
          setTimeout(() => setPinCode(''), 300);
        }
      }
      return newCode;
    });
  };

  const handlePinDelete = () => {
    setPinError('');
    setPinCode(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPinMode) return;
      if (/^[0-9]$/.test(e.key)) {
        handlePinPress(e.key);
      } else if (e.key === 'Backspace') {
        handlePinDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPinMode, savedPin, tempToken]);

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-900 transition-colors duration-300">
      
      <div className="hidden lg:flex w-1/2 bg-[#0A192F] relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-blue-600/30 blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-cyan-600/20 blur-[100px]"></div>
        
        <div className="relative z-10">
          <div className="text-4xl font-black text-white tracking-tight flex items-center gap-3 mb-6">
            <img src="/logo.png" alt="NXT" className="w-12 h-12 drop-shadow-md" />
            NXT<span className="text-blue-500">.</span>
          </div>
          <h2 className="text-5xl font-light text-white leading-tight mt-12">
            Финансы нового <br/><span className="font-bold text-blue-400">поколения.</span>
          </h2>
        </div>

        <div className="relative z-10 glass-panel p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm max-w-md">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="text-blue-400 w-6 h-6" />
            <p className="text-blue-200 font-medium">Абсолютная безопасность</p>
          </div>
          <p className="text-slate-400 text-sm">Ваши данные защищены современными алгоритмами шифрования.</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          
          <AnimatePresence mode="wait">
            {!isPinMode ? (
              <motion.div 
                key="login-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="mb-10 text-center lg:text-left">
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    {isLoginMode ? 'С возвращением' : 'Создать аккаунт'}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400">
                    {isLoginMode ? 'Войдите, чтобы управлять финансами' : 'Присоединяйтесь к NXT D-Bank уже сегодня'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <AnimatePresence mode="wait">
                    {!isLoginMode && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, y: -20 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -20 }}
                        className="flex flex-col gap-4 overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <input type="text" name="firstName" placeholder="Имя" required={!isLoginMode}
                            value={formData.firstName} onChange={handleChange}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 transition outline-none dark:text-white"
                          />
                          <input type="text" name="lastName" placeholder="Фамилия" required={!isLoginMode}
                            value={formData.lastName} onChange={handleChange}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 transition outline-none dark:text-white"
                          />
                        </div>
                        <input type="tel" name="phone" placeholder="Телефон (+7...)" required={!isLoginMode}
                          value={formData.phone} onChange={handleChange}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 transition outline-none dark:text-white"
                        />
                        
                        {/* ВЫБОР ПЛАТЕЖНОЙ СИСТЕМЫ */}
                        <div className="mt-2 mb-2">
                          <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><CreditCard className="w-4 h-4"/> Выберите систему карты</p>
                          <div className="grid grid-cols-2 gap-2">
                            {cardSystems.map(sys => (
                              <button 
                                key={sys.id} 
                                type="button" 
                                onClick={() => setFormData({...formData, cardSystem: sys.id})}
                                className={`p-3 rounded-xl border text-sm font-bold transition ${formData.cardSystem === sys.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                              >
                                {sys.label}
                              </button>
                            ))}
                          </div>
                        </div>

                      </motion.div>
                    )}
                  </AnimatePresence>

                  <input type="text" name="login" placeholder="Логин" required
                    value={formData.login} onChange={handleChange}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 transition outline-none dark:text-white"
                  />
                  
                  <input type="password" name="password" placeholder="Пароль" required
                    value={formData.password} onChange={handleChange}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 transition outline-none dark:text-white"
                  />

                  <button disabled={loading} type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition duration-300 shadow-lg shadow-blue-600/20 flex justify-center items-center gap-2 mt-2 disabled:opacity-70"
                  >
                    {loading ? 'Обработка...' : (isLoginMode ? 'Войти в систему' : 'Открыть счет')}
                    {!loading && <ArrowRight className="w-5 h-5" />}
                  </button>
                </form>

                {message.text && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                    className={`mt-4 p-4 rounded-xl text-sm font-medium text-center ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-red-50 text-red-600 dark:bg-red-900/30'}`}
                  >
                    {message.text}
                  </motion.div>
                )}

                <div className="mt-8 text-center">
                  <button type="button" onClick={() => { setIsLoginMode(!isLoginMode); setMessage({ type: '', text: '' }); }}
                    className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition flex items-center justify-center gap-2 w-full"
                  >
                    {isLoginMode ? <><UserPlus className="w-4 h-4"/> Нет аккаунта? Зарегистрироваться</> : <><LogIn className="w-4 h-4"/> Уже есть аккаунт? Войти</>}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="pin-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <Lock className="w-8 h-8" />
                </div>
                
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Введите PIN-код</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8 h-6">
                  {pinError ? <span className="text-red-500 font-bold">{pinError}</span> : 'Для входа в аккаунт требуется подтверждение'}
                </p>

                <div className="flex gap-4 justify-center mb-10">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`w-4 h-4 rounded-full transition-colors duration-300 ${i < pinCode.length ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button key={num} type="button" onClick={() => handlePinPress(num.toString())} className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-2xl font-light hover:bg-blue-50 dark:hover:bg-slate-700 transition active:scale-95 flex items-center justify-center">
                      {num}
                    </button>
                  ))}
                  <div />
                  <button type="button" onClick={() => handlePinPress('0')} className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-2xl font-light hover:bg-blue-50 dark:hover:bg-slate-700 transition active:scale-95 flex items-center justify-center">
                    0
                  </button>
                  <button type="button" onClick={handlePinDelete} className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 text-2xl font-light hover:bg-red-50 dark:hover:bg-slate-700 transition active:scale-95 flex items-center justify-center">
                    ⌫
                  </button>
                </div>

                <button 
                  type="button" 
                  onClick={() => { setIsPinMode(false); setPinCode(''); setTempToken(''); setPinError(''); }} 
                  className="text-sm font-medium text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Войти под другим аккаунтом
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}