export type Language = 'en' | 'ta';

export type UserRole = 'customer' | 'captain' | 'admin';

export type ServiceType = 'rubi_cab' | 'rubi_pink';

export type VehicleType = 'bike' | 'auto' | 'mini' | 'sedan' | 'seven_seater';

export interface LocationPoint {
  id: string;
  name: string;
  tamilName?: string;
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
  district?: string;
  city?: string;
  state?: string;
  category?: 'home' | 'work' | 'airport' | 'station' | 'hospital' | 'mall' | 'college' | 'custom' | 'outstation';
}

export interface TamilNaduDistrict {
  id: string;
  name: string;
  districtName?: string;
  tamilName: string;
  headquarters: string;
  lat: number;
  lng: number;
  isActive: boolean;
  isPinkActive: boolean;
  isPinkAvailable?: boolean;
  activeVehicleCategories: VehicleType[];
  majorCities: string[];
  fareMultiplier: number;
  zone?: string;
}

export interface SavedLocationItem {
  id: string;
  label: string;
  tamilLabel?: string;
  icon: 'home' | 'briefcase' | 'heart' | 'map-pin' | 'building' | 'coffee';
  location: LocationPoint;
}

export interface VehicleCategoryConfig {
  id: VehicleType;
  name: string;
  tamilName: string;
  tagline: string;
  tamilTagline: string;
  capacity: number;
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  minFare: number;
  icon: string;
  imageUrl: string;
  etaMinutes: number;
  activeForRubiCab: boolean;
  activeForRubiPink: boolean;
  exampleModels: string;
}

export interface ServiceFareConfig {
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  minFare: number;
}

export interface FareSettings {
  gstRatePercent: number; // 5% GST
  platformCommissionPercent: number; // 20%
  tdsPercent: number; // 1% TDS under Sec 194O
  waitingChargePerMin: number; // ₹2/min beyond 3 min
  nightSurgeMultiplier: number; // 1.25x
  peakHourSurgeMultiplier: number; // 1.35x
  cancellationFee: number; // ₹35
  minWithdrawalAmount: number; // ₹200
  maxWithdrawalAmount: number; // ₹50000
  withdrawalCommissionPercent: number; // 10% admin configurable
  withdrawalsSuspended: boolean; // safety freeze
  withdrawalSuspensionReason?: string;
  // Separate vehicle pricing matrix for standard RUBI CAB and RUBI CAB PINK
  rubiCabCategories: Record<VehicleType, ServiceFareConfig>;
  rubiPinkCategories: Record<VehicleType, ServiceFareConfig>;
  // Backward compatibility alias
  categories: Record<VehicleType, ServiceFareConfig>;
}

export interface FareBreakdown {
  serviceType: ServiceType;
  baseFare: number;
  distanceKm: number;
  distanceCharge: number;
  durationMinutes: number;
  timeCharge: number;
  waitingMinutes: number;
  waitingCharge: number;
  surgeMultiplier: number;
  surgeAmount: number;
  discount: number;
  gstAmount: number;
  grossFare: number;
  platformCommission: number;
  tdsAmount: number;
  captainNetEarnings: number;
}

export type BookingStatus =
  | 'searching'
  | 'searching_timeout'
  | 'accepted'
  | 'captain_arriving'
  | 'arrived'
  | 'otp_verified'
  | 'in_progress'
  | 'destination_reached'
  | 'completed'
  | 'cancelled';

export type CustomerBookingStage =
  | 'LOCATION_SELECTION'
  | 'ROUTE_PREVIEW'
  | 'LOCATIONS_CONFIRMED'
  | 'VEHICLE_SELECTION'
  | 'RIDE_CONFIRMATION'
  | 'SEARCHING_CAPTAIN'
  | 'CAPTAIN_ASSIGNED'
  | 'DRIVER_ARRIVING'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'CANCELLED';

export const STANDARD_CANCELLATION_REASONS = [
  'Captain taking too long',
  'Changed my destination',
  'Booked by mistake',
  'Found another ride',
  'Fare is too high',
  'Captain asked me to cancel',
  'Pickup location is incorrect',
  'Other reason',
] as const;

export type StandardCancellationReason = (typeof STANDARD_CANCELLATION_REASONS)[number];

export interface CancellationRecord {
  id: string;
  bookingId: string;
  bookingRef: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  captainId?: string;
  captainName?: string;
  vehicleType: VehicleType;
  serviceType: ServiceType;
  pickupAddress: string;
  destinationAddress: string;
  reason: string;
  additionalExplanation?: string;
  cancelledBy: 'customer' | 'captain' | 'admin';
  cancelledAt: number;
  previousStatus: BookingStatus;
  finalStatus: 'cancelled';
  cancellationFee: number;
}

export interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  password?: string;
  savedAddresses: {
    home?: LocationPoint;
    work?: LocationPoint;
    favorites: LocationPoint[];
  };
  frequentPlaces?: SavedLocationItem[];
  recentSearches?: LocationPoint[];
  rating: number;
  totalRides: number;
}

export type KYCStatus =
  | 'KYC Not Started'
  | 'KYC Incomplete'
  | 'Submitted'
  | 'Under Verification'
  | 'Approved'
  | 'Rejected'
  | 'Reverification Required'
  | 'Suspended';

export type BankVerificationStatus = 'unverified' | 'penny_drop_pending' | 'verified' | 'failed';

export type CaptainApprovalStatus =
  | 'draft'
  | 'submitted'
  | 'under_verification'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'pending'
  | 'reverification_required';

export interface CaptainProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  password?: string;
  dob?: string;
  residentialAddress?: string;
  photoUrl: string;
  gender: 'male' | 'female' | 'other';
  isPinkEligible: boolean; // Female captains approved for RUBI CAB PINK
  serviceEligibility: ServiceType[]; // ['rubi_cab', 'rubi_pink']
  vehicleType: VehicleType;
  vehicleModel: string;
  vehicleRegNumber: string;
  vehiclePhotoUrl: string;
  vehicleCapacity?: number;
  
  // Identity and RTO Documents
  identityDocType?: 'aadhaar' | 'pan' | 'voter_id';
  identityDocNumber?: string;
  identityDocUrl?: string;
  drivingLicenseNumber: string;
  drivingLicenseDocUrl?: string;
  licenseExpiry: string;
  vehicleRcDocUrl?: string;
  rcDocUrl?: string;
  insuranceNumber: string;
  insuranceExpiry: string;
  vehicleInsuranceDocUrl?: string;
  fitnessCertificateUrl?: string;
  
  // Operating Territory
  operatingState?: string;
  operatingDistrict?: string;
  operatingDistricts?: string[];
  operatingCity?: string;
  currentCity?: string;
  preferredWorkingArea?: string;

  // Status and Timestamps
  approvalStatus: CaptainApprovalStatus;
  kycStatus?: KYCStatus;
  rejectionReason?: string;
  submittedAt?: number;
  approvedAt?: number;
  rejectedAt?: number;

  isOnline: boolean;
  isBusy: boolean;
  currentLat: number;
  currentLng: number;
  heading: number;
  rating: number;
  totalTrips: number;
  bankDetails: {
    accountHolderName?: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountType?: 'savings' | 'current';
    upiId?: string;
    verified: boolean;
    verificationStatus?: BankVerificationStatus;
    pennyDropRef?: string;
    verifiedAt?: number;
  };
}

export interface CaptainRegistrationForm {
  // A. Personal Details
  fullName: string;
  phone: string;
  email: string;
  dob: string;
  residentialAddress: string;
  photoUrl: string;
  gender: 'male' | 'female' | 'other';

  // B. Identity Verification
  identityDocType: 'aadhaar' | 'pan' | 'voter_id';
  identityDocNumber: string;
  identityDocUrl: string;
  drivingLicenseNumber: string;
  drivingLicenseDocUrl: string;
  licenseExpiry: string;

  // C. Vehicle Details
  vehicleCategory: VehicleType;
  vehicleMakeModel: string;
  vehicleRegNumber: string;
  vehiclePhotoUrl: string;
  vehicleRcDocUrl: string;
  vehicleInsuranceDocUrl: string;
  fitnessCertificateUrl: string;
  passengerCapacity: number;

  // D. Banking Details
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;

  // E. Service Selection
  serviceSelection: ServiceType; // 'rubi_cab' | 'rubi_pink'

  // F. Operating Location
  operatingState: string;
  operatingDistrict: string;
  operatingCity: string;
  preferredWorkingArea: string;
}

export interface DistrictBookingStats {
  districtId: string;
  districtName: string;
  totalTrips: number;
  activeCaptains: number;
  grossRevenue: number;
  pinkTripsCount: number;
}

export interface GPSBreadcrumb {
  lat: number;
  lng: number;
  timestamp: number;
  speedKmh?: number;
}

export interface VirtualCallSession {
  sessionId: string;
  virtualBridgeNumber: string; // Indian DID, e.g. +91 80 4719 0284
  extensionPin: string; // 4-digit temporary bridge pin
  allocatedAt: number;
  expiresAt: number;
  provider: 'Exotel Cloud Telephony' | 'Knowlarity Telephony' | 'Airtel IQ';
  status: 'active' | 'expired';
  callHistory: Array<{
    callId: string;
    initiatedBy: 'rider' | 'captain';
    timestamp: number;
    durationSeconds: number;
    callStatus: 'connected' | 'missed' | 'busy';
  }>;
}

export interface Booking {
  id: string;
  bookingRef: string;
  serviceType: ServiceType; // 'rubi_cab' or 'rubi_pink'
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerRating: number;
  captainId?: string;
  captain?: CaptainProfile;
  vehicleType: VehicleType;
  pickup: LocationPoint;
  destination: LocationPoint;
  status: BookingStatus;
  
  // OTP Management
  openingOtp: string; // 6 digits
  openingOtpAttempts: number;
  openingOtpVerifiedAt?: number;
  
  closingOtp: string; // 6 digits
  closingOtpAttempts: number;
  closingOtpVerifiedAt?: number;
  
  // Virtual Number Calling System
  virtualCallSession?: VirtualCallSession;
  
  // Timestamps
  createdAt: number;
  acceptedAt?: number;
  startedAt?: number;
  completedAt?: number;
  cancelledAt?: number;
  cancellationReason?: string;
  cancelledBy?: 'customer' | 'captain' | 'admin';
  
  // Distance and Tracking
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  actualDistanceKm?: number;
  actualDurationMin?: number;
  routeCoordinates: GPSBreadcrumb[];
  
  // Pricing
  estimatedFare: number;
  finalFare?: number;
  fareBreakdown?: FareBreakdown;
  couponCode?: string;
  
  // Payment
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: 'upi' | 'card' | 'netbanking' | 'wallet' | 'cash';
  paymentTxnId?: string;
  paidAt?: number;
  
  // Ratings
  customerRatingGiven?: number;
  customerReviewGiven?: string;
  captainRatingGiven?: number;
  
  // Emergency
  sosTriggered?: boolean;
  sosTriggeredAt?: number;
}

export type PaymentMode = 'upi' | 'card' | 'netbanking' | 'cash' | 'wallet';

export type WithdrawalStatus =
  | 'Requested'
  | 'Processing'
  | 'Paid'
  | 'Failed'
  | 'Reversed'
  | 'Rejected'
  | 'pending'
  | 'approved'
  | 'processing'
  | 'successful'
  | 'rejected';

export interface WalletTransaction {
  id: string;
  transactionRef: string;
  captainId: string;
  type:
    | 'ride_earning'
    | 'commission_deduction'
    | 'cash_collection_offset'
    | 'withdrawal'
    | 'withdrawal_hold'
    | 'withdrawal_refund'
    | 'incentive'
    | 'penalty';
  amount: number; // positive for credit, negative for debit
  creditAmount?: number;
  debitAmount?: number;
  commissionAmount?: number;
  netAmount?: number;
  previousBalance?: number;
  balanceAfter: number;
  paymentReference?: string;
  bookingId?: string;
  withdrawalId?: string;
  description: string;
  tamilDescription?: string;
  status?: 'completed' | 'pending' | 'reversed' | 'failed';
  createdAt: number;
}

export interface WithdrawalRequest {
  id: string;
  withdrawalRef: string;
  captainId: string;
  captainName: string;
  amount: number; // gross requested withdrawal
  commissionRatePercent?: number; // admin configurable, e.g., 10%
  commissionDeducted?: number; // e.g., ₹100
  netPayoutAmount?: number; // e.g., ₹900
  bankDetails: {
    accountHolderName?: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountType?: 'savings' | 'current';
    upiId?: string;
  };
  status: WithdrawalStatus;
  requestedAt: number;
  processedAt?: number;
  payoutTxnId?: string;
  payoutProvider?: 'RazorpayX Direct IMPS' | 'Cashfree Payouts' | 'PayTM Bank Transfer';
  failureReason?: string;
  adminNotes?: string;
}

export interface Coupon {
  code: string;
  discountType: 'flat' | 'percentage';
  discountValue: number;
  maxDiscount?: number;
  minFare: number;
  description: string;
  active: boolean;
  serviceApplicability?: 'all' | 'rubi_cab' | 'rubi_pink';
}

export interface SupportTicket {
  id: string;
  ticketRef: string;
  userId: string;
  userName: string;
  userRole: 'customer' | 'captain';
  bookingId?: string;
  category: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: number;
  resolvedAt?: number;
}

export interface AuditLog {
  id: string;
  actor: string;
  role: string;
  action: string;
  details: string;
  ipAddress?: string;
  timestamp: number;
}

export interface TelephonyConfig {
  provider: 'Exotel Cloud Telephony' | 'Knowlarity Telephony' | 'Airtel IQ';
  status: 'active' | 'standby';
  virtualNumberPool: string[];
  sessionExpiryMinutes: number;
  recordingEnabled: boolean;
}
