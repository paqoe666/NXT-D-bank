import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { ShieldCheck, ArrowRight, UserPlus, LogIn } from 'lucide-react';

export default function Login() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const setToken = useStore((state) => state.setToken);

  // Состояния полей
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    login: '',
    password: ''
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
          setToken(data.token); // Сохраняем токен, App.tsx сам перекинет нас в дашборд
        } else {
          setMessage({ type: 'success', text: 'Аккаунт создан! Теперь вы можете войти.' });
          setIsLoginMode(true);
          setFormData({ ...formData, password: '' }); // Очищаем пароль для безопасности
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

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-900 transition-colors duration-300">
      
      {/* ЛЕВАЯ ЧАСТЬ - Декоративная (Брендинг) */}
      <div className="hidden lg:flex w-1/2 bg-[#0A192F] relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-blue-600/30 blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-cyan-600/20 blur-[100px]"></div>
        
        <div className="relative z-10">
          <div className="text-4xl font-black text-white tracking-tight flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">N</span>
            </div>
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

      {/* ПРАВАЯ ЧАСТЬ - Форма */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          
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

        </div>
      </div>
    </div>
  );
}