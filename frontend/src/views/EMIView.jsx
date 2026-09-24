import { useState, useEffect } from "react";
import { Plus, Landmark, AlertTriangle, AlertCircle, Edit2, Trash2, Calendar, X, ShieldAlert } from "lucide-react";
import { apiRequest } from "../api";

export default function EMIView({ onRefreshParent }) {
  const [emis, setEmis] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmi, setEditingEmi] = useState(null);
  const [lender, setLender] = useState("");
  const [loanName, setLoanName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [outstanding, setOutstanding] = useState("");
  const [emiAmount, setEmiAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [dueDate, setDueDate] = useState("5");
  const [tenure, setTenure] = useState("12");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [list, sum] = await Promise.all([
        apiRequest("/api/emi"),
        apiRequest("/api/emi/summary")
      ]);
      setEmis(list || []);
      setSummary(sum);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreateModal() {
    setEditingEmi(null);
    setLender("");
    setLoanName("");
    setPrincipal("");
    setOutstanding("");
    setEmiAmount("");
    setInterestRate("8.5");
    setDueDate("5");
    setTenure("12");
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(e) {
    setEditingEmi(e);
    setLender(e.lender);
    setLoanName(e.loan_name);
    setPrincipal(e.principal_amount.toString());
    setOutstanding(e.outstanding_amount.toString());
    setEmiAmount(e.emi_amount.toString());
    setInterestRate(e.interest_rate.toString());
    setDueDate(e.due_date.toString());
    setTenure(e.remaining_tenure.toString());
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    if (!lender || !loanName || !emiAmount || parseFloat(emiAmount) <= 0) {
      setFormError("Lender, loan name, and valid EMI amount are required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        lender: lender.trim(),
        loan_name: loanName.trim(),
        principal_amount: parseFloat(principal) || 0.0,
        outstanding_amount: parseFloat(outstanding) || parseFloat(principal) || 0.0,
        emi_amount: parseFloat(emiAmount),
        interest_rate: parseFloat(interestRate) || 0.0,
        due_date: parseInt(dueDate) || 5,
        remaining_tenure: parseInt(tenure) || 12,
        status: "Active"
      };

      if (editingEmi) {
        await apiRequest(`/api/emi/${editingEmi.id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest("/api/emi", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      setModalOpen(false);
      loadData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to remove this loan record?")) return;
    try {
      await apiRequest(`/api/emi/${id}`, { method: "DELETE" });
      loadData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      alert("Failed to delete EMI: " + err.message);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">EMI & Debt Management</h2>
          <p className="text-xs text-slate-400 mt-1">
            Track active loan obligations, debt-to-income leverage, and auto-debit liquidation schedules.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
        >
          <Plus size={16} />
          <span>Add Loan / EMI</span>
        </button>
      </div>

      {/* Warnings Banner if active */}
      {summary?.warnings && summary.warnings.length > 0 && (
        <div className="space-y-2">
          {summary.warnings.map((w, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2.5"
            >
              <AlertTriangle size={16} className="text-amber-400 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary KPI Strip */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-panel p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Monthly EMI</span>
            <div className="text-xl font-black text-amber-400 font-mono mt-0.5">
              ₹{summary.total_monthly_emi.toLocaleString()}
            </div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Outstanding Debt</span>
            <div className="text-xl font-black text-white font-mono mt-0.5">
              ₹{summary.total_outstanding.toLocaleString()}
            </div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Debt-to-Income (DTI)</span>
            <div className="text-xl font-black text-indigo-400 font-mono mt-0.5">
              {summary.debt_to_income_ratio}%
            </div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Burden Level</span>
            <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
              {summary.emi_burden_level}
            </div>
          </div>
        </div>
      )}

      {/* EMI Cards */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-sm">Loading debt portfolio...</div>
      ) : emis.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center border border-slate-800">
          <Landmark className="mx-auto text-slate-600 mb-3" size={40} />
          <h3 className="text-base font-semibold text-white">No active loans or EMIs recorded</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Add your vehicle, personal, or home loans to calculate debt leverage and early liquidity warnings.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Add Your First Loan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {emis.map(e => (
            <div
              key={e.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Due Day {e.due_date} of month
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(e)}
                      className="p-1 rounded text-slate-400 hover:text-slate-200"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white">{e.loan_name}</h3>
                <p className="text-xs text-slate-400">{e.lender}</p>

                <div className="my-4 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[10px] uppercase text-slate-500 font-semibold block">Monthly EMI</span>
                  <div className="text-2xl font-extrabold text-amber-400 font-mono mt-0.5">
                    ₹{e.emi_amount.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Outstanding: ₹{e.outstanding_amount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>{e.interest_rate}% Interest</span>
                <span>{e.remaining_tenure} months left</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#111827] border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-base">
                {editingEmi ? "Edit Loan Commitment" : "Add Loan / EMI"}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Lender / Bank</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC, SBI"
                    value={lender}
                    onChange={e => setLender(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Loan Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Car Loan"
                    value={loanName}
                    onChange={e => setLoanName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Monthly EMI (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 12500"
                    value={emiAmount}
                    onChange={e => setEmiAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-indigo-500 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Outstanding (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 350000"
                    value={outstanding}
                    onChange={e => setOutstanding(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Interest %</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="8.5"
                    value={interestRate}
                    onChange={e => setInterestRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Due Day (1-31)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Tenure (Mos)</label>
                  <input
                    type="number"
                    min={1}
                    value={tenure}
                    onChange={e => setTenure(e.target.value)}
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
                  {submitting ? "Saving..." : editingEmi ? "Update Loan" : "Add Loan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
