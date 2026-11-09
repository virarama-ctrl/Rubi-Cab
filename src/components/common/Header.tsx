import React, { useState, useEffect } from 'react';
import {
  Car,
  Compass,
  LayoutDashboard,
  Columns,
  Languages,
  Shield,
  User,
  Radio,
  Zap,
  Heart,
  LogIn,
  LogOut,
} from 'lucide-react';
import { Language, UserRole } from '../../types';
import { getTranslation } from '../../utils/translations';
import { platformStore } from '../../services/store';

interface HeaderProps {
  currentRole: UserRole | 'split';
  onRoleChange: (role: UserRole | 'split') => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenAuthModal: () => void;
  onOpenCaptainRegistration?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  lang,
  onLanguageChange,
  onOpenAuthModal,
  onOpenCaptainRegistration,
}) => {
  const [storeState, setStoreState] = useState(platformStore.getState());

  useEffect(() => {
    const unsub = platformStore.subscribe(() => {
      setStoreState({ ...platformStore.getState() });
    });
    return unsub;
  }, []);

  const activeBooking = storeState.activeBooking;
  const currentCaptain = platformStore.getCurrentCaptain();
  const currentCustomer = storeState.currentCustomer;
  const isPink = storeState.selectedService === 'rubi_pink';
  const pendingApprovals = storeState.captains.filter((c) => c.approvalStatus === 'pending').length;
  const pendingPayouts = storeState.withdrawalRequests.filter((w) => w.status === 'pending').length;

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => onRoleChange('customer')}
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-lg transition-all ${
                isPink
                  ? 'bg-gradient-to-tr from-pink-500 to-rose-400 text-white shadow-pink-500/20'
                  : 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {isPink ? <Heart className="w-6 h-6 fill-current" /> : <Zap className="w-6 h-6 fill-current" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white font-sans">
                  {lang === 'ta' ? (isPink ? 'ரூபி கேப் பிங்க்' : 'ரூபி கேப்') : (isPink ? 'RUBI CAB PINK' : 'RUBI CAB')}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                    isPink
                      ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                      : 'bg-amber-400/10 text-amber-300 border-amber-400/20'
                  }`}
                >
                  {isPink ? 'WOMEN FLEET' : 'PRO AGGREGATOR'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-0.5 hidden sm:block">
                {isPink ? 'Women-Priority Safety Transport' : getTranslation(lang, 'tagline')}
              </p>
            </div>
          </div>

          {/* Language Switcher & Captain Sign Up (Mobile view) */}
          <div className="flex md:hidden items-center gap-1.5">
            {onOpenCaptainRegistration && (
              <button
                onClick={onOpenCaptainRegistration}
                className="px-2 py-1 rounded-xl bg-amber-400 text-slate-950 text-[11px] font-black shadow-sm"
              >
                + Captain
              </button>
            )}
            <button
              onClick={() => onLanguageChange(lang === 'en' ? 'ta' : 'en')}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-800"
            >
              <Languages className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'en' ? 'தமிழ்' : 'EN'}</span>
            </button>
            <button
              onClick={onOpenAuthModal}
              className="p-1.5 bg-slate-850 text-amber-400 rounded-xl border border-slate-800"
              title="Role Login"
            >
              <LogIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Role & Interface Switcher */}
        <nav className="flex items-center gap-1 sm:gap-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl w-full md:w-auto justify-center overflow-x-auto">
          {/* Customer / Rider Tab */}
          <button
            onClick={() => onRoleChange('customer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
              currentRole === 'customer'
                ? isPink
                  ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                  : 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Rider</span>
            {activeBooking && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            )}
          </button>

          {/* Captain Tab */}
          <button
            onClick={() => onRoleChange('captain')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
              currentRole === 'captain'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Captain</span>
            <span
              className={`w-2 h-2 rounded-full ml-0.5 ${
                currentCaptain.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
          </button>

          {/* Admin Dashboard Tab */}
          <button
            onClick={() => onRoleChange('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
              currentRole === 'admin'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Admin</span>
            {pendingApprovals + pendingPayouts > 0 && (
              <span className="px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[9px] font-black">
                {pendingApprovals + pendingPayouts}
              </span>
            )}
          </button>

          {/* Dual Split-View Tab */}
          <button
            onClick={() => onRoleChange('split')}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentRole === 'split'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'text-sky-400 hover:text-sky-300 hover:bg-sky-950/40'
            }`}
            title="View Rider & Captain side-by-side to test real-time 2-stage OTPs"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>{getTranslation(lang, 'splitView')}</span>
          </button>
        </nav>

        {/* Right Tools: Role Login Modal trigger & Language switch */}
        <div className="hidden md:flex items-center gap-2.5">
          {onOpenCaptainRegistration && (
            <button
              onClick={onOpenCaptainRegistration}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-xs font-black text-amber-300 border border-amber-400/40 transition-all hover:scale-102"
            >
              <Car className="w-3.5 h-3.5" />
              <span>New Captain Sign Up</span>
            </button>
          )}

          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-xs font-bold text-amber-400 border border-slate-800 transition-all hover:border-amber-400/40"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login / Switch Role</span>
          </button>

          <button
            onClick={() => onLanguageChange(lang === 'en' ? 'ta' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-xs font-semibold text-slate-200 border border-slate-800 transition-all hover:border-slate-700"
          >
            <Languages className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'en' ? 'தமிழ்' : 'English'}</span>
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
            <Radio className="w-3 h-3 animate-ping" />
            <span>Tamil Nadu 38 Districts Live</span>
          </div>
        </div>
      </div>
    </header>
  );
};
