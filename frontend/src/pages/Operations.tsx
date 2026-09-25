import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { CreditCard, History, Settings, ArrowUpRight, ArrowDownLeft, X, CheckCircle2, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const translations: Record<string, any> = {
  ru: { dash: 'Главная', hist: 'Операции', set: 'Настройки', title: 'История операций', income: 'Пополнения и доходы', expense: 'Расходы и переводы', all: 'Все', incomes: 'Доходы', expenses: 'Расходы', searchText: 'Поиск операции...', listTitle: 'Список транзакций', notFound: 'Операции не найдены', clearHistory: 'Очистить историю', confirmClear: 'Удалить всю историю?', unknown: 'Неизвестный', err: 'ОШИБКА', comm: 'Ком.', success: 'Успешно', fail: 'Ошибка', opId: 'ID Операции', dateTime: 'Дата и время', sender: 'Отправитель', receiver: 'Получатель', commission: 'Комиссия', comment: 'Комментарий', repeat: 'Повторить', downloadPdf: 'Скачать квитанцию (PDF)' },
  en: { dash: 'Dashboard', hist: 'History', set: 'Settings', title: 'Transaction History', income: 'Deposits', expense: 'Expenses', all: 'All', incomes: 'Income', expenses: 'Expenses', searchText: 'Search...', listTitle: 'Transactions', notFound: 'Not found', clearHistory: 'Clear history', confirmClear: 'Clear all?', unknown: 'Unknown', err: 'ERR', comm: 'Fee', success: 'Success', fail: 'Fail', opId: 'ID', dateTime: 'Date', sender: 'Sender', receiver: 'Receiver', commission: 'Fee', comment: 'Comment', repeat: 'Repeat', downloadPdf: 'Download PDF' }
};

export default function Operations() {
  const { token, userData, setUserData, logout, language } = useStore();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  const receiptRef = useRef<HTMLDivElement>(null);

  const t = translations[language] || translations.ru;
  const rates: Record<string, number> = { 'RUB': 1, 'USD': 80, 'EUR': 100 };
  const myId = userData?.account?.userId;
  const currentCurrency = userData?.account?.currency || 'RUB';

  const calculateTxAmounts = (tx: any) => {
    const isIncome = tx.receiverId === myId;
    const txCurrency = tx.currency || tx.sender?.account?.currency || 'RUB';
    const rateTx = rates[txCurrency] || 1;
    const rateCurrent = rates[currentCurrency] || 1;
    const amount = Number(tx.amount) || 0;
    const commission = Number(tx.commission) || 0;
    const amountInRub = amount * rateTx;
    const commInRub = commission * rateTx;

    let finalAmount = isIncome ? (amountInRub / rateCurrent) : ((amountInRub + commInRub) / rateCurrent);
    let finalComm = isIncome ? 0 : (commInRub / rateCurrent);

    return {
      finalAmount: Math.round(finalAmount * 100) / 100,
      finalComm: Math.round(finalComm * 100) / 100,
      originalCurrency: txCurrency
    };
  };

  const fetchHistory = async () => {
    try {
      const dashRes = await fetch('https://nxt-d-bank-backend.onrender.com/api/bank/dashboard', { headers: { 'Authorization': `Bearer ${token}` } });
      if (dashRes.ok) setUserData(await dashRes.json());
      else { logout(); navigate('/login'); return; }

      const histRes = await fetch('https://nxt-d-bank-backend.onrender.com/api/bank/history', { headers: { 'Authorization': `Bearer ${token}` } });
      if (histRes.ok) setTransactions(await histRes.json());
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { if (token) fetchHistory(); }, [token]);

  const handleDownloadPDF = async () => {
    if (!receiptRef.current || !selectedTx) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`NXT_Receipt_${selectedTx.id.slice(0,8)}.pdf`);
    } catch (err) {
      console.error('Ошибка создания PDF', err);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const isIncome = tx.receiverId === myId;
    if (filterType === 'income' && !isIncome) return false;
    if (filterType === 'expense' && isIncome) return false;
    return true;
  });

  const formatDate = (dateString: string, includeTime = true) => {
    return new Date(dateString).toLocaleDateString('ru-RU', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: includeTime ? '2-digit' : undefined, minute: includeTime ? '2-digit' : undefined 
    });
  };

  if (loading || !userData) return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-[#F3F6F8] flex text-slate-800">
      
      {/* Боковое меню */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="p-8"><h1 className="text-2xl font-black text-slate-900">NXT-D</h1></div>
          <nav className="p-4 flex flex-col gap-2">
            <button onClick={() => navigate('/dashboard')} className="hover:bg-slate-100 px-4 py-3 rounded-xl font-medium flex items-center gap-3"><CreditCard className="w-5 h-5" /> {t.dash}</button>
            <button className="bg-blue-50 text-blue-600 px-4 py-3 rounded-xl font-medium flex items-center gap-3"><History className="w-5 h-5" /> {t.hist}</button>
            <button onClick={() => navigate('/settings')} className="hover:bg-slate-100 px-4 py-3 rounded-xl font-medium flex items-center gap-3"><Settings className="w-5 h-5" /> {t.set}</button>
          </nav>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto p-8 max-w-5xl mx-auto gap-6">
        <h2 className="text-3xl font-bold text-slate-900">{t.title}</h2>

        <div className="flex gap-4 items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button onClick={() => setFilterType('all')} className={`px-5 py-2 text-sm font-bold rounded-lg ${filterType === 'all' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>{t.all}</button>
            <button onClick={() => setFilterType('income')} className={`px-5 py-2 text-sm font-bold rounded-lg ${filterType === 'income' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>{t.incomes}</button>
            <button onClick={() => setFilterType('expense')} className={`px-5 py-2 text-sm font-bold rounded-lg ${filterType === 'expense' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>{t.expenses}</button>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-2">
            {filteredTransactions.map((tx) => {
              const isIncome = tx.receiverId === myId;
              const { finalAmount, finalComm } = calculateTxAmounts(tx);
              return (
                <motion.div key={tx.id} onClick={() => setSelectedTx({ ...tx, finalAmount, finalComm })} className="p-3.5 rounded-2xl hover:bg-slate-50 cursor-pointer flex justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isIncome ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-600'}`}>
                      {isIncome ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{tx.target || t.unknown}</h4>
                      <span className="text-[11px] text-slate-500">{formatDate(tx.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-base ${isIncome ? 'text-emerald-500' : 'text-slate-900'}`}>{isIncome ? '+' : '-'}{finalAmount} {currentCurrency}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Модальное окно транзакции */}
      <AnimatePresence>
        {selectedTx && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white w-full max-w-sm rounded-3xl p-6 relative flex flex-col items-center">
              <button onClick={() => setSelectedTx(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
              
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4"><span className="text-white font-black text-xl">N</span></div>
              <h3 className="text-2xl font-bold mb-1">{selectedTx.receiverId === myId ? '+' : '-'}{selectedTx.finalAmount} {currentCurrency}</h3>
              <p className="text-emerald-500 font-bold text-sm flex items-center gap-1 mb-6"><CheckCircle2 className="w-4 h-4"/> Исполнена</p>

              <div className="w-full space-y-3 text-sm bg-slate-50 p-4 rounded-xl mb-6">
                <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500">ID</span><span className="font-mono">{selectedTx.id.slice(0,8).toUpperCase()}</span></div>
                <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500">Дата</span><span>{formatDate(selectedTx.createdAt)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Сумма</span><span className="font-bold">{selectedTx.finalAmount} {currentCurrency}</span></div>
              </div>

              <button onClick={handleDownloadPDF} className="w-full py-4 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-xl flex justify-center items-center gap-2">
                <Download className="w-5 h-5"/> {t.downloadPdf}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* СКРЫТЫЙ ШАБЛОН ДЛЯ PDF КВИТАНЦИИ (А4 Формат) */}
      {selectedTx && (
        <div className="absolute left-[-10000px] top-[-10000px]">
          <div ref={receiptRef} className="w-[800px] bg-white p-12 text-black font-sans box-border relative">
            
            {/* Шапка квитанции */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-2xl tracking-tighter">NXT</div>
                <div>
                  <h1 className="text-2xl font-bold text-blue-600 uppercase tracking-wide">NXT D-BANK</h1>
                  <p className="text-slate-500 text-sm mt-1">Официальное подтверждение операции</p>
                </div>
              </div>
              <div className="text-right text-sm text-slate-600 leading-relaxed">
                NXT D-Bank Ltd.<br/>Global Financial District, 1<br/>support@nxtdbank.com<br/>БИК: 044525000
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-2">Подтверждение платежа</h2>
            <p className="text-slate-600 mb-10">Платежное поручение №{selectedTx.id.slice(0,10).toUpperCase()} от {formatDate(selectedTx.createdAt, false)}</p>

            {/* Сетка данных */}
            <div className="grid grid-cols-2 gap-y-8 gap-x-12 mb-16">
              
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Плательщик</p>
                <p className="font-semibold text-lg">{selectedTx.sender ? `${selectedTx.sender.firstName} ${selectedTx.sender.lastName}` : 'Внутренний счет NXT'}</p>
                <p className="text-sm text-slate-600 mt-1">Счет: **** **** **** {selectedTx.senderCardMask || '0000'}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Сумма платежа</p>
                <p className="font-bold text-2xl">{selectedTx.finalAmount} {currentCurrency}</p>
                {selectedTx.finalComm > 0 && <p className="text-sm text-slate-600 mt-1">Вкл. комиссию: {selectedTx.finalComm} {currentCurrency}</p>}
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Тип операции</p>
                <p className="font-medium">Электронный перевод средств</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Статус операции</p>
                <p className="font-bold text-emerald-600">Исполнена</p>
                <p className="text-sm text-slate-600 mt-1">{formatDate(selectedTx.createdAt)}</p>
              </div>

              <div className="col-span-2 border-t border-slate-200 pt-8 mt-4">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Получатель</p>
                <p className="font-semibold text-lg">{selectedTx.receiver ? `${selectedTx.receiver.firstName} ${selectedTx.receiver.lastName}` : (selectedTx.target || 'Неизвестный счет')}</p>
                <p className="text-sm text-slate-600 mt-1">Банк получателя: {selectedTx.receiverSystem || 'NXT D-Bank'}</p>
              </div>

              {selectedTx.comment && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Назначение платежа</p>
                  <p className="font-medium">{selectedTx.comment}</p>
                </div>
              )}
            </div>

            {/* Блок с печатью и подписью */}
            <div className="mt-20 pt-8 border-t border-slate-200 flex justify-between items-end relative">
              <div>
                <p className="text-sm text-slate-600 mb-2">Оператор / Автоматизированная система</p>
                <div className="w-48 border-b border-black mb-1"></div>
                <p className="text-xs text-slate-500">Документ сгенерирован автоматически</p>
              </div>

              {/* Визуальная имитация круглой банковской печати */}
              <div className="absolute right-10 bottom-4 w-36 h-36 rounded-full border-4 border-blue-600/70 flex flex-col items-center justify-center text-blue-600/70 transform -rotate-12">
                <div className="w-32 h-32 rounded-full border border-blue-600/70 flex flex-col items-center justify-center p-2 text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">NXT D-Bank</span>
                  <span className="text-[8px] font-bold uppercase leading-tight border-t border-b border-blue-600/70 py-1 my-1">Операция<br/>Проведена</span>
                  <span className="text-[7px] font-mono leading-none">{formatDate(selectedTx.createdAt, false)}</span>
                </div>
              </div>
            </div>

            <div className="mt-16 text-[10px] text-slate-400 text-center">
              Генеральная лицензия на осуществление банковских операций NXT D-Bank. Документ не требует мокрой печати.
            </div>

          </div>
        </div>
      )}
    </div>
  );
}