import { useState, useEffect } from "react";
import { Lock, ShieldAlert, Monitor, Key, LogOut, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest } from "../api";
import { useAuth } from "../context/AuthContext";

export default function SecurityView() {
  const { user, logout } = useAuth();
  const [securityData, setSecurityData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Password change state
  const [currPassword, setCurrPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  async function loadSecurityOverview() {
    setLoading(true);
    try {
      const data = await apiRequest("/api/security/overview");
      setSecurityData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSecurityOverview();
  }, []);

  async function handleLogoutOthers() {
    try {
      await apiRequest("/api/security/logout-others", { method: "POST" });
      alert("All other active sessions have been revoked.");
      loadSecurityOverview();
    } catch (err) {
      alert("Failed to logout other sessions: " + err.message);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwdMsg("");
    setPwdError("");

    if (!currPassword || !newPassword) {
      setPwdError("Please enter your current and new password.");
      return;
    }
    if (newPassword.length < 6) {
      setPwdError("New password must be at least 6 characters.");
      return;
    }

    setChangingPwd(true);
    try {
      await apiRequest("/api/security/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currPassword,
          new_password: newPassword
        })
      });
      setPwdMsg("Password changed successfully. Older sessions have been revoked.");
      setCurrPassword("");
      setNewPassword("");
    } catch (err) {
      setPwdError(err.message);
    } finally {
      setChangingPwd(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirm("WARNING: Are you absolutely sure you want to permanently delete your FinGuard account and all financial telemetry? This action CANNOT be undone.")) {
      return;
    }
    try {
      await apiRequest("/api/security/account", { method: "DELETE" });
      logout();
    } catch (err) {
      alert("Failed to delete account: " + err.message);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Lock size={20} className="text-indigo-400" />
          <span>Security & Session Center</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Audit authorized browser sessions, manage credentials, and inspect security telemetry.
        </p>
      </div>

      {/* Security Architecture Statement */}
      <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-xs text-indigo-300 flex items-start gap-3">
        <ShieldAlert size={20} className="text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <strong className="block text-white font-semibold">Strict Zero-Storage Credential Protocol</strong>
          <p className="mt-0.5 text-slate-300 leading-relaxed">
            FinGuard enforces cryptographic hashing with modern salted bcrypt for passwords. Bank PINs, OTPs, CVVs, and internet banking credentials are never requested or stored anywhere in the platform.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Active Sessions Panel */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Monitor size={17} className="text-indigo-400" />
                <h3 className="font-semibold text-white text-sm">Active Browser Sessions</h3>
              </div>
              <button
                onClick={handleLogoutOthers}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
              >
                Logout Others
              </button>
            </div>

            <div className="space-y-3 mt-4">
              {loading ? (
                <div className="py-8 text-center text-slate-500 text-xs">Loading sessions...</div>
              ) : securityData?.active_sessions?.length > 0 ? (
                securityData.active_sessions.map(s => (
                  <div key={s.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white truncate max-w-[200px]">
                        {s.user_agent?.split(" ")[0] || "Browser Session"}
                      </span>
                      {s.is_current ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          CURRENT SESSION
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Active</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[11px]">IP: {s.ip_address || "127.0.0.1"}</p>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Logged in: {new Date(s.created_at).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-6 text-center">No active sessions found.</p>
              )}
            </div>
          </div>
        </div>

        {/* Change Password Panel */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Key size={17} className="text-indigo-400" />
            <h3 className="font-semibold text-white text-sm">Update Password</h3>
          </div>

          {pwdMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{pwdMsg}</span>
            </div>
          )}

          {pwdError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{pwdError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Current Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={currPassword}
                onChange={e => setCurrPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-xs"
                required
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">New Secure Password</label>
              <input
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-xs"
                required
              />
            </div>

            <button
              type="submit"
              disabled={changingPwd}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
            >
              {changingPwd ? "Updating Password..." : "Change Password"}
            </button>
          </form>
        </div>

      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="glass-panel p-5 rounded-2xl border border-rose-500/30 bg-rose-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2">
            <Trash2 size={16} />
            <span>Danger Zone: Permanent Account Deletion</span>
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Permanently delete your user profile, linked accounts, transaction logs, and risk models.
          </p>
        </div>
        <button
          onClick={handleDeleteAccount}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shrink-0 transition-colors"
        >
          Delete Account Permanently
        </button>
      </div>

    </div>
  );
}
