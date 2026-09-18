/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  AuthUser,
  authenticateUser,
  getAllSystemAccounts,
  setCurrentUser,
  logoutUser,
  GUEST_COMMUTER_USER,
  AuthRole
} from "../../utils/authManager";
import {
  ShieldCheck,
  Building2,
  Car,
  Award,
  Wrench,
  Users,
  Eye,
  EyeOff,
  Lock,
  User,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  LogOut,
  Sparkles,
  ShieldAlert
} from "lucide-react";

interface UserLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  onLoginSuccess: (user: AuthUser) => void;
}

export default function UserLoginModal({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess
}: UserLoginModalProps) {
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const allAccounts = getAllSystemAccounts();

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!usernameInput.trim()) {
      setErrorMsg("Please enter your username, phone number, or ID.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const result = authenticateUser(usernameInput, passwordInput);
      setIsLoading(false);

      if (result.success && result.user) {
        setSuccessMsg(`Welcome, ${result.user.fullName}! Signed in successfully.`);
        setTimeout(() => {
          onLoginSuccess(result.user!);
          onClose();
        }, 600);
      } else {
        setErrorMsg(result.error || "Authentication failed. Check your credentials.");
      }
    }, 250);
  };

  const handleQuickLogin = (account: AuthUser) => {
    setErrorMsg("");
    setSuccessMsg(`Switching account to ${account.fullName}...`);
    setCurrentUser(account);
    setTimeout(() => {
      onLoginSuccess(account);
      onClose();
    }, 400);
  };

  const handleCommuterMode = () => {
    logoutUser();
    onLoginSuccess(GUEST_COMMUTER_USER);
    onClose();
  };

  const roleIcons: Record<AuthRole, React.ReactNode> = {
    "super-admin": <ShieldCheck className="w-4 h-4 text-indigo-500" />,
    "operator": <Building2 className="w-4 h-4 text-amber-500" />,
    "driver": <Car className="w-4 h-4 text-blue-500" />,
    "admin": <Wrench className="w-4 h-4 text-emerald-500" />,
    "fleet-manager": <Award className="w-4 h-4 text-teal-500" />,
    "inspector": <ShieldAlert className="w-4 h-4 text-red-500" />,
    "commuter": <Users className="w-4 h-4 text-zinc-500" />
  };

  const roleColors: Record<AuthRole, string> = {
    "super-admin": "border-indigo-500/30 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300",
    "operator": "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300",
    "driver": "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300",
    "admin": "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
    "fleet-manager": "border-teal-500/30 bg-teal-500/5 text-teal-700 dark:text-teal-300",
    "inspector": "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300",
    "commuter": "border-zinc-300 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
  };

  // Curated demo selection for one-click testing
  const demoAccounts = [
    allAccounts.find((a) => a.username === "superadmin") || allAccounts[0],
    allAccounts.find((a) => a.role === "operator") || allAccounts[1],
    allAccounts.find((a) => a.role === "driver") || allAccounts[2],
    allAccounts.find((a) => a.role === "admin") || allAccounts[3],
    allAccounts.find((a) => a.role === "fleet-manager") || allAccounts[4],
    allAccounts.find((a) => a.role === "inspector") || allAccounts[5]
  ].filter(Boolean) as AuthUser[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-zinc-900 text-white p-6 relative flex justify-between items-start border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                National Road Transportation Council • Sisonkhe
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2 font-display">
              User Authentication Portal
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Secure role-based access for Operators, Drivers, Rank Marshals, and Administrators.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current user banner if already logged in */}
        {currentUser && currentUser.role !== "commuter" && (
          <div className="bg-zinc-50 dark:bg-zinc-950/80 px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <img
                src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"}
                alt={currentUser.fullName}
                className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover"
              />
              <div>
                <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  {currentUser.fullName}
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${roleColors[currentUser.role]}`}>
                    {currentUser.roleDisplay}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500">Currently authenticated as @{currentUser.username}</div>
              </div>
            </div>

            <button
              onClick={handleCommuterMode}
              className="text-[11px] font-bold text-zinc-500 hover:text-red-500 dark:text-zinc-400 flex items-center gap-1 cursor-pointer transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        )}

        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Status feedback */}
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{successMsg}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                Username, Registered Phone, or National ID
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="e.g. superadmin, cyril_kunene, or +268 7604 1234"
                className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  Password or Terminal PIN
                </label>
                <span className="text-[10px] text-zinc-400">Default demo: admin / 1234</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter your password or PIN"
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 pr-11 rounded-xl text-sm font-mono-jb text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-zinc-900 hover:bg-black dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher Section */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Instant Role Switcher (One-Click Testing)
              </div>
              <span className="text-[10px] text-zinc-400">Select any pre-configured profile</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {demoAccounts.map((account) => {
                const isCurrent = currentUser.id === account.id;
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => handleQuickLogin(account)}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                      isCurrent
                        ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80"
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shrink-0 mt-0.5">
                      {roleIcons[account.role]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                          {account.fullName}
                        </div>
                        {isCurrent && (
                          <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate">{account.roleDisplay}</div>
                      <div className="text-[9px] text-zinc-400 font-mono-jb mt-0.5">
                        User: {account.username}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Commuter Mode Guest Button */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleCommuterMode}
              className="text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
            >
              Continue as Public Commuter (View Kiosk & TV Departure Boards only)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
