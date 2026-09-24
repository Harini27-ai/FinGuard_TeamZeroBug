import { useState } from "react";
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, Landmark, ShieldAlert,
  AlertTriangle, CheckCircle, Clock, ChevronRight, Sparkles, AlertOctagon, HelpCircle
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie,
  Cell, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from "recharts";
import HealthScoreCard from "../components/HealthScoreCard";
import Day25WarningBanner from "../components/Day25WarningBanner";
import FraudSimulatorPanel from "../components/FraudSimulatorPanel";
import { apiRequest } from "../api";

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#f97316", "#64748b"];

export default function DashboardView({ dashboardData, onRefresh, onNavigate }) {
  const [anomalyActionLoading, setAnomalyActionLoading] = useState(null);

  if (!dashboardData) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-slate-400 text-sm">Synchronizing Financial Immune OS...</p>
      </div>
    );
  }

  const {
    financial_health_score = 74,
    health_risk_level = "MEDIUM",
    current_balance = 0,
    monthly_income = 0,
    monthly_expenses = 0,
    monthly_savings = 0,
    total_emi = 0,
    savings_rate = 0,
    debt_to_income = 0,
    stress_risk_percent = 0,
    day25_warning,
    emergency_fund,
    category_spending = [],
    income_vs_expense_trend = [],
    savings_trend = [],
    score_trend = [],
    upcoming_emis = [],
    active_goals = [],
    active_anomalies = [],
    recent = []
  } = dashboardData;

  async function handleAnomalyStatus(id, newStatus) {
    setAnomalyActionLoading(id);
    try {
      await apiRequest(`/api/anomalies/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus })
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to update anomaly status");
    } finally {
      setAnomalyActionLoading(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Day-25 Early Warning Banner */}
      <Day25WarningBanner warning={day25_warning} />

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        
        {/* Card 1: Health Score Card */}
        <div className="xl:col-span-2">
          <HealthScoreCard
            score={financial_health_score}
            riskLevel={health_risk_level}
            scoreData={{
              score: financial_health_score,
              risk_level: health_risk_level,
              summary: "Computed dynamically across income stability, DTI, emergency buffer, and spending volatility."
            }}
          />
        </div>

        {/* Card 2: Current Total Balance */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Liquid Balance</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Wallet size={16} />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-extrabold text-white tracking-tight">
              ₹{current_balance.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Across active accounts</p>
          </div>
          <button
            onClick={() => onNavigate("accounts")}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
          >
            Manage Accounts <ChevronRight size={12} />
          </button>
        </div>

        {/* Card 3: Monthly Income */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Monthly Income</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-extrabold text-emerald-400 tracking-tight">
              ₹{monthly_income.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Salary & cash inflows</p>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Verified active cycle</span>
        </div>

        {/* Card 4: Monthly Expenses */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Monthly Outflow</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown size={16} />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-extrabold text-rose-400 tracking-tight">
              ₹{monthly_expenses.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {monthly_income > 0 ? `${((monthly_expenses / monthly_income) * 100).toFixed(0)}% of income` : "Recorded spend"}
            </p>
          </div>
          <button
            onClick={() => onNavigate("transactions")}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
          >
            View Breakdown <ChevronRight size={12} />
          </button>
        </div>

        {/* Card 5: Monthly Savings & EMI */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Monthly EMI</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Landmark size={16} />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-extrabold text-amber-400 tracking-tight">
              ₹{total_emi.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              DTI Ratio: <span className="text-white font-bold">{debt_to_income}%</span>
            </p>
          </div>
          <button
            onClick={() => onNavigate("emi")}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
          >
            Manage Loans <ChevronRight size={12} />
          </button>
        </div>

      </div>

      {/* Stress Prediction & Emergency Fund Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Stress Prediction Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">AI Financial Stress Prediction</h3>
                <p className="text-[11px] text-slate-400">Early Stress Horizon & Risk Vector</p>
              </div>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              stress_risk_percent > 65
                ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                : stress_risk_percent > 35
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            }`}>
              {stress_risk_percent > 65 ? "HIGH" : stress_risk_percent > 35 ? "MODERATE" : "LOW"} STRESS RISK
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-xs text-slate-400">Predicted Liquidity Stress Risk:</span>
              <span className="text-xl font-black text-white">{stress_risk_percent}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  stress_risk_percent > 65
                    ? "bg-gradient-to-r from-amber-500 to-rose-500"
                    : stress_risk_percent > 35
                    ? "bg-gradient-to-r from-indigo-500 to-amber-500"
                    : "bg-gradient-to-r from-emerald-500 to-teal-400"
                }`}
                style={{ width: `${stress_risk_percent}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-300 mt-2 space-y-1">
            <p className="font-semibold text-white">Primary Vulnerability Factors:</p>
            <p className="text-slate-400 text-[11px]">• Expenses consume {monthly_income > 0 ? ((monthly_expenses/monthly_income)*100).toFixed(0) : 0}% of net revenue.</p>
            <p className="text-slate-400 text-[11px]">• Fixed EMI commitments total ₹{total_emi.toLocaleString()}/month.</p>
          </div>
        </div>

        {/* Emergency Fund Predictor */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                <PiggyBank size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Emergency Fund Predictor</h3>
                <p className="text-[11px] text-slate-400">Essential Monthly Run-rate Buffer</p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
              {emergency_fund?.coverage_months || 0} MO COVERAGE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 my-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Current Reserve</span>
              <strong className="text-sm text-white font-mono">₹{(emergency_fund?.current_fund || 0).toLocaleString()}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">6-Month Target</span>
              <strong className="text-sm text-slate-200 font-mono">₹{(emergency_fund?.target_amount || 0).toLocaleString()}</strong>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Funding Gap: <strong className="text-rose-400 font-mono">₹{(emergency_fund?.gap_amount || 0).toLocaleString()}</strong>
            </span>
            <span className="text-slate-400">
              Target Monthly SIP: <strong className="text-emerald-400 font-mono">₹{(emergency_fund?.monthly_saving_recommendation || 0).toLocaleString()}</strong>
            </span>
          </div>
        </div>

      </div>

      {/* Interactive Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Chart 1: Income vs Expenses */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Income vs Expense Trend</h3>
            <span className="text-[11px] text-slate-400 font-mono">Past 6 Months</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={income_vs_expense_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={val => `₹${val/1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                  formatter={value => [`₹${Number(value).toLocaleString()}`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Category Spending Donut */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Expense Distribution by Category</h3>
            <span className="text-[11px] text-slate-400">Current Month</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {category_spending.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={category_spending}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {category_spending.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(val, name, item) => [`₹${Number(val).toLocaleString()} (${item.payload.percentage}%)`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-500 text-xs">
                No categorized expenses recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Monthly Savings Trend */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Monthly Savings Trajectory</h3>
            <span className="text-[11px] text-slate-400">Net Accumulation</span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={savings_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={val => `₹${val/1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                  formatter={value => [`₹${Number(value).toLocaleString()}`, "Savings"]}
                />
                <Area type="monotone" dataKey="savings" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#savingsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Financial Health Score Trend */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Health Score Stability Trend</h3>
            <span className="text-[11px] text-slate-400">Historical Resilience</span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={score_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[40, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                  formatter={value => [`${value}/100`, "Health Score"]}
                />
                <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: "#10b981" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Anomalies, Upcoming EMIs & Goals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Spending Anomalies Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertOctagon size={18} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Detected Anomalies</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {active_anomalies.length} PENDING
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Outliers detected by statistical variance models:
            </p>

            <div className="space-y-2.5 max-h-56 overflow-y-auto">
              {active_anomalies.map(anom => (
                <div key={anom.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white">{anom.category} Surge</span>
                    <span className="font-bold text-amber-400">₹{anom.amount.toLocaleString()}</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mb-2">{anom.description}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAnomalyStatus(anom.id, "Expected")}
                      disabled={anomalyActionLoading === anom.id}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold"
                    >
                      Mark Expected
                    </button>
                    <button
                      onClick={() => handleAnomalyStatus(anom.id, "Unexpected")}
                      disabled={anomalyActionLoading === anom.id}
                      className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-semibold"
                    >
                      Mark Unexpected
                    </button>
                  </div>
                </div>
              ))}
              {active_anomalies.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No abnormal spending spikes detected this cycle.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming EMIs Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Landmark size={18} className="text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Upcoming EMIs</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {upcoming_emis.length} ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">Next 30 days loan obligations:</p>

            <div className="space-y-2.5 max-h-56 overflow-y-auto">
              {upcoming_emis.map(emi => (
                <div key={emi.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white block">{emi.loan_name}</span>
                    <span className="text-[11px] text-slate-400">{emi.lender} · Due day {emi.due_date}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white block font-mono">₹{emi.emi_amount.toLocaleString()}</span>
                    <span className="text-[10px] text-amber-400 font-semibold">{emi.days_left} days left</span>
                  </div>
                </div>
              ))}
              {upcoming_emis.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No active EMIs recorded.
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => onNavigate("emi")}
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
          >
            Manage Debt Portfolio <ChevronRight size={14} />
          </button>
        </div>

        {/* Active Goals Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <PiggyBank size={18} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Immune Goals</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {active_goals.length} ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">Savings targets & milestones:</p>

            <div className="space-y-3 max-h-56 overflow-y-auto">
              {active_goals.map(g => (
                <div key={g.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{g.goal_name}</span>
                    <span className="font-bold text-emerald-400">{g.progress_percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${g.progress_percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>₹{g.current_amount.toLocaleString()}</span>
                    <span>Target: ₹{g.target_amount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {active_goals.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No financial goals set yet.
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => onNavigate("goals")}
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
          >
            Create Financial Goal <ChevronRight size={14} />
          </button>
        </div>

      </div>

      {/* Real-Time ZeroBug Fraud Simulation & Live Feed Panel (PRESERVED) */}
      <FraudSimulatorPanel
        recentTransactions={recent}
        onTransactionScored={onRefresh}
      />

    </div>
  );
}
