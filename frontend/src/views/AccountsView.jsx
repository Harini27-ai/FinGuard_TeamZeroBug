import { useState, useEffect } from "react";
import { Plus, CreditCard, Trash2, Edit2, ShieldCheck, Landmark, CheckCircle, AlertCircle, X } from "lucide-react";
import { apiRequest } from "../api";

export default function AccountsView({ onRefreshParent }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState(null);

  // Form state
  const [bankName, setBankName] = useState("");
  const [nickname, setNickname] = useState("");
  const [accType, setAccType] = useState("Savings");
  const [last4, setLast4] = useState("");
  const [balance, setBalance] = useState("");
  const [income, setIncome] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadAccounts() {
    setLoading(true);
    try {
      const data = await apiRequest("/api/accounts");
      setAccounts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  function openCreateModal() {
    setEditingAcc(null);
    setBankName("");
    setNickname("");
    setAccType("Savings");
    setLast4("");
    setBalance("");
    setIncome("");
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(acc) {
    setEditingAcc(acc);
    setBankName(acc.bank_name);
    setNickname(acc.account_nickname);
    setAccType(acc.account_type);
    setLast4(acc.last4);
    setBalance(acc.current_balance.toString());
    setIncome(acc.monthly_income.toString());
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    if (!bankName || !nickname || !last4) {
      setFormError("Bank name, nickname, and last 4 digits are required.");
      return;
    }

    if (!/^\d{4}$/.test(last4.trim())) {
      setFormError("Last 4 digits must contain exactly 4 numeric characters.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        bank_name: bankName.trim(),
        account_nickname: nickname.trim(),
        account_type: accType,
        last4: last4.trim(),
        current_balance: parseFloat(balance) || 0.0,
        monthly_income: parseFloat(income) || 0.0,
        account_status: "Active"
      };

      if (editingAcc) {
        await apiRequest(`/api/accounts/${editingAcc.id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest("/api/accounts", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      setModalOpen(false);
      loadAccounts();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this financial account?")) return;
    try {
      await apiRequest(`/api/accounts/${id}`, { method: "DELETE" });
      loadAccounts();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      alert("Failed to delete account: " + err.message);
    }
  }

  const totalBalance = accounts.reduce((acc, a) => acc + (a.current_balance || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Financial Accounts & Cards</h2>
          <p className="text-xs text-slate-400 mt-1">
            Securely link checking, savings, and salary accounts with zero credential exposure.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
        >
          <Plus size={16} />
          <span>Add Account</span>
        </button>
      </div>

      {/* Security Banner */}
      <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300">
        <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
        <span>
          <strong>Zero-Knowledge Security:</strong> FinGuard strictly stores only your account nickname and the last 4 digits. We never solicit or store bank passwords, OTPs, UPI PINs, or CVVs.
        </span>
      </div>

      {/* Account Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-sm">Loading your accounts...</div>
      ) : accounts.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center border border-slate-800">
          <Landmark className="mx-auto text-slate-600 mb-3" size={40} />
          <h3 className="text-base font-semibold text-white">No accounts added yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Connect your bank accounts or click "Load Demo Data" in the top bar to inspect realistic financial health metrics.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Add Your First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(acc => (
            <div
              key={acc.id}
              className="glass-panel-interactive p-5 rounded-2xl border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {acc.account_type}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(acc)}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
                      title="Edit Account"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete Account"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white">{acc.account_nickname}</h3>
                <p className="text-xs text-slate-400">{acc.bank_name}</p>

                <div className="my-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[10px] uppercase text-slate-500 font-semibold block">Available Balance</span>
                  <div className="text-xl font-extrabold text-white font-mono mt-0.5">
                    ₹{acc.current_balance.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono">•••• {acc.last4}</span>
                {acc.monthly_income > 0 && (
                  <span>Salary: ₹{acc.monthly_income.toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#111827] border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-base">
                {editingAcc ? "Edit Account" : "Add Bank Account"}
              </h3>
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

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank, SBI, ICICI"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Account Nickname</label>
                <input
                  type="text"
                  placeholder="e.g. Primary Salary Account, Emergency Fund"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Account Type</label>
                  <select
                    value={accType}
                    onChange={e => setAccType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="Savings">Savings</option>
                    <option value="Salary">Salary</option>
                    <option value="Current">Current</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Investment">Investment</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Last 4 Digits Only</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 4821"
                    value={last4}
                    onChange={e => setLast4(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Current Balance (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={balance}
                    onChange={e => setBalance(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Monthly Inflow (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={income}
                    onChange={e => setIncome(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
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
                  {submitting ? "Saving..." : editingAcc ? "Update Account" : "Add Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
