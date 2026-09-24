import { useState, useEffect } from "react";
import { Plus, Search, Filter, Trash2, ArrowUpRight, ArrowDownLeft, X, AlertCircle } from "lucide-react";
import { apiRequest } from "../api";

const CATEGORIES = [
  "Food", "Transport", "Shopping", "Bills", "Rent", "EMI",
  "Education", "Healthcare", "Entertainment", "Investments", "Salary", "Other"
];

export default function TransactionsView({ onRefreshParent }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [txType, setTxType] = useState("expense");
  const [category, setCategory] = useState("Food");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      let queryParams = new URLSearchParams();
      if (search) queryParams.append("search", search);
      if (categoryFilter) queryParams.append("category", categoryFilter);
      if (typeFilter) queryParams.append("transaction_type", typeFilter);

      const [txList, sumData] = await Promise.all([
        apiRequest(`/api/transactions?${queryParams.toString()}`),
        apiRequest("/api/transactions/summary")
      ]);
      setTransactions(txList || []);
      setSummary(sumData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [categoryFilter, typeFilter]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    loadData();
  }

  async function handleAddTransaction(e) {
    e.preventDefault();
    setFormError("");

    if (!amount || parseFloat(amount) <= 0) {
      setFormError("Amount must be greater than 0.");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          transaction_type: txType,
          category,
          amount: parseFloat(amount),
          description: description.trim() || merchant.trim() || "Transaction",
          merchant: merchant.trim() || "Merchant"
        })
      });

      setModalOpen(false);
      setAmount("");
      setDescription("");
      setMerchant("");
      loadData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this transaction record?")) return;
    try {
      await apiRequest(`/api/transactions/${id}`, { method: "DELETE" });
      loadData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      alert("Failed to delete transaction: " + err.message);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Transaction Management</h2>
          <p className="text-xs text-slate-400 mt-1">
            Categorized cash-flow logs, automated anomaly detection, and monthly burn summary.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
        >
          <Plus size={16} />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Income</span>
            <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
              ₹{summary.total_income.toLocaleString()}
            </div>
          </div>
          <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Expenses</span>
            <div className="text-lg font-black text-rose-400 font-mono mt-0.5">
              ₹{summary.total_expenses.toLocaleString()}
            </div>
          </div>
          <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Monthly Savings</span>
            <div className="text-lg font-black text-indigo-400 font-mono mt-0.5">
              ₹{summary.net_savings.toLocaleString()}
            </div>
          </div>
          <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Savings Rate</span>
            <div className="text-lg font-black text-white font-mono mt-0.5">
              {summary.savings_rate}%
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search transactions, merchant, or notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="flex-1 md:w-36 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="flex-1 md:w-32 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>

          {(categoryFilter || typeFilter || search) && (
            <button
              onClick={() => { setCategoryFilter(""); setTypeFilter(""); setSearch(""); }}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
              title="Reset filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-bold border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Description / Merchant</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Type</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No transactions match your current query.
                  </td>
                </tr>
              ) : (
                transactions.map(t => {
                  const isIncome = t.transaction_type === "income";
                  const displayDate = t.transaction_date || t.created_at;
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-white">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isIncome ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                          }`}>
                            {isIncome ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100">{t.description || t.merchant}</div>
                            {t.merchant && t.merchant !== t.description && (
                              <div className="text-[10px] text-slate-400">{t.merchant}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60 text-slate-300 font-medium text-[11px]">
                          {t.category || "Other"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {displayDate ? new Date(displayDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                        <span className={isIncome ? "text-emerald-400" : "text-white"}>
                          {isIncome ? "+" : "-"}₹{Number(t.amount).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          isIncome
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}>
                          {t.transaction_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete transaction"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#111827] border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-base">Record New Transaction</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddTransaction} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
                {["expense", "income", "transfer"].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTxType(type)}
                    className={`py-1.5 rounded-lg font-semibold uppercase text-[10px] tracking-wider transition-all ${
                      txType === type
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 1500"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Merchant / Recipient</label>
                  <input
                    type="text"
                    placeholder="e.g. Swiggy, Amazon"
                    value={merchant}
                    onChange={e => setMerchant(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Description / Memo</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly grocery stockup"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  {submitting ? "Saving..." : "Add Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
