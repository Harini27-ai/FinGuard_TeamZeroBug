import { AlertTriangle, AlertCircle, ShieldAlert, ArrowRight } from "lucide-react";

export default function Day25WarningBanner({ warning }) {
  if (!warning || !warning.is_triggered || warning.warning_level === "SAFE") {
    return null;
  }

  const isCritical = warning.warning_level === "CRITICAL";

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 border transition-all mb-6 relative overflow-hidden ${
        isCritical
          ? "bg-rose-950/30 border-rose-500/40 text-rose-200"
          : "bg-amber-950/30 border-amber-500/40 text-amber-200"
      }`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isCritical ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
            }`}
          >
            {isCritical ? <AlertCircle size={22} /> : <AlertTriangle size={22} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/40 border border-current">
                {warning.warning_level} · DAY-25 EARLY WARNING
              </span>
              <span className="text-xs text-slate-400">
                {warning.days_to_salary} days until salary/billing cycle
              </span>
            </div>
            <p className="text-sm font-semibold text-white mt-1.5 leading-snug">
              {warning.warning_message}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-300">
              <span>
                Projected Balance: <strong className="text-white font-mono">₹{warning.projected_balance.toLocaleString()}</strong>
              </span>
              <span>•</span>
              <span>
                Safe Cushion Floor: <strong className="text-white font-mono">₹{warning.safe_buffer.toLocaleString()}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Recommended action box */}
        <div className="w-full md:w-auto md:min-w-[280px] p-3 rounded-xl bg-black/40 border border-white/10 shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Recommended Action
          </span>
          <p className="text-xs font-medium text-slate-200 mt-1 leading-normal">
            {warning.recommended_action}
          </p>
        </div>
      </div>
    </div>
  );
}
