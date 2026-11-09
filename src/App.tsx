import React, { useState, useEffect } from 'react';
import { UserRole, Language } from './types';
import { Header } from './components/common/Header';
import { CustomerApp } from './components/customer/CustomerApp';
import { CaptainApp } from './components/captain/CaptainApp';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthModal } from './components/auth/AuthModal';
import { CaptainRegistrationModal } from './components/captain/CaptainRegistrationModal';
import { VirtualCallModal } from './components/common/VirtualCallModal';
import { platformStore } from './services/store';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole | 'split'>('customer');
  const [lang, setLang] = useState<Language>('en');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showCaptainRegModal, setShowCaptainRegModal] = useState<boolean>(false);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Handle window resize dynamically
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && currentRole === 'split') {
        setCurrentRole('customer');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentRole]);

  const handleRoleSelectFromAuth = (role: UserRole) => {
    setCurrentRole(role);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
      {/* Google Maps Quota Warning Banner (if triggered) */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top App Header with Role Switcher & Tamil / English toggle */}
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        lang={lang}
        onLanguageChange={setLang}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onOpenCaptainRegistration={() => setShowCaptainRegModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-10">
        {currentRole === 'customer' && <CustomerApp lang={lang} />}

        {currentRole === 'captain' && <CaptainApp lang={lang} />}

        {currentRole === 'admin' && <AdminDashboard lang={lang} />}

        {/* Dual Live Split Mode */}
        {currentRole === 'split' && (
          <div className="max-w-[1720px] mx-auto px-3 sm:px-6 py-4">
            {/* Split view banner info */}
            <div className="mb-4 px-4 py-2.5 bg-gradient-to-r from-sky-950/60 via-slate-900 to-amber-950/40 border border-sky-800/40 rounded-2xl flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                <span className="font-bold text-white">Dual Live Testing Mode</span>
                <span className="text-slate-400 hidden sm:inline">
                  — Test real-time two-stage OTP handshake between Rider and Captain on one screen
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="text-sky-300">Left: Rider Interface (RUBI CAB / PINK)</span>
                <span>|</span>
                <span className="text-amber-300">Right: Captain Duty Console</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Customer Interface */}
              <div className="border border-slate-800/80 rounded-3xl bg-slate-925/40 p-2 shadow-2xl">
                <div className="px-4 py-2 border-b border-slate-800/80 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-sky-400" />
                    <span className="font-bold text-xs uppercase tracking-wider text-sky-400">
                      Rider (Customer) Interface
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Ramesh Sundaram</span>
                </div>
                <CustomerApp lang={lang} />
              </div>

              {/* Right Column: Captain Interface */}
              <div className="border border-slate-800/80 rounded-3xl bg-slate-925/40 p-2 shadow-2xl">
                <div className="px-4 py-2 border-b border-slate-800/80 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="font-bold text-xs uppercase tracking-wider text-amber-400">
                      Captain (Driver) Interface
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Duty & Telemetry Console</span>
                </div>
                <CaptainApp lang={lang} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-bold text-slate-400">RUBI CAB & RUBI CAB PINK Mobility Platform</span> • 100% TRAI & RTO Compliant Aggregator
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>2-Stage Opening & Closing OTP</span>
            <span>•</span>
            <span>Exotel Masked Cloud Telephony</span>
            <span>•</span>
            <span>Seven Seater Fleet</span>
            <span>•</span>
            <span>Women-Priority Travel</span>
          </div>
        </div>
      </footer>

      {/* Global Virtual Calling Telephony Modal */}
      <VirtualCallModal />

      {/* Global Auth / Role Selection Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        lang={lang}
        onSuccessRole={handleRoleSelectFromAuth}
        onOpenCaptainRegistration={() => setShowCaptainRegModal(true)}
      />

      {/* Global Captain Onboarding & KYC Registration Modal */}
      <CaptainRegistrationModal
        isOpen={showCaptainRegModal}
        onClose={() => setShowCaptainRegModal(false)}
        lang={lang}
        onSuccessSubmitted={(ref) => {
          // Switch to admin or captain view if desired, or let user know
        }}
      />
    </div>
  );
}
