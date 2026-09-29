import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { Send, Copy, QrCode, Trash2, X, CheckCircle2, Link2 } from 'lucide-react';

const API = 'https://nxt-d-bank-backend.onrender.com';

const dict = {
  ru: {
    title: 'Запросить деньги', desc: 'Создайте ссылку или QR — друзья откроют и оплатят одним тапом',
    amount: 'Сумма', amountHint: 'Пусто — плательщик выберет сумму сам',
    purpose: 'Назначение', purposeHint: 'Например: на кофе',
    create: 'Создать ссылку и QR', myRequests: 'Мои запросы',
    collected: 'Собрано', copies: 'оплат', noLimit: 'любая сумма',
    copy: 'Скопировать', cancel: 'Отменить запрос',
    statusActive: 'Активен', statusPaid: 'Оплачен', statusCanceled: 'Отменён',
    created: 'Ссылка готова — отправьте другу', notFound: 'Запросов пока нет', hint: 'Ссылку можно отправить в чат или показать QR'
  },
  en: {
    title: 'Request money', desc: 'Create a link or QR — friends open it and pay in one tap',
    amount: 'Amount', amountHint: 'Empty — the payer picks the amount',
    purpose: 'Purpose', purposeHint: 'For example: for coffee',
    create: 'Create link & QR', myRequests: 'My requests',
    collected: 'Collected', copies: 'payments', noLimit: 'any amount',
    copy: 'Copy', cancel: 'Cancel request',
    statusActive: 'Active', statusPaid: 'Paid', statusCanceled: 'Canceled',
    created: 'Link is ready — send it to a friend', notFound: 'No requests yet', hint: 'Send the link in a chat or show the QR code'
  },
  es: {
    title: 'Solicitar dinero', desc: 'Crea un enlace o QR: tus amigos abren y pagan con un toque',
    amount: 'Cantidad', amountHint: 'Vacío — el pagador elige la cantidad',
    purpose: 'Motivo', purposeHint: 'Por ejemplo: para el café',
    create: 'Crear enlace y QR', myRequests: 'Mis solicitudes',
    collected: 'Recaudado', copies: 'pagos', noLimit: 'cualquier cantidad',
    copy: 'Copiar', cancel: 'Cancelar solicitud',
    statusActive: 'Activa', statusPaid: 'Pagada', statusCanceled: 'Cancelada',
    created: 'Enlace listo: envíaselo a un amigo', notFound: 'Todavía no hay solicitudes', hint: 'Envía el enlace al chat o muestra el QR'
  }
};

const statusClass = (status: string) =>
  status === 'paid'
    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30'
    : status === 'canceled'
      ? 'bg-slate-100 text-slate-500 dark:bg-slate-700'
      : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30';

// Модалка «Запросить деньги»: создание ссылки/QR и список своих запросов
export default function MoneyRequestModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { token, language, userData } = useStore();
  const t = dict[(language as keyof typeof dict) || 'ru'] || dict.ru;

  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [ok, setOk] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  const linkFor = (requestToken: string) => `${window.location.origin}/pay/${requestToken}`;

  const load = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/bank/requests`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (error) { /* список не критичен */ }
  };

  useEffect(() => {
    if (isOpen) { setStatus(''); setOk(false); load(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('...'); setOk(false);
    try {
      const res = await fetch(`${API}/api/bank/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount, title: purpose })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setOk(true); setStatus(t.created); setAmount(''); setPurpose(''); load(); }
      else { setStatus(data.message || 'Ошибка'); }
    } catch (error) { setStatus('Ошибка сети'); }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/bank/requests/${id}/cancel`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { setOk(true); setStatus(t.created); load(); }
    } catch (error) { /* игнорируем */ }
  };

  const copyLink = async (requestToken: string, id: string) => {
    try {
      await navigator.clipboard.writeText(linkFor(requestToken));
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 2000);
    } catch (error) { /* буфер обмена недоступен */ }
  };

  const currency = userData?.account?.currency || 'RUB';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[1.75rem] shadow-2xl max-h-[90vh] overflow-y-auto">

            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between gap-3 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center"><Send className="w-5 h-5" /></span>
                  {t.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{t.desc}</p>
              </div>
              <button onClick={onClose} className="p-1.5 -mr-1 -mt-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{t.amount} ({currency})</label>
                  <input type="number" min="0" step="any" placeholder={t.amountHint} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{t.purpose}</label>
                  <input type="text" maxLength={120} placeholder={t.purposeHint} value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
                </div>
              </div>
              <button type="submit" className="w-full bg-[#0A192F] dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2">
                <Link2 className="w-4 h-4" /> {t.create}
              </button>
              {status && (
                <div className={`text-xs font-bold text-center py-2.5 rounded-xl ${ok ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-red-50 text-red-600 dark:bg-red-900/30'}`}>{status}</div>
              )}
            </form>

            <div className="px-5 pb-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{t.myRequests}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{t.hint}</p>

              {requests.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">{t.notFound}</p>
              )}

              <div className="space-y-3">
                {requests.map((r) => (
                  <div key={r.id} className="border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{r.title || t.noLimit}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {r.amount !== null ? `${r.amount} ${r.currency}` : t.noLimit}
                          {r.paidCount > 0 && ` · ${t.collected}: ${r.paidAmount} ${r.currency} (${r.paidCount} ${t.copies})`}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${statusClass(r.status)}`}>
                        {r.status === 'paid' ? t.statusPaid : r.status === 'canceled' ? t.statusCanceled : t.statusActive}
                      </span>
                    </div>

                    {r.status === 'active' && (
                      <>
                        <div className="flex items-center gap-2 mt-3">
                          <div className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                            {linkFor(r.token)}
                          </div>
                          <button onClick={() => copyLink(r.token, r.id)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 transition" title={t.copy}>
                            {copiedId === r.id ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <a href={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(linkFor(r.token))}`} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-blue-500 transition" title="QR">
                            <QrCode className="w-4 h-4" />
                          </a>
                          <button onClick={() => handleCancel(r.id)} className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 transition" title={t.cancel}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex justify-center mt-3">
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(linkFor(r.token))}`} alt="QR" className="w-32 h-32 bg-white p-1 rounded-xl" />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
