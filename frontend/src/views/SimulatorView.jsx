import { useState, useEffect } from "react";
import { Sliders, RefreshCw, Sparkles, TrendingUp, TrendingDown, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";
import { apiRequest } from "../api";

export default function SimulatorView() {
  const [salaryChange, setSalaryChange] = useState(0);
  const [expenseChange, setExpenseChange] = useState(0);
  const [newEmi, setNewEmi] = useState(0);
  const [additionalSavings, setAdditionalSavings] = useState(0);
  const [oneTimeExpense, setOneTimeExpense] = useState(0);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function runSimulation() {
    setLoading(true);
    try {
      const data = await apiRequest("/api/simulator", {
        method: "POST",
        body: JSON.stringify({
          salary_change: parseFloat(salaryChange) || 0,
          expense_change: parseFloat(expenseChange) || 0,
          new_emi_amount: parseFloat(newEmi) || 0,
          emi_change: 0,
          additional_savings: parseFloat(additionalSavings) || 0,
          one_time_expense: parseFloat(oneTimeExpense) || 0
        })
      });
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runSimulation();
  }, [salaryChange, expenseChange, newEmi, additionalSavings, oneTimeExpense]);

  function resetSliders() {
    setSalaryChange(0);
    setExpenseChange(0);
    setNewEmi(0);
    setAdditionalSavings(0);
    setOneTimeExpense(0);
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">What-If Financial Stress Simulator</h2>
          <p className="text-xs text-slate-400 mt-1">
            Simulate parameter adjustments in-memory without altering your real accounts or records.
          </p>
        </div>
        <button
          onClick={resetSliders}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw size={13} />
          <span>Reset Sliders</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sliders Panel */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sliders size={18} className="text-indigo-400" />
            <h3 className="font-semibold text-white text-sm">Simulation Variables</h3>
          </div>

          {/* Salary Adjustment */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Monthly Salary / Revenue Delta</span>
              <span className={`font-mono font-bold ${salaryChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {salaryChange >= 0 ? "+" : ""}₹{Number(salaryChange).toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={-30000}
              max={50000}
              step={1000}
              value={salaryChange}
              onChange={e => setSalaryChange(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>-₹30k</span>
              <span>Baseline</span>
              <span>+₹50k</span>
            </div>
          </div>

          {/* Outflow Adjustment */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Monthly Outflow / Spend Delta</span>
              <span className={`font-mono font-bold ${expenseChange <= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {expenseChange >= 0 ? "+" : ""}₹{Number(expenseChange).toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={-20000}
              max={30000}
              step={1000}
              value={expenseChange}
              onChange={e => setExpenseChange(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>-₹20k (Reduction)</span>
              <span>Baseline</span>
              <span>+₹30k (Increase)</span>
            </div>
          </div>

          {/* New EMI */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Add New Monthly EMI</span>
              <span className="font-mono font-bold text-amber-400">
                +₹{Number(newEmi).toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={35000}
              step={1000}
              value={newEmi}
              onChange={e => setNewEmi(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>₹0</span>
              <span>₹15k</span>
              <span>₹35k/mo</span>
            </div>
          </div>

          {/* Large One-Time Expense */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Large One-Time Capital Expenditure</span>
              <span className="font-mono font-bold text-rose-400">
                -₹{Number(oneTimeExpense).toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={150000}
              step={5000}
              value={oneTimeExpense}
              onChange={e => setOneTimeExpense(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>₹0</span>
              <span>₹75k</span>
              <span>₹150k</span>
            </div>
          </div>

          {/* Additional Liquid Savings */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Add Liquid Capital Injection</span>
              <span className="font-mono font-bold text-emerald-400">
                +₹{Number(additionalSavings).toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={200000}
              step={10000}
              value={additionalSavings}
              onChange={e => setAdditionalSavings(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>₹0</span>
              <span>₹100k</span>
              <span>₹200k</span>
            </div>
          </div>
        </div>

        {/* Results Comparison Panel */}
        <div className="lg:col-span-7 space-y-4">
          {result && (
            <>
              {/* Score Delta Big Box */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                      Financial Health Score Simulation
                    </span>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="text-center sm:text-left">
                        <span className="text-[10px] uppercase text-slate-500 block font-semibold">Baseline</span>
                        <span className="text-3xl font-black text-slate-300">{result.baseline.health_score}</span>
                      </div>
                      <ArrowRight size={20} className="text-indigo-400" />
                      <div className="text-center sm:text-left">
                        <span className="text-[10px] uppercase text-slate-500 block font-semibold">Simulated</span>
                        <span className={`text-3xl font-black ${
                          result.score_delta >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          {result.simulated.health_score}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`px-4 py-2 rounded-xl text-center border ${
                    result.score_delta > 0
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                      : result.score_delta < 0
                      ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}>
                    <span className="text-xs font-bold block">
                      {result.score_delta > 0 ? `+${result.score_delta}` : result.score_delta} Points
                    </span>
                    <span className="text-[10px] block opacity-80">
                      {result.score_delta >= 0 ? "Score Upgrade" : "Score Impact"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comparative Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Monthly Surplus</span>
                  <div className="text-base font-extrabold text-white font-mono mt-0.5">
                    ₹{result.simulated.monthly_savings.toLocaleString()}
                  </div>
                  <span className={`text-[10px] font-bold ${result.savings_delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {result.savings_delta >= 0 ? "+" : ""}₹{result.savings_delta.toLocaleString()}/mo
                  </span>
                </div>

                <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Emergency Runway</span>
                  <div className="text-base font-extrabold text-white font-mono mt-0.5">
                    {result.simulated.emergency_coverage_months} Months
                  </div>
                  <span className={`text-[10px] font-bold ${result.coverage_delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {result.coverage_delta >= 0 ? "+" : ""}{result.coverage_delta} Mo
                  </span>
                </div>

                <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Debt-to-Income</span>
                  <div className="text-base font-extrabold text-white font-mono mt-0.5">
                    {result.simulated.debt_to_income_ratio}%
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Baseline: {result.baseline.debt_to_income_ratio}%
                  </span>
                </div>
              </div>

              {/* Predictive Scenario Insights */}
              <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                  Immune Engine Observations
                </span>
                <div className="space-y-1.5">
                  {result.insights.map((msg, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <Sparkles size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                      <span>{msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
