import { useState } from "react";
import { Activity, ChevronRight, CheckCircle2, AlertTriangle, X } from "lucide-react";

export default function HealthScoreCard({ score = 74, riskLevel = "MEDIUM", scoreData }) {
  const [showDetails, setShowDetails] = useState(false);

  const getTheme = () => {
    if (score >= 80) {
      return {
        badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        stroke: "#10b981",
        label: "ROBUST IMMUNITY",
        sub: "Excellent financial resilience and liquidity cushion."
      };
    } else if (score >= 60) {
      return {
        badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        stroke: "#f59e0b",
        label: "MODERATE RESILIENCE",
        sub: "Manageable liabilities; emergency reserve requires expansion."
      };
    } else if (score >= 40) {
      return {
        badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",
        stroke: "#f97316",
        label: "ELEVATED RISK",
        sub: "High debt obligations or volatile expenses creating vulnerability."
      };
    } else {
      return {
        badge: "bg-rose-500/20 text-rose-400 border-rose-500/30",
        stroke: "#ef4444",
        label: "CRITICAL DISTRESS",
        sub: "Immediate reduction in discretionary outflows recommended."
      };
    }
  };

  const theme = getTheme();
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <>
      <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden border border-slate-800">
        {/* Top title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Activity size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Financial Health Score</h3>
              <p className="text-[11px] text-slate-400">Dynamic 0–100 Immune Metric</p>
            </div>
          </div>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${theme.badge}`}>
            {riskLevel} RISK
          </span>
        </div>

        {/* Center gauge */}
        <div className="my-4 flex items-center gap-5">
          <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="9"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke={theme.stroke}
                strokeWidth="9"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-white tracking-tight">{score}</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">out of 100</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-200 tracking-wide uppercase">{theme.label}</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-3">
              {scoreData?.summary || theme.sub}
            </p>
            <button
              onClick={() => setShowDetails(true)}
              className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <span>View 8 Contributing Factors</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Mini progress bars summary */}
        <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/50">
            <span className="text-slate-400 block text-[10px]">Expense Ratio</span>
            <span className="font-semibold text-slate-200">
              {scoreData?.contributing_factors?.find(f => f.name.includes("Expense"))?.rating || "Calculated"}
            </span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/50">
            <span className="text-slate-400 block text-[10px]">EMI Burden</span>
            <span className="font-semibold text-slate-200">
              {scoreData?.contributing_factors?.find(f => f.name.includes("EMI"))?.rating || "Calculated"}
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown Modal */}
      {showDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div>
                <h3 className="font-semibold text-white text-base">Financial Health Score Breakdown</h3>
                <p className="text-xs text-slate-400">Score: {score}/100 · {riskLevel} Risk Profile</p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4 flex-1">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  Contributing Scoring Factors
                </h4>
                <div className="space-y-2.5">
                  {scoreData?.contributing_factors?.map((f, i) => {
                    const isGood = f.rating === "Good";
                    return (
                      <div key={i} className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-white">{f.name}</span>
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            isGood ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                          }`}>
                            {f.rating} ({f.weight_score}/{f.max_weight} pts)
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{f.description}</p>
                      </div>
                    );
                  }) || <p className="text-xs text-slate-500">Add transactions to generate full factor breakdown.</p>}
                </div>
              </div>

              {scoreData?.improvement_suggestions && scoreData.improvement_suggestions.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2.5">
                    Recommended Improvements
                  </h4>
                  <div className="space-y-2">
                    {scoreData.improvement_suggestions.map((s, i) => (
                      <div key={i} className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/30 flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-indigo-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-slate-200">{s.action}</p>
                          <span className="text-[10px] text-indigo-300 font-semibold mt-0.5 inline-block">
                            Potential impact: {s.potential_impact}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
