import { useState } from "react";
import { Zap, ShieldAlert, Cpu, Activity, CheckCircle2, X } from "lucide-react";
import { apiRequest } from "../api";

export default function FraudSimulatorPanel({ recentTransactions = [], onTransactionScored }) {
  const [busy, setBusy] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  async function handleSimulate() {
    setBusy(true);
    try {
      const data = await apiRequest("/api/transactions/simulate", { method: "POST" });
      setSelectedTx(data);
      if (onTransactionScored) onTransactionScored();
    } catch (err) {
      console.error("Simulation error:", err);
      alert("Failed to simulate transaction: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  function getBadgeClass(action) {
    switch ((action || "").toLowerCase()) {
      case "approve":
        return "badge approve";
      case "step_up":
        return "badge step_up";
      case "freeze":
        return "badge freeze";
      default:
        return "badge approve";
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="pulse"></span>
            <h3 className="font-semibold text-white text-sm">Real-Time Defense & Fraud Engine</h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Behavioral signals + account graph checks + autonomous APPROVE / STEP_UP / FREEZE policy
          </p>
        </div>

        <button
          onClick={handleSimulate}
          disabled={busy}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 shrink-0"
        >
          <Zap size={15} className={busy ? "animate-spin" : ""} />
          <span>{busy ? "Scoring Pipeline..." : "Simulate Fraud Detection"}</span>
        </button>
      </div>

      {/* 4-step pipeline cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-indigo-400 font-bold text-xs block mb-1">01 · PAYLOAD</span>
          <strong className="text-xs text-slate-200 block">Transaction Stream</strong>
          <small className="text-[11px] text-slate-400">Device fingerprint & telemetry</small>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-indigo-400 font-bold text-xs block mb-1">02 · GRAPH</span>
          <strong className="text-xs text-slate-200 block">Identity Relationships</strong>
          <small className="text-[11px] text-slate-400">Account / Device / IP cross-links</small>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-indigo-400 font-bold text-xs block mb-1">03 · BEHAVIOR</span>
          <strong className="text-xs text-slate-200 block">Biometric Deviation</strong>
          <small className="text-[11px] text-slate-400">Typing & pointer anomalies</small>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-indigo-400 font-bold text-xs block mb-1">04 · POLICY</span>
          <strong className="text-xs text-slate-200 block">Autonomous Action</strong>
          <small className="text-[11px] text-slate-400">Approve / Step-Up / Freeze</small>
        </div>
      </div>

      {/* Live feed table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40">
        <div className="px-4 py-2.5 bg-slate-900/70 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-semibold">
          <span>Live Scored Feed</span>
          <span className="text-[10px] text-slate-500">Click row for full explanation</span>
        </div>
        <div className="divide-y divide-slate-800/60 max-h-56 overflow-y-auto">
          {recentTransactions.slice(0, 5).map(tx => (
            <div
              key={tx.id}
              onClick={() => setSelectedTx(tx)}
              className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-indigo-950/20 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-400 text-[11px]">{tx.account_id}</span>
                <span className="font-medium text-slate-200 truncate max-w-[130px] sm:max-w-[200px]">
                  {tx.merchant || tx.description}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-white">
                  ₹{Number(tx.amount).toLocaleString()}
                </span>
                <span className="font-mono text-slate-400 hidden sm:inline">
                  Risk: {Number(tx.risk_score || 0).toFixed(2)}
                </span>
                <span className={getBadgeClass(tx.action)}>{tx.action || "APPROVE"}</span>
              </div>
            </div>
          ))}
          {recentTransactions.length === 0 && (
            <div className="p-6 text-center text-slate-500 text-xs">
              No transactions processed yet. Click "Simulate Fraud Detection" to test the pipeline.
            </div>
          )}
        </div>
      </div>

      {/* Modal detail */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedTx(null)}
        >
          <div
            className="w-full max-w-md bg-[#111827] border border-slate-700 rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Transaction Scoring Result</h3>
              <span className={getBadgeClass(selectedTx.action)}>{selectedTx.action}</span>
            </div>

            <div className="my-5 text-center">
              <div className="text-5xl font-black text-indigo-400 tracking-tight">
                {Number(selectedTx.risk_score || 0).toFixed(2)}
              </div>
              <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">Calculated Risk Score</p>
            </div>

            <div className="space-y-2 text-xs bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Account:</span>
                <span className="font-mono text-slate-200">{selectedTx.account_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Merchant:</span>
                <span className="font-medium text-slate-200">{selectedTx.merchant || "Merchant"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-white">₹{Number(selectedTx.amount).toLocaleString()}</span>
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Decision Factors & Reasons
            </h4>
            <ul className="space-y-1.5 mb-5 text-xs text-slate-300">
              {selectedTx.reasons?.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
