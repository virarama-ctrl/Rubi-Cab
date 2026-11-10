import React, { useState, useEffect } from 'react';
import {
  Car,
  Power,
  Navigation,
  ShieldCheck,
  Wallet,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Phone,
  KeyRound,
  Compass,
  FileCheck,
  TrendingUp,
  CreditCard,
  Building,
  RefreshCw,
  X,
  History,
  Star,
  ChevronRight,
  ShieldAlert,
  Heart,
  Sparkles,
} from 'lucide-react';
import {
  Booking,
  CaptainProfile,
  Language,
  VehicleType,
  WithdrawalRequest,
} from '../../types';
import { platformStore, SEED_CAPTAINS } from '../../services/store';
import { getTranslation } from '../../utils/translations';
import { InteractiveMap } from '../common/InteractiveMap';

interface CaptainAppProps {
  lang: Language;
}

export const CaptainApp: React.FC<CaptainAppProps> = ({ lang }) => {
  const [storeState, setStoreState] = useState(platformStore.getState());
  const [activeTab, setActiveTab] = useState<'duty' | 'wallet' | 'kyc' | 'history'>('duty');

  // OTP Inputs
  const [openingOtpInput, setOpeningOtpInput] = useState<string>('');
  const [openingOtpError, setOpeningOtpError] = useState<string | null>(null);
  const [closingOtpInput, setClosingOtpInput] = useState<string>('');
  const [closingOtpError, setClosingOtpError] = useState<string | null>(null);

  // Withdrawal Form
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('500');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  // Incoming ride alert timer countdown
  const [requestCountdown, setRequestCountdown] = useState<number>(30);

  useEffect(() => {
    const unsubscribe = platformStore.subscribe(() => {
      setStoreState({ ...platformStore.getState() });
    });
    return unsubscribe;
  }, []);

  const captain = platformStore.getCurrentCaptain();
  const activeBooking = storeState.activeBooking;
  const walletData = platformStore.getCaptainWallet(captain.id);
  const fareSettings = storeState.fareSettings;

  // Incoming ride countdown timer
  useEffect(() => {
    if (activeBooking && activeBooking.status === 'searching' && captain.isOnline) {
      setRequestCountdown(30);
      const timer = setInterval(() => {
        setRequestCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeBooking?.status, captain.isOnline]);

  // Online / Offline toggle
  const handleToggleOnline = () => {
    platformStore.setCaptainOnline(captain.id, !captain.isOnline);
  };

  // Accept incoming ride
  const handleAcceptRide = () => {
    platformStore.captainAcceptRide(captain.id);
  };

  // Captain arrived at pickup
  const handleArrivedAtPickup = () => {
    platformStore.captainArrivedAtPickup();
  };

  // Verify Opening OTP to start ride
  const handleVerifyOpeningOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOpeningOtpError(null);
    const res = platformStore.verifyOpeningOtp(openingOtpInput);
    if (!res.success) {
      setOpeningOtpError(res.error || 'Invalid Opening OTP');
    } else {
      setOpeningOtpInput('');
    }
  };

  // Captain reached destination
  const handleReachedDestination = () => {
    platformStore.captainReachedDestination();
  };

  // Verify Closing OTP to complete ride & trigger ledger crediting
  const handleVerifyClosingOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setClosingOtpError(null);
    const res = platformStore.verifyClosingOtp(closingOtpInput);
    if (!res.success) {
      setClosingOtpError(res.error || 'Invalid Closing OTP');
    } else {
      setClosingOtpInput('');
    }
  };

  // Request Bank Payout Withdrawal
  const handleRequestWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawSuccess(null);
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setWithdrawError('Please enter a valid numeric amount');
      return;
    }

    const res = platformStore.requestWithdrawal(captain.id, amountNum);
    if (!res.success) {
      setWithdrawError(res.error || 'Withdrawal failed');
    } else {
      setWithdrawSuccess(
        `Payout request ${res.withdrawal?.withdrawalRef} for ₹${amountNum} submitted successfully!`
      );
      setTimeout(() => {
        setShowWithdrawModal(false);
        setWithdrawSuccess(null);
      }, 2000);
    }
  };

  // Switch captain for demo testing
  const handleSwitchCaptain = (cptId: string) => {
    platformStore.switchActiveCaptain(cptId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-5">
      {/* Captain Top Bar & Profile Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <img
            src={captain.photoUrl}
            alt={captain.name}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400/50 shadow-md shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white">{captain.name}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30 uppercase">
                {captain.vehicleType.replace('_', ' ')}
              </span>
              {captain.isPinkEligible && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40 flex items-center gap-1">
                  <Heart className="w-2.5 h-2.5 fill-current" />
                  <span>RUBI PINK Certified</span>
                </span>
              )}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  captain.approvalStatus === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : captain.approvalStatus === 'rejected'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : captain.approvalStatus === 'suspended'
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                    : 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                }`}
              >
                {captain.approvalStatus.toUpperCase()}
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="font-mono text-slate-200">{captain.vehicleRegNumber}</span>
              <span>•</span>
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400" />
                {captain.rating} ({captain.totalTrips} trips)
              </span>
              <span>•</span>
              <span className="text-slate-300 font-medium">
                {captain.operatingCity || captain.currentCity || 'Chennai'} Territory ({captain.operatingDistrict || 'Tamil Nadu'})
              </span>
            </div>
          </div>
        </div>

        {/* Demo Captain Switcher Dropdown & Duty Switch */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 hidden lg:inline">Switch Captain:</span>
            <select
              value={captain.id}
              onChange={(e) => handleSwitchCaptain(e.target.value)}
              className="bg-slate-850 border border-slate-700 text-xs text-white rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              {SEED_CAPTAINS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.vehicleType}) {c.isPinkEligible ? '⭐ PINK' : ''} [{c.approvalStatus.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              if (captain.approvalStatus !== 'approved') {
                alert(`Cannot go on duty: Captain account status is "${captain.approvalStatus}". Super Admin approval is required.`);
                return;
              }
              handleToggleOnline();
            }}
            disabled={captain.approvalStatus !== 'approved'}
            className={`px-4 py-2 rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-md ${
              captain.approvalStatus !== 'approved'
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                : captain.isOnline
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Power className="w-4 h-4 stroke-[3]" />
            <span>
              {captain.approvalStatus !== 'approved'
                ? 'APPROVAL PENDING'
                : captain.isOnline
                ? 'ON DUTY'
                : 'GO ONLINE'}
            </span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'duty', label: 'Duty Console', icon: Navigation },
          {
            id: 'wallet',
            label: `Wallet (₹${walletData.availableBalance})`,
            icon: Wallet,
          },
          { id: 'kyc', label: 'RTO & Insurance Compliance', icon: FileCheck },
          { id: 'history', label: 'Trip Ledger', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DUTY CONSOLE */}
      {activeTab === 'duty' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Side: Ride Request & Two-Stage OTP verification */}
          <div className="lg:col-span-5 space-y-4">
            {/* Status indicator banner */}
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    captain.isOnline ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                  }`}
                />
                <span className="font-bold text-white">
                  {captain.isOnline ? 'Listening for Live Ride Signals' : 'Captain Currently Offline'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">GPS: Active (Chennai Metro)</span>
            </div>

            {/* INCOMING RIDE REQUEST ALERT */}
            {activeBooking && activeBooking.status === 'searching' && captain.isOnline && (
              <div
                className={`bg-slate-900 border-2 rounded-3xl p-5 shadow-2xl space-y-4 animate-bounce-subtle ${
                  activeBooking.serviceType === 'rubi_pink'
                    ? 'border-pink-500 shadow-pink-500/20'
                    : 'border-amber-400 shadow-amber-400/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-4 h-4 animate-spin" />
                    <span>Incoming Ride Request</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        activeBooking.serviceType === 'rubi_pink'
                          ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                          : 'bg-amber-400/10 text-amber-300 border border-amber-400/30'
                      }`}
                    >
                      {activeBooking.serviceType === 'rubi_pink'
                        ? 'RUBI PINK [Women Priority]'
                        : 'RUBI CAB'}
                    </span>
                    <span className="text-xs font-black font-mono text-rose-400 px-2 py-0.5 bg-rose-500/10 rounded-lg border border-rose-500/20">
                      {requestCountdown}s
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-850 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <div className="text-xs font-bold text-white truncate">
                      {activeBooking.pickup.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <div className="text-xs font-bold text-white truncate">
                      {activeBooking.destination.name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Est. Net Earnings</div>
                    <div className="text-xl font-black text-emerald-400 font-mono">
                      ₹
                      {activeBooking.fareBreakdown?.captainNetEarnings ||
                        Math.round(activeBooking.estimatedFare * 0.78)}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div>{activeBooking.estimatedDistanceKm} km</div>
                    <div>~{activeBooking.estimatedDurationMin} mins</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => platformStore.cancelBooking('Captain passed', 'captain')}
                    className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs transition-all"
                  >
                    {getTranslation(lang, 'rejectRide')}
                  </button>
                  <button
                    onClick={handleAcceptRide}
                    className="py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl text-xs shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    {getTranslation(lang, 'acceptRide')}
                  </button>
                </div>
              </div>
            )}

            {/* RIDE IN PROGRESS LIFECYCLE FOR CAPTAIN */}
            {activeBooking && activeBooking.captainId === captain.id && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                {/* Header status */}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">
                    {activeBooking.status === 'accepted' && 'En Route to Pickup Point'}
                    {activeBooking.status === 'arrived' && 'Arrived at Pickup - Awaiting Opening OTP'}
                    {activeBooking.status === 'in_progress' && 'Trip In Progress'}
                    {activeBooking.status === 'destination_reached' &&
                      'Destination Reached - Awaiting Closing OTP'}
                    {activeBooking.status === 'completed' && 'Trip Finalized & Settled'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{activeBooking.bookingRef}</span>
                </div>

                {/* Customer Contact Card & Masked Bridge Calling */}
                <div className="p-3 bg-slate-850 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{activeBooking.customerName}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{activeBooking.customerRating} Customer Rating</span>
                    </div>
                  </div>

                  {/* VIRTUAL NUMBER CALLING SYSTEM BUTTON (EXOTEL MASKED) */}
                  <button
                    onClick={() => platformStore.initiateVirtualCall(activeBooking.id, 'captain')}
                    className="p-2.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30 flex items-center gap-1.5 transition-all"
                    title="Masked Virtual Bridge Call (TRAI Compliant)"
                  >
                    <Phone className="w-4 h-4" />
                    <span className="font-bold text-[11px]">Masked Call</span>
                  </button>
                </div>

                {/* Action 1: Reached Pickup Point */}
                {activeBooking.status === 'accepted' && (
                  <button
                    onClick={handleArrivedAtPickup}
                    className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl text-xs shadow-lg shadow-amber-400/20"
                  >
                    Confirm Arrived at Pickup Spot
                  </button>
                )}

                {/* CRITICAL TWO-STAGE OTP 1: Enter Customer Opening OTP */}
                {(activeBooking.status === 'arrived' || activeBooking.status === 'accepted') && (
                  <form
                    onSubmit={handleVerifyOpeningOtp}
                    className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-3"
                  >
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4" />
                      <span>{getTranslation(lang, 'enterOpeningOtp')}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Ask the passenger for the 6-digit Opening PIN displayed on their screen.
                    </p>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-Digit PIN"
                      value={openingOtpInput}
                      onChange={(e) => setOpeningOtpInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full py-2.5 px-4 bg-slate-900 border border-slate-700 rounded-xl text-center font-mono text-2xl tracking-widest text-white focus:outline-none focus:border-amber-400"
                    />
                    {openingOtpError && (
                      <div className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{openingOtpError}</span>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={openingOtpInput.length !== 6}
                      className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md"
                    >
                      {getTranslation(lang, 'verifyToStart')}
                    </button>
                  </form>
                )}

                {/* Active Trip Telemetry and Reached Destination Action */}
                {activeBooking.status === 'in_progress' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-sky-950/20 rounded-2xl border border-sky-800/40 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-sky-300 font-semibold flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 animate-spin" />
                          <span>GPS Tracking Active</span>
                        </span>
                        <span className="text-emerald-400 font-mono font-bold">Speed: 38 km/h</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                        <div className="bg-slate-900/60 p-2 rounded-xl">
                          <div className="text-[10px] text-slate-400">Recorded Distance</div>
                          <div className="text-sm font-bold text-white">
                            {activeBooking.actualDistanceKm || activeBooking.estimatedDistanceKm} km
                          </div>
                        </div>
                        <div className="bg-slate-900/60 p-2 rounded-xl">
                          <div className="text-[10px] text-slate-400">Duration</div>
                          <div className="text-sm font-bold text-white">
                            {activeBooking.actualDurationMin || activeBooking.estimatedDurationMin} mins
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleReachedDestination}
                      className="w-full py-3.5 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-2xl text-xs shadow-lg shadow-sky-500/20"
                    >
                      Confirm Reached Destination
                    </button>
                  </div>
                )}

                {/* CRITICAL TWO-STAGE OTP 2: Enter Customer Closing OTP */}
                {activeBooking.status === 'destination_reached' && (
                  <form
                    onSubmit={handleVerifyClosingOtp}
                    className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-3"
                  >
                    <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{getTranslation(lang, 'enterClosingOtp')}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Collect the 6-digit trip completion PIN from the passenger to finalize fare calculation.
                    </p>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-Digit Closing PIN"
                      value={closingOtpInput}
                      onChange={(e) => setClosingOtpInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full py-2.5 px-4 bg-slate-900 border border-slate-700 rounded-xl text-center font-mono text-2xl tracking-widest text-white focus:outline-none focus:border-purple-400"
                    />
                    {closingOtpError && (
                      <div className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{closingOtpError}</span>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={closingOtpInput.length !== 6}
                      className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 disabled:opacity-40 text-white font-black rounded-xl text-xs transition-all shadow-md"
                    >
                      {getTranslation(lang, 'verifyToEnd')}
                    </button>
                  </form>
                )}

                {/* Trip finalized info */}
                {activeBooking.status === 'completed' && (
                  <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-2 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <h4 className="text-sm font-bold text-white">Trip Successfully Closed</h4>
                    <p className="text-xs text-slate-400">
                      Net earnings credited to your captain wallet. Awaiting customer payment confirmation.
                    </p>
                    <div className="text-xl font-black text-emerald-400 font-mono pt-1">
                      +₹{activeBooking.fareBreakdown?.captainNetEarnings}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side: Map Navigation */}
          <div className="lg:col-span-7 sticky top-20">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 shadow-xl">
              <InteractiveMap
                pickup={activeBooking?.pickup || (captain.currentLat ? { lat: captain.currentLat, lng: captain.currentLng, id: 'cpt_pos', name: `${captain.name}'s Location`, address: `${captain.operatingDistrict || 'Tamil Nadu'}, India` } : null)}
                destination={activeBooking?.destination || null}
                activeBooking={activeBooking}
                lang={lang}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WALLET & BANK PAYOUTS */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          {/* KYC Status & Emergency Suspension Banner if applicable */}
          {storeState.fareSettings.withdrawalsSuspended && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-rose-300">Withdrawals Suspended: </span>
                <span className="text-rose-200">
                  {storeState.fareSettings.withdrawalSuspensionReason ||
                    'Banking operations are temporarily paused by RUBI CAB administration for scheduled audit.'}
                </span>
              </div>
            </div>
          )}

          {captain.kycStatus !== 'Approved' && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-amber-300">
                    KYC Status: {captain.kycStatus || 'Under Verification'}
                  </div>
                  <div className="text-slate-300 text-[11px] mt-0.5">
                    Only captains with Approved KYC status can receive ride dispatches and initiate bank payouts.
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                {captain.kycStatus || 'In Review'}
              </span>
            </div>
          )}

          {/* 5-Metric Wallet Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Available for Payout</div>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                ₹{walletData.availableBalance}
              </div>
              <button
                onClick={() => {
                  setWithdrawError(null);
                  setWithdrawSuccess(null);
                  setShowWithdrawModal(true);
                }}
                disabled={
                  walletData.availableBalance < (fareSettings.minWithdrawalAmount || 200) ||
                  captain.kycStatus !== 'Approved' ||
                  captain.bankDetails.verificationStatus !== 'verified' ||
                  fareSettings.withdrawalsSuspended
                }
                className="mt-2.5 w-full py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Request Payout</span>
              </button>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pending In-Flight</div>
              <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                ₹{walletData.pendingBalance}
              </div>
              <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Reserved for bank processing</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Net Earnings</div>
              <div className="text-2xl font-black text-white font-mono mt-1">
                ₹{walletData.totalEarnings}
              </div>
              <div className="text-[10px] text-slate-400 mt-2">All completed ride earnings & incentives</div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Withdrawn</div>
              <div className="text-2xl font-black text-sky-400 font-mono mt-1">
                ₹{walletData.totalWithdrawn}
              </div>
              <div className="text-[10px] text-slate-400 mt-2">Disbursed to verified bank account</div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Platform Commission</div>
              <div className="text-2xl font-black text-slate-300 font-mono mt-1">
                ₹{walletData.totalCommission}
              </div>
              <div className="text-[10px] text-slate-400 mt-2">RUBI CAB tech fee & government TDS</div>
            </div>
          </div>

          {/* Bank Account Verification & Security Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-400" />
                  <span>Settlement Bank Account & Penny-Drop Verification</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  TRAI and NPCI compliant direct IMPS bank payout gateway
                </p>
              </div>

              {captain.bankDetails.verificationStatus === 'verified' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified via NPCI Penny-Drop</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2">
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold">
                    Penny-Drop Verification Required
                  </span>
                  <button
                    onClick={() => {
                      const res = platformStore.verifyCaptainBankAccount(captain.id);
                      if (res.success) {
                        setWithdrawSuccess(`Bank account verified successfully! NPCI Ref: ${res.pennyDropRef}`);
                        setTimeout(() => setWithdrawSuccess(null), 3500);
                      }
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 rounded-xl text-xs font-bold shadow-md transition-all"
                  >
                    Run Penny-Drop Test (₹1)
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-850 rounded-2xl border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Account Holder</div>
                <div className="font-bold text-white mt-1">
                  {captain.bankDetails.accountHolderName || captain.name}
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5">100% Name Match with KYC</div>
              </div>

              <div className="p-3 bg-slate-850 rounded-2xl border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Bank & Branch</div>
                <div className="font-bold text-white mt-1">{captain.bankDetails.bankName}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Type: {(captain.bankDetails.accountType || 'Savings').toUpperCase()}
                </div>
              </div>

              <div className="p-3 bg-slate-850 rounded-2xl border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Masked Account Number</div>
                <div className="font-mono font-bold text-white mt-1 text-sm">
                  {platformStore.maskAccountNumber(captain.bankDetails.accountNumber)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Encrypted at rest & in transit</div>
              </div>

              <div className="p-3 bg-slate-850 rounded-2xl border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold">IFSC & Settlement Gateway</div>
                <div className="font-mono font-bold text-white mt-1">{captain.bankDetails.ifscCode}</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">
                  {captain.bankDetails.pennyDropRef || 'NPCI IMPS Direct Transfer'}
                </div>
              </div>
            </div>
          </div>

          {/* Automated Double-Entry Wallet Ledger */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Immutable Personal Wallet Ledger</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time double-entry accounting separating online credits and cash offsets
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {walletData.transactions.length} records
              </span>
            </div>

            <div className="divide-y divide-slate-800">
              {walletData.transactions.map((tx) => (
                <div key={tx.id} className="py-3.5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5 max-w-xl">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{tx.description}</span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-md font-mono uppercase font-bold ${
                          tx.type === 'ride_earning'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : tx.type === 'cash_collection_offset'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : tx.type === 'withdrawal_hold'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : tx.type === 'withdrawal_refund'
                            ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                            : tx.type === 'incentive'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {tx.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Ref: {tx.transactionRef} • {new Date(tx.createdAt).toLocaleString()}
                      {tx.tamilDescription && ` • ${tx.tamilDescription}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-mono font-black text-sm ${
                        tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.amount > 0 ? `+₹${tx.amount}` : `-₹${Math.abs(tx.amount)}`}
                    </div>
                    {tx.commissionAmount ? (
                      <div className="text-[10px] text-slate-400 font-mono">
                        Platform Fee: ₹{tx.commissionAmount}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KYC & COMMERCIAL PERMITS */}
      {activeTab === 'kyc' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Captain KYC & Commercial Permits</h3>
              <p className="text-xs text-slate-400">
                Statutory documents registered with Tamil Nadu State Transport Authority
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                captain.kycStatus === 'Approved'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              {captain.kycStatus || 'Submitted'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-slate-850 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Driving License</span>
              <div className="font-mono text-white font-bold">{captain.drivingLicenseNumber}</div>
              <div className="text-[11px] text-emerald-400">Valid till {captain.licenseExpiry}</div>
            </div>

            <div className="p-3.5 bg-slate-850 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Commercial Insurance</span>
              <div className="font-mono text-white font-bold">{captain.insuranceNumber}</div>
              <div className="text-[11px] text-emerald-400">Valid till {captain.insuranceExpiry}</div>
            </div>

            <div className="p-3.5 bg-slate-850 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Aadhaar / Identity Document</span>
              <div className="font-mono text-white font-bold">{captain.identityDocNumber || '•••• •••• 9920'}</div>
              <div className="text-[11px] text-emerald-400">Unique Identification Authority of India</div>
            </div>

            <div className="p-3.5 bg-slate-850 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Vehicle Registration (RC)</span>
              <div className="font-mono text-white font-bold">{captain.vehicleRegNumber}</div>
              <div className="text-[11px] text-slate-300">{captain.vehicleModel}</div>
            </div>

            <div className="p-3.5 bg-slate-850 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Settlement Bank Account</span>
              <div className="font-mono text-white font-bold">
                {captain.bankDetails.bankName} - {platformStore.maskAccountNumber(captain.bankDetails.accountNumber)}
              </div>
              <div className="text-[11px] text-slate-300 font-mono">IFSC: {captain.bankDetails.ifscCode}</div>
            </div>

            <div className="p-3.5 bg-slate-850 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Bank Verification Status</span>
              <div className="font-bold text-emerald-400">
                {captain.bankDetails.verificationStatus === 'verified'
                  ? 'Penny-Drop Verified'
                  : 'Pending Verification'}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {captain.bankDetails.pennyDropRef || 'NPCI Direct Settlement'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TRIP LEDGER */}
      {activeTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white">Completed Trips History</h3>
          <div className="divide-y divide-slate-800">
            {storeState.bookingHistory.map((bk) => (
              <div key={bk.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white">
                    {bk.pickup.name} → {bk.destination.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {bk.bookingRef} • {bk.serviceType.toUpperCase()} • {new Date(bk.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-black text-sm text-emerald-400">
                    ₹{bk.fareBreakdown?.captainNetEarnings || Math.round(bk.estimatedFare * 0.78)}
                  </div>
                  <div className="text-[10px] text-slate-400">Gross: ₹{bk.finalFare || bk.estimatedFare}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RAPIDO / UBER-STYLE WITHDRAWAL MODAL WITH COMMISSION & NET PAYOUT PREVIEW */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Request Bank Withdrawal</h3>
                <p className="text-xs text-slate-400">Direct IMPS settlement to your verified account</p>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
              <span className="text-xs text-slate-300">Available Wallet Balance</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                ₹{walletData.availableBalance}
              </span>
            </div>

            <form onSubmit={handleRequestWithdrawal} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">
                  Withdrawal Amount (Min ₹{fareSettings.minWithdrawalAmount || 200}, Max ₹
                  {fareSettings.maxWithdrawalAmount || 50000})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min={fareSettings.minWithdrawalAmount || 200}
                    max={Math.min(fareSettings.maxWithdrawalAmount || 50000, walletData.availableBalance)}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-850 border border-slate-700 rounded-xl text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>
              </div>

              {/* Net Payout and Commission Preview */}
              {(() => {
                const amt = parseFloat(withdrawAmount) || 0;
                const commRate = fareSettings.withdrawalCommissionPercent ?? 10;
                const comm = Math.round((amt * commRate) / 100);
                const net = Math.max(0, amt - comm);
                return (
                  <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <div className="font-bold text-slate-300 border-b border-slate-800 pb-2">
                      Payout Breakdown & Fee Preview
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Requested Gross Amount</span>
                      <span className="font-mono font-semibold text-white">₹{amt}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Platform Commission ({commRate}%)</span>
                      <span className="font-mono font-semibold text-amber-400">-₹{comm}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-800">
                      <span className="text-white">Net Bank Deposit</span>
                      <span className="font-mono text-emerald-400 text-base">₹{net}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Bank Destination Card */}
              <div className="p-3.5 bg-slate-850 rounded-2xl border border-slate-800 text-xs space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Payout Destination</div>
                <div className="font-bold text-white flex items-center justify-between">
                  <span>{captain.bankDetails.bankName}</span>
                  <span className="text-emerald-400 text-[11px]">NPCI IMPS</span>
                </div>
                <div className="font-mono text-slate-300">
                  Account: {platformStore.maskAccountNumber(captain.bankDetails.accountNumber)} • IFSC: {captain.bankDetails.ifscCode}
                </div>
              </div>

              {withdrawError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{withdrawError}</span>
                </div>
              )}

              {withdrawSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{withdrawSuccess}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !withdrawAmount ||
                    parseFloat(withdrawAmount) < (fareSettings.minWithdrawalAmount || 200) ||
                    parseFloat(withdrawAmount) > walletData.availableBalance
                  }
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                >
                  Confirm & Withdraw
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
