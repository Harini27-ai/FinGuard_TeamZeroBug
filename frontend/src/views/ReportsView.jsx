import { useState, useEffect } from "react";
import { FileText, Calendar, Download, TrendingUp, TrendingDown, PiggyBank, Landmark, ShieldCheck, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { apiRequest } from "../api";

export default function ReportsView() {
  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadReport(m) {
    setLoading(true);
    try {
      const data = await apiRequest(`/api/reports?month=${m}`);
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport(selectedMonth);
  }, [selectedMonth]);

  const categoryChartData = report?.category_breakdown
    ? Object.entries(report.category_breakdown).map(([cat, amt]) => ({
        category: cat,
        amount: amt
      }))
    : [];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Monthly Financial Reports</h2>
          <p className="text-xs text-slate-400 mt-1">
            Historical audit reports, category distribution, and month-over-month trajectory analysis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded-xl">
            <Calendar size={14} className="text-indigo-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
            />
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Download size={14} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500 text-sm">Generating monthly financial report...</div>
      ) : !report ? (
        <div className="glass-panel p-12 rounded-2xl text-center border border-slate-800 text-slate-400 text-xs">
          No report data generated for this billing period.
        </div>
      ) : (
        <div className="space-y-5">
          
          {/* Executive Summary Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase text-indigo-400 font-bold block mb-1">
                EXECUTIVE SUMMARY · {report.month_year}
              </span>
              <h3 className="text-lg font-bold text-white">
                Monthly Net Cash-Flow Report
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Financial health ended at <strong className="text-white">{report.health_score}/100</strong> with a <strong className="text-white">{report.risk_level}</strong> risk profile.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center min-w-[100px]">
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Health Score</span>
                <span className="text-2xl font-black text-emerald-400">{report.health_score}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center min-w-[100px]">
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Risk Level</span>
                <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-slate-800 mt-1 inline-block">
                  {report.risk_level}
                </span>
              </div>
            </div>
          </div>

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Total Revenue</span>
              <div className="text-lg font-black text-emerald-400 font-mono mt-1">
                ₹{report.total_income.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {report.mom_comparison?.income_growth || "Stable"} MoM
              </span>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Total Outflow</span>
              <div className="text-lg font-black text-rose-400 font-mono mt-1">
                ₹{report.total_expenses.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {report.mom_comparison?.expense_growth || "Tracked"} MoM
              </span>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Net Savings</span>
              <div className="text-lg font-black text-indigo-400 font-mono mt-1">
                ₹{report.total_savings.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {report.mom_comparison?.savings_growth || "Protected"}
              </span>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">EMI Debt Serviced</span>
              <div className="text-lg font-black text-amber-400 font-mono mt-1">
                ₹{report.total_emi.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Fixed Debt Obligations
              </span>
            </div>
          </div>

          {/* Category Breakdown Chart */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
              Monthly Category Expenditure Breakdown
            </h4>
            <div className="h-64 w-full">
              {categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="category" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={val => `₹${val/1000}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                      formatter={value => [`₹${Number(value).toLocaleString()}`, "Amount"]}
                    />
                    <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-16 text-center text-slate-500 text-xs">
                  No expenditure recorded for this month.
                </div>
              )}
            </div>
          </div>

          {/* Key Findings & Recommendations */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              Strategic Recommendations for Next Cycle
            </h4>
            <div className="space-y-2">
              {report.recommendations?.map((rec, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-200">
                  <CheckCircle2 size={15} className="text-indigo-400 mt-0.5 shrink-0" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
