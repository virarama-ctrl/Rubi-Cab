import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Car,
  FileCheck,
  TrendingUp,
  Settings,
  ShieldAlert,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Tag,
  History,
  Save,
  AlertTriangle,
  RotateCcw,
  Compass,
  Heart,
  PhoneCall,
  Lock,
  Sparkles,
  Layers,
  MapPin,
  Search,
  Eye,
  FileText,
  Filter,
  Check,
  X,
  CreditCard,
  Building,
} from 'lucide-react';
import {
  CaptainApprovalStatus,
  CaptainProfile,
  Coupon,
  FareSettings,
  Language,
  ServiceType,
  TamilNaduDistrict,
  VehicleType,
} from '../../types';
import { platformStore, VEHICLE_CONFIGS } from '../../services/store';
import { TAMIL_NADU_DISTRICTS } from '../../data/tamilNaduData';
import { getTranslation } from '../../utils/translations';
import { InteractiveMap } from '../common/InteractiveMap';

interface AdminDashboardProps {
  lang: Language;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ lang }) => {
  const [storeState, setStoreState] = useState(platformStore.getState());
  const [activeTab, setActiveTab] = useState<
    | 'stats'
    | 'districts'
    | 'services'
    | 'captains'
    | 'live_map'
    | 'pricing'
    | 'telephony'
    | 'payouts'
    | 'coupons'
    | 'sos'
    | 'audit'
    | 'cancellations'
  >('stats');

  // District state
  const [districtSearchQuery, setDistrictSearchQuery] = useState<string>('');
  const [districtFilterZone, setDistrictFilterZone] = useState<string>('all');

  // Captain KYC state
  const [captainStatusFilter, setCaptainStatusFilter] = useState<string>('all');
  const [docPreview, setDocPreview] = useState<{
    title: string;
    type: string;
    number: string;
    url?: string;
    holder: string;
  } | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{
    captainId: string;
    captainName: string;
    reason: string;
  } | null>(null);

  // Editable Fare Settings Form
  const [fareForm, setFareForm] = useState<FareSettings>(platformStore.getFareSettings());
  const [selectedPricingService, setSelectedPricingService] = useState<'rubi_cab' | 'rubi_pink'>('rubi_cab');
  const [fareSavedToast, setFareSavedToast] = useState<boolean>(false);

  // Cancellation management filters
  const [cancellationFilter, setCancellationFilter] = useState<'all' | 'customer' | 'captain' | 'admin'>('all');
  const [cancellationSearch, setCancellationSearch] = useState<string>('');

  // New Coupon Form
  const [newCouponCode, setNewCouponCode] = useState<string>('');
  const [newCouponDiscount, setNewCouponDiscount] = useState<number>(30);
  const [newCouponMinFare, setNewCouponMinFare] = useState<number>(60);
  const [newCouponService, setNewCouponService] = useState<'all' | 'rubi_cab' | 'rubi_pink'>('all');

  // Wallet & Payout Administration State
  const [adminCommissionRate, setAdminCommissionRate] = useState<number>(
    platformStore.getFareSettings().withdrawalCommissionPercent ?? 10
  );
  const [adminMinWithdrawal, setAdminMinWithdrawal] = useState<number>(
    platformStore.getFareSettings().minWithdrawalAmount ?? 200
  );
  const [adminMaxWithdrawal, setAdminMaxWithdrawal] = useState<number>(
    platformStore.getFareSettings().maxWithdrawalAmount ?? 50000
  );
  const [freezeReason, setFreezeReason] = useState<string>('');
  const [payoutToast, setPayoutToast] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = platformStore.subscribe(() => {
      const cur = platformStore.getState();
      setStoreState({ ...cur });
    });
    return unsubscribe;
  }, []);

  const handleDownloadLedgerCsv = () => {
    const csv = platformStore.generateLedgerCsvReport();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rubi_cab_wallet_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const captains = storeState.captains;
  const bookings = storeState.bookingHistory;
  const activeBooking = storeState.activeBooking;
  const withdrawals = storeState.withdrawalRequests;
  const auditLogs = storeState.auditLogs;
  const coupons = storeState.coupons;
  const telephony = storeState.telephonyConfig;
  const districts = platformStore.getDistricts();
  const cancellations = storeState.cancellationRecords || [];

  // Compute Platform Metrics
  const totalCustomers = 512;
  const totalCaptainsCount = captains.length;
  const pendingCaptains = captains.filter(
    (c) => c.approvalStatus === 'pending' || c.approvalStatus === 'submitted' || c.approvalStatus === 'under_verification'
  );
  const activeTripsCount = activeBooking ? 1 : 0;
  const completedTripsCount = bookings.filter((b) => b.status === 'completed').length;
  const pinkTripsCount = bookings.filter((b) => b.serviceType === 'rubi_pink').length;

  const totalGrossBookings = bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + (b.finalFare || 0), 22450);

  const platformCommissionRevenue = Math.round(totalGrossBookings * 0.2); // 20% commission
  const captainPayableEarnings = totalGrossBookings - platformCommissionRevenue;
  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'pending').length;

  // Handle KYC Status update
  const handleApproveCaptain = (captainId: string) => {
    platformStore.updateCaptainApproval(captainId, 'approved');
  };

  const handleOpenRejectDialog = (cpt: CaptainProfile) => {
    setRejectDialog({
      captainId: cpt.id,
      captainName: cpt.name,
      reason: 'Incomplete or unreadable driving licence / RC document. Please upload clear scan.',
    });
  };

  const handleConfirmReject = () => {
    if (!rejectDialog) return;
    platformStore.updateCaptainApproval(rejectDialog.captainId, 'rejected', rejectDialog.reason);
    setRejectDialog(null);
  };

  const handleSuspendCaptain = (captainId: string) => {
    platformStore.updateCaptainApproval(captainId, 'suspended', 'Safety inspection audit hold');
  };

  // Toggle RUBI PINK Eligibility
  const handleTogglePinkEligibility = (captainId: string, current: boolean) => {
    platformStore.updateCaptainPinkEligibility(captainId, !current);
  };

  // Save Dynamic Pricing Changes
  const handleSavePricing = (e: React.FormEvent) => {
    e.preventDefault();
    platformStore.updateFareSettings(fareForm);
    setFareSavedToast(true);
    setTimeout(() => setFareSavedToast(false), 2500);
  };

  // Update Withdrawal Status
  const handleProcessWithdrawal = (
    withdrawalId: string,
    status: 'approved' | 'successful' | 'rejected'
  ) => {
    platformStore.updateWithdrawalStatus(withdrawalId, status);
  };

  // Create Coupon
  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    const newCoupon: Coupon = {
      code: newCouponCode.trim().toUpperCase(),
      discountType: 'flat',
      discountValue: newCouponDiscount,
      minFare: newCouponMinFare,
      description: `Flat ₹${newCouponDiscount} off on ${newCouponService.toUpperCase()} rides`,
      active: true,
      serviceApplicability: newCouponService,
    };
    platformStore.addCoupon(newCoupon);
    setNewCouponCode('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-6">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white">RUBI CAB Super Admin Command Center</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase">
              Root Access
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Fleet telemetry, dual RUBI CAB & PINK services, Exotel telephony bridge, and automated double-entry ledger
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-semibold border border-emerald-500/20 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Platform Engine Operational</span>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'stats', label: 'Metrics Overview', icon: TrendingUp },
          { id: 'districts', label: `TN 38 Districts Ops (${districts.length})`, icon: MapPin },
          { id: 'services', label: 'RUBI CAB vs PINK Services', icon: Layers },
          { id: 'captains', label: `Captain KYC & Verification (${pendingCaptains.length})`, icon: FileCheck },
          { id: 'live_map', label: 'Fleet Live Map', icon: Compass },
          { id: 'pricing', label: 'Fare Matrix Engine', icon: Settings },
          { id: 'telephony', label: 'Telephony & Privacy', icon: PhoneCall },
          { id: 'payouts', label: `Bank Payouts (${pendingWithdrawalsCount})`, icon: ArrowUpRight },
          { id: 'coupons', label: 'Coupons & Promos', icon: Tag },
          { id: 'cancellations', label: `Cancellations (${cancellations.length})`, icon: XCircle },
          { id: 'audit', label: 'System Audit Logs', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
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

      {/* TAB 1: METRICS OVERVIEW */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-lg">
              <span className="text-xs text-slate-400 font-semibold uppercase">Total Platform Gross</span>
              <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                ₹{totalGrossBookings}
              </div>
              <div className="text-[11px] text-slate-400 mt-2">100% Settled Bookings</div>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-lg">
              <span className="text-xs text-slate-400 font-semibold uppercase">Platform Technology Levy (20%)</span>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                ₹{platformCommissionRevenue}
              </div>
              <div className="text-[11px] text-slate-400 mt-2">Platform Revenue</div>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-lg">
              <span className="text-xs text-slate-400 font-semibold uppercase">Captain Net Disbursed</span>
              <div className="text-2xl font-black text-white font-mono mt-1">
                ₹{captainPayableEarnings}
              </div>
              <div className="text-[11px] text-slate-400 mt-2">Credited to Captain Wallets</div>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-lg">
              <span className="text-xs text-slate-400 font-semibold uppercase">RUBI CAB PINK Trips</span>
              <div className="text-2xl font-black text-pink-400 font-mono mt-1">
                {pinkTripsCount + 28}
              </div>
              <div className="text-[11px] text-pink-300/80 mt-2">Dedicated Women Fleet Priority</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1B: TAMIL NADU STATEWIDE OPERATIONS (38 DISTRICTS) */}
      {activeTab === 'districts' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-400" />
                  <span>Tamil Nadu Statewide Operations Management (All 38 Districts)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Activate/deactivate regional clusters, control RUBI CAB PINK availability, and calibrate regional tariff multipliers.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                  {districts.filter((d) => d.isActive).length} Active Districts
                </span>
                <span className="px-3 py-1 bg-pink-500/10 text-pink-300 border border-pink-500/20 rounded-xl">
                  {districts.filter((d) => d.isPinkActive).length} Pink Enabled
                </span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-slate-800">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-850 rounded-xl border border-slate-700 text-xs">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Filter by district name or headquarters (e.g. Madurai, Coimbatore, Theni)..."
                  value={districtSearchQuery}
                  onChange={(e) => setDistrictSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-white focus:outline-none"
                />
              </div>

              {/* Zone Filter */}
              <div className="flex items-center gap-1 bg-slate-850 p-1 rounded-xl border border-slate-700 text-xs overflow-x-auto">
                {['all', 'North', 'South', 'Central', 'West'].map((zone) => (
                  <button
                    key={zone}
                    onClick={() => setDistrictFilterZone(zone)}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      districtFilterZone === zone
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {zone === 'all' ? 'All Zones' : `${zone} Zone`}
                  </button>
                ))}
              </div>
            </div>

            {/* District Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
              {districts
                .filter((d) => {
                  const distName = d.name || d.districtName || '';
                  const matchQuery =
                    !districtSearchQuery ||
                    distName.toLowerCase().includes(districtSearchQuery.toLowerCase()) ||
                    d.headquarters.toLowerCase().includes(districtSearchQuery.toLowerCase()) ||
                    d.tamilName.includes(districtSearchQuery);
                  const distZone = d.zone || 'Central';
                  const matchZone = districtFilterZone === 'all' || distZone === districtFilterZone;
                  return matchQuery && matchZone;
                })
                .map((dist) => {
                  const distName = dist.name || dist.districtName || '';
                  const registeredCaptainsInDist = captains.filter(
                    (c) =>
                      c.operatingDistrict?.toLowerCase() === dist.id.toLowerCase() ||
                      c.operatingDistrict?.toLowerCase() === distName.toLowerCase() ||
                      (c.operatingCity && c.operatingCity.toLowerCase() === dist.headquarters.toLowerCase())
                  ).length;

                  return (
                    <div
                      key={dist.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        dist.isActive
                          ? 'bg-slate-850 border-slate-700/80 shadow-md'
                          : 'bg-slate-900/40 border-slate-800/80 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-sm text-white">{distName}</h4>
                            <span className="text-xs text-slate-400">({dist.tamilName})</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            HQ: {dist.headquarters} • <span className="text-amber-400">{dist.zone || 'TN'} Zone</span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            dist.isActive
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {dist.isActive ? 'Active' : 'Offline'}
                        </span>
                      </div>

                      {/* Major Cities Tag */}
                      <div className="flex flex-wrap gap-1 text-[10px] text-slate-400">
                        {dist.majorCities.slice(0, 3).map((city) => (
                          <span key={city} className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">
                            {city}
                          </span>
                        ))}
                      </div>

                      {/* Controls */}
                      <div className="pt-2 border-t border-slate-800 space-y-2 text-xs">
                        {/* Service Toggles */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300">RUBI CAB Service:</span>
                          <button
                            onClick={() => platformStore.toggleDistrictActive(dist.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              dist.isActive
                                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {dist.isActive ? 'Enabled' : 'Disabled'}
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-pink-300 flex items-center gap-1">
                            <Heart className="w-3 h-3 fill-current" />
                            <span>RUBI CAB PINK:</span>
                          </span>
                          <button
                            onClick={() => platformStore.toggleDistrictPink(dist.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              dist.isPinkActive
                                ? 'bg-pink-500 text-white shadow-sm'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {dist.isPinkActive ? 'PINK Active' : 'Off'}
                          </button>
                        </div>

                        {/* Fare Multiplier Stepper */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-300">Tariff Multiplier:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                platformStore.updateDistrictFareMultiplier(
                                  dist.id,
                                  Math.max(0.8, Math.round((dist.fareMultiplier - 0.05) * 100) / 100)
                                )
                              }
                              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-amber-300 text-xs px-1">
                              {dist.fareMultiplier.toFixed(2)}x
                            </span>
                            <button
                              onClick={() =>
                                platformStore.updateDistrictFareMultiplier(
                                  dist.id,
                                  Math.min(2.0, Math.round((dist.fareMultiplier + 0.05) * 100) / 100)
                                )
                              }
                              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Registered Captains count */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                          <span>Registered Captains:</span>
                          <span className="font-bold text-white font-mono">
                            {registeredCaptainsInDist > 0 ? `${registeredCaptainsInDist} on roster` : '0 (Dispatch via Hub)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SERVICES CONFIGURATION (RUBI CAB VS RUBI CAB PINK) */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* RUBI CAB Card */}
          <div className="bg-slate-900 border border-amber-400/30 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">RUBI CAB (Standard)</h3>
                  <p className="text-xs text-slate-400">Regular urban mobility services</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-amber-400/10 text-amber-300 rounded-xl text-xs font-bold border border-amber-400/20">
                Active
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300">Active Vehicle Categories</div>
              {VEHICLE_CONFIGS.map((veh) => (
                <div key={veh.id} className="p-3 bg-slate-850 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <img src={veh.imageUrl} alt={veh.name} className="w-10 h-8 rounded-lg object-cover" />
                    <div>
                      <div className="font-bold text-white">{veh.name}</div>
                      <div className="text-[10px] text-slate-400">{veh.exampleModels}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md text-[10px] font-bold">
                    Enabled
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* RUBI CAB PINK Card */}
          <div className="bg-slate-900 border border-pink-500/40 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-pink-500 text-white flex items-center justify-center font-black">
                  <Heart className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">RUBI CAB PINK</h3>
                  <p className="text-xs text-slate-400">Dedicated women-focused transport</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-pink-500/20 text-pink-300 rounded-xl text-xs font-bold border border-pink-500/30">
                Active
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-pink-300">Women-Priority Fleet Categories</div>
              {VEHICLE_CONFIGS.map((veh) => (
                <div key={veh.id} className="p-3 bg-slate-850 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <img src={veh.imageUrl} alt={veh.name} className="w-10 h-8 rounded-lg object-cover" />
                    <div>
                      <div className="font-bold text-white">{veh.name} (Pink Edition)</div>
                      <div className="text-[10px] text-slate-400">Strict female captain matching</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-pink-500/20 text-pink-300 rounded-md text-[10px] font-bold">
                    PINK Priority
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CAPTAIN KYC, VERIFICATION & APPROVAL SYSTEM */}
      {activeTab === 'captains' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-400" />
                <span>Captain KYC, Digital Document Audit & Approval Portal</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect Aadhaar/PAN, Driving Licence, RC, Commercial Insurance, and Bank verification before activating captains.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono px-3 py-1 bg-slate-850 rounded-xl border border-slate-700">
              {captains.length} Total Registered Captains
            </span>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-850 rounded-2xl border border-slate-700 text-xs overflow-x-auto">
            {[
              { id: 'all', label: `All (${captains.length})` },
              {
                id: 'pending',
                label: `Pending Review (${
                  captains.filter((c) => c.approvalStatus === 'pending' || c.approvalStatus === 'submitted' || c.approvalStatus === 'under_verification').length
                })`,
              },
              { id: 'approved', label: `Approved (${captains.filter((c) => c.approvalStatus === 'approved').length})` },
              { id: 'rejected', label: `Rejected (${captains.filter((c) => c.approvalStatus === 'rejected').length})` },
              { id: 'suspended', label: `Suspended (${captains.filter((c) => c.approvalStatus === 'suspended').length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setCaptainStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  captainStatusFilter === f.id
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Captain Cards List */}
          <div className="divide-y divide-slate-800">
            {captains
              .filter((cpt) => {
                if (captainStatusFilter === 'all') return true;
                if (captainStatusFilter === 'pending') {
                  return cpt.approvalStatus === 'pending' || cpt.approvalStatus === 'submitted' || cpt.approvalStatus === 'under_verification';
                }
                return cpt.approvalStatus === captainStatusFilter;
              })
              .map((cpt) => (
                <div key={cpt.id} className="py-4 space-y-3">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs">
                    {/* Captain Identity & Profile */}
                    <div className="flex items-start gap-3">
                      <img
                        src={cpt.photoUrl}
                        alt={cpt.name}
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-700 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">{cpt.name}</span>
                          <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-mono text-slate-300 uppercase">
                            {cpt.vehicleType}
                          </span>
                          {cpt.gender === 'female' && (
                            <span className="px-2 py-0.5 bg-pink-500/20 text-pink-300 rounded text-[10px] font-bold border border-pink-500/30">
                              Female Captain
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              cpt.approvalStatus === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : cpt.approvalStatus === 'rejected'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : cpt.approvalStatus === 'suspended'
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                            }`}
                          >
                            Status: {cpt.approvalStatus.toUpperCase()}
                          </span>
                        </div>

                        <div className="text-slate-400 text-[11px] mt-1 space-y-0.5">
                          <div>
                            <span className="text-slate-300 font-medium">Vehicle:</span> {cpt.vehicleModel || cpt.vehicleType.toUpperCase()} ({cpt.vehicleRegNumber})
                          </div>
                          <div>
                            <span className="text-slate-300 font-medium">Phone:</span> {cpt.phone} • <span className="text-slate-300 font-medium">Email:</span> {cpt.email || 'N/A'}
                          </div>
                          {cpt.residentialAddress && (
                            <div className="truncate max-w-md">
                              <span className="text-slate-300 font-medium">Address:</span> {cpt.residentialAddress}
                            </div>
                          )}
                          {cpt.rejectionReason && (
                            <div className="text-rose-400 font-semibold">
                              Rejection Notice: {cpt.rejectionReason}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap self-end lg:self-auto">
                      {/* Female Captain Pink Certifier */}
                      {cpt.gender === 'female' && (
                        <button
                          onClick={() => handleTogglePinkEligibility(cpt.id, cpt.isPinkEligible)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                            cpt.isPinkEligible
                              ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <Heart className="w-3.5 h-3.5 fill-current" />
                          <span>{cpt.isPinkEligible ? 'PINK Certified' : 'Certify for PINK'}</span>
                        </button>
                      )}

                      {/* Approval Status Actions */}
                      {cpt.approvalStatus !== 'approved' && (
                        <button
                          onClick={() => handleApproveCaptain(cpt.id)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl flex items-center gap-1 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve KYC</span>
                        </button>
                      )}

                      {cpt.approvalStatus !== 'rejected' && cpt.approvalStatus !== 'suspended' && (
                        <button
                          onClick={() => handleOpenRejectDialog(cpt)}
                          className="px-3 py-1.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 font-bold rounded-xl flex items-center gap-1 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      )}

                      {cpt.approvalStatus === 'approved' && (
                        <button
                          onClick={() => handleSuspendCaptain(cpt.id)}
                          className="px-3 py-1.5 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 font-bold rounded-xl transition-all"
                        >
                          Suspend Account
                        </button>
                      )}

                      {cpt.approvalStatus === 'suspended' && (
                        <button
                          onClick={() => handleApproveCaptain(cpt.id)}
                          className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-xl transition-all"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Document Inspection Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                    {/* 1. Identity Doc */}
                    <div className="p-2 bg-slate-850 rounded-xl border border-slate-700/60 flex items-center justify-between">
                      <div className="truncate mr-1">
                        <div className="font-bold text-slate-300">Identity ({cpt.identityDocType || 'Govt ID'})</div>
                        <div className="font-mono text-slate-400 truncate">{cpt.identityDocNumber || 'TN-ID-9921'}</div>
                      </div>
                      <button
                        onClick={() =>
                          setDocPreview({
                            title: `Identity Document (${cpt.identityDocType || 'Govt Approved ID'})`,
                            type: cpt.identityDocType || 'Aadhaar / Voter ID',
                            number: cpt.identityDocNumber || 'TN-ID-9921',
                            url: cpt.identityDocUrl,
                            holder: cpt.name,
                          })
                        }
                        className="p-1.5 hover:bg-slate-700 text-amber-400 rounded-lg shrink-0"
                        title="Inspect Document"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 2. Driving License */}
                    <div className="p-2 bg-slate-850 rounded-xl border border-slate-700/60 flex items-center justify-between">
                      <div className="truncate mr-1">
                        <div className="font-bold text-slate-300">Driving Licence (DL)</div>
                        <div className="font-mono text-slate-400 truncate">{cpt.drivingLicenseNumber}</div>
                      </div>
                      <button
                        onClick={() =>
                          setDocPreview({
                            title: 'Driving Licence (Commercial Transport Badge)',
                            type: 'Driving Licence',
                            number: cpt.drivingLicenseNumber,
                            url: cpt.drivingLicenseDocUrl,
                            holder: cpt.name,
                          })
                        }
                        className="p-1.5 hover:bg-slate-700 text-amber-400 rounded-lg shrink-0"
                        title="Inspect DL"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 3. RC Document */}
                    <div className="p-2 bg-slate-850 rounded-xl border border-slate-700/60 flex items-center justify-between">
                      <div className="truncate mr-1">
                        <div className="font-bold text-slate-300">Vehicle RC Certificate</div>
                        <div className="font-mono text-slate-400 truncate">{cpt.vehicleRegNumber}</div>
                      </div>
                      <button
                        onClick={() =>
                          setDocPreview({
                            title: 'Vehicle Registration Certificate (RC)',
                            type: 'RTO Form 23 Certificate of Registration',
                            number: cpt.vehicleRegNumber,
                            url: cpt.rcDocUrl,
                            holder: cpt.name,
                          })
                        }
                        className="p-1.5 hover:bg-slate-700 text-amber-400 rounded-lg shrink-0"
                        title="Inspect RC"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 4. Bank Account */}
                    <div className="p-2 bg-slate-850 rounded-xl border border-slate-700/60 flex items-center justify-between">
                      <div className="truncate mr-1">
                        <div className="font-bold text-slate-300">{cpt.bankDetails?.bankName || 'Verified Bank'}</div>
                        <div className="font-mono text-slate-400 truncate">
                          {cpt.bankDetails?.accountNumber || '••••••••1245'}
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-mono text-[9px]">
                        IFSC: {cpt.bankDetails?.ifscCode || 'SBIN0000800'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 4: FLEET LIVE MAP */}
      {activeTab === 'live_map' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Live Fleet GPS Radar</h3>
            <span className="text-xs text-emerald-400 font-mono">Tamil Nadu Statewide Live Nodes</span>
          </div>
          <InteractiveMap
            pickup={activeBooking?.pickup || null}
            destination={activeBooking?.destination || null}
            activeBooking={activeBooking}
            showAllCaptains={true}
            lang={lang}
          />
        </div>
      )}

      {/* TAB 5: FARE MATRIX ENGINE */}
      {activeTab === 'pricing' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Dynamic Pricing & Regulatory Tariff Engine</h3>
              <p className="text-xs text-slate-400">Configure base fares, per-km rates, and peak multipliers per service</p>
            </div>
            {fareSavedToast && (
              <span className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs animate-bounce">
                Tariffs Saved!
              </span>
            )}
          </div>

          {/* Service Switcher for pricing matrix */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPricingService('rubi_cab')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                selectedPricingService === 'rubi_cab'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              RUBI CAB Pricing
            </button>
            <button
              onClick={() => setSelectedPricingService('rubi_pink')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                selectedPricingService === 'rubi_pink'
                  ? 'bg-pink-500 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              RUBI CAB PINK Pricing
            </button>
          </div>

          <form onSubmit={handleSavePricing} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-2">
                <label className="text-slate-300 font-bold block">Platform Technology Levy (%)</label>
                <input
                  type="number"
                  value={fareForm.platformCommissionPercent}
                  onChange={(e) =>
                    setFareForm({ ...fareForm, platformCommissionPercent: parseFloat(e.target.value) || 20 })
                  }
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>

              <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-2">
                <label className="text-slate-300 font-bold block">Section 194O TDS (%)</label>
                <input
                  type="number"
                  value={fareForm.tdsPercent}
                  onChange={(e) => setFareForm({ ...fareForm, tdsPercent: parseFloat(e.target.value) || 1 })}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>

              <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-2">
                <label className="text-slate-300 font-bold block">Peak Surge Multiplier</label>
                <input
                  type="number"
                  step="0.05"
                  value={fareForm.peakHourSurgeMultiplier}
                  onChange={(e) =>
                    setFareForm({ ...fareForm, peakHourSurgeMultiplier: parseFloat(e.target.value) || 1.2 })
                  }
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="py-3 px-6 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-lg transition-all"
            >
              Update Dynamic Tariffs
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: TELEPHONY & PRIVACY CONFIGURATION */}
      {activeTab === 'telephony' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Cloud Telephony Virtual Bridge (Exotel Masking)</h3>
              <p className="text-xs text-slate-400">TRAI mandate: 100% two-way number masking for rider and captain safety</p>
            </div>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/20">
              Provider: {telephony.provider}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-2">
              <div className="font-bold text-white">Active Virtual DIDs Pool</div>
              <div className="space-y-1 font-mono text-amber-400">
                {telephony.virtualNumberPool.map((num, i) => (
                  <div key={i} className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    {num} (Rotational Bridge)
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-3">
              <div className="font-bold text-white">Session Security Policy</div>
              <div className="text-slate-300 space-y-1">
                <div>• Temporary Extension PIN expires in: <span className="text-sky-400 font-bold">{telephony.sessionExpiryMinutes} minutes</span></div>
                <div>• Auto Call Recording: <span className="text-emerald-400 font-bold">Encrypted SIP</span></div>
                <div>• Direct Personal Number Access: <span className="text-rose-400 font-bold">Strictly Disabled</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: CAPTAIN PERSONAL WALLET, KYC & BANK PAYOUT MANAGEMENT */}
      {activeTab === 'payouts' && (
        <div className="space-y-6">
          {/* Toast Notification */}
          {payoutToast && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{payoutToast}</span>
              </div>
              <button onClick={() => setPayoutToast(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 4 Platform Metrics */}
          {(() => {
            const paidWithdrawals = withdrawals.filter((w) => w.status === 'Paid' || w.status === 'successful');
            const totalDisbursed = paidWithdrawals.reduce((sum, w) => sum + (w.netPayoutAmount || w.amount), 0);
            const inFlightWithdrawals = withdrawals.filter(
              (w) =>
                w.status === 'Requested' ||
                w.status === 'Processing' ||
                w.status === 'pending' ||
                w.status === 'processing'
            );
            const inFlightTotal = inFlightWithdrawals.reduce((sum, w) => sum + w.amount, 0);
            const totalPayoutCommission = paidWithdrawals.reduce(
              (sum, w) => sum + (w.commissionDeducted || Math.round(w.amount * 0.1)),
              0
            );

            // Compute total wallet balances across all captains
            const totalCaptainBalances = captains.reduce((sum, c) => {
              const w = platformStore.getCaptainWallet(c.id);
              return sum + w.availableBalance;
            }, 0);

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Total Settled IMPS Payouts
                  </div>
                  <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                    ₹{totalDisbursed}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {paidWithdrawals.length} transactions completed
                  </div>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    In-Flight Payout Queue
                  </div>
                  <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                    ₹{inFlightTotal}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {inFlightWithdrawals.length} pending requests reserved
                  </div>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Payout Platform Revenue
                  </div>
                  <div className="text-2xl font-black text-sky-400 font-mono mt-1">
                    ₹{totalPayoutCommission}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    From {storeState.fareSettings.withdrawalCommissionPercent || 10}% platform levy
                  </div>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Total Captain Wallet Float
                  </div>
                  <div className="text-2xl font-black text-white font-mono mt-1">
                    ₹{totalCaptainBalances}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Across {captains.length} registered Tamil Nadu captains
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Admin Commission Configuration & Platform Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-amber-400" />
                  <span>Platform Commission & Withdrawal Policy Configuration</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure dynamic commission rates, withdrawal constraints, and emergency compliance controls
                </p>
              </div>

              <button
                onClick={handleDownloadLedgerCsv}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Export Ledger CSV</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Commission Rate % */}
              <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-2">
                <label className="text-slate-300 font-bold block">
                  Platform Commission on Withdrawals (%)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={adminCommissionRate}
                    onChange={(e) => setAdminCommissionRate(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => {
                      platformStore.setWithdrawalCommissionPercent(adminCommissionRate);
                      setPayoutToast(`Withdrawal platform commission set to ${adminCommissionRate}%`);
                      setTimeout(() => setPayoutToast(null), 3000);
                    }}
                    className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl shrink-0"
                  >
                    Save
                  </button>
                </div>
                <div className="text-[10px] text-slate-400">
                  Current rate applied: {storeState.fareSettings.withdrawalCommissionPercent || 10}%
                </div>
              </div>

              {/* Limits */}
              <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-2">
                <label className="text-slate-300 font-bold block">
                  Min & Max Payout Limits (₹)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min ₹"
                    value={adminMinWithdrawal}
                    onChange={(e) => setAdminMinWithdrawal(parseInt(e.target.value) || 0)}
                    className="w-1/2 p-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                  <input
                    type="number"
                    placeholder="Max ₹"
                    value={adminMaxWithdrawal}
                    onChange={(e) => setAdminMaxWithdrawal(parseInt(e.target.value) || 0)}
                    className="w-1/2 p-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => {
                      platformStore.setWithdrawalLimits(adminMinWithdrawal, adminMaxWithdrawal);
                      setPayoutToast(`Withdrawal limits saved (Min: ₹${adminMinWithdrawal}, Max: ₹${adminMaxWithdrawal})`);
                      setTimeout(() => setPayoutToast(null), 3000);
                    }}
                    className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl shrink-0"
                  >
                    Save
                  </button>
                </div>
                <div className="text-[10px] text-slate-400">
                  Default: Min ₹200, Max ₹50,000 per transaction
                </div>
              </div>

              {/* Emergency Freeze Toggle */}
              <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-2">
                <label className="text-slate-300 font-bold block">
                  Emergency Withdrawal Freeze
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const next = !storeState.fareSettings.withdrawalsSuspended;
                      platformStore.toggleWithdrawalsSuspension(
                        next,
                        next ? freezeReason || 'Scheduled audit by State Transport Compliance' : undefined
                      );
                      setPayoutToast(
                        next ? 'Emergency freeze ACTIVATED. All captain withdrawals suspended.' : 'Emergency freeze lifted.'
                      );
                      setTimeout(() => setPayoutToast(null), 3500);
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold transition-all ${
                      storeState.fareSettings.withdrawalsSuspended
                        ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
                    }`}
                  >
                    {storeState.fareSettings.withdrawalsSuspended
                      ? 'SUSPENDED (Click to Unfreeze)'
                      : 'Active (Click to Freeze)'}
                  </button>
                </div>
                {storeState.fareSettings.withdrawalsSuspended && (
                  <input
                    type="text"
                    placeholder="Suspension reason displayed to captains"
                    value={freezeReason}
                    onChange={(e) => setFreezeReason(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-white focus:outline-none"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Withdrawal Requests Queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  <span>Captain Bank Payout Requests Queue</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Direct IMPS authorizations with automatic double-entry hold release or settlement
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {withdrawals.length} total requests
              </span>
            </div>

            {withdrawals.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No bank payout requests currently in the queue.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{w.captainName}</span>
                        <span className="text-slate-400 font-mono text-[11px]">({w.captainId})</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase ${
                            w.status === 'Paid' || w.status === 'successful'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : w.status === 'Processing' || w.status === 'processing'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : w.status === 'Requested' || w.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {w.status}
                        </span>
                      </div>

                      <div className="text-slate-400 text-[11px] font-mono flex flex-wrap gap-x-3">
                        <span>Ref: {w.withdrawalRef}</span>
                        <span>Bank: {w.bankDetails.bankName}</span>
                        <span>
                          Account: {platformStore.maskAccountNumber(w.bankDetails.accountNumber)} (IFSC: {w.bankDetails.ifscCode})
                        </span>
                        <span>Requested: {new Date(w.requestedAt).toLocaleString()}</span>
                      </div>

                      {w.payoutTxnId && (
                        <div className="text-[11px] text-emerald-400 font-mono">
                          Settlement Ref: {w.payoutTxnId} • Provider: {w.payoutProvider || 'RazorpayX Direct IMPS'}
                        </div>
                      )}
                      {w.failureReason && (
                        <div className="text-[11px] text-rose-400 font-mono">
                          Reason: {w.failureReason}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-mono font-black text-sm text-emerald-400">
                          Net: ₹{w.netPayoutAmount || Math.round(w.amount * 0.9)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Gross: ₹{w.amount} (Comm: ₹{w.commissionDeducted || Math.round(w.amount * 0.1)})
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(w.status === 'Requested' || w.status === 'pending') && (
                          <>
                            <button
                              onClick={() => {
                                platformStore.processWithdrawalPayout(w.id, 'authorize_payout');
                                setPayoutToast(`Authorized IMPS payout of ₹${w.netPayoutAmount || w.amount} for ${w.captainName}`);
                                setTimeout(() => setPayoutToast(null), 3000);
                              }}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-md transition-all"
                            >
                              Authorize IMPS
                            </button>
                            <button
                              onClick={() => {
                                platformStore.processWithdrawalPayout(w.id, 'mark_processing');
                                setPayoutToast(`Marked request ${w.withdrawalRef} as Processing`);
                                setTimeout(() => setPayoutToast(null), 2500);
                              }}
                              className="px-2.5 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold rounded-xl transition-all"
                            >
                              Process
                            </button>
                            <button
                              onClick={() => {
                                platformStore.processWithdrawalPayout(w.id, 'reject_payout', 'Rejected by administrator');
                                setPayoutToast(`Rejected request ${w.withdrawalRef}. Held funds returned to captain wallet.`);
                                setTimeout(() => setPayoutToast(null), 3000);
                              }}
                              className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold rounded-xl transition-all"
                            >
                              Reject & Refund
                            </button>
                          </>
                        )}

                        {(w.status === 'Processing' || w.status === 'processing') && (
                          <>
                            <button
                              onClick={() => {
                                platformStore.processWithdrawalPayout(w.id, 'authorize_payout');
                                setPayoutToast(`Settled IMPS payout for ${w.captainName}`);
                                setTimeout(() => setPayoutToast(null), 3000);
                              }}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl"
                            >
                              Complete Payout
                            </button>
                            <button
                              onClick={() => {
                                platformStore.processWithdrawalPayout(w.id, 'fail_payout', 'Bank gateway timeout');
                                setPayoutToast(`Marked failed. Funds returned to captain wallet.`);
                                setTimeout(() => setPayoutToast(null), 3000);
                              }}
                              className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold rounded-xl"
                            >
                              Fail & Refund
                            </button>
                          </>
                        )}

                        {(w.status === 'Paid' || w.status === 'successful') && (
                          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold font-mono">
                            PAID (IMPS)
                          </span>
                        )}

                        {(w.status === 'Rejected' || w.status === 'Failed') && (
                          <span className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl font-bold font-mono">
                            {w.status.toUpperCase()} (REFUNDED)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Captains Personal Wallet Ledger & KYC Management Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-sky-400" />
                  <span>Tamil Nadu Captains Personal Wallet & KYC Registry</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time ledger balances, KYC compliance statuses, and penny-drop bank verification
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {captains.length} registered captains
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold">
                    <th className="pb-3 pr-4">Captain</th>
                    <th className="pb-3 px-3">District</th>
                    <th className="pb-3 px-3">KYC Status</th>
                    <th className="pb-3 px-3">Bank Verification</th>
                    <th className="pb-3 px-3 text-right">Available (₹)</th>
                    <th className="pb-3 px-3 text-right">In-Flight (₹)</th>
                    <th className="pb-3 px-3 text-right">Earnings (₹)</th>
                    <th className="pb-3 px-3 text-right">Withdrawn (₹)</th>
                    <th className="pb-3 pl-3 text-center">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {captains.map((c) => {
                    const w = platformStore.getCaptainWallet(c.id);
                    return (
                      <tr key={c.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 pr-4 font-sans">
                          <div className="font-bold text-white">{c.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {c.id} • {c.vehicleType.toUpperCase()}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-sans text-slate-300">
                          {c.operatingDistrict || 'Tamil Nadu'}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <select
                            value={c.kycStatus || 'Submitted'}
                            onChange={(e) => {
                              const newStatus = e.target.value as any;
                              platformStore.updateCaptainKYCStatus(c.id, newStatus);
                              setPayoutToast(`Captain ${c.name} KYC updated to ${newStatus}`);
                              setTimeout(() => setPayoutToast(null), 2500);
                            }}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border focus:outline-none bg-slate-900 ${
                              c.kycStatus === 'Approved'
                                ? 'text-emerald-400 border-emerald-500/30'
                                : c.kycStatus === 'Under Verification'
                                ? 'text-amber-400 border-amber-500/30'
                                : c.kycStatus === 'Suspended'
                                ? 'text-rose-400 border-rose-500/30'
                                : 'text-sky-400 border-sky-500/30'
                            }`}
                          >
                            <option value="Approved">Approved</option>
                            <option value="Under Verification">Under Verification</option>
                            <option value="Submitted">Submitted</option>
                            <option value="KYC Incomplete">KYC Incomplete</option>
                            <option value="KYC Not Started">KYC Not Started</option>
                            <option value="Reverification Required">Reverification Required</option>
                            <option value="Suspended">Suspended</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="py-3 px-3 font-sans">
                          {c.bankDetails.verificationStatus === 'verified' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Penny-Drop Verified</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                const res = platformStore.verifyCaptainBankAccount(c.id);
                                if (res.success) {
                                  setPayoutToast(`Penny-drop verified for ${c.name}! Ref: ${res.pennyDropRef}`);
                                  setTimeout(() => setPayoutToast(null), 3000);
                                }
                              }}
                              className="px-2 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-[10px]"
                            >
                              Verify ₹1 Test
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-emerald-400">
                          ₹{w.availableBalance}
                        </td>
                        <td className="py-3 px-3 text-right text-amber-400">
                          ₹{w.pendingBalance}
                        </td>
                        <td className="py-3 px-3 text-right text-white">
                          ₹{w.totalEarnings}
                        </td>
                        <td className="py-3 px-3 text-right text-sky-400">
                          ₹{w.totalWithdrawn}
                        </td>
                        <td className="py-3 pl-3 text-center font-sans">
                          <button
                            onClick={() => {
                              platformStore.switchActiveCaptain(c.id);
                              setPayoutToast(`Switched active captain to ${c.name} for testing`);
                              setTimeout(() => setPayoutToast(null), 2500);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[11px] font-semibold"
                          >
                            Impersonate
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white">Promotional Discount Engine</h3>
          <form onSubmit={handleAddCoupon} className="flex gap-2 text-xs">
            <input
              type="text"
              placeholder="Code (e.g. MEGA100)"
              value={newCouponCode}
              onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
              className="p-2.5 bg-slate-850 border border-slate-700 rounded-xl text-white font-mono uppercase focus:outline-none"
              required
            />
            <input
              type="number"
              placeholder="Discount ₹"
              value={newCouponDiscount}
              onChange={(e) => setNewCouponDiscount(parseInt(e.target.value) || 0)}
              className="w-24 p-2.5 bg-slate-850 border border-slate-700 rounded-xl text-white font-mono focus:outline-none"
              required
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl"
            >
              Add Coupon
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {coupons.map((c) => (
              <div key={c.code} className="p-3 bg-slate-850 rounded-2xl border border-slate-800 text-xs">
                <div className="font-mono font-bold text-amber-400 text-sm">{c.code}</div>
                <div className="text-slate-300 mt-1">{c.description}</div>
                <div className="text-[10px] text-slate-400 mt-2">Min Fare: ₹{c.minFare}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 9: SAFETY SOS LOGS */}
      {activeTab === 'sos' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Emergency Safety SOS Dispatches</h3>
            <span className="px-2.5 py-1 bg-red-500/20 text-red-400 rounded-xl text-xs font-bold border border-red-500/30">
              112 Police Integration Ready
            </span>
          </div>
          <div className="text-xs text-slate-400">
            No live active emergency alarms. Standby emergency response protocols are fully active across all 38 districts.
          </div>
        </div>
      )}

      {/* TAB 10: CANCELLATIONS MANAGEMENT & ANALYTICS */}
      {activeTab === 'cancellations' && (() => {
        const customerCancels = cancellations.filter((c) => c.cancelledBy === 'customer').length;
        const captainCancels = cancellations.filter((c) => c.cancelledBy === 'captain').length;
        const adminCancels = cancellations.filter((c) => c.cancelledBy === 'admin').length;
        const totalFeesRealized = cancellations.reduce((sum, c) => sum + (c.cancellationFee || 0), 0);
        const searchDropoffs = cancellations.filter(
          (c) => c.previousStatus === 'searching' || c.previousStatus === 'searching_timeout'
        ).length;

        // Reason breakdown counts
        const reasonCounts = cancellations.reduce((acc, c) => {
          acc[c.reason] = (acc[c.reason] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Route counts
        const routeCounts = cancellations.reduce((acc, c) => {
          const p = (c.pickupAddress || '').split(',')[0].trim();
          const d = (c.destinationAddress || '').split(',')[0].trim();
          const route = `${p} → ${d}`;
          acc[route] = (acc[route] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const sortedRoutes = Object.entries(routeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

        // Filtered cancellations
        const filteredCancellations = cancellations.filter((c) => {
          if (cancellationFilter !== 'all' && c.cancelledBy !== cancellationFilter) {
            return false;
          }
          if (cancellationSearch.trim()) {
            const q = cancellationSearch.toLowerCase();
            const matchRef = c.bookingRef.toLowerCase().includes(q);
            const matchCust = c.customerName.toLowerCase().includes(q);
            const matchCap = (c.captainName || '').toLowerCase().includes(q);
            const matchReason = c.reason.toLowerCase().includes(q);
            const matchExpl = (c.additionalExplanation || '').toLowerCase().includes(q);
            return matchRef || matchCust || matchCap || matchReason || matchExpl;
          }
          return true;
        });

        return (
          <div className="space-y-6">
            {/* Header & Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="text-[11px] font-semibold text-slate-400">Total Cancellations</div>
                <div className="text-2xl font-black text-white mt-1">{cancellations.length}</div>
                <div className="text-[10px] text-slate-500 mt-1">Audit-tracked platform events</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="text-[11px] font-semibold text-slate-400">Customer vs Captain</div>
                <div className="text-base font-black text-white mt-1">
                  <span className="text-amber-400">{customerCancels}</span> Rider / <span className="text-sky-400">{captainCancels}</span> Cap
                </div>
                <div className="text-[10px] text-slate-500 mt-1">{adminCancels} by Admin</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="text-[11px] font-semibold text-slate-400">Cancellation Fees Realized</div>
                <div className="text-2xl font-black text-emerald-400 font-mono mt-1">₹{totalFeesRealized}</div>
                <div className="text-[10px] text-slate-500 mt-1">₹{fareForm.cancellationFee} per billable cancel</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="text-[11px] font-semibold text-slate-400">Pre-Trip Search Drop-offs</div>
                <div className="text-2xl font-black text-purple-400 mt-1">{searchDropoffs}</div>
                <div className="text-[10px] text-slate-500 mt-1">Cancelled prior to captain dispatch</div>
              </div>
            </div>

            {/* Analytics: Reason Breakdown & Route Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reason Breakdown */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-bold text-white text-sm">Cancellation Reasons Breakdown</h4>
                  <span className="text-[10px] text-slate-400 font-mono">8 Standard Categories</span>
                </div>
                <div className="space-y-2.5">
                  {Object.entries(reasonCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([reason, count]) => {
                      const pct = Math.round((count / (cancellations.length || 1)) * 100);
                      return (
                        <div key={reason} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 font-medium truncate">{reason}</span>
                            <span className="text-slate-400 font-mono font-bold">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-400 h-full rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Frequently Cancelled Routes */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-bold text-white text-sm">Frequently Cancelled Routes</h4>
                  <span className="text-[10px] text-slate-400">Tamil Nadu Hotspots</span>
                </div>
                <div className="space-y-2">
                  {sortedRoutes.map(([route, count]) => (
                    <div
                      key={route}
                      className="p-3 bg-slate-850 rounded-2xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="text-slate-200 font-semibold truncate">{route}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-mono font-bold shrink-0">
                        {count} cancels
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ledger & Table Filter */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-bold text-white">Full Cancellation Audit Ledger</h4>
                  <p className="text-xs text-slate-400">
                    Real-time transaction log of booking cancellations, reasons, and fee charges
                  </p>
                </div>

                {/* Filter and Search */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="flex bg-slate-850 p-1 rounded-xl border border-slate-700 text-xs">
                    {(['all', 'customer', 'captain', 'admin'] as const).map((role) => (
                      <button
                        key={role}
                        onClick={() => setCancellationFilter(role)}
                        className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all ${
                          cancellationFilter === role
                            ? 'bg-amber-400 text-slate-950 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>

                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search cancels..."
                      value={cancellationSearch}
                      onChange={(e) => setCancellationSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-slate-850 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Cancellation Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-850 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Date & Time</th>
                      <th className="py-3 px-3">Booking Ref</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Captain</th>
                      <th className="py-3 px-3">Vehicle</th>
                      <th className="py-3 px-3">Prev Status</th>
                      <th className="py-3 px-3">Reason & Details</th>
                      <th className="py-3 px-3">Cancelled By</th>
                      <th className="py-3 px-3 text-right">Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredCancellations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-500">
                          No cancellation records found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredCancellations.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                            {new Date(c.cancelledAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                            {c.bookingRef}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-white truncate max-w-[120px]">{c.customerName}</div>
                            {c.customerPhone && (
                              <div className="text-[10px] text-slate-500 font-mono">{c.customerPhone}</div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {c.captainName ? (
                              <div>
                                <div className="font-semibold text-white truncate max-w-[120px]">{c.captainName}</div>
                                {c.captainId && (
                                  <div className="text-[10px] text-slate-500 font-mono">{c.captainId}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                c.serviceType === 'rubi_pink'
                                  ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {c.vehicleType}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-mono text-[11px] text-slate-400 capitalize">
                              {c.previousStatus.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 max-w-[200px]">
                            <div className="font-semibold text-slate-200">{c.reason}</div>
                            {c.additionalExplanation && (
                              <div className="text-[10px] text-slate-400 italic truncate mt-0.5">
                                "{c.additionalExplanation}"
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                c.cancelledBy === 'customer'
                                  ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                                  : c.cancelledBy === 'captain'
                                  ? 'bg-sky-400/20 text-sky-400 border border-sky-400/30'
                                  : 'bg-purple-400/20 text-purple-400 border border-purple-400/30'
                              }`}
                            >
                              {c.cancelledBy}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                            {c.cancellationFee > 0 ? (
                              <span className="text-emerald-400">₹{c.cancellationFee}</span>
                            ) : (
                              <span className="text-slate-500">₹0</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 11: SYSTEM AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">System Security & Transaction Audit Trail</h3>
            <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-xl text-xs font-mono">
              {auditLogs.length} Records
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-850 rounded-2xl border border-slate-800 text-xs flex items-center justify-between gap-4"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400">{log.action}</span>
                    <span className="px-1.5 py-0.2 bg-slate-800 text-[10px] rounded text-slate-400 uppercase font-semibold">
                      {log.role} • {log.actor}
                    </span>
                  </div>
                  <div className="text-slate-300 text-[11px] truncate">{log.details}</div>
                </div>
                <div className="font-mono text-[10px] text-slate-500 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {docPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-white text-sm">{docPreview.title}</h4>
              </div>
              <button
                onClick={() => setDocPreview(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-850 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Document Type:</span>
                  <span className="font-bold text-white">{docPreview.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Document / Reg Number:</span>
                  <span className="font-mono font-bold text-amber-400">{docPreview.number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Holder / Captain Name:</span>
                  <span className="font-medium text-slate-200">{docPreview.holder}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Issuing Authority:</span>
                  <span className="text-emerald-400 font-medium">Government of Tamil Nadu / Transport Dept</span>
                </div>
              </div>

              {/* Document Image View Simulator */}
              <div className="border border-slate-700/80 rounded-2xl overflow-hidden bg-slate-950 p-2">
                <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                  <span>Digitally Stored Document Copy:</span>
                  <span className="text-emerald-400 font-mono">SHA-256 Verified</span>
                </div>
                {docPreview.url && !docPreview.url.startsWith('doc_') ? (
                  <img
                    src={docPreview.url}
                    alt={docPreview.title}
                    className="w-full h-48 object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-40 bg-slate-900 border border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center p-4 text-center space-y-2">
                    <FileCheck className="w-8 h-8 text-amber-400" />
                    <div>
                      <div className="font-bold text-white text-xs">{docPreview.type} Scan Verified</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Ref: {docPreview.url || 'TN-DOC-DIGITAL-SIGN-8832'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setDocPreview(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all"
            >
              Close Document Viewer
            </button>
          </div>
        </div>
      )}

      {/* REJECTION REASON DIALOG */}
      {rejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-white text-sm">Reject Captain KYC Application</h4>
            </div>

            <p className="text-xs text-slate-300">
              Please specify the audit discrepancy for <span className="font-bold text-white">{rejectDialog.captainName}</span>. This reason will be dispatched to the captain via SMS.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Audit Rejection Reason</label>
              <textarea
                rows={3}
                value={rejectDialog.reason}
                onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
                className="w-full p-2.5 bg-slate-850 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-400"
                placeholder="State reason (e.g. Incomplete RC scan, expired insurance)..."
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectDialog(null)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
