import { useState, useEffect } from "react";
import { Plus, Target, PiggyBank, Edit2, Trash2, ArrowUpRight, X, AlertCircle } from "lucide-react";
import { apiRequest } from "../api";

const GOAL_TYPES = [
  "Emergency fund", "Vacation", "Education", "Vehicle", "Home", "Investment", "Custom"
];

export default function GoalsView({ onRefreshParent }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [goalName, setGoalName] = useState("");
  const [goalType, setGoalType] = useState("Custom");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [contribution, setContribution] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Contribute Modal
  const [contribModalOpen, setContribModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [contribAmount, setContribAmount] = useState("");

  async function loadGoals() {
    setLoading(true);
    try {
      const data = await apiRequest("/api/goals");
      setGoals(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals();
  }, []);

  function openCreateModal() {
    setEditingGoal(null);
    setGoalName("");
    setGoalType("Emergency fund");
    setTargetAmount("");
    setCurrentAmount("0");
    setContribution("");
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(g) {
    setEditingGoal(g);
    setGoalName(g.goal_name);
    setGoalType(g.goal_type);
    setTargetAmount(g.target_amount.toString());
    setCurrentAmount(g.current_amount.toString());
    setContribution(g.monthly_contribution.toString());
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    if (!goalName || !targetAmount || parseFloat(targetAmount) <= 0) {
      setFormError("Valid goal name and target amount are required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        goal_name: goalName.trim(),
        goal_type: goalType,
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount) || 0.0,
        monthly_contribution: parseFloat(contribution) || 0.0
      };

      if (editingGoal) {
        await apiRequest(`/api/goals/${editingGoal.id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest("/api/goals", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      setModalOpen(false);
      loadGoals();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleContribute(e) {
    e.preventDefault();
    if (!contribAmount || parseFloat(contribAmount) <= 0) return;

    try {
      await apiRequest(`/api/goals/${selectedGoal.id}/contribute`, {
        method: "POST",
        body: JSON.stringify({ amount: parseFloat(contribAmount) })
      });
      setContribModalOpen(false);
      setContribAmount("");
      loadGoals();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      alert("Failed to contribute: " + err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this financial goal?")) return;
    try {
      await apiRequest(`/api/goals/${id}`, { method: "DELETE" });
      loadGoals();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      alert("Failed to delete goal: " + err.message);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Financial Immune Goals</h2>
          <p className="text-xs text-slate-400 mt-1">
            Build resilience against shocks by tracking emergency reserves, capital investments, and milestones.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
        >
          <Plus size={16} />
          <span>New Goal</span>
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-sm">Loading your financial goals...</div>
      ) : goals.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center border border-slate-800">
          <Target className="mx-auto text-slate-600 mb-3" size={40} />
          <h3 className="text-base font-semibold text-white">No active financial goals</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Set an Emergency Fund target or long-term milestone to track progress automatically.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(g => (
            <div
              key={g.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {g.goal_type}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(g)}
                      className="p-1 rounded text-slate-400 hover:text-slate-200"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white">{g.goal_name}</h3>

                {/* Progress bar */}
                <div className="my-4">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold text-white">
                      ₹{g.current_amount.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-emerald-400">
                      {g.progress_percentage}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${g.progress_percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>Remaining: ₹{g.remaining_amount.toLocaleString()}</span>
                    <span>Target: ₹{g.target_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-400">
                  {g.projected_completion_date ? (
                    <span>ETA: {g.projected_completion_date}</span>
                  ) : (
                    <span>Add monthly contribution</span>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedGoal(g); setContribModalOpen(true); }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
                >
                  + Add Funds
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Goal Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#111827] border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-base">
                {editingGoal ? "Edit Goal" : "Create Financial Goal"}
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
                <label className="text-slate-300 font-medium block mb-1">Goal Name</label>
                <input
                  type="text"
                  placeholder="e.g. 6-Month Emergency Reserve, Vacation to Goa"
                  value={goalName}
                  onChange={e => setGoalName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Goal Type</label>
                <select
                  value={goalType}
                  onChange={e => setGoalType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-xs"
                >
                  {GOAL_TYPES.map(gt => <option key={gt} value={gt}>{gt}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Target Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 150000"
                    value={targetAmount}
                    onChange={e => setTargetAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-indigo-500 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Current Saved (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={currentAmount}
                    onChange={e => setCurrentAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Monthly Planned Contribution (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5000"
                  value={contribution}
                  onChange={e => setContribution(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-indigo-500 text-xs"
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
                  {submitting ? "Saving..." : editingGoal ? "Update Goal" : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Funds Modal */}
      {contribModalOpen && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#111827] border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-base">Contribute to {selectedGoal.goal_name}</h3>
              <button onClick={() => setContribModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleContribute} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Contribution Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5000"
                  value={contribAmount}
                  onChange={e => setContribAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setContribModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
