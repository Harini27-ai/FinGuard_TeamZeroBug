import { useState } from "react";
import {
  ShieldCheck, LayoutDashboard, CreditCard, ArrowLeftRight, Landmark,
  Target, Sliders, Bot, FileText, Lock, Bell, Database, LogOut, User as UserIcon
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api";

export default function Navbar({ activeTab, setActiveTab, unreadCount, onOpenAlerts, onRefreshData }) {
  const { user, logout, quickDemoLogin } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "accounts", label: "Accounts", icon: CreditCard },
    { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
    { id: "emi", label: "EMI & Debt", icon: Landmark },
    { id: "goals", label: "Goals", icon: Target },
    { id: "simulator", label: "What-If Simulator", icon: Sliders },
    { id: "assistant", label: "AI Assistant", icon: Bot },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "security", label: "Security", icon: Lock },
  ];

  async function handleLoadDemoData() {
    setSeeding(true);
    try {
      if (!user) {
        await quickDemoLogin();
      } else {
        await apiRequest("/api/demo/seed", { method: "POST" });
      }
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3000);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error("Demo seed error:", err);
      alert("Failed to load demo data: " + err.message);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => setActiveTab("dashboard")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-lg tracking-tight">FinGuard</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  IMMUNE OS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Predict Stress · Prevent Crisis</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden xl:flex items-center gap-1 overflow-x-auto py-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                  }`}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2.5">
            {/* Load Demo Data Button */}
            <button
              onClick={handleLoadDemoData}
              disabled={seeding}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                seedSuccess
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : "bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-200"
              }`}
              title="Populates realistic synthetic accounts, transactions, and loans"
            >
              <Database size={14} className={seeding ? "animate-spin text-indigo-400" : "text-indigo-400"} />
              <span className="hidden sm:inline">
                {seeding ? "Seeding..." : seedSuccess ? "Demo Loaded ✓" : "Load Demo Data"}
              </span>
            </button>

            {/* Smart Alerts Button */}
            <button
              onClick={onOpenAlerts}
              className="relative p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
              title="View Smart Alerts"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* User Profile / Logout */}
            {user ? (
              <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
                <div className="hidden md:block text-right">
                  <div className="text-xs font-semibold text-white leading-tight">{user.name}</div>
                  <div className="text-[10px] text-slate-400 leading-tight truncate max-w-[110px]">{user.email}</div>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 transition-colors"
                  title="Log out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab("auth")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
              >
                <UserIcon size={14} />
                <span>Sign In</span>
              </button>
            )}
          </div>

        </div>

        {/* Mobile secondary navigation */}
        <div className="xl:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-800/60 no-scrollbar">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white bg-slate-800/40"
                }`}
              >
                <Icon size={13} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}
