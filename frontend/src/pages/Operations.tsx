import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { LogOut, CreditCard, History, Settings, Search, ArrowUpRight, ArrowDownLeft, X, FileText, CheckCircle2, XCircle, Trash2, RefreshCw, Download } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const translations: Record<string, any> = {
  ru: { dash: 'Главная', hist: 'Операции', set: 'Настройки', title: 'История операций', income: 'Пополнения и доходы', expense: 'Расходы и переводы', all: 'Все', incomes: 'Доходы', expenses: 'Расходы', searchText: 'Поиск операции...', listTitle: 'Список транзакций', notFound: 'Операции не найдены', clearHistory: 'Очистить историю', confirmClear: 'Вы уверены, что хотите удалить всю историю транзакций?', unknown: 'Неизвестный получатель', err: 'ОШИБКА', comm: 'Ком.', simNote: 'Учебный симулятор', success: 'Успешно', fail: 'Возврат / Ошибка', opId: 'ID Операции', dateTime: 'Дата и время', sender: 'Отправитель', receiver: 'Получатель', commission: 'Комиссия', comment: 'Комментарий', close: 'Закрыть', ceoDeposit: 'Пополнение счета CEO', repeat: 'Повторить перевод', downloadPdf: 'Скачать квитанцию (PDF)' },
  en: { dash: 'Dashboard', hist: 'History', set: 'Settings', title: 'Transaction History', income: 'Deposits & Income', expense: 'Expenses & Transfers', all: 'All', incomes: 'Income', expenses: 'Expenses', searchText: 'Search transaction...', listTitle: 'Transactions List', notFound: 'No transactions found', clearHistory: 'Clear history', confirmClear: 'Are you sure you want to delete all transaction history?', unknown: 'Unknown recipient', err: 'ERROR', comm: 'Fee', simNote: 'Training Simulator', success: 'Success', fail: 'Refund / Error', opId: 'Operation ID', dateTime: 'Date & Time', sender: 'Sender', receiver: 'Receiver', commission: 'Fee', comment: 'Comment', close: 'Close', ceoDeposit: 'CEO Account Deposit', repeat: 'Repeat transfer', downloadPdf: 'Download PDF' }
};

export default function Operations() {
  const { token, userData, setUserData, logout, language } = useStore();
  const navigate = useNavigate();
  const location = useLocation(); 
  
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  const [autoOpenId, setAutoOpenId] = useState<string | null>(location.state?.openTxId || null);
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

    let finalAmount = 0;
    let finalComm = 0;

    if (isIncome) {
      finalAmount = amountInRub / rateCurrent;
    } else {
      finalAmount = (amountInRub + commInRub) / rateCurrent;
      finalComm = commInRub / rateCurrent;
    }

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
      else { handleLogout(); return; }

      const histRes = await fetch('https://nxt-d-bank-backend.onrender.com/api/bank/history', { headers: { 'Authorization': `Bearer ${token}` } });
      if (histRes.ok) setTransactions(await histRes.json());
      
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { if (token) fetchHistory(); }, [token]);

  useEffect(() => {
    if (transactions.length > 0 && autoOpenId) {
      const tx = transactions.find((t: any) => t.id === autoOpenId);
      if (tx) {
        const { finalAmount, finalComm } = calculateTxAmounts(tx);
        setSelectedTx({ ...tx, finalAmount, finalComm });
        setAutoOpenId(null);
        window.history.replaceState({}, document.title);
      }
    }
  }, [transactions, autoOpenId, myId, currentCurrency]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleClearHistory = async () => {
    if (!window.confirm(t.confirmClear)) return;
    try {
      const res = await fetch('https://nxt-d-bank-backend.onrender.com/api/bank/history', { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) { setTransactions([]); fetchHistory(); }
    } catch (e) { console.error(e); }
  };

  const handleRepeatTransfer = (tx: any) => {
    navigate('/dashboard', { state: { repeatTx: { target: tx.target, amount: tx.amount } } });
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current || !selectedTx) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`NXT_Receipt_${selectedTx.id.split('-')[0].toUpperCase()}.pdf`);
    } catch (err) {
      console.error('Ошибка создания PDF', err);
    }
  };

  const stats = transactions.reduce((acc, tx) => {
    if (tx.status === 'completed') {
      const { finalAmount } = calculateTxAmounts(tx);
      if (tx.receiverId === myId) acc.income += finalAmount;
      if (tx.senderId === myId) acc.expense += finalAmount;
    }
    return acc;
  }, { income: 0, expense: 0 });

  const filteredTransactions = transactions.filter(tx => {
    const isIncome = tx.receiverId === myId;
    if (filterType === 'income' && !isIncome) return false;
    if (filterType === 'expense' && isIncome) return false;
    
    const query = searchQuery.toLowerCase();
    const searchString = `${tx.target || ''} ${tx.comment || ''} ${tx.sender?.firstName || ''} ${tx.sender?.lastName || ''} ${tx.receiver?.firstName || ''} ${tx.receiver?.lastName || ''}`.toLowerCase();
    if (searchQuery && !searchString.includes(query)) return false;
    return true;
  });

  const formatDate = (dateString: string, includeTime = true) => {
    return new Date(dateString).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: includeTime ? '2-digit' : undefined, minute: includeTime ? '2-digit' : undefined 
    });
  };

  if (loading || !userData) return <div className="min-h-screen bg-[#F3F6F8] dark:bg-slate-900 flex items-center justify-center"><div className="animate-pulse w-16 h-16 bg-blue-500/20 rounded-full"></div></div>;

  return (
    <div className="min-h-screen bg-[#F3F6F8] dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-300">
      
      <aside className="w-full md:w-64 bg-white dark:bg-[#0A192F] border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex flex-col justify-between md:min-h-screen z-10 relative transition-colors duration-300">
        <div>
          <div className="p-8 hidden md:block">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center"><span className="text-white text-sm font-bold">N</span></div>
              NXT-D
            </h1>
          </div>
          <nav className="p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
            <button onClick={() => navigate('/dashboard')} className="hover:bg-slate-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 w-full justify-center md:justify-start">
              <CreditCard className="w-5 h-5" /> <span className="hidden md:inline">{t.dash}</span>
            </button>
            <button className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 w-full justify-center md:justify-start">
              <History className="w-5 h-5" /> <span className="hidden md:inline">{t.hist}</span>
            </button>
            <button onClick={() => navigate('/settings')} className="hover:bg-slate-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 w-full justify-center md:justify-start">
              <Settings className="w-5 h-5" /> <span className="hidden md:inline">{t.set}</span>
            </button>
          </nav>
        </div>
        <div className="p-4 hidden md:block">
          <div className="bg-slate-50 dark:bg-[#112240] p-4 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">{userData.client.charAt(0)}</div>
              <div className="truncate"><p className="text-slate-900 dark:text-white font-medium text-sm truncate">{userData.client.split(' ')[0]}</p></div>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition p-2"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="md:hidden bg-white dark:bg-slate-800 p-4 flex justify-between items-center shadow-sm border-b border-slate-200 dark:border-slate-800">
          <h1 className="text-xl font-black text-slate-900 dark:text-white">NXT-D</h1>
          <button onClick={handleLogout} className="text-sm font-medium text-red-500"><LogOut className="w-5 h-5" /></button>
        </header>

        <div className="p-4 md:p-8 max-w-5xl w-full mx-auto relative flex flex-col h-full gap-6">
          
          <div className="flex justify-between items-center">
            <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              {t.title}
            </motion.h2>
            {transactions.length > 0 && (
              <button onClick={handleClearHistory} className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl text-sm font-bold transition">
                <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">{t.clearHistory}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center gap-4 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 flex items-center justify-center"><ArrowDownLeft className="w-6 h-6" /></div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{t.income}</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">+{Math.round(stats.income * 100) / 100} <span className="text-emerald-500">{currentCurrency}</span></h3>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center gap-4 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/30 text-red-500 flex items-center justify-center"><ArrowUpRight className="w-6 h-6" /></div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{t.expense}</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">-{Math.round(stats.expense * 100) / 100} <span className="text-red-500">{currentCurrency}</span></h3>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
            <div className="flex w-full md:w-auto p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
              <button onClick={() => setFilterType('all')} className={`flex-1 md:flex-none px-5 py-2 text-sm font-bold rounded-lg transition ${filterType === 'all' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>{t.all}</button>
              <button onClick={() => setFilterType('income')} className={`flex-1 md:flex-none px-5 py-2 text-sm font-bold rounded-lg transition ${filterType === 'income' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>{t.incomes}</button>
              <button onClick={() => setFilterType('expense')} className={`flex-1 md:flex-none px-5 py-2 text-sm font-bold rounded-lg transition ${filterType === 'expense' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>{t.expenses}</button>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" placeholder={t.searchText} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-2.5 pl-10 pr-4 rounded-xl outline-none text-sm font-medium text-slate-900 dark:text-white" />
            </div>
          </div>

          <div className="flex-1 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden flex flex-col transition-colors">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700"><h3 className="font-bold text-base text-slate-900 dark:text-white">{t.listTitle}</h3></div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8"><FileText className="w-12 h-12 mb-4 opacity-20" /><p className="font-medium">{t.notFound}</p></div>
              ) : (
                <div className="space-y-1">
                  {filteredTransactions.map((tx) => {
                    const isIncome = tx.receiverId === myId;
                    const amountSign = isIncome ? '+' : '-';
                    const amountColor = isIncome ? 'text-emerald-500' : 'text-slate-900 dark:text-white';
                    
                    let targetName = tx.target;
                    if (isIncome && tx.sender) targetName = `${tx.sender.firstName} ${tx.sender.lastName}`;
                    if (!isIncome && tx.receiver) targetName = `${tx.receiver.firstName} ${tx.receiver.lastName}`;
                    if (tx.type === 'deposit') targetName = t.ceoDeposit;

                    const { finalAmount, finalComm } = calculateTxAmounts(tx);

                    return (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={tx.id} onClick={() => setSelectedTx({ ...tx, finalAmount, finalComm })} className="p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}>
                            {isIncome ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{targetName || t.unknown}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-slate-500 font-medium">{formatDate(tx.createdAt)}</span>
                              {tx.status === 'failed_recipient_not_found' && <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.2 rounded-full font-bold">{t.err}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-base ${amountColor}`}>{amountSign}{finalAmount} {currentCurrency}</p>
                          {finalComm > 0 && !isIncome && <p className="text-[11px] text-slate-400">{t.comm} {finalComm} {currentCurrency}</p>}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {selectedTx && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white dark:bg-slate-800 w-full max-w-xs rounded-[1.5rem] shadow-2xl flex flex-col relative overflow-hidden transition-colors">
              
              <div className="p-5 pb-4 flex flex-col items-center text-center border-b border-dashed border-slate-200 dark:border-slate-700 relative">
                <button onClick={() => setSelectedTx(null)} className="absolute top-3 right-3 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><X className="w-4 h-4" /></button>
                
                <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center mb-2 shadow-md"><span className="text-white font-black text-sm">N</span></div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">NXT-D Bank</h3>
                
                {selectedTx.status === 'completed' ? (
                  <div className="flex items-center gap-1.5 mt-2 text-emerald-500 font-bold text-xs"><CheckCircle2 className="w-4 h-4" /> {t.success}</div>
                ) : (
                  <div className="flex items-center gap-1.5 mt-2 text-red-500 font-bold text-xs"><XCircle className="w-4 h-4" /> {t.fail}</div>
                )}
                
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                  {selectedTx.receiverId === myId ? '+' : '-'}{selectedTx.finalAmount} {currentCurrency}
                </h2>
              </div>

              <div className="p-5 space-y-3 text-xs bg-slate-50 dark:bg-slate-800/50">
                <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-700 pb-1.5">
                  <span className="text-slate-500">{t.opId}</span>
                  <span className="font-mono text-slate-900 dark:text-white">{selectedTx.id.split('-')[0].toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-700 pb-1.5">
                  <span className="text-slate-500">{t.dateTime}</span>
                  <span className="font-medium text-right text-slate-900 dark:text-white">{formatDate(selectedTx.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-700 pb-1.5">
                  <span className="text-slate-500">{t.sender}</span>
                  <span className="font-medium text-right text-slate-900 dark:text-white">{selectedTx.sender ? `${selectedTx.sender.firstName} ${selectedTx.sender.lastName}` : 'NXT-D Bank'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-700 pb-1.5">
                  <span className="text-slate-500">{t.receiver}</span>
                  <span className="font-medium text-right text-slate-900 dark:text-white">{selectedTx.receiver ? `${selectedTx.receiver.firstName} ${selectedTx.receiver.lastName}` : selectedTx.target}</span>
                </div>
                {selectedTx.finalComm > 0 && (
                  <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-700 pb-1.5">
                    <span className="text-slate-500">{t.commission}</span>
                    <span className="font-medium text-right text-slate-900 dark:text-white">{selectedTx.finalComm} {currentCurrency}</span>
                  </div>
                )}
                {selectedTx.comment && (
                  <div>
                    <span className="text-slate-500 block mb-0.5">{t.comment}</span>
                    <span className="italic bg-white dark:bg-slate-900 p-2 rounded-lg block border border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white">"{selectedTx.comment}"</span>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-white dark:bg-slate-800 space-y-2">
                <button onClick={handleDownloadPDF} className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-bold flex items-center justify-center gap-2 transition text-xs">
                  <Download className="w-4 h-4" /> {t.downloadPdf}
                </button>

                {selectedTx.senderId === myId && selectedTx.type !== 'deposit' && (
                  <button onClick={() => handleRepeatTransfer(selectedTx)} className="w-full py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl font-bold flex items-center justify-center gap-2 transition text-xs">
                    <RefreshCw className="w-4 h-4" /> {t.repeat}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* СКРЫТЫЙ ШАБЛОН ДЛЯ PDF КВИТАНЦИИ (А4 Формат) */}
      {selectedTx && (
        <div className="absolute left-[-10000px] top-[-10000px]">
          <div ref={receiptRef} className="w-[800px] bg-white p-12 text-black font-sans box-border relative">
            
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
              <div className="flex items-center gap-4">
                {/* ИСПРАВЛЕННЫЙ ЛОГОТИП БЕЗ ФЛЕКСБОКСА ДЛЯ КОРРЕКТНОГО РЕНДЕРА HTML2CANVAS */}
                <div className="w-16 h-16 bg-blue-600 rounded-full text-white font-black text-2xl tracking-tighter text-center block" style={{ lineHeight: '64px' }}>NXT</div>
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
            <p className="text-slate-600 mb-10">Платежное поручение №{selectedTx.id.split('-')[0].toUpperCase()} от {formatDate(selectedTx.createdAt, false)}</p>

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

            <div className="mt-20 pt-8 border-t border-slate-200 flex justify-between items-end relative">
              <div>
                <p className="text-sm text-slate-600 mb-2">Оператор / Автоматизированная система</p>
                <div className="w-48 border-b border-black mb-1"></div>
                <p className="text-xs text-slate-500">Документ сгенерирован автоматически</p>
              </div>

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