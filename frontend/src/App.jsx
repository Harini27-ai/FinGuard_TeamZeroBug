import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import AlertsModal from "./components/AlertsModal";
import DashboardView from "./views/DashboardView";
import AccountsView from "./views/AccountsView";
import TransactionsView from "./views/TransactionsView";
import EMIView from "./views/EMIView";
import GoalsView from "./views/GoalsView";
import SimulatorView from "./views/SimulatorView";
import AssistantView from "./views/AssistantView";
import ReportsView from "./views/ReportsView";
import SecurityView from "./views/SecurityView";
import AuthModal from "./views/AuthModal";
import { apiRequest } from "./api";

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboardData, setDashboardData] = useState(null);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function loadDashboard() {
    try {
      const data = await apiRequest("/api/dashboard");
      setDashboardData(data);
      setUnreadAlertsCount(data?.unread_alerts_count || 0);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  }

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 8000);
    return () => clearInterval(interval);
  }, [user]);

  async function handleRefreshAll() {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Initializing FinGuard Financial Immune OS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadCount={unreadAlertsCount}
        onOpenAlerts={() => setAlertsModalOpen(true)}
        onRefreshData={handleRefreshAll}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "auth" && !user && (
          <AuthModal onSuccess={() => setActiveTab("dashboard")} />
        )}

        {activeTab === "dashboard" && (
          <DashboardView
            dashboardData={dashboardData}
            onRefresh={handleRefreshAll}
            onNavigate={tab => setActiveTab(tab)}
          />
        )}

        {activeTab === "accounts" && (
          user ? (
            <AccountsView onRefreshParent={handleRefreshAll} />
          ) : (
            <AuthModal onSuccess={() => setActiveTab("accounts")} />
          )
        )}

        {activeTab === "transactions" && (
          user ? (
            <TransactionsView onRefreshParent={handleRefreshAll} />
          ) : (
            <AuthModal onSuccess={() => setActiveTab("transactions")} />
          )
        )}

        {activeTab === "emi" && (
          user ? (
            <EMIView onRefreshParent={handleRefreshAll} />
          ) : (
            <AuthModal onSuccess={() => setActiveTab("emi")} />
          )
        )}

        {activeTab === "goals" && (
          user ? (
            <GoalsView onRefreshParent={handleRefreshAll} />
          ) : (
            <AuthModal onSuccess={() => setActiveTab("goals")} />
          )
        )}

        {activeTab === "simulator" && (
          <SimulatorView />
        )}

        {activeTab === "assistant" && (
          user ? (
            <AssistantView />
          ) : (
            <AuthModal onSuccess={() => setActiveTab("assistant")} />
          )
        )}

        {activeTab === "reports" && (
          user ? (
            <ReportsView />
          ) : (
            <AuthModal onSuccess={() => setActiveTab("reports")} />
          )
        )}

        {activeTab === "security" && (
          user ? (
            <SecurityView />
          ) : (
            <AuthModal onSuccess={() => setActiveTab("security")} />
          )
        )}
      </main>

      {/* Smart Alerts Modal */}
      <AlertsModal
        isOpen={alertsModalOpen}
        onClose={() => setAlertsModalOpen(false)}
        onRefreshCount={loadDashboard}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 bg-slate-950/40 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>FinGuard · Team ZeroBug · Financial Immune System & Real-Time Defense</span>
          <span>FastAPI · SQLAlchemy · React · Tailwind CSS · Recharts</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
