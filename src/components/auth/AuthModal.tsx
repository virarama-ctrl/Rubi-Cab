import React, { useState } from 'react';
import {
  Shield,
  User,
  Car,
  Lock,
  Phone,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Zap,
  ArrowRight,
  Sparkles,
  HeartHandshake,
} from 'lucide-react';
import { Language, UserRole } from '../../types';
import { platformStore, SEED_CAPTAINS } from '../../services/store';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSuccessRole: (role: UserRole) => void;
  onOpenCaptainRegistration?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  lang,
  onSuccessRole,
  onOpenCaptainRegistration,
}) => {
  const [activeTab, setActiveTab] = useState<'rider' | 'captain' | 'new_captain' | 'admin'>('rider');
  const [isRegisteringRider, setIsRegisteringRider] = useState<boolean>(false);
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);

  // Rider state
  const [riderPhone, setRiderPhone] = useState<string>('+91 98410 77654');
  const [riderPassword, setRiderPassword] = useState<string>('rider123');
  const [riderRegName, setRiderRegName] = useState<string>('');
  const [riderRegPhone, setRiderRegPhone] = useState<string>('');
  const [riderOtpInput, setRiderOtpInput] = useState<string>('');
  const [riderOtpSent, setRiderOtpSent] = useState<boolean>(false);
  const [riderError, setRiderError] = useState<string | null>(null);

  // Captain state
  const [selectedCaptainId, setSelectedCaptainId] = useState<string>(SEED_CAPTAINS[0].id);
  const [captainPassword, setCaptainPassword] = useState<string>('captain123');
  const [captainError, setCaptainError] = useState<string | null>(null);

  // Admin state
  const [adminEmail, setAdminEmail] = useState<string>('admin@rubicab.com');
  const [adminPassword, setAdminPassword] = useState<string>('admin123');
  const [adminError, setAdminError] = useState<string | null>(null);

  // Reset dialog state
  const [resetIdentifier, setResetIdentifier] = useState<string>('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Rider Login
  const handleRiderLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setRiderError(null);
    const res = platformStore.loginRider(riderPhone, riderPassword);
    if (res.success) {
      onSuccessRole('customer');
      onClose();
    } else {
      setRiderError(res.error || 'Login failed');
    }
  };

  // Handle Rider Register
  const handleRiderRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRiderError(null);
    if (!riderOtpSent) {
      if (!riderRegName.trim() || !riderRegPhone.trim()) {
        setRiderError('Name and 10-digit mobile number are required');
        return;
      }
      setRiderOtpSent(true);
      return;
    }

    if (riderOtpInput.length !== 4 && riderOtpInput.length !== 6) {
      setRiderError('Enter 4-digit or 6-digit OTP received via SMS (Demo OTP: 1234)');
      return;
    }

    const res = platformStore.registerRider({
      name: riderRegName,
      phone: riderRegPhone.startsWith('+91') ? riderRegPhone : `+91 ${riderRegPhone}`,
    });

    if (res.success) {
      onSuccessRole('customer');
      onClose();
    } else {
      setRiderError(res.error || 'Registration failed');
    }
  };

  // Handle Captain Login
  const handleCaptainLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setCaptainError(null);
    const res = platformStore.loginCaptain(selectedCaptainId, captainPassword);
    if (res.success) {
      onSuccessRole('captain');
      onClose();
    } else {
      setCaptainError(res.error || 'Captain authentication failed');
    }
  };

  // Handle Admin Login
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    const res = platformStore.loginAdmin(adminEmail, adminPassword);
    if (res.success) {
      onSuccessRole('admin');
      onClose();
    } else {
      setAdminError(res.error || 'Invalid administrator credentials');
    }
  };

  // Handle Password Reset
  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) return;
    setResetSuccessMessage(
      `Secure password reset link and temporary OTP have been dispatched to ${resetIdentifier}. Check your registered mobile SMS / email.`
    );
    setTimeout(() => {
      setShowForgotModal(false);
      setResetSuccessMessage(null);
      setResetIdentifier('');
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-400/20 rounded-full text-amber-400 text-xs font-bold mb-2">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>RUBI CAB & RUBI CAB PINK</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            {lang === 'ta' ? 'ரூபி கேப் உள்நுழைவு' : 'Welcome to RUBI CAB'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose your role to access your dedicated transport dashboard
          </p>
        </div>

        {/* 4 Role Selection Options */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('rider');
              setIsRegisteringRider(false);
            }}
            className={`py-2 px-1.5 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'rider'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Rider</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('captain')}
            className={`py-2 px-1.5 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'captain'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Captain Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenCaptainRegistration) {
                onOpenCaptainRegistration();
                onClose();
              } else {
                setActiveTab('new_captain');
              }
            }}
            className={`py-2 px-1.5 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'new_captain'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-amber-400 hover:text-white bg-amber-400/10 border border-amber-400/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>New Captain</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`py-2 px-1.5 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'admin'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Login</span>
          </button>
        </div>

        {/* 0. NEW CAPTAIN SIGN UP TAB PANEL */}
        {activeTab === 'new_captain' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-850/90 border border-amber-400/30 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Car className="w-5 h-5" />
                <h3 className="text-sm font-black text-white">Join RUBI CAB Captain Fleet</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Drive your Bike, Auto, Mini, Sedan or Seven Seater across all 38 Tamil Nadu districts. Enjoy daily direct bank payouts, transparent 10% commission, and female captain priority on RUBI CAB PINK.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Instant Mobile OTP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Digital RC & DL Upload</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Direct Bank Verification</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Tamil Nadu Statewide</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onOpenCaptainRegistration) {
                  onOpenCaptainRegistration();
                  onClose();
                }
              }}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2"
            >
              <span>Begin Captain Registration Form</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setActiveTab('captain')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Already registered? Captain Sign In
              </button>
            </div>
          </div>
        )}

        {/* 1. RIDER TAB */}
        {activeTab === 'rider' && !isRegisteringRider && (
          <form onSubmit={handleRiderLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Mobile Number or User ID
              </label>
              <div className="flex items-center gap-2 p-2.5 bg-slate-850 rounded-xl border border-slate-700 text-xs">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <input
                  type="text"
                  value={riderPhone}
                  onChange={(e) => setRiderPhone(e.target.value)}
                  placeholder="+91 98410 77654"
                  className="bg-transparent text-white w-full focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-slate-850 rounded-xl border border-slate-700 text-xs">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <input
                  type="password"
                  value={riderPassword}
                  onChange={(e) => setRiderPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent text-white w-full focus:outline-none"
                  required
                />
              </div>
            </div>

            {riderError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{riderError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-amber-400/20"
            >
              Sign In to RUBI CAB
            </button>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>New to RUBI CAB?</span>
              <button
                type="button"
                onClick={() => setIsRegisteringRider(true)}
                className="text-amber-400 hover:underline font-bold"
              >
                Register with Mobile OTP
              </button>
            </div>
          </form>
        )}

        {/* 1B. RIDER REGISTRATION WITH OTP */}
        {activeTab === 'rider' && isRegisteringRider && (
          <form onSubmit={handleRiderRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Sundaram"
                value={riderRegName}
                onChange={(e) => setRiderRegName(e.target.value)}
                className="w-full p-2.5 bg-slate-850 rounded-xl border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Mobile Number (for SMS OTP)
              </label>
              <input
                type="tel"
                placeholder="+91 98400 12345"
                value={riderRegPhone}
                onChange={(e) => setRiderRegPhone(e.target.value)}
                className="w-full p-2.5 bg-slate-850 rounded-xl border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            {riderOtpSent && (
              <div className="p-3 bg-slate-850 rounded-xl border border-amber-400/50 space-y-2">
                <div className="text-[11px] text-amber-300 font-semibold flex items-center justify-between">
                  <span>Enter OTP received via SMS:</span>
                  <span className="font-mono text-slate-400">Demo OTP: 1234</span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="1234"
                  value={riderOtpInput}
                  onChange={(e) => setRiderOtpInput(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-center font-mono text-lg tracking-widest text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            )}

            {riderError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{riderError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg"
            >
              {riderOtpSent ? 'Verify OTP & Complete Registration' : 'Send Mobile Verification OTP'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsRegisteringRider(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Already have an account? Sign In
              </button>
            </div>
          </form>
        )}

        {/* 2. CAPTAIN TAB */}
        {activeTab === 'captain' && (
          <form onSubmit={handleCaptainLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Select Approved Captain Account
              </label>
              <select
                value={selectedCaptainId}
                onChange={(e) => setSelectedCaptainId(e.target.value)}
                className="w-full p-2.5 bg-slate-850 rounded-xl border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                {SEED_CAPTAINS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.vehicleType.toUpperCase()} - {c.vehicleRegNumber}) {c.isPinkEligible ? '⭐ PINK Certified' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">Captain Security PIN / Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  Forgot PIN?
                </button>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-slate-850 rounded-xl border border-slate-700 text-xs">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <input
                  type="password"
                  value={captainPassword}
                  onChange={(e) => setCaptainPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent text-white w-full focus:outline-none"
                  required
                />
              </div>
            </div>

            {captainError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{captainError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-amber-400/20"
            >
              Sign In as Captain
            </button>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400">
              <span className="font-bold text-slate-300">Captain Onboarding: </span>
              All captains undergo RTO document verification, background checks, and commercial insurance compliance before activation.
            </div>
          </form>
        )}

        {/* 3. ADMIN TAB */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
              <Shield className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-bold">Restricted Super Admin Console: </span>
                Only authorized platform personnel may access command center controls. Public administrative registration is disabled.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Authorized Admin Email
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@rubicab.com"
                className="w-full p-2.5 bg-slate-850 rounded-xl border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Admin Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 bg-slate-850 rounded-xl border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            {adminError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{adminError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg"
            >
              Authenticate Admin Session
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD MODAL */}
        {showForgotModal && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md p-6 flex flex-col justify-center rounded-3xl z-20">
            <h3 className="text-base font-bold text-white mb-2">Password Reset Assistance</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter your registered mobile number or email to receive a secure OTP to reset your login credentials.
            </p>
            <form onSubmit={handlePasswordReset} className="space-y-3">
              <input
                type="text"
                placeholder="Registered mobile or email"
                value={resetIdentifier}
                onChange={(e) => setResetIdentifier(e.target.value)}
                className="w-full p-2.5 bg-slate-850 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                required
              />
              {resetSuccessMessage && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{resetSuccessMessage}</span>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-400 text-slate-950 text-xs font-black rounded-xl"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
