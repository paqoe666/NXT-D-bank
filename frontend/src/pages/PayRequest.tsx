import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { Send, CheckCircle2, ArrowRight, Lock, History } from 'lucide-react';

const API = 'https://nxt-d-bank-backend.onrender.com';

const dict = {
  ru: {
    asks: 'просит у вас', anyAmount: 'любую сумму', pay: 'Оплатить', loginToPay: 'Войти и оплатить',
    loginHint: 'Оплата списывается с вашего счёта в NXT D-Bank', yourBalance: 'Ваш баланс',
    willDebit: 'Спишется с вашего счёта', purpose: 'Назначение', paid: 'Платёж отправлен!',
    inProcessing: 'Операция в обработке — деньги придут в течение нескольких секунд',
    toHistory: 'Мои операции', toHome: 'На главную', notFound: 'Запрос не найден',
    canceled: 'Автор отменил этот запрос', alreadyPaid: 'Этот запрос уже оплачен',
    expired: 'Срок действия запроса истёк', loading: 'Загружаем запрос...', own: 'Это ваш собственный запрос'
  },
  en: {
    asks: 'is asking you for', anyAmount: 'any amount', pay: 'Pay', loginToPay: 'Sign in to pay',
    loginHint: 'The payment is debited from your NXT D-Bank account', yourBalance: 'Your balance',
    willDebit: 'Will be debited from your account', purpose: 'Purpose', paid: 'Payment sent!',
    inProcessing: 'The payment is processing — money will arrive in a few seconds',
    toHistory: 'My transactions', toHome: 'Home', notFound: 'Request not found',
    canceled: 'The author canceled this request', alreadyPaid: 'This request is already paid',
    expired: 'This request has expired', loading: 'Loading request...', own: 'This is your own request'
  },
  es: {
    asks: 'te pide', anyAmount: 'cualquier cantidad', pay: 'Pagar', loginToPay: 'Inicia sesión y paga',
    loginHint: 'El pago se descuenta de tu cuenta NXT D-Bank', yourBalance: 'Tu saldo',
    willDebit: 'Se descontará de tu cuenta', purpose: 'Motivo', paid: '¡Pago enviado!',
    inProcessing: 'El pago está en proceso: el dinero llegará en unos segundos',
    toHistory: 'Mis operaciones', toHome: 'Inicio', notFound: 'Solicitud no encontrada',
    canceled: 'El autor canceló esta solicitud', alreadyPaid: 'Esta solicitud ya está pagada',
    expired: 'La solicitud ha caducado', loading: 'Cargando solicitud...', own: 'Esta es tu propia solicitud'
  }
};

const money = (val: number | string | undefined) => {
  if (val === undefined || val === null || val === '') return '';
  const num = Number(val);
  return isNaN(num) ? String(val) : num.toLocaleString('ru-RU');
};

// Страница оплаты запроса денег: /pay/<token>
export default function PayRequest() {
  const { token: urlToken } = useParams();
  const navigate = useNavigate();
  const { token, language, setUserData } = useStore();
  const t = dict[(language as keyof typeof dict) || 'ru'] || dict.ru;

  const [request, setRequest] = useState<any>(null);
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState('');
  const [amount, setAmount] = useState('');
  const [payStatus, setPayStatus] = useState('');
  const [payOk, setPayOk] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [debit, setDebit] = useState<{ amount: number; currency: string } | null>(null);

  // 1. Публичная информация по запросу (доступна без входа в банк)
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/v1/payment-requests/${urlToken}`);
        if (!res.ok) { setBlocked('not_found'); return; }
        const data = await res.json();
        setRequest(data);
        if (data.expired) setBlocked('expired');
        else if (data.status === 'canceled') setBlocked('canceled');
        else if (data.status === 'paid') setBlocked('alreadyPaid');
      } catch (error) {
        setBlocked('not_found');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [urlToken]);

  // 2. Счет плательщика (нужен, чтобы показать баланс и валюту списания)
  useEffect(() => {
    if (!token) return;
    const loadAccount = async () => {
      try {
        const res = await fetch(`${API}/api/bank/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setUserData(data);
          setAccount(data.account);
        }
      } catch (error) { /* страница работает и без баланса */ }
    };
    loadAccount();
  }, [token, setUserData]);

  // 3. Для запроса на «любую сумму» показываем, сколько спишется в валюте плательщика
  useEffect(() => {
    if (!request || request.amount !== null || !amount || !account) { setDebit(null); return; }
    const entered = Number(amount);
    if (!Number.isFinite(entered) || entered <= 0) { setDebit(null); return; }

    fetch(`${API}/api/v1/rates`)
      .then((r) => r.json())
      .then((d) => {
        const from = d.rates?.[request.currency] || 1;
        const to = d.rates?.[account.currency] || 1;
        setDebit({ amount: Math.round((entered * from / to) * 100) / 100, currency: account.currency });
      })
      .catch(() => setDebit(null));
  }, [request, amount, account]);

  const handlePay = async () => {
    setPayStatus('...'); setPayOk(false);
    try {
      const res = await fetch(`${API}/api/bank/requests/pay/${urlToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setPayOk(true); setResult(data); }
      else { setPayOk(false); setPayStatus(data.message || 'Не удалось оплатить'); }
    } catch (error) { setPayStatus('Ошибка сети'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F6F8] dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse w-16 h-16 bg-blue-500/20 rounded-full" />
      </div>
    );
  }

  const blockedText = blocked === 'not_found' ? t.notFound
    : blocked === 'canceled' ? t.canceled
      : blocked === 'alreadyPaid' ? t.alreadyPaid
        : blocked === 'expired' ? t.expired : '';

  return (
    <div className="min-h-screen bg-[#F3F6F8] dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex items-center justify-center p-4 transition-colors duration-300">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">

        {result ? (
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8" /></div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white mb-2">{t.paid}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.inProcessing}</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white mt-5">
              {money(result.chargedAmount)} <span className="text-base font-bold text-slate-400">{result.chargedCurrency}</span>
            </p>
            <div className="flex flex-col gap-2 mt-7">
              <button onClick={() => navigate('/history')} className="w-full bg-[#0A192F] dark:bg-blue-600 hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition">
                <History className="w-4 h-4" /> {t.toHistory}
              </button>
              <button onClick={() => navigate('/dashboard')} className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3.5 rounded-xl transition">{t.toHome}</button>
            </div>
          </div>
        ) : blocked ? (
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 flex items-center justify-center mx-auto mb-4"><Lock className="w-8 h-8" /></div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white mb-2">{blockedText}</h1>
            {request && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {request.requesterName} {t.asks} {request.amount !== null ? `${money(request.amount)} ${request.currency}` : t.anyAmount}
              </p>
            )}
            <button onClick={() => navigate('/dashboard')} className="w-full bg-[#0A192F] dark:bg-blue-600 text-white font-bold py-3.5 rounded-xl transition">{t.toHome}</button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl overflow-hidden">
            <div className="p-6 text-center bg-gradient-to-b from-blue-500/10 to-transparent">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#0A192F] dark:bg-blue-600 flex items-center justify-center"><span className="text-white font-black">N</span></div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-900 dark:text-white">{request?.requesterName}</span> {t.asks}
              </p>
              <p className="text-4xl font-black text-slate-900 dark:text-white mt-2">
                {request?.amount !== null ? money(request?.amount) : t.anyAmount}
                {request?.amount !== null && <span className="text-lg font-bold text-slate-400 ml-1">{request?.currency}</span>}
              </p>
              {request?.title && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">«{request.title}»</p>}
            </div>

            <div className="p-6 pt-0 space-y-3">
              {token ? (
                <>
                  {account && (
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{t.yourBalance}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{money(account.balance)} {account.currency}</span>
                    </div>
                  )}

                  {request?.amount === null && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{t.willDebit} ({request?.currency})</label>
                      <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t.anyAmount}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-lg font-bold" />
                      {debit && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{t.willDebit}: {money(debit.amount)} {debit.currency}</p>}
                    </div>
                  )}

                  {payStatus && !payOk && <div className="text-xs font-bold text-center text-red-500 bg-red-50 dark:bg-red-900/20 py-2.5 rounded-xl">{payStatus}</div>}

                  <button
                    onClick={handlePay}
                    disabled={request?.amount === null && !debit}
                    className="w-full bg-[#0A192F] dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition"
                  >
                    <Send className="w-5 h-5" /> {t.pay}
                    {request?.amount !== null && <span className="opacity-80">· {money(request?.amount)} {request?.currency}</span>}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center flex items-center justify-center gap-1.5"><Lock className="w-3.5 h-3.5" /> {t.loginHint}</p>
                  <button onClick={() => navigate(`/login?next=/pay/${urlToken}`)} className="w-full bg-[#0A192F] dark:bg-blue-600 hover:bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition">
                    {t.loginToPay} <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
