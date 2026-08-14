import { useState, useEffect } from 'react';
import { 
  ArrowUpRight, ArrowDownRight, 
  Wallet, FileText, Download, Plus, Search, Filter, ChevronLeft, ChevronRight, Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTransactionsPaginated, deleteTransaction } from '../lib/api';
import AddExpenseModal from '../components/AddExpenseModal';
import { useToast } from '../components/Toast';
import { generateAccountsPDF, generateTransactionReceiptPDF } from '../lib/pdfExport';
import { getLogoBase64 } from '../lib/pdf/logoLoader';
import { useGlobalSearch } from '../contexts/GlobalSearchContext';

export default function Accounts() {
  const [activeTab, setActiveTab] = useState<'all' | 'Income' | 'Expense'>('all');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const { globalSearch: search, setGlobalSearch: setSearch } = useGlobalSearch();
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;
  const queryClient = useQueryClient();

  useEffect(() => {
    setPage(1);
  }, [search]);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      toast('Transaction entry deleted from ledger successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || 'Failed to delete transaction', 'error');
    }
  });

  const handleDeleteTransaction = (id: string, desc: string, amount: number) => {
    if (window.confirm(`Are you sure you want to permanently delete transaction "${desc || id}" (₹${amount})?`)) {
      deleteMutation.mutate(id);
    }
  };

  const { data: ledgerData, isLoading, isError } = useQuery({
    queryKey: ['transactions', activeTab, search, category, page],
    queryFn: () => fetchTransactionsPaginated({
      page,
      limit,
      type: activeTab === 'all' ? undefined : activeTab,
      search: search || undefined,
      category: category || undefined
    }),
  });

  const transactions = ledgerData?.transactions || [];
  const pagination = ledgerData?.pagination || { totalItems: 0, currentPage: 1, totalPages: 1 };
  const summary = ledgerData?.summary || { totalIncome: 0, totalExpense: 0, netProfit: 0 };

  // Fallback calculations in case server summary is missing
  const totalIncome = summary.totalIncome || transactions.filter((t: any) => t.type === 'Income').reduce((sum: number, t: any) => sum + t.amount, 0);
  const totalExpense = summary.totalExpense || transactions.filter((t: any) => t.type === 'Expense').reduce((sum: number, t: any) => sum + t.amount, 0);
  const netProfit = summary.netProfit || (totalIncome - totalExpense);

  const handleDownloadReport = async () => {
    try {
      const logoBase64 = await getLogoBase64().catch(() => undefined);
      await generateAccountsPDF(transactions, totalIncome, totalExpense, netProfit, logoBase64);
      toast('Accounts report downloaded successfully', 'success');
    } catch (err) {
      toast('Failed to generate report', 'error');
    }
  };

  const handleDownloadReceipt = async (transaction: any) => {
    try {
      const logoBase64 = await getLogoBase64().catch(() => undefined);
      await generateTransactionReceiptPDF(transaction, logoBase64);
      toast('Receipt downloaded successfully', 'success');
    } catch (err) {
      console.error(err);
      toast('Failed to generate receipt', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts & Ledger</h1>
          <p className="text-muted-foreground">Track income, expenses, and real-time cashbook.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={handleDownloadReport}
            className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-muted h-10 px-4 py-2 transition-colors whitespace-nowrap"
          >
            <Download className="mr-2 h-4 w-4" />
            Report
          </button>
          <button 
            onClick={() => setShowExpenseModal(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-6 shadow-sm col-span-2 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
            <Wallet className="h-48 w-48 -mr-10 -mt-10" />
          </div>
          <h3 className="text-sm font-medium text-primary-foreground/80 mb-4">Total Net Profit (Filtered Scope)</h3>
          <div className="text-4xl font-bold">₹{netProfit.toLocaleString()}</div>
          <div className="mt-4 flex items-center gap-2 text-sm text-primary-foreground/90 font-medium">
            <ArrowUpRight className="h-4 w-4" /> Calculated from live ledger
          </div>
        </div>
        
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Total Income</h3>
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-500">₹{totalIncome.toLocaleString()}</div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Total Expenses</h3>
            <div className="h-8 w-8 rounded-full bg-rose-500/10 flex items-center justify-center">
              <ArrowDownRight className="h-4 w-4 text-rose-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-500">₹{totalExpense.toLocaleString()}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20 p-4 rounded-xl border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search category, ID, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="text-sm rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-48"
          >
            <option value="">All Categories</option>
            <option value="Order Payment">Order Payment</option>
            <option value="Supplies">Supplies & Materials</option>
            <option value="Salaries">Employee Salaries</option>
            <option value="Utilities">Utilities & Rent</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Marketing">Marketing</option>
            <option value="Other">Other Expenses</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden">
        <div className="flex border-b bg-muted/10">
          <button 
            onClick={() => { setActiveTab('all'); setPage(1); }}
            className={cn("px-6 py-3 text-sm font-semibold transition-all border-b-2", activeTab === 'all' ? "border-primary text-primary bg-background" : "border-transparent text-muted-foreground")}
          >
            All Transactions ({activeTab === 'all' ? pagination.totalItems : ''})
          </button>
          <button 
            onClick={() => { setActiveTab('Income'); setPage(1); }}
            className={cn("px-6 py-3 text-sm font-semibold transition-all border-b-2", activeTab === 'Income' ? "border-emerald-500 text-emerald-500 bg-background" : "border-transparent text-muted-foreground")}
          >
            Income Only
          </button>
          <button 
            onClick={() => { setActiveTab('Expense'); setPage(1); }}
            className={cn("px-6 py-3 text-sm font-semibold transition-all border-b-2", activeTab === 'Expense' ? "border-rose-500 text-rose-500 bg-background" : "border-transparent text-muted-foreground")}
          >
            Expenses Only
          </button>
        </div>

        <div className="overflow-x-auto p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Transaction</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-center">Method</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
                <th className="px-6 py-4 font-medium text-right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="animate-pulse">Loading</div>
                  </td>
                </tr>
              )}
              {isError && !isLoading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-rose-500">
                    Failed to load transactions. Please verify server connection.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && transactions.map((trx: any) => (
                <tr key={trx._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center border",
                        trx.type === 'Income' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                      )}>
                        {trx.type === 'Income' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{trx.description || trx.category}</div>
                        <div className="text-xs text-muted-foreground">{trx.transactionNumber || trx._id} • {trx.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground font-medium">
                    {new Date(trx.date || trx.createdAt).toLocaleDateString()} at {new Date(trx.date || trx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border">
                      {trx.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "font-bold text-base",
                      trx.type === 'Income' ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {trx.type === 'Income' ? '+' : '-'}₹{Number(trx.amount || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => handleDownloadReceipt(trx)}
                        title="Download Voucher"
                        className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteTransaction(trx._id, trx.description || trx.category, trx.amount)}
                        title="Delete Entry"
                        className="p-2 hover:bg-rose-50 rounded-md text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !isError && transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No transactions found matching criteria in database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Server-side Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/10 text-sm text-muted-foreground">
            <div>
              Showing page <span className="font-semibold text-foreground">{pagination.currentPage}</span> of <span className="font-semibold text-foreground">{pagination.totalPages}</span> ({pagination.totalItems} total entries)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-input bg-background hover:bg-muted disabled:opacity-50 text-xs font-medium transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button
                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                disabled={page >= pagination.totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-input bg-background hover:bg-muted disabled:opacity-50 text-xs font-medium transition-colors"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {showExpenseModal && (
        <AddExpenseModal 
          onClose={() => setShowExpenseModal(false)}
          onSuccess={() => {
            setShowExpenseModal(false);
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
          }}
        />
      )}
    </div>
  );
}
