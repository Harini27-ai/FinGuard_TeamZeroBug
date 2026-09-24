import { useState, useEffect } from "react";
import { X, Bell, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { apiRequest } from "../api";

export default function AlertsModal({ isOpen, onClose, onRefreshCount }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAlerts() {
    setLoading(true);
    try {
      const data = await apiRequest("/api/alerts");
      setAlerts(data || []);
      if (onRefreshCount) onRefreshCount();
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
    }
  }, [isOpen]);

  async function markRead(id) {
    try {
      await apiRequest(`/api/alerts/${id}/read`, { method: "PUT" });
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
      if (onRefreshCount) onRefreshCount();
    } catch (err) {
      console.error(err);
    }
  }

  async function markAllRead() {
    try {
      await apiRequest("/api/alerts/mark-all-read", { method: "POST" });
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
      if (onRefreshCount) onRefreshCount();
    } catch (err) {
      console.error(err);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#111827] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Smart Financial Alerts</h3>
              <p className="text-xs text-slate-400">Early warnings & anomaly notifications</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alerts.some(a => !a.is_read) && (
              <button
                onClick={markAllRead}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="mx-auto text-emerald-400/60 mb-2" size={32} />
              <p className="text-slate-300 text-sm font-medium">All caught up!</p>
              <p className="text-slate-500 text-xs mt-1">No active warnings or unread alerts</p>
            </div>
          ) : (
            alerts.map(a => {
              const isWarning = a.severity === "WARNING" || a.severity === "CRITICAL";
              return (
                <div
                  key={a.id}
                  onClick={() => !a.is_read && markRead(a.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    a.is_read
                      ? "bg-slate-900/40 border-slate-800/60 opacity-60"
                      : isWarning
                      ? "bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50"
                      : "bg-indigo-950/20 border-indigo-500/30 hover:border-indigo-500/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {a.severity === "CRITICAL" ? (
                        <AlertCircle className="text-red-400" size={17} />
                      ) : a.severity === "WARNING" ? (
                        <AlertTriangle className="text-amber-400" size={17} />
                      ) : (
                        <Info className="text-indigo-400" size={17} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-white truncate">{a.title}</span>
                        {!a.is_read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{a.message}</p>
                      <span className="text-[10px] text-slate-500 mt-1.5 inline-block">
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
