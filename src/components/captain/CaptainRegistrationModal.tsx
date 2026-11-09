import React, { useState } from 'react';
import {
  Car,
  User,
  Shield,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  CreditCard,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Heart,
  Phone,
  Camera,
  Check,
} from 'lucide-react';
import {
  CaptainRegistrationForm,
  Language,
  ServiceType,
  VehicleType,
} from '../../types';
import { platformStore, VEHICLE_CONFIGS } from '../../services/store';
import { TAMIL_NADU_DISTRICTS } from '../../data/tamilNaduData';

interface CaptainRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSuccessSubmitted?: (applicationRef: string) => void;
}

export const CaptainRegistrationModal: React.FC<CaptainRegistrationModalProps> = ({
  isOpen,
  onClose,
  lang,
  onSuccessSubmitted,
}) => {
  const [step, setStep] = useState<number>(1);
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpVerified, setOtpVerified] = useState<boolean>(false);
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<CaptainRegistrationForm>({
    fullName: '',
    phone: '',
    email: '',
    dob: '1992-06-15',
    residentialAddress: '',
    photoUrl: '',
    gender: 'male',
    identityDocType: 'aadhaar',
    identityDocNumber: '',
    identityDocUrl: '',
    drivingLicenseNumber: '',
    drivingLicenseDocUrl: '',
    licenseExpiry: '2034-12-31',
    vehicleCategory: 'auto',
    vehicleMakeModel: '',
    vehicleRegNumber: '',
    vehiclePhotoUrl: '',
    vehicleRcDocUrl: '',
    vehicleInsuranceDocUrl: '',
    fitnessCertificateUrl: '',
    passengerCapacity: 3,
    accountHolderName: '',
    bankName: 'State Bank of India',
    accountNumber: '',
    ifscCode: '',
    serviceSelection: 'rubi_cab',
    operatingState: 'Tamil Nadu',
    operatingDistrict: 'Chennai',
    operatingCity: '',
    preferredWorkingArea: '',
  });

  if (!isOpen) return null;

  // Handle Send OTP
  const handleSendOtp = () => {
    if (!formData.phone || formData.phone.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number');
      return;
    }
    setFormError(null);
    setOtpSent(true);
  };

  // Handle Verify OTP
  const handleVerifyOtp = () => {
    if (enteredOtp === '1234' || enteredOtp.length === 6 || enteredOtp.length === 4) {
      setOtpVerified(true);
      setFormError(null);
    } else {
      setFormError('Invalid OTP. Use Demo OTP: 1234');
    }
  };

  // Validate current step before proceeding
  const handleNextStep = () => {
    setFormError(null);
    if (step === 1) {
      if (!formData.fullName.trim()) {
        setFormError('Full Name is required');
        return;
      }
      if (!formData.phone.trim()) {
        setFormError('Mobile number is required');
        return;
      }
      if (!otpVerified) {
        setFormError('Please complete mobile OTP verification');
        return;
      }
    } else if (step === 2) {
      if (!formData.identityDocNumber.trim()) {
        setFormError('Identity document number is required');
        return;
      }
      if (!formData.drivingLicenseNumber.trim()) {
        setFormError('Driving Licence number is required');
        return;
      }
    } else if (step === 3) {
      if (!formData.vehicleRegNumber.trim()) {
        setFormError('Vehicle registration number is required (e.g. TN 09 BZ 8820)');
        return;
      }
    } else if (step === 4) {
      if (!formData.accountNumber.trim() || !formData.ifscCode.trim()) {
        setFormError('Bank Account Number and IFSC Code are required for trip payouts');
        return;
      }
    }

    setStep((prev) => Math.min(prev + 1, 5));
  };

  // Handle final submission
  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // If RUBI CAB PINK is selected, verify female captain requirement
    if (formData.serviceSelection === 'rubi_pink' && formData.gender !== 'female') {
      setFormError('RUBI CAB PINK is strictly reserved for verified female captains as per women-priority mobility charter.');
      return;
    }

    const result = platformStore.registerNewCaptain(formData);
    if (result.success) {
      setSubmittedRef(result.applicationRef);
      if (onSuccessSubmitted) {
        onSuccessSubmitted(result.applicationRef);
      }
    } else {
      setFormError(result.error || 'Failed to submit captain registration');
    }
  };

  // Steps configuration
  const stepsList = [
    { num: 1, title: 'Personal' },
    { num: 2, title: 'Identity & DL' },
    { num: 3, title: 'Vehicle' },
    { num: 4, title: 'Banking' },
    { num: 5, title: 'Service & Area' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-8 text-neutral-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
          aria-label="Close Registration Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        {!submittedRef ? (
          <>
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-1">
                <span>Tamil Nadu Statewide Onboarding</span>
                <span aria-hidden="true">·</span>
                <span>All 38 Districts</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                New Captain Registration
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Join RUBI CAB & RUBI CAB PINK. Earn competitive weekly payouts with 100% transparent platform ledger.
              </p>

              {/* Step Progress Indicator */}
              <div className="grid grid-cols-5 gap-2 mt-4 pt-4 border-t border-neutral-800">
                {stepsList.map((s) => {
                  const isDone = step > s.num;
                  const isCurrent = step === s.num;
                  return (
                    <div key={s.num} className="text-center">
                      <div
                        className={`h-1.5 rounded-full mb-1.5 transition-colors ${
                          isDone
                            ? 'bg-emerald-500'
                            : isCurrent
                            ? 'bg-amber-400'
                            : 'bg-neutral-800'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-medium block truncate ${
                          isCurrent
                            ? 'text-amber-400 font-semibold'
                            : isDone
                            ? 'text-emerald-400'
                            : 'text-neutral-500'
                        }`}
                      >
                        {s.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            {/* STEP 1: PERSONAL DETAILS */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Full Legal Name (as per Aadhaar / DL) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Senthil Kumar"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Gender *
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          gender: e.target.value as any,
                          serviceSelection: e.target.value === 'female' ? formData.serviceSelection : 'rubi_cab',
                        })
                      }
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female (Eligible for RUBI CAB PINK)</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Mobile Phone & OTP Verification */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Mobile Number (for Driver OTP & Dispatch) *
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
                      <input
                        type="tel"
                        placeholder="+91 98940 12345"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={otpVerified}
                        className="w-full pl-9 p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-75"
                        required
                      />
                    </div>
                    {!otpVerified && (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-amber-400 text-xs font-semibold rounded-xl border border-neutral-700 transition-colors shrink-0"
                      >
                        {otpSent ? 'Resend OTP' : 'Send OTP'}
                      </button>
                    )}
                    {otpVerified && (
                      <div className="px-3 py-2 bg-emerald-950/40 border border-emerald-800 text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verified</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* OTP Input box */}
                {otpSent && !otpVerified && (
                  <div className="p-3 bg-neutral-950 border border-amber-400/40 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-300">Enter SMS OTP:</span>
                      <span className="text-[11px] text-neutral-500 font-mono">Demo OTP: 1234</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="1234"
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value)}
                        className="flex-1 p-2 bg-neutral-900 border border-neutral-700 rounded-lg text-center font-mono text-base tracking-widest text-white focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        className="px-4 py-2 bg-amber-400 text-black font-semibold rounded-lg text-xs hover:bg-amber-300"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="driver@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Date of Birth * (Must be 18+)
                    </label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Residential Address (Tamil Nadu) *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Door No, Street Name, Locality, Pincode"
                    value={formData.residentialAddress}
                    onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
                    className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                    required
                  />
                </div>
              </div>
            )}

            {/* STEP 2: IDENTITY & DRIVING LICENCE */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Identity Document Type *
                    </label>
                    <select
                      value={formData.identityDocType}
                      onChange={(e) => setFormData({ ...formData, identityDocType: e.target.value as any })}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="aadhaar">Aadhaar Card (UIDAI)</option>
                      <option value="pan">PAN Card</option>
                      <option value="voter_id">Voter ID (Election Commission)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      ID Document Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5821 9920 1148"
                      value={formData.identityDocNumber}
                      onChange={(e) => setFormData({ ...formData, identityDocNumber: e.target.value })}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>

                {/* Aadhaar Upload Simulator */}
                <div className="p-3 bg-neutral-950 border border-dashed border-neutral-700 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-neutral-400" />
                    <div>
                      <div className="font-semibold text-white">Government ID Document Upload</div>
                      <div className="text-[11px] text-neutral-500">PDF, JPG, PNG (Max 5MB)</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-neutral-800 text-amber-400 rounded-lg text-xs font-semibold">
                    Simulated Ready ✓
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Commercial Driving Licence Number (RTO) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TN38 20180005512"
                      value={formData.drivingLicenseNumber}
                      onChange={(e) => setFormData({ ...formData, drivingLicenseNumber: e.target.value })}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Licence Expiry Date *
                    </label>
                    <input
                      type="date"
                      value={formData.licenseExpiry}
                      onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>

                {/* Driving Licence Upload Simulator */}
                <div className="p-3 bg-neutral-950 border border-dashed border-neutral-700 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="font-semibold text-white">Commercial DL Front & Back Upload</div>
                      <div className="text-[11px] text-neutral-500">Clear readable copy with badge number</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-neutral-800 text-amber-400 rounded-lg text-xs font-semibold">
                    Attached ✓
                  </span>
                </div>
              </div>
            )}

            {/* STEP 3: VEHICLE DETAILS */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-2">
                    Select Vehicle Category *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {VEHICLE_CONFIGS.map((v) => {
                      const isSel = formData.vehicleCategory === v.id;
                      return (
                        <div
                          key={v.id}
                          onClick={() =>
                            setFormData({
                              ...formData,
                              vehicleCategory: v.id,
                              passengerCapacity: v.capacity,
                            })
                          }
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                            isSel
                              ? 'bg-amber-400/10 border-amber-400 text-white'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-xs text-white">{v.name}</span>
                            <span className="text-[10px] text-neutral-400">{v.capacity} Seat</span>
                          </div>
                          <img
                            src={v.imageUrl}
                            alt={v.name}
                            className="w-full h-12 rounded object-cover mt-1"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Vehicle Make & Model *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Maruti Suzuki Dzire / Bajaj RE Auto"
                      value={formData.vehicleMakeModel}
                      onChange={(e) => setFormData({ ...formData, vehicleMakeModel: e.target.value })}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Registration Number (Tamil Nadu RTO) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TN 38 AQ 4455"
                      value={formData.vehicleRegNumber}
                      onChange={(e) => setFormData({ ...formData, vehicleRegNumber: e.target.value })}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>

                {/* RC & Insurance upload status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1">
                    <span className="text-[10px] text-neutral-400 uppercase font-semibold">RC Book SmartCard</span>
                    <div className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>RC Document Attached</span>
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1">
                    <span className="text-[10px] text-neutral-400 uppercase font-semibold">Commercial Insurance</span>
                    <div className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Valid Policy Attached</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: BANKING DETAILS */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="p-3 bg-amber-400/10 border border-amber-400/20 rounded-xl text-xs text-amber-300">
                  <span className="font-semibold">Direct Weekly Bank Payouts: </span>
                  Fares and earnings are credited directly to this verified bank account via IMPS/NEFT without commission delays.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Account Holder Name (must match DL) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senthil Kumar"
                    value={formData.accountHolderName || formData.fullName}
                    onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                    className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Bank Name *
                    </label>
                    <select
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="State Bank of India">State Bank of India</option>
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="Canara Bank">Canara Bank</option>
                      <option value="Indian Overseas Bank">Indian Overseas Bank</option>
                      <option value="Indian Bank">Indian Bank</option>
                      <option value="Tamilnad Mercantile Bank">Tamilnad Mercantile Bank</option>
                      <option value="Axis Bank">Axis Bank</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Bank Account Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 30992148102"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    IFSC Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SBIN0000411"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>
            )}

            {/* STEP 5: SERVICE SELECTION & OPERATING LOCATION */}
            {step === 5 && (
              <form onSubmit={handleSubmitApplication} className="space-y-4">
                {/* Service Selection */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-2">
                    Service Fleet Selection *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setFormData({ ...formData, serviceSelection: 'rubi_cab' })}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        formData.serviceSelection === 'rubi_cab'
                          ? 'bg-amber-400/10 border-amber-400 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Car className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-xs text-white">RUBI CAB (Standard)</span>
                      </div>
                      <p className="text-[11px] text-neutral-400">
                        Open to all certified commercial captains across Tamil Nadu.
                      </p>
                    </div>

                    <div
                      onClick={() => {
                        if (formData.gender === 'female') {
                          setFormData({ ...formData, serviceSelection: 'rubi_pink' });
                        } else {
                          setFormError('RUBI CAB PINK is strictly available for female captains only.');
                        }
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        formData.serviceSelection === 'rubi_pink'
                          ? 'bg-pink-500/15 border-pink-400 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Heart className="w-4 h-4 text-pink-400 fill-current" />
                        <span className="font-bold text-xs text-white">RUBI CAB PINK</span>
                      </div>
                      <p className="text-[11px] text-pink-300/80">
                        Women-focused ride service with female captain priority and specialized safety protocols.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Operating District in Tamil Nadu */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Operating State
                    </label>
                    <input
                      type="text"
                      value="Tamil Nadu (38 Districts)"
                      disabled
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Operating District *
                    </label>
                    <select
                      value={formData.operatingDistrict}
                      onChange={(e) => setFormData({ ...formData, operatingDistrict: e.target.value })}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      {TAMIL_NADU_DISTRICTS.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name} ({d.tamilName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      City / Headquarters Town
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Coimbatore Central / Theni Town"
                      value={formData.operatingCity}
                      onChange={(e) => setFormData({ ...formData, operatingCity: e.target.value })}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Preferred Working Locality
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bus Stand & Railway Station Areas"
                      value={formData.preferredWorkingArea}
                      onChange={(e) => setFormData({ ...formData, preferredWorkingArea: e.target.value })}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Terms notice */}
                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                  <div className="font-semibold text-neutral-300">Statutory Aggregator Agreement:</div>
                  <p>
                    By submitting, I confirm that all submitted documents, vehicle fitness certificates, and insurance policies are authentic under the Motor Vehicles (Amendment) Act and Tamil Nadu Motor Vehicles Rules.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-xl text-xs transition-colors shadow-md"
                  >
                    Submit Application for Admin Verification
                  </button>
                </div>
              </form>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-neutral-800">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              ) : (
                <div />
              )}

              {step < 5 && (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </>
        ) : (
          /* CONFIRMATION / SUBMISSION SUCCESS SCREEN */
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                Application Received
              </span>
              <h3 className="text-xl font-bold text-white mt-1">
                Welcome to RUBI CAB, {formData.fullName}!
              </h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1">
                Your application has been logged under{' '}
                <span className="font-mono text-amber-400 font-semibold">{submittedRef}</span>. Our Tamil Nadu operations team will verify your RTO commercial documents within 2-4 hours.
              </p>
            </div>

            <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 max-w-sm mx-auto text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500">Applicant:</span>
                <span className="font-semibold text-white">{formData.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">District:</span>
                <span className="font-semibold text-white">{formData.operatingDistrict}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Vehicle:</span>
                <span className="font-semibold text-amber-400">{formData.vehicleRegNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Status:</span>
                <span className="text-amber-400 font-semibold uppercase">Under Verification</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500">
              You can check approval status in the Admin Approval Console or sign in once approved.
            </p>

            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-xl text-xs transition-colors"
            >
              Back to RUBI CAB
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
