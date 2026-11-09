import {
  AuditLog,
  Booking,
  BookingStatus,
  CancellationRecord,
  CaptainApprovalStatus,
  CaptainProfile,
  CaptainRegistrationForm,
  Coupon,
  CustomerProfile,
  DistrictBookingStats,
  FareBreakdown,
  FareSettings,
  GPSBreadcrumb,
  LocationPoint,
  PaymentMode,
  SavedLocationItem,
  ServiceType,
  SupportTicket,
  TamilNaduDistrict,
  TelephonyConfig,
  UserRole,
  VehicleCategoryConfig,
  VehicleType,
  VirtualCallSession,
  WalletTransaction,
  WithdrawalRequest,
} from '../types';
import {
  calculateFinalFare,
  DEFAULT_FARE_SETTINGS,
  estimateFare,
  generateSixDigitOtp,
  haversineDistance,
  verifyOtp,
} from '../utils/fareEngine';
import {
  getDistrictFromCoordinates,
  STATEWIDE_TAMIL_NADU_LOCATIONS,
  TAMIL_NADU_DISTRICTS,
} from '../data/tamilNaduData';

// Alias popular locations to statewide locations
export const POPULAR_LOCATIONS: LocationPoint[] = STATEWIDE_TAMIL_NADU_LOCATIONS;

// Actual Professional Vehicle Photographs (Bike, Auto, Mini, Sedan, and 7-Seater Family SUV)
export const VEHICLE_CONFIGS: VehicleCategoryConfig[] = [
  {
    id: 'bike',
    name: 'Bike Taxi',
    tamilName: 'பைக் டாக்ஸி',
    tagline: 'Swift city travel, beat traffic easily',
    tamilTagline: 'போக்குவரத்து நெரிசலை விரைந்து கடக்க',
    capacity: 1,
    baseFare: 25,
    perKmRate: 9,
    perMinRate: 1.2,
    minFare: 35,
    icon: 'bike',
    imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
    etaMinutes: 2,
    activeForRubiCab: true,
    activeForRubiPink: true,
    exampleModels: 'Hero Splendor / Honda Activa / Royal Enfield',
  },
  {
    id: 'auto',
    name: 'Namma Auto',
    tamilName: 'நம்ம ஆட்டோ',
    tagline: 'Reliable doorstep ride, metered fare',
    tamilTagline: 'நேரடி வீட்டு வாசலில் பிக்கப்',
    capacity: 3,
    baseFare: 35,
    perKmRate: 14,
    perMinRate: 1.8,
    minFare: 50,
    icon: 'auto',
    imageUrl: 'https://images.unsplash.com/photo-1593950315186-76a92975b60c?auto=format&fit=crop&w=600&q=80',
    etaMinutes: 4,
    activeForRubiCab: true,
    activeForRubiPink: true,
    exampleModels: 'Bajaj RE Compact 4S / Piaggio Ape',
  },
  {
    id: 'mini',
    name: 'Mini Cab',
    tamilName: 'மினி கார்',
    tagline: 'Comfortable AC hatchback for daily travel',
    tamilTagline: 'ஏசி வசதியுடன் தினசரி பயணம்',
    capacity: 4,
    baseFare: 60,
    perKmRate: 18,
    perMinRate: 2.2,
    minFare: 90,
    icon: 'car',
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
    etaMinutes: 6,
    activeForRubiCab: true,
    activeForRubiPink: true,
    exampleModels: 'Maruti Suzuki WagonR / Swift VXi',
  },
  {
    id: 'sedan',
    name: 'Prime Sedan',
    tamilName: 'பிரைம் செடான்',
    tagline: 'Spacious legroom, top-rated captains & comfort',
    tamilTagline: 'அதிக இடவசதி மற்றும் சொகுசு',
    capacity: 4,
    baseFare: 90,
    perKmRate: 22,
    perMinRate: 2.8,
    minFare: 140,
    icon: 'car',
    imageUrl: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80',
    etaMinutes: 7,
    activeForRubiCab: true,
    activeForRubiPink: true,
    exampleModels: 'Maruti Suzuki Dzire / Honda Amaze',
  },
  {
    id: 'seven_seater',
    name: 'Seven Seater / SUV',
    tamilName: 'குடும்ப வாகனம் (7 இருக்கை)',
    tagline: 'Spacious 7-seater for family, outstation & luggage',
    tamilTagline: 'குடும்ப பயணம் மற்றும் அதிக லக்கேஜ் வசதி',
    capacity: 7,
    baseFare: 130,
    perKmRate: 28,
    perMinRate: 3.5,
    minFare: 200,
    icon: 'suv',
    imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80',
    etaMinutes: 8,
    activeForRubiCab: true,
    activeForRubiPink: true,
    exampleModels: 'Toyota Innova Crysta / Maruti Ertiga',
  },
];

// Pre-seeded Verified Captains Across Tamil Nadu Districts (Chennai, Coimbatore, Madurai, Theni, Salem, Trichy)
export const SEED_CAPTAINS: CaptainProfile[] = [
  // 1. Chennai: Female Captain for RUBI CAB PINK & Regular (Auto)
  {
    id: 'cpt_priya',
    name: 'Priya Dhandapani',
    phone: '+91 98402 11990',
    email: 'priya.d@rubicab.com',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    gender: 'female',
    isPinkEligible: true,
    serviceEligibility: ['rubi_cab', 'rubi_pink'],
    vehicleType: 'auto',
    vehicleModel: 'Bajaj RE Compact 4S Auto (Pink Edition)',
    vehicleRegNumber: 'TN 09 BZ 8820',
    vehiclePhotoUrl: 'https://images.unsplash.com/photo-1593950315186-76a92975b60c?auto=format&fit=crop&w=400&q=80',
    vehicleCapacity: 3,
    identityDocType: 'aadhaar',
    identityDocNumber: '6821 9920 1148',
    drivingLicenseNumber: 'TN09 20170008821',
    licenseExpiry: '2032-04-10',
    insuranceNumber: 'BAJAJ-ALLZ-771920',
    insuranceExpiry: '2028-11-15',
    operatingState: 'Tamil Nadu',
    operatingDistrict: 'Chennai',
    operatingCity: 'T. Nagar',
    preferredWorkingArea: 'Chennai Central & South',
    approvalStatus: 'approved',
    isOnline: true,
    isBusy: false,
    currentLat: 13.0425,
    currentLng: 80.2355,
    heading: 45,
    rating: 4.96,
    totalTrips: 1840,
    bankDetails: {
      accountHolderName: 'Priya Dhandapani',
      bankName: 'HDFC Bank (T. Nagar Branch)',
      accountNumber: '501004829148',
      ifscCode: 'HDFC0001234',
      upiId: 'priya.pink@okhdfcbank',
      verified: true,
    },
  },

  // 2. Chennai: Female Captain for RUBI CAB PINK & Regular (Prime Sedan)
  {
    id: 'cpt_deepa',
    name: 'Deepa Natarajan',
    phone: '+91 94440 33881',
    email: 'deepa.n@rubicab.com',
    photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
    gender: 'female',
    isPinkEligible: true,
    serviceEligibility: ['rubi_cab', 'rubi_pink'],
    vehicleType: 'sedan',
    vehicleModel: 'Maruti Suzuki Dzire ZXi Prime',
    vehicleRegNumber: 'TN 07 CK 4110',
    vehiclePhotoUrl: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=400&q=80',
    vehicleCapacity: 4,
    identityDocType: 'aadhaar',
    identityDocNumber: '4410 8821 9912',
    drivingLicenseNumber: 'TN07 20160004112',
    licenseExpiry: '2031-08-22',
    insuranceNumber: 'ICICI-LOMB-994120',
    insuranceExpiry: '2029-05-18',
    operatingState: 'Tamil Nadu',
    operatingDistrict: 'Chennai',
    operatingCity: 'Anna Nagar',
    preferredWorkingArea: 'Chennai Metro & Airport',
    approvalStatus: 'approved',
    isOnline: true,
    isBusy: false,
    currentLat: 13.0460,
    currentLng: 80.2385,
    heading: 90,
    rating: 4.98,
    totalTrips: 2210,
    bankDetails: {
      accountHolderName: 'Deepa Natarajan',
      bankName: 'State Bank of India (Anna Nagar)',
      accountNumber: '30992148102',
      ifscCode: 'SBIN0000411',
      upiId: 'deepa.natarajan@sbi',
      verified: true,
    },
  },

  // 3. Coimbatore: Female Captain for RUBI CAB PINK & Regular (Mini Cab)
  {
    id: 'cpt_anitha_cbe',
    name: 'Anitha Sivasankaran',
    phone: '+91 98940 55211',
    email: 'anitha.s@rubicab.com',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    gender: 'female',
    isPinkEligible: true,
    serviceEligibility: ['rubi_cab', 'rubi_pink'],
    vehicleType: 'mini',
    vehicleModel: 'Maruti Suzuki WagonR VXi (Pink Edition)',
    vehicleRegNumber: 'TN 38 BC 9012',
    vehiclePhotoUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=400&q=80',
    vehicleCapacity: 4,
    identityDocType: 'aadhaar',
    identityDocNumber: '7721 4410 8890',
    drivingLicenseNumber: 'TN38 20180005512',
    licenseExpiry: '2033-02-14',
    insuranceNumber: 'NEW-INDIA-552148',
    insuranceExpiry: '2029-01-20',
    operatingState: 'Tamil Nadu',
    operatingDistrict: 'Coimbatore',
    operatingCity: 'Gandhipuram',
    preferredWorkingArea: 'Gandhipuram, RS Puram, Peelamedu',
    approvalStatus: 'approved',
    isOnline: true,
    isBusy: false,
    currentLat: 11.0185,
    currentLng: 76.9690,
    heading: 90,
    rating: 4.95,
    totalTrips: 1320,
    bankDetails: {
      accountHolderName: 'Anitha Sivasankaran',
      bankName: 'Canara Bank (Gandhipuram)',
      accountNumber: '11200482910',
      ifscCode: 'CNRB0001120',
      upiId: 'anitha.cbe@okaxis',
      verified: true,
    },
  },

  // 4. Coimbatore: Male Captain for RUBI CAB Regular (Seven Seater Innova)
  {
    id: 'cpt_senthil_cbe',
    name: 'Senthil Kumar',
    phone: '+91 97890 22114',
    email: 'senthil.k@rubicab.com',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    gender: 'male',
    isPinkEligible: false,
    serviceEligibility: ['rubi_cab'],
    vehicleType: 'seven_seater',
    vehicleModel: 'Toyota Innova Crysta 2.4 VX 7-Seater',
    vehicleRegNumber: 'TN 38 AQ 4455',
    vehiclePhotoUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80',
    vehicleCapacity: 7,
    identityDocType: 'aadhaar',
    identityDocNumber: '8810 5519 2244',
    drivingLicenseNumber: 'TN38 20140004455',
    licenseExpiry: '2030-09-18',
    insuranceNumber: 'TATA-AIG-445512',
    insuranceExpiry: '2029-08-11',
    operatingState: 'Tamil Nadu',
    operatingDistrict: 'Coimbatore',
    operatingCity: 'Peelamedu',
    preferredWorkingArea: 'Coimbatore City & Nilgiris / Ooty Outstation',
    approvalStatus: 'approved',
    isOnline: true,
    isBusy: false,
    currentLat: 11.0250,
    currentLng: 76.9950,
    heading: 180,
    rating: 4.93,
    totalTrips: 2750,
    bankDetails: {
      accountHolderName: 'Senthil Kumar',
      bankName: 'Indian Overseas Bank (Peelamedu)',
      accountNumber: '0189020000411',
      ifscCode: 'IOBA0000189',
      upiId: 'senthil.innova@iob',
      verified: true,
    },
  },

  // 5. Madurai: Female Captain for RUBI CAB PINK & Regular (Auto)
  {
    id: 'cpt_meena_mdu',
    name: 'Meenakshi Sundaram (Meena)',
    phone: '+91 97860 44332',
    email: 'meena.m@rubicab.com',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    gender: 'female',
    isPinkEligible: true,
    serviceEligibility: ['rubi_cab', 'rubi_pink'],
    vehicleType: 'auto',
    vehicleModel: 'Bajaj RE Compact Auto (Pink Edition)',
    vehicleRegNumber: 'TN 58 DZ 7711',
    vehiclePhotoUrl: 'https://images.unsplash.com/photo-1593950315186-76a92975b60c?auto=format&fit=crop&w=400&q=80',
    vehicleCapacity: 3,
    identityDocType: 'aadhaar',
    identityDocNumber: '9920 1148 6620',
    drivingLicenseNumber: 'TN58 20190007711',
    licenseExpiry: '2034-06-10',
    insuranceNumber: 'HDFC-ERGO-771120',
    insuranceExpiry: '2028-10-05',
    operatingState: 'Tamil Nadu',
    operatingDistrict: 'Madurai',
    operatingCity: 'Mattuthavani',
    preferredWorkingArea: 'Madurai City, Meenakshi Temple, Bus Stand',
    approvalStatus: 'approved',
    isOnline: true,
    isBusy: false,
    currentLat: 9.9480,
    currentLng: 78.1640,
    heading: 90,
    rating: 4.97,
    totalTrips: 1640,
    bankDetails: {
      accountHolderName: 'Meenakshi Sundaram',
      bankName: 'State Bank of India (Mattuthavani)',
      accountNumber: '31890482914',
      ifscCode: 'SBIN0001840',
      upiId: 'meena.madurai@sbi',
      verified: true,
    },
  },

  // 6. Theni: Male Captain for RUBI CAB Regular (Seven Seater Innova)
  {
    id: 'cpt_pandian_theni',
    name: 'Pandian Muthuraman',
    phone: '+91 99420 88771',
    email: 'pandian.m@rubicab.com',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    gender: 'male',
    isPinkEligible: false,
    serviceEligibility: ['rubi_cab'],
    vehicleType: 'seven_seater',
    vehicleModel: 'Toyota Innova Crysta 2.4 GX 7-Seater',
    vehicleRegNumber: 'TN 60 CA 3388',
    vehiclePhotoUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80',
    vehicleCapacity: 7,
    identityDocType: 'aadhaar',
    identityDocNumber: '4450 1120 7788',
    drivingLicenseNumber: 'TN60 20150003388',
    licenseExpiry: '2031-11-20',
    insuranceNumber: 'ICICI-LOMB-338812',
    insuranceExpiry: '2029-04-15',
    operatingState: 'Tamil Nadu',
    operatingDistrict: 'Theni',
    operatingCity: 'Theni Allinagaram',
    preferredWorkingArea: 'Theni, Bodi, Periyakulam, Cumbum & Megamalai',
    approvalStatus: 'approved',
    isOnline: true,
    isBusy: false,
    currentLat: 10.0110,
    currentLng: 77.4780,
    heading: 45,
    rating: 4.94,
    totalTrips: 1980,
    bankDetails: {
      accountHolderName: 'Pandian Muthuraman',
      bankName: 'Tamilnad Mercantile Bank (Theni)',
      accountNumber: '1481000501234',
      ifscCode: 'TMBL0000148',
      upiId: 'pandian.theni@tmb',
      verified: true,
    },
  },

  // 7. Theni: Female Captain for RUBI CAB PINK & Regular (Auto)
  {
    id: 'cpt_radha_theni',
    name: 'Radha Kannan',
    phone: '+91 94860 11223',
    email: 'radha.k@rubicab.com',
    photoUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=300&q=80',
    gender: 'female',
    isPinkEligible: true,
    serviceEligibility: ['rubi_cab', 'rubi_pink'],
    vehicleType: 'auto',
    vehicleModel: 'Bajaj RE Compact 4S (Pink Edition)',
    vehicleRegNumber: 'TN 60 BZ 5511',
    vehiclePhotoUrl: 'https://images.unsplash.com/photo-1593950315186-76a92975b60c?auto=format&fit=crop&w=400&q=80',
    vehicleCapacity: 3,
    identityDocType: 'aadhaar',
    identityDocNumber: '5511 8820 9940',
    drivingLicenseNumber: 'TN60 20200005511',
    licenseExpiry: '2035-08-12',
    insuranceNumber: 'BAJAJ-ALLZ-551100',
    insuranceExpiry: '2028-12-10',
    operatingState: 'Tamil Nadu',
    operatingDistrict: 'Theni',
    operatingCity: 'Bodinayakanur',
    preferredWorkingArea: 'Theni & Bodinayakanur',
    approvalStatus: 'approved',
    isOnline: true,
    isBusy: false,
    currentLat: 10.0105,
    currentLng: 77.3490,
    heading: 180,
    rating: 4.96,
    totalTrips: 870,
    bankDetails: {
      accountHolderName: 'Radha Kannan',
      bankName: 'Canara Bank (Bodi)',
      accountNumber: '22100482910',
      ifscCode: 'CNRB0002210',
      upiId: 'radha.theni@upi',
      verified: true,
    },
  },

  // 8. Salem: Male Captain for RUBI CAB Regular (Prime Sedan)
  {
    id: 'cpt_gunasekaran_slm',
    name: 'Gunasekaran Rajendran',
    phone: '+91 98420 77441',
    email: 'guna.r@rubicab.com',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    gender: 'male',
    isPinkEligible: false,
    serviceEligibility: ['rubi_cab'],
    vehicleType: 'sedan',
    vehicleModel: 'Maruti Suzuki Dzire VXi',
    vehicleRegNumber: 'TN 27 BV 8811',
    vehiclePhotoUrl: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=400&q=80',
    vehicleCapacity: 4,
    identityDocType: 'aadhaar',
    identityDocNumber: '8811 4420 1199',
    drivingLicenseNumber: 'TN27 20160008811',
    licenseExpiry: '2031-10-05',
    insuranceNumber: 'HDFC-ERGO-881144',
    insuranceExpiry: '2029-02-18',
    operatingState: 'Tamil Nadu',
    operatingDistrict: 'Salem',
    operatingCity: 'Salem Central',
    preferredWorkingArea: 'Salem New Bus Stand, Omalur, Attur',
    approvalStatus: 'approved',
    isOnline: true,
    isBusy: false,
    currentLat: 11.6650,
    currentLng: 78.1470,
    heading: 90,
    rating: 4.91,
    totalTrips: 2100,
    bankDetails: {
      accountHolderName: 'Gunasekaran Rajendran',
      bankName: 'Indian Bank (Salem Main)',
      accountNumber: '44100582910',
      ifscCode: 'IDIB000S012',
      upiId: 'guna.salem@indianbank',
      verified: true,
    },
  },

  // 9. Trichy: Male Captain for RUBI CAB Regular (Namma Auto)
  {
    id: 'cpt_saravanan_try',
    name: 'Saravanan Pitchai',
    phone: '+91 99440 66552',
    email: 'saravanan.p@rubicab.com',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
    gender: 'male',
    isPinkEligible: false,
    serviceEligibility: ['rubi_cab'],
    vehicleType: 'auto',
    vehicleModel: 'Bajaj RE Compact 4S',
    vehicleRegNumber: 'TN 45 BX 6622',
    vehiclePhotoUrl: 'https://images.unsplash.com/photo-1593950315186-76a92975b60c?auto=format&fit=crop&w=400&q=80',
    vehicleCapacity: 3,
    identityDocType: 'aadhaar',
    identityDocNumber: '6622 1148 5590',
    drivingLicenseNumber: 'TN45 20170006622',
    licenseExpiry: '2032-12-15',
    insuranceNumber: 'UNITED-INDIA-662211',
    insuranceExpiry: '2028-09-25',
    operatingState: 'Tamil Nadu',
    operatingDistrict: 'Tiruchirappalli',
    operatingCity: 'Trichy Central',
    preferredWorkingArea: 'Central Bus Stand, Srirangam, Airport',
    approvalStatus: 'approved',
    isOnline: true,
    isBusy: false,
    currentLat: 10.7915,
    currentLng: 78.6885,
    heading: 45,
    rating: 4.89,
    totalTrips: 1780,
    bankDetails: {
      accountHolderName: 'Saravanan Pitchai',
      bankName: 'State Bank of India (Trichy Cantonment)',
      accountNumber: '20948219482',
      ifscCode: 'SBIN0000930',
      upiId: 'saravanan.trichy@sbi',
      verified: true,
    },
  },

  // 10. Tiruppur: Male Captain for RUBI CAB Regular (Bike Taxi)
  {
    id: 'cpt_karthik_tup',
    name: 'Karthikeyan Velusamy',
    phone: '+91 97900 88123',
    email: 'karthik.v@rubicab.com',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
    gender: 'male',
    isPinkEligible: false,
    serviceEligibility: ['rubi_cab'],
    vehicleType: 'bike',
    vehicleModel: 'Hero Splendor Plus BS6',
    vehicleRegNumber: 'TN 39 CD 1188',
    vehiclePhotoUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=400&q=80',
    vehicleCapacity: 1,
    identityDocType: 'aadhaar',
    identityDocNumber: '1188 4420 9931',
    drivingLicenseNumber: 'TN39 20190001188',
    licenseExpiry: '2034-03-20',
    insuranceNumber: 'BAJAJ-ALLZ-118899',
    insuranceExpiry: '2028-11-01',
    operatingState: 'Tamil Nadu',
    operatingDistrict: 'Tiruppur',
    operatingCity: 'Tiruppur',
    preferredWorkingArea: 'Old Bus Stand, Avinashi Road',
    approvalStatus: 'approved',
    isOnline: true,
    isBusy: false,
    currentLat: 11.1090,
    currentLng: 77.3420,
    heading: 90,
    rating: 4.92,
    totalTrips: 1450,
    bankDetails: {
      accountHolderName: 'Karthikeyan Velusamy',
      bankName: 'HDFC Bank (Tiruppur)',
      accountNumber: '501002914820',
      ifscCode: 'HDFC0000248',
      upiId: 'karthik.tup@okhdfcbank',
      verified: true,
    },
  },
];

export const INITIAL_COUPONS: Coupon[] = [
  {
    code: 'RUBI50',
    discountType: 'percentage',
    discountValue: 20,
    maxDiscount: 50,
    minFare: 50,
    description: '20% off up to ₹50 on RUBI CAB statewide rides',
    active: true,
    serviceApplicability: 'all',
  },
  {
    code: 'PINKSAFE',
    discountType: 'flat',
    discountValue: 50,
    minFare: 80,
    description: 'Flat ₹50 off on RUBI CAB PINK women-priority rides',
    active: true,
    serviceApplicability: 'rubi_pink',
  },
  {
    code: 'TNINTERCITY',
    discountType: 'flat',
    discountValue: 150,
    minFare: 500,
    description: 'Flat ₹150 off on Tamil Nadu intercity & outstation rides',
    active: true,
    serviceApplicability: 'all',
  },
];

export const DEFAULT_CUSTOMER: CustomerProfile = {
  id: 'rider_ramesh_101',
  name: 'Ramesh Sundaram',
  phone: '+91 98410 77654',
  email: 'ramesh.s@rubicab.com',
  password: 'rider123',
  rating: 4.9,
  totalRides: 38,
  savedAddresses: {
    home: STATEWIDE_TAMIL_NADU_LOCATIONS[2], // T. Nagar
    work: STATEWIDE_TAMIL_NADU_LOCATIONS[3], // OMR Tidel Park
    favorites: [STATEWIDE_TAMIL_NADU_LOCATIONS[0], STATEWIDE_TAMIL_NADU_LOCATIONS[5]],
  },
  frequentPlaces: [
    {
      id: 'fp_1',
      label: 'Home (T. Nagar)',
      tamilLabel: 'வீடு',
      icon: 'home',
      location: STATEWIDE_TAMIL_NADU_LOCATIONS[2],
    },
    {
      id: 'fp_2',
      label: 'Work (Tidel Park)',
      tamilLabel: 'அலுவலகம்',
      icon: 'briefcase',
      location: STATEWIDE_TAMIL_NADU_LOCATIONS[3],
    },
    {
      id: 'fp_3',
      label: 'Chennai Airport (MAA)',
      tamilLabel: 'விமான நிலையம்',
      icon: 'map-pin',
      location: STATEWIDE_TAMIL_NADU_LOCATIONS[1],
    },
    {
      id: 'fp_4',
      label: 'Coimbatore Junction',
      tamilLabel: 'கோவை இரயில் நிலையம்',
      icon: 'building',
      location: STATEWIDE_TAMIL_NADU_LOCATIONS[6],
    },
  ],
  recentSearches: [
    STATEWIDE_TAMIL_NADU_LOCATIONS[0], // Chennai Central
    STATEWIDE_TAMIL_NADU_LOCATIONS[5], // CBE Gandhipuram
    STATEWIDE_TAMIL_NADU_LOCATIONS[10], // Madurai Meenakshi Temple
    STATEWIDE_TAMIL_NADU_LOCATIONS[14], // Theni Bus Stand
  ],
};

const DEFAULT_TELEPHONY_CONFIG: TelephonyConfig = {
  provider: 'Exotel Cloud Telephony',
  status: 'active',
  virtualNumberPool: [
    '+91 80 4719 0284',
    '+91 80 4719 0285',
    '+91 44 6902 4410',
    '+91 44 6902 4411',
  ],
  sessionExpiryMinutes: 45,
  recordingEnabled: false,
};

const STORAGE_KEY = 'rubi_cab_v3_store';

const SEED_CANCELLATIONS: CancellationRecord[] = [
  {
    id: 'canc_seed_01',
    bookingId: 'book_canc_01',
    bookingRef: 'RC-841920',
    customerId: 'cust_ramesh',
    customerName: 'Ramesh Sundaram',
    customerPhone: '+91 98410 77654',
    captainId: 'cpt_priya',
    captainName: 'Priya Dhandapani',
    vehicleType: 'auto',
    serviceType: 'rubi_pink',
    pickupAddress: 'T. Nagar Panagal Park, Chennai',
    destinationAddress: 'Marina Beach, Chennai',
    reason: 'Captain taking too long',
    additionalExplanation: 'Waited 12 minutes, captain stuck in traffic at Kodambakkam bridge',
    cancelledBy: 'customer',
    cancelledAt: Date.now() - 3600000 * 5,
    previousStatus: 'accepted',
    finalStatus: 'cancelled',
    cancellationFee: 0,
  },
  {
    id: 'canc_seed_02',
    bookingId: 'book_canc_02',
    bookingRef: 'RC-712894',
    customerId: 'cust_ramesh',
    customerName: 'Ramesh Sundaram',
    customerPhone: '+91 98410 77654',
    vehicleType: 'bike',
    serviceType: 'rubi_cab',
    pickupAddress: 'Chennai Central Railway Station, Chennai',
    destinationAddress: 'Tidel Park, Tharamani',
    reason: 'Booked by mistake',
    additionalExplanation: 'Selected incorrect destination railway station',
    cancelledBy: 'customer',
    cancelledAt: Date.now() - 3600000 * 18,
    previousStatus: 'searching',
    finalStatus: 'cancelled',
    cancellationFee: 0,
  },
  {
    id: 'canc_seed_03',
    bookingId: 'book_canc_03',
    bookingRef: 'RC-629140',
    customerId: 'cust_karthik',
    customerName: 'Karthik Subramanian',
    customerPhone: '+91 98402 11990',
    captainId: 'cpt_senthil',
    captainName: 'Senthil Kumar',
    vehicleType: 'seven_seater',
    serviceType: 'rubi_cab',
    pickupAddress: 'Coimbatore Airport, Peelamedu',
    destinationAddress: 'Gandhipuram Bus Stand, Coimbatore',
    reason: 'Changed my destination',
    additionalExplanation: 'Flight arrived earlier, taking train directly from junction',
    cancelledBy: 'customer',
    cancelledAt: Date.now() - 3600000 * 28,
    previousStatus: 'arrived',
    finalStatus: 'cancelled',
    cancellationFee: 35,
  },
  {
    id: 'canc_seed_04',
    bookingId: 'book_canc_04',
    bookingRef: 'RC-552109',
    customerId: 'cust_anitha',
    customerName: 'Anitha V.',
    customerPhone: '+91 94432 88123',
    captainId: 'cpt_deepa',
    captainName: 'Deepa Natarajan',
    vehicleType: 'sedan',
    serviceType: 'rubi_pink',
    pickupAddress: 'Meenakshi Temple East Gate, Madurai',
    destinationAddress: 'Madurai Railway Junction',
    reason: 'Found another ride',
    additionalExplanation: 'Auto available right outside temple exit',
    cancelledBy: 'customer',
    cancelledAt: Date.now() - 3600000 * 42,
    previousStatus: 'accepted',
    finalStatus: 'cancelled',
    cancellationFee: 0,
  },
  {
    id: 'canc_seed_05',
    bookingId: 'book_canc_05',
    bookingRef: 'RC-419082',
    customerId: 'cust_meena',
    customerName: 'Meenakshi Raman',
    customerPhone: '+91 97900 44512',
    captainId: 'cpt_gunasekaran_mdu',
    captainName: 'Gunasekaran Rajendran',
    vehicleType: 'sedan',
    serviceType: 'rubi_cab',
    pickupAddress: 'Salem New Bus Stand, Salem',
    destinationAddress: 'Salem Junction Railway Station',
    reason: 'Captain asked me to cancel',
    additionalExplanation: 'Captain reported flat tire and requested cancellation',
    cancelledBy: 'captain',
    cancelledAt: Date.now() - 3600000 * 50,
    previousStatus: 'accepted',
    finalStatus: 'cancelled',
    cancellationFee: 0,
  },
];

interface AppState {
  fareSettings: FareSettings;
  districts: TamilNaduDistrict[];
  captains: CaptainProfile[];
  currentCustomer: CustomerProfile;
  currentCaptainId: string;
  selectedService: ServiceType; // 'rubi_cab' | 'rubi_pink'
  currentUserRole: UserRole; // 'customer' | 'captain' | 'admin'
  isAuthenticated: boolean;
  activeBooking: Booking | null;
  bookingHistory: Booking[];
  cancellationRecords: CancellationRecord[];
  walletTransactions: WalletTransaction[];
  withdrawalRequests: WithdrawalRequest[];
  coupons: Coupon[];
  supportTickets: SupportTicket[];
  auditLogs: AuditLog[];
  telephonyConfig: TelephonyConfig;
  activeVirtualCall: {
    isOpen: boolean;
    bookingId?: string;
    callerRole: 'rider' | 'captain';
    targetName: string;
    virtualNumber: string;
    extensionPin: string;
    connected: boolean;
    durationSeconds: number;
  } | null;
}

class Store {
  private state: AppState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): AppState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          fareSettings: parsed.fareSettings || DEFAULT_FARE_SETTINGS,
          districts: parsed.districts?.length ? parsed.districts : TAMIL_NADU_DISTRICTS,
          captains: parsed.captains?.length ? parsed.captains : SEED_CAPTAINS,
          currentCustomer: parsed.currentCustomer || DEFAULT_CUSTOMER,
          currentCaptainId: parsed.currentCaptainId || SEED_CAPTAINS[0].id,
          selectedService: parsed.selectedService || 'rubi_cab',
          currentUserRole: parsed.currentUserRole || 'customer',
          isAuthenticated: parsed.isAuthenticated ?? true,
          activeBooking: parsed.activeBooking || null,
          bookingHistory: parsed.bookingHistory || [],
          cancellationRecords: parsed.cancellationRecords?.length ? parsed.cancellationRecords : SEED_CANCELLATIONS,
          walletTransactions: parsed.walletTransactions || this.getInitialWalletTransactions(),
          withdrawalRequests: parsed.withdrawalRequests || [],
          coupons: parsed.coupons || INITIAL_COUPONS,
          supportTickets: parsed.supportTickets || [],
          auditLogs: parsed.auditLogs || this.getInitialAuditLogs(),
          telephonyConfig: parsed.telephonyConfig || DEFAULT_TELEPHONY_CONFIG,
          activeVirtualCall: null,
        };
      }
    } catch {
      // Ignore
    }

    return {
      fareSettings: DEFAULT_FARE_SETTINGS,
      districts: TAMIL_NADU_DISTRICTS,
      captains: SEED_CAPTAINS,
      currentCustomer: DEFAULT_CUSTOMER,
      currentCaptainId: SEED_CAPTAINS[0].id,
      selectedService: 'rubi_cab',
      currentUserRole: 'customer',
      isAuthenticated: true,
      activeBooking: null,
      bookingHistory: [],
      cancellationRecords: SEED_CANCELLATIONS,
      walletTransactions: this.getInitialWalletTransactions(),
      withdrawalRequests: [],
      coupons: INITIAL_COUPONS,
      supportTickets: [],
      auditLogs: this.getInitialAuditLogs(),
      telephonyConfig: DEFAULT_TELEPHONY_CONFIG,
      activeVirtualCall: null,
    };
  }

  private getInitialWalletTransactions(): WalletTransaction[] {
    return [
      {
        id: 'txn_init_01',
        transactionRef: 'TXN-90214-EARN',
        captainId: 'cpt_priya',
        type: 'ride_earning',
        amount: 380,
        description: 'Trip earnings: T. Nagar to Marina Beach',
        tamilDescription: 'சவாரி வருமானம்: தி. நகர் முதல் மெரினா',
        balanceAfter: 1250,
        createdAt: Date.now() - 3600000 * 5,
      },
      {
        id: 'txn_init_02',
        transactionRef: 'TXN-90215-COMM',
        captainId: 'cpt_priya',
        type: 'commission_deduction',
        amount: -76,
        description: 'Platform commission deduction (20%)',
        tamilDescription: 'இயங்குதள கட்டண பிடித்தம் (20%)',
        balanceAfter: 1174,
        createdAt: Date.now() - 3600000 * 5,
      },
      {
        id: 'txn_init_03',
        transactionRef: 'TXN-90220-PINK',
        captainId: 'cpt_deepa',
        type: 'ride_earning',
        amount: 420,
        description: 'RUBI CAB PINK trip: Anna Nagar to Tidel Park',
        tamilDescription: 'ரூபி கேப் பிங்க் சவாரி வருமானம்: அண்ணா நகர் - டைடல்',
        balanceAfter: 1680,
        createdAt: Date.now() - 3600000 * 3,
      },
    ];
  }

  private getInitialAuditLogs(): AuditLog[] {
    return [
      {
        id: 'log_01',
        actor: 'SYSTEM',
        role: 'system',
        action: 'PLATFORM_STATEWIDE_EXPANSION',
        details: 'RUBI CAB expanded across all 38 Tamil Nadu districts (Chennai, Coimbatore, Madurai, Theni, Salem, Trichy, Tiruppur, Erode, etc.) with statewide captain onboarding.',
        timestamp: Date.now() - 86400000,
      },
      {
        id: 'log_02',
        actor: 'superadmin@rubicab.com',
        role: 'super_admin',
        action: 'PINK_FLEET_CERTIFICATION',
        details: 'Captain Anitha Sivasankaran (Coimbatore), Meenakshi Sundaram (Madurai), and Radha Kannan (Theni) certified for RUBI CAB PINK.',
        timestamp: Date.now() - 43200000,
      },
    ];
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Quota
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  // --- GETTERS ---
  public getState(): AppState {
    return this.state;
  }

  public getSelectedService(): ServiceType {
    return this.state.selectedService;
  }

  public setSelectedService(service: ServiceType) {
    this.state.selectedService = service;
    this.addAuditLog(this.state.currentCustomer.name, 'customer', 'SERVICE_SELECTED', `Switched to ${service.toUpperCase()}`);
    this.saveState();
  }

  public getCurrentCustomer(): CustomerProfile {
    return this.state.currentCustomer;
  }

  public getCurrentCaptain(): CaptainProfile {
    const cpt = this.state.captains.find((c) => c.id === this.state.currentCaptainId);
    return cpt || this.state.captains[0];
  }

  public getFareSettings(): FareSettings {
    return this.state.fareSettings;
  }

  public getActiveBooking(): Booking | null {
    return this.state.activeBooking;
  }

  // --- STATEWIDE TAMIL NADU DISTRICT MANAGEMENT ---

  public getDistricts(): TamilNaduDistrict[] {
    return this.state.districts;
  }

  public toggleDistrictActive(districtId: string): void {
    this.state.districts = this.state.districts.map((d) =>
      d.id === districtId ? { ...d, isActive: !d.isActive } : d
    );
    this.addAuditLog('Super Admin', 'admin', 'DISTRICT_STATUS_TOGGLED', `District ${districtId} active state changed.`);
    this.saveState();
  }

  public toggleDistrictPink(districtId: string): void {
    this.state.districts = this.state.districts.map((d) =>
      d.id === districtId ? { ...d, isPinkActive: !d.isPinkActive } : d
    );
    this.addAuditLog('Super Admin', 'admin', 'DISTRICT_PINK_TOGGLED', `District ${districtId} RUBI PINK status changed.`);
    this.saveState();
  }

  public updateDistrictFareMultiplier(districtId: string, multiplier: number): void {
    this.state.districts = this.state.districts.map((d) =>
      d.id === districtId ? { ...d, fareMultiplier: multiplier } : d
    );
    this.saveState();
  }

  public getDistrictStats(): DistrictBookingStats[] {
    return this.state.districts.map((d) => {
      const activeCaptains = this.state.captains.filter(
        (c) =>
          c.operatingDistrict?.toLowerCase() === d.name.toLowerCase() &&
          c.approvalStatus === 'approved' &&
          c.isOnline
      ).length;

      const districtBookings = this.state.bookingHistory.filter(
        (b) =>
          b.pickup.district?.toLowerCase() === d.name.toLowerCase() ||
          b.pickup.address.toLowerCase().includes(d.name.toLowerCase())
      );

      const grossRev = districtBookings.reduce((sum, b) => sum + (b.finalFare || b.estimatedFare), 0);
      const pinkTrips = districtBookings.filter((b) => b.serviceType === 'rubi_pink').length;

      return {
        districtId: d.id,
        districtName: d.name,
        totalTrips: districtBookings.length,
        activeCaptains,
        grossRevenue: grossRev,
        pinkTripsCount: pinkTrips,
      };
    });
  }

  // --- CAPTAIN DISCOVERY IN DISTRICT ---
  public findEligibleCaptains(
    districtName?: string,
    serviceType: ServiceType = this.state.selectedService,
    vehicleType?: VehicleType
  ): CaptainProfile[] {
    return this.state.captains.filter((c) => {
      if (c.approvalStatus !== 'approved') return false;
      if (!c.isOnline) return false;
      if (c.isBusy) return false;

      // Filter service
      if (serviceType === 'rubi_pink' && !c.isPinkEligible) return false;

      // Filter vehicle
      if (vehicleType && c.vehicleType !== vehicleType) return false;

      // If districtName is specified, prioritize or match district
      if (districtName) {
        const isDistrictMatch =
          c.operatingDistrict?.toLowerCase() === districtName.toLowerCase() ||
          c.preferredWorkingArea?.toLowerCase().includes(districtName.toLowerCase());
        return isDistrictMatch;
      }

      return true;
    });
  }

  // --- CAPTAIN REGISTRATION & APPROVAL WORKFLOW ---

  public registerNewCaptain(form: CaptainRegistrationForm): {
    success: boolean;
    captainId: string;
    applicationRef: string;
    error?: string;
  } {
    if (!form.fullName || !form.phone || !form.drivingLicenseNumber || !form.vehicleRegNumber) {
      return {
        success: false,
        captainId: '',
        applicationRef: '',
        error: 'Please fill all mandatory personal, licence, and vehicle details',
      };
    }

    const captainId = `cpt_${Date.now()}`;
    const applicationRef = `APP-TN-${Math.floor(100000 + Math.random() * 900000)}`;

    // Resolve district coordinates
    const districtObj = this.state.districts.find(
      (d) => d.name.toLowerCase() === form.operatingDistrict.toLowerCase()
    ) || this.state.districts[0];

    const newCaptain: CaptainProfile = {
      id: captainId,
      name: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      dob: form.dob,
      residentialAddress: form.residentialAddress,
      photoUrl:
        form.photoUrl ||
        (form.gender === 'female'
          ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80'
          : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'),
      gender: form.gender,
      isPinkEligible: form.serviceSelection === 'rubi_pink' && form.gender === 'female',
      serviceEligibility:
        form.serviceSelection === 'rubi_pink' && form.gender === 'female'
          ? ['rubi_cab', 'rubi_pink']
          : ['rubi_cab'],
      vehicleType: form.vehicleCategory,
      vehicleModel: form.vehicleMakeModel || `${form.vehicleCategory.toUpperCase()} Commercial`,
      vehicleRegNumber: form.vehicleRegNumber.toUpperCase(),
      vehiclePhotoUrl:
        form.vehiclePhotoUrl ||
        (form.vehicleCategory === 'bike'
          ? 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=400&q=80'
          : form.vehicleCategory === 'auto'
          ? 'https://images.unsplash.com/photo-1593950315186-76a92975b60c?auto=format&fit=crop&w=400&q=80'
          : form.vehicleCategory === 'seven_seater'
          ? 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80'
          : 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=400&q=80'),
      vehicleCapacity: form.passengerCapacity || 4,
      identityDocType: form.identityDocType,
      identityDocNumber: form.identityDocNumber,
      identityDocUrl: form.identityDocUrl || 'Aadhaar_Govt_ID_Verified.pdf',
      drivingLicenseNumber: form.drivingLicenseNumber.toUpperCase(),
      drivingLicenseDocUrl: form.drivingLicenseDocUrl || 'Driving_Licence_TamilNadu_RTO.pdf',
      licenseExpiry: form.licenseExpiry || '2034-12-31',
      vehicleRcDocUrl: form.vehicleRcDocUrl || 'RC_Book_SmartCard.pdf',
      insuranceNumber: `INS-${Math.floor(1000000 + Math.random() * 9000000)}`,
      insuranceExpiry: '2029-12-31',
      vehicleInsuranceDocUrl: form.vehicleInsuranceDocUrl || 'Comprehensive_Insurance_Policy.pdf',
      fitnessCertificateUrl: form.fitnessCertificateUrl || 'FC_Permit_Certificate.pdf',
      operatingState: form.operatingState || 'Tamil Nadu',
      operatingDistrict: form.operatingDistrict,
      operatingCity: form.operatingCity || form.operatingDistrict,
      preferredWorkingArea: form.preferredWorkingArea,
      approvalStatus: 'submitted',
      submittedAt: Date.now(),
      isOnline: false,
      isBusy: false,
      currentLat: districtObj.lat + (Math.random() * 0.02 - 0.01),
      currentLng: districtObj.lng + (Math.random() * 0.02 - 0.01),
      heading: 90,
      rating: 5.0,
      totalTrips: 0,
      bankDetails: {
        accountHolderName: form.accountHolderName || form.fullName,
        bankName: form.bankName || 'State Bank of India',
        accountNumber: form.accountNumber,
        ifscCode: form.ifscCode.toUpperCase(),
        upiId: `${form.phone.replace(/[^0-9]/g, '')}@upi`,
        verified: true,
      },
    };

    this.state.captains.unshift(newCaptain);
    this.addAuditLog(
      form.fullName,
      'captain',
      'NEW_CAPTAIN_APPLICATION_SUBMITTED',
      `Application ${applicationRef} submitted for ${form.vehicleCategory} in ${form.operatingDistrict} district. Status: Submitted.`
    );
    this.saveState();

    return {
      success: true,
      captainId,
      applicationRef,
    };
  }

  public updateCaptainApproval(
    captainId: string,
    status: CaptainApprovalStatus,
    reason?: string
  ): void {
    this.state.captains = this.state.captains.map((c) => {
      if (c.id === captainId) {
        return {
          ...c,
          approvalStatus: status,
          rejectionReason: reason,
          approvedAt: status === 'approved' ? Date.now() : c.approvedAt,
          rejectedAt: status === 'rejected' ? Date.now() : c.rejectedAt,
          isOnline: status === 'approved' ? true : false,
        };
      }
      return c;
    });

    this.addAuditLog(
      'Super Admin',
      'admin',
      'CAPTAIN_APPROVAL_UPDATED',
      `Captain ${captainId} status updated to ${status.toUpperCase()}${reason ? ` (Reason: ${reason})` : ''}`
    );
    this.saveState();
  }

  public updateCaptainProfile(captainId: string, updates: Partial<CaptainProfile>): void {
    this.state.captains = this.state.captains.map((c) =>
      c.id === captainId ? { ...c, ...updates } : c
    );
    this.saveState();
  }

  public updateVehiclePhoto(vehicleType: VehicleType, imageUrl: string): void {
    const veh = VEHICLE_CONFIGS.find((v) => v.id === vehicleType);
    if (veh) {
      veh.imageUrl = imageUrl;
      this.addAuditLog('Super Admin', 'admin', 'VEHICLE_PHOTO_UPDATED', `Photo updated for ${vehicleType}`);
      this.saveState();
    }
  }

  // --- WALLET GETTER ---
  public getCaptainWallet(captainId: string): {
    availableBalance: number;
    totalEarnings: number;
    pendingBalance: number;
    transactions: WalletTransaction[];
  } {
    const txns = this.state.walletTransactions.filter((t) => t.captainId === captainId);
    let totalEarnings = 0;
    let availableBalance = 1970; // Base balance for demo
    let pendingBalance = 0;

    for (const t of txns) {
      if (t.type === 'ride_earning' || t.type === 'incentive') {
        totalEarnings += t.amount;
        availableBalance += t.amount;
      } else if (t.type === 'commission_deduction' || t.type === 'penalty' || t.type === 'withdrawal') {
        availableBalance -= Math.abs(t.amount);
      }
    }

    const pendingWithdrawals = this.state.withdrawalRequests
      .filter((w) => w.captainId === captainId && (w.status === 'pending' || w.status === 'processing'))
      .reduce((sum, w) => sum + w.amount, 0);

    pendingBalance = pendingWithdrawals;
    availableBalance = Math.max(0, availableBalance - pendingWithdrawals);

    return {
      availableBalance,
      totalEarnings,
      pendingBalance,
      transactions: txns.sort((a, b) => b.createdAt - a.createdAt),
    };
  }

  // --- AUTHENTICATION & ROLE SWITCHING ---

  public loginRider(identifier: string, _password?: string): { success: boolean; error?: string } {
    if (!identifier || identifier.trim().length < 3) {
      return { success: false, error: 'Please enter a valid mobile number or rider ID' };
    }
    this.state.currentUserRole = 'customer';
    this.state.isAuthenticated = true;
    this.addAuditLog(this.state.currentCustomer.name, 'customer', 'RIDER_AUTHENTICATED', `Rider ${identifier} logged in`);
    this.saveState();
    return { success: true };
  }

  public loginCaptain(captainIdOrPhone: string, _password?: string): { success: boolean; error?: string } {
    const found = this.state.captains.find(
      (c) =>
        c.id === captainIdOrPhone ||
        c.phone.includes(captainIdOrPhone) ||
        c.name.toLowerCase().includes(captainIdOrPhone.toLowerCase())
    );
    if (!found) {
      return { success: false, error: 'No captain found with this identifier' };
    }
    if (found.approvalStatus !== 'approved') {
      return {
        success: false,
        error: `Application status is: ${found.approvalStatus.toUpperCase()}. Access restricted pending admin document approval.`,
      };
    }
    this.state.currentCaptainId = found.id;
    this.state.currentUserRole = 'captain';
    this.state.isAuthenticated = true;
    this.addAuditLog(found.name, 'captain', 'CAPTAIN_AUTHENTICATED', `Captain ${found.name} logged in`);
    this.saveState();
    return { success: true };
  }

  public loginAdmin(email: string, password?: string): { success: boolean; error?: string } {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Valid authorized admin email required' };
    }
    if (password && password !== 'admin123' && password !== 'admin') {
      return { success: false, error: 'Invalid administrator credentials' };
    }
    this.state.currentUserRole = 'admin';
    this.state.isAuthenticated = true;
    this.addAuditLog(email, 'admin', 'ADMIN_AUTHENTICATED', `Super Admin logged into Command Center`);
    this.saveState();
    return { success: true };
  }

  public registerRider(data: { name: string; phone: string; email?: string }): { success: boolean; error?: string } {
    if (!data.name || !data.phone) {
      return { success: false, error: 'Name and Mobile Number are required' };
    }
    this.state.currentCustomer = {
      ...DEFAULT_CUSTOMER,
      id: `rider_${Date.now()}`,
      name: data.name,
      phone: data.phone,
      email: data.email || `${data.name.toLowerCase().replace(/\s+/g, '')}@rubicab.com`,
    };
    this.state.currentUserRole = 'customer';
    this.state.isAuthenticated = true;
    this.addAuditLog(data.name, 'customer', 'RIDER_REGISTERED', `New rider registered: ${data.phone}`);
    this.saveState();
    return { success: true };
  }

  public logout() {
    this.state.isAuthenticated = false;
    this.saveState();
  }

  public setUserRole(role: UserRole) {
    this.state.currentUserRole = role;
    this.saveState();
  }

  // --- RECENT SEARCHES & SAVED PLACES ---

  public addRecentSearch(point: LocationPoint) {
    const list = this.state.currentCustomer.recentSearches || [];
    const filtered = list.filter((l) => l.id !== point.id);
    this.state.currentCustomer.recentSearches = [point, ...filtered].slice(0, 8);
    this.saveState();
  }

  public addCustomSavedPlace(item: SavedLocationItem) {
    if (!this.state.currentCustomer.frequentPlaces) {
      this.state.currentCustomer.frequentPlaces = [];
    }
    this.state.currentCustomer.frequentPlaces.push(item);
    this.saveState();
  }

  // --- VIRTUAL NUMBER CALLING SYSTEM ---

  public allocateVirtualCallingBridge(bookingId: string): VirtualCallSession {
    const randomDID = this.state.telephonyConfig.virtualNumberPool[
      Math.floor(Math.random() * this.state.telephonyConfig.virtualNumberPool.length)
    ];
    const extensionPin = Math.floor(1000 + Math.random() * 9000).toString();

    const session: VirtualCallSession = {
      sessionId: `vcall_${Date.now()}`,
      virtualBridgeNumber: randomDID,
      extensionPin,
      allocatedAt: Date.now(),
      expiresAt: Date.now() + this.state.telephonyConfig.sessionExpiryMinutes * 60 * 1000,
      provider: this.state.telephonyConfig.provider,
      status: 'active',
      callHistory: [],
    };

    return session;
  }

  public initiateVirtualCall(bookingId: string, callerRole: 'rider' | 'captain') {
    const booking = this.state.activeBooking;
    if (!booking) return;

    if (!booking.virtualCallSession) {
      booking.virtualCallSession = this.allocateVirtualCallingBridge(booking.id);
    }

    const targetName = callerRole === 'rider' ? (booking.captain?.name || 'Captain') : booking.customerName;

    this.state.activeVirtualCall = {
      isOpen: true,
      bookingId,
      callerRole,
      targetName,
      virtualNumber: booking.virtualCallSession.virtualBridgeNumber,
      extensionPin: booking.virtualCallSession.extensionPin,
      connected: false,
      durationSeconds: 0,
    };

    this.saveState();
  }

  public connectVirtualCall() {
    if (!this.state.activeVirtualCall) return;
    this.state.activeVirtualCall.connected = true;
    this.saveState();
  }

  public endVirtualCall() {
    if (!this.state.activeVirtualCall) return;
    const call = this.state.activeVirtualCall;
    const booking = this.state.activeBooking;

    if (booking && booking.virtualCallSession) {
      booking.virtualCallSession.callHistory.push({
        callId: `call_${Date.now()}`,
        initiatedBy: call.callerRole,
        timestamp: Date.now(),
        durationSeconds: call.durationSeconds,
        callStatus: 'connected',
      });
    }

    this.addAuditLog(
      'TELEPHONY_BRIDGE',
      'system',
      'MASKED_CALL_ENDED',
      `Masked call between ${booking?.customerName} and ${booking?.captain?.name} ended (${call.durationSeconds}s duration). Personal numbers protected.`
    );

    this.state.activeVirtualCall = null;
    this.saveState();
  }

  // --- STATEWIDE BOOKING LIFECYCLE ---

  public createBooking(
    pickup: LocationPoint,
    destination: LocationPoint,
    vehicleType: VehicleType,
    couponCode?: string,
    serviceType: ServiceType = this.state.selectedService
  ): Booking {
    this.addRecentSearch(destination);
    this.addRecentSearch(pickup);

    // Resolve districts if not specified
    if (!pickup.district) {
      const pDist = getDistrictFromCoordinates(pickup.lat, pickup.lng);
      pickup.district = pDist.name;
    }
    if (!destination.district) {
      const dDist = getDistrictFromCoordinates(destination.lat, destination.lng);
      destination.district = dDist.name;
    }

    // Realistic driving distance with road curvature factor (1.28x straight line)
    const straightDist = haversineDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
    const distanceKm = Math.max(1.2, Math.round(straightDist * 1.28 * 10) / 10);

    // Determine duration based on city vs highway outstation speed
    let durationMinutes = 10;
    if (distanceKm > 40) {
      // Highway speed ~ 55 km/h
      durationMinutes = Math.round((distanceKm / 55) * 60) + 15;
    } else {
      // Urban speed ~ 24 km/h
      durationMinutes = Math.max(6, Math.round((distanceKm / 24) * 60) + 4);
    }

    let discount = 0;
    if (couponCode) {
      const foundCoupon = this.state.coupons.find(
        (c) => c.active && c.code.toUpperCase() === couponCode.trim().toUpperCase()
      );
      if (foundCoupon) {
        if (foundCoupon.discountType === 'flat') {
          discount = foundCoupon.discountValue;
        } else {
          discount = Math.min(foundCoupon.maxDiscount || 50, (foundCoupon.discountValue / 100) * 100);
        }
      }
    }

    const { estimatedFare, breakdown } = estimateFare(
      vehicleType,
      distanceKm,
      durationMinutes,
      this.state.fareSettings,
      { serviceType, discountAmount: discount }
    );

    const openingOtp = generateSixDigitOtp();
    const closingOtp = generateSixDigitOtp();

    const booking: Booking = {
      id: `bk_${Date.now()}`,
      bookingRef: `RC-${Math.floor(100000 + Math.random() * 900000)}`,
      serviceType,
      customerId: this.state.currentCustomer.id,
      customerName: this.state.currentCustomer.name,
      customerPhone: this.state.currentCustomer.phone,
      customerRating: this.state.currentCustomer.rating,
      vehicleType,
      pickup,
      destination,
      status: 'searching',
      openingOtp,
      openingOtpAttempts: 0,
      closingOtp,
      closingOtpAttempts: 0,
      createdAt: Date.now(),
      estimatedDistanceKm: distanceKm,
      estimatedDurationMin: durationMinutes,
      routeCoordinates: [
        { lat: pickup.lat, lng: pickup.lng, timestamp: Date.now() },
      ],
      estimatedFare,
      fareBreakdown: breakdown,
      couponCode,
      paymentStatus: 'pending',
    };

    this.state.activeBooking = booking;
    this.addAuditLog(
      this.state.currentCustomer.name,
      'customer',
      'BOOKING_CREATED',
      `Booking ${booking.bookingRef} created for ${vehicleType} (${serviceType.toUpperCase()}) from ${pickup.name} (${pickup.district || 'TN'}) to ${destination.name} (${destination.district || 'TN'}) [${distanceKm} km]`
    );
    this.saveState();
    return booking;
  }

  public captainAcceptRide(captainId: string): boolean {
    const booking = this.state.activeBooking;
    if (!booking || booking.status !== 'searching') return false;

    const captain = this.state.captains.find((c) => c.id === captainId);
    if (!captain) return false;

    // Verify captain approval status
    if (captain.approvalStatus !== 'approved') return false;

    // Verify service eligibility: RUBI CAB PINK requires isPinkEligible
    if (booking.serviceType === 'rubi_pink' && !captain.isPinkEligible) {
      return false;
    }

    booking.status = 'accepted';
    booking.acceptedAt = Date.now();
    booking.captainId = captain.id;
    booking.captain = { ...captain, isBusy: true };

    // Allocate masked virtual calling session
    booking.virtualCallSession = this.allocateVirtualCallingBridge(booking.id);

    this.state.captains = this.state.captains.map((c) =>
      c.id === captainId ? { ...c, isBusy: true } : c
    );

    this.addAuditLog(
      captain.name,
      'captain',
      'RIDE_ACCEPTED',
      `Captain ${captain.name} (${captain.operatingDistrict || 'Tamil Nadu'}) accepted ride ${booking.bookingRef} under ${booking.serviceType.toUpperCase()}`
    );
    this.saveState();
    return true;
  }

  public captainArrivedAtPickup(): boolean {
    const booking = this.state.activeBooking;
    if (!booking || booking.status !== 'accepted') return false;

    booking.status = 'arrived';
    this.addAuditLog(booking.captain?.name || 'Captain', 'captain', 'CAPTAIN_ARRIVED', `Captain reached pickup for ${booking.bookingRef}`);
    this.saveState();
    return true;
  }

  public verifyOpeningOtp(enteredOtp: string): { success: boolean; error?: string } {
    const booking = this.state.activeBooking;
    if (!booking) return { success: false, error: 'No active booking found' };

    if (booking.status !== 'arrived' && booking.status !== 'accepted') {
      return { success: false, error: 'Cannot verify opening OTP in current ride state' };
    }

    const verification = verifyOtp(enteredOtp, booking.openingOtp, booking.openingOtpAttempts, 3);
    booking.openingOtpAttempts += 1;

    if (!verification.success) {
      this.saveState();
      return { success: false, error: verification.error };
    }

    booking.status = 'in_progress';
    booking.startedAt = Date.now();
    booking.openingOtpVerifiedAt = Date.now();
    booking.actualDistanceKm = 0.5;
    booking.actualDurationMin = 1;

    this.addAuditLog(
      booking.captain?.name || 'Captain',
      'captain',
      'OPENING_OTP_VERIFIED',
      `Opening OTP verified for ${booking.bookingRef}. Trip started.`
    );
    this.saveState();
    return { success: true };
  }

  public recordGPSUpdate(lat: number, lng: number, speedKmh: number = 42): void {
    const booking = this.state.activeBooking;
    if (!booking || booking.status !== 'in_progress') return;

    const crumb: GPSBreadcrumb = {
      lat,
      lng,
      timestamp: Date.now(),
      speedKmh,
    };

    booking.routeCoordinates.push(crumb);

    if (booking.routeCoordinates.length >= 2) {
      const prev = booking.routeCoordinates[booking.routeCoordinates.length - 2];
      const delta = haversineDistance(prev.lat, prev.lng, lat, lng);
      booking.actualDistanceKm = Math.round(((booking.actualDistanceKm || 0) + delta) * 100) / 100;
    }

    if (booking.startedAt) {
      const durationMin = Math.max(1, Math.round((Date.now() - booking.startedAt) / 60000));
      booking.actualDurationMin = durationMin;
    }

    this.saveState();
  }

  public captainReachedDestination(): boolean {
    const booking = this.state.activeBooking;
    if (!booking || booking.status !== 'in_progress') return false;

    booking.status = 'destination_reached';
    this.addAuditLog(
      booking.captain?.name || 'Captain',
      'captain',
      'DESTINATION_REACHED',
      `Destination reached for ${booking.bookingRef}. Waiting for closing OTP.`
    );
    this.saveState();
    return true;
  }

  public verifyClosingOtp(enteredOtp: string): { success: boolean; error?: string } {
    const booking = this.state.activeBooking;
    if (!booking) return { success: false, error: 'No active booking found' };

    if (booking.status !== 'destination_reached') {
      return { success: false, error: 'Ride must be at destination reached state to verify closing OTP' };
    }

    const verification = verifyOtp(enteredOtp, booking.closingOtp, booking.closingOtpAttempts, 3);
    booking.closingOtpAttempts += 1;

    if (!verification.success) {
      this.saveState();
      return { success: false, error: verification.error };
    }

    booking.status = 'completed';
    booking.completedAt = Date.now();
    booking.closingOtpVerifiedAt = Date.now();

    const actualDist = booking.actualDistanceKm || booking.estimatedDistanceKm;
    const actualDuration = booking.actualDurationMin || booking.estimatedDurationMin;

    const finalBreakdown = calculateFinalFare(
      booking.vehicleType,
      actualDist,
      actualDuration,
      2,
      this.state.fareSettings,
      booking.fareBreakdown?.surgeMultiplier || 1.0,
      booking.fareBreakdown?.discount || 0,
      booking.serviceType
    );

    booking.finalFare = finalBreakdown.grossFare;
    booking.fareBreakdown = finalBreakdown;

    if (booking.captainId) {
      this.state.captains = this.state.captains.map((c) =>
        c.id === booking.captainId ? { ...c, isBusy: false, totalTrips: c.totalTrips + 1 } : c
      );
    }

    this.addAuditLog(
      'SYSTEM',
      'system',
      'TRIP_COMPLETED_FARE_LOCKED',
      `Trip ${booking.bookingRef} finalized via Closing OTP. Gross: ₹${booking.finalFare}, Commission: ₹${finalBreakdown.platformCommission}, Net: ₹${finalBreakdown.captainNetEarnings}`
    );
    this.saveState();
    return { success: true };
  }

  public completePayment(
    paymentMethod: PaymentMode,
    txnId: string = `PAY_${Date.now()}`
  ): boolean {
    const booking = this.state.activeBooking;
    if (!booking || booking.status !== 'completed' || !booking.fareBreakdown) return false;

    booking.paymentStatus = 'completed';
    booking.paymentMethod = paymentMethod;
    booking.paymentTxnId = txnId;
    booking.paidAt = Date.now();

    const captainId = booking.captainId || this.state.captains[0].id;
    const netEarnings = booking.fareBreakdown.captainNetEarnings;
    const commission = booking.fareBreakdown.platformCommission;

    const earningTxn: WalletTransaction = {
      id: `wtx_${Date.now()}_earn`,
      transactionRef: `TXN-${Math.floor(100000 + Math.random() * 900000)}-CREDIT`,
      captainId,
      type: 'ride_earning',
      amount: netEarnings,
      description: `Trip earnings for ${booking.bookingRef} (${booking.serviceType.toUpperCase()} - ${booking.pickup.name} to ${booking.destination.name})`,
      tamilDescription: `சவாரி வருமானம்: ${booking.bookingRef}`,
      bookingId: booking.id,
      balanceAfter: 0,
      createdAt: Date.now(),
    };

    const commTxn: WalletTransaction = {
      id: `wtx_${Date.now()}_comm`,
      transactionRef: `COMM-${Math.floor(100000 + Math.random() * 900000)}-LEVY`,
      captainId,
      type: 'commission_deduction',
      amount: commission,
      description: `Platform technology levy (20%) on ${booking.bookingRef}`,
      tamilDescription: `இயங்குதள தொழில்நுட்ப கட்டணம் (20%)`,
      bookingId: booking.id,
      balanceAfter: 0,
      createdAt: Date.now(),
    };

    this.state.walletTransactions.push(earningTxn, commTxn);
    this.state.bookingHistory.unshift({ ...booking });

    this.addAuditLog(
      booking.customerName,
      'customer',
      'PAYMENT_SETTLED',
      `Payment of ₹${booking.finalFare} settled via ${paymentMethod.toUpperCase()} (Ref: ${txnId}). Credited ₹${netEarnings} to Captain ${captainId}.`
    );

    this.saveState();
    return true;
  }

  public submitRating(
    stars: number,
    review: string,
    ratingBy: 'customer' | 'captain'
  ): void {
    const booking = this.state.activeBooking;
    if (!booking) return;

    if (ratingBy === 'customer') {
      booking.customerRatingGiven = stars;
      booking.customerReviewGiven = review;
    } else {
      booking.captainRatingGiven = stars;
    }

    this.saveState();
  }

  public resetActiveBooking(): void {
    this.state.activeBooking = null;
    this.saveState();
  }

  public getCancellationFee(status?: BookingStatus): number {
    const currentStatus = status || this.state.activeBooking?.status;
    if (!currentStatus) return 0;
    if (currentStatus === 'searching' || currentStatus === 'searching_timeout') {
      return 0;
    }
    if (currentStatus === 'accepted' || currentStatus === 'arrived' || currentStatus === 'captain_arriving') {
      return this.state.fareSettings.cancellationFee || 35;
    }
    return 0;
  }

  public handleSearchTimeout(): boolean {
    const booking = this.state.activeBooking;
    if (!booking || booking.status !== 'searching') return false;
    booking.status = 'searching_timeout';
    this.addAuditLog(
      booking.customerName,
      'customer',
      'SEARCH_TIMEOUT',
      `Captain search timed out for booking ${booking.bookingRef}. Customer can retry or cancel.`
    );
    this.saveState();
    return true;
  }

  public retrySearchingCaptain(): boolean {
    const booking = this.state.activeBooking;
    if (!booking || booking.status !== 'searching_timeout') return false;
    booking.status = 'searching';
    this.addAuditLog(
      booking.customerName,
      'customer',
      'SEARCH_RETRY',
      `Customer restarted captain search for booking ${booking.bookingRef}.`
    );
    this.saveState();
    return true;
  }

  public getCancellationRecords(): CancellationRecord[] {
    return this.state.cancellationRecords || [];
  }

  public cancelBooking(
    reason: string,
    cancelledBy: 'customer' | 'captain' | 'admin' = 'customer',
    explanation?: string
  ): { success: boolean; error?: string; record?: CancellationRecord } {
    const booking = this.state.activeBooking;
    if (!booking) {
      return { success: false, error: 'No active booking found to cancel.' };
    }

    if (booking.status === 'cancelled') {
      return { success: false, error: 'This booking has already been cancelled.' };
    }

    if (booking.status === 'in_progress' || booking.status === 'destination_reached' || booking.status === 'completed') {
      return { success: false, error: 'Trip is already in progress and cannot be cancelled.' };
    }

    const previousStatus = booking.status;
    const fee = this.getCancellationFee(previousStatus);

    booking.status = 'cancelled';
    booking.cancelledAt = Date.now();
    booking.cancellationReason = reason;
    booking.cancelledBy = cancelledBy;

    // Release assigned captain so they are free for other rides immediately
    if (booking.captainId) {
      this.state.captains = this.state.captains.map((c) =>
        c.id === booking.captainId ? { ...c, isBusy: false } : c
      );
    }

    const record: CancellationRecord = {
      id: `canc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      bookingId: booking.id,
      bookingRef: booking.bookingRef,
      customerId: booking.customerId,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      captainId: booking.captainId,
      captainName: booking.captain?.name,
      vehicleType: booking.vehicleType,
      serviceType: booking.serviceType,
      pickupAddress: booking.pickup.address || booking.pickup.name,
      destinationAddress: booking.destination.address || booking.destination.name,
      reason,
      additionalExplanation: explanation?.trim() || undefined,
      cancelledBy,
      cancelledAt: Date.now(),
      previousStatus,
      finalStatus: 'cancelled',
      cancellationFee: fee,
    };

    if (!Array.isArray(this.state.cancellationRecords)) {
      this.state.cancellationRecords = [];
    }
    this.state.cancellationRecords.unshift(record);

    this.state.bookingHistory.unshift({ ...booking });
    this.addAuditLog(
      cancelledBy,
      cancelledBy,
      'BOOKING_CANCELLED',
      `Booking ${booking.bookingRef} cancelled: ${reason}. Fee: ₹${fee}`
    );

    // Reset active booking so the customer immediately returns to the clean booking screen
    this.state.activeBooking = null;
    this.saveState();

    return { success: true, record };
  }

  // --- BANK WITHDRAWALS ---

  public requestWithdrawal(captainId: string, amount: number): { success: boolean; withdrawal?: WithdrawalRequest; error?: string } {
    const wallet = this.getCaptainWallet(captainId);
    if (amount < this.state.fareSettings.minWithdrawalAmount) {
      return { success: false, error: `Minimum withdrawal amount is ₹${this.state.fareSettings.minWithdrawalAmount}` };
    }
    if (amount > wallet.availableBalance) {
      return { success: false, error: `Requested amount exceeds available balance of ₹${wallet.availableBalance}` };
    }

    const captain = this.state.captains.find((c) => c.id === captainId);
    if (!captain) return { success: false, error: 'Captain profile not found' };

    const withdrawal: WithdrawalRequest = {
      id: `wdr_${Date.now()}`,
      withdrawalRef: `WDR-${Math.floor(100000 + Math.random() * 900000)}`,
      captainId,
      captainName: captain.name,
      amount,
      bankDetails: {
        bankName: captain.bankDetails.bankName,
        accountNumber: captain.bankDetails.accountNumber,
        ifscCode: captain.bankDetails.ifscCode,
        upiId: captain.bankDetails.upiId,
      },
      status: 'pending',
      requestedAt: Date.now(),
    };

    this.state.withdrawalRequests.unshift(withdrawal);
    this.addAuditLog(captain.name, 'captain', 'WITHDRAWAL_REQUESTED', `Requested ₹${amount} bank payout (Ref: ${withdrawal.withdrawalRef})`);
    this.saveState();
    return { success: true, withdrawal };
  }

  public updateWithdrawalStatus(
    withdrawalId: string,
    status: 'approved' | 'successful' | 'rejected',
    adminNotes?: string
  ): void {
    const w = this.state.withdrawalRequests.find((item) => item.id === withdrawalId);
    if (!w) return;

    w.status = status;
    w.processedAt = Date.now();
    w.adminNotes = adminNotes;

    if (status === 'successful') {
      w.payoutTxnId = `IMPS${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const debitTxn: WalletTransaction = {
        id: `wtx_${Date.now()}_wdr`,
        transactionRef: `PAYOUT-${w.withdrawalRef}`,
        captainId: w.captainId,
        type: 'withdrawal',
        amount: -w.amount,
        description: `Bank withdrawal payout to ${w.bankDetails.bankName} (${w.bankDetails.accountNumber})`,
        tamilDescription: `வங்கி கணக்கு பணப்பரிமாற்றம்: ₹${w.amount}`,
        withdrawalId: w.id,
        balanceAfter: 0,
        createdAt: Date.now(),
      };
      this.state.walletTransactions.push(debitTxn);
    }

    this.addAuditLog('Super Admin', 'admin', 'WITHDRAWAL_PROCESSED', `Payout ${w.withdrawalRef} updated to ${status.toUpperCase()}`);
    this.saveState();
  }

  // --- FARE SETTINGS & ADMIN CONTROLS ---

  public updateFareSettings(settings: FareSettings, adminActor: string = 'Super Admin') {
    this.state.fareSettings = settings;
    this.addAuditLog(adminActor, 'admin', 'FARE_SETTINGS_UPDATED', 'Updated dynamic fare matrix');
    this.saveState();
  }

  public setCaptainOnline(captainId: string, isOnline: boolean) {
    this.state.captains = this.state.captains.map((c) =>
      c.id === captainId ? { ...c, isOnline } : c
    );
    this.saveState();
  }

  public switchActiveCaptain(captainId: string) {
    this.state.currentCaptainId = captainId;
    this.saveState();
  }

  public toggleCaptainPinkEligibility(captainId: string, isEligible: boolean) {
    this.state.captains = this.state.captains.map((c) =>
      c.id === captainId
        ? {
            ...c,
            isPinkEligible: isEligible,
            serviceEligibility: isEligible ? ['rubi_cab', 'rubi_pink'] : ['rubi_cab'],
          }
        : c
    );
    this.addAuditLog(
      'Super Admin',
      'admin',
      'CAPTAIN_PINK_ELIGIBILITY_TOGGLED',
      `Captain ${captainId} RUBI CAB PINK eligibility set to ${isEligible}`
    );
    this.saveState();
  }

  public updateCaptainPinkEligibility(captainId: string, isEligible: boolean) {
    this.toggleCaptainPinkEligibility(captainId, isEligible);
  }

  public updateCaptainKYCStatus(
    captainId: string,
    status: CaptainApprovalStatus,
    reason?: string
  ) {
    this.updateCaptainApproval(captainId, status, reason);
  }

  public triggerEmergencySOS(bookingId?: string) {
    const booking = this.state.activeBooking;
    if (booking) {
      booking.sosTriggered = true;
      booking.sosTriggeredAt = Date.now();
    }
    this.addAuditLog(
      this.state.currentCustomer.name,
      'customer',
      'EMERGENCY_SOS_TRIGGERED',
      `CRITICAL: Emergency SOS triggered for ride ${booking?.bookingRef || 'General'}. Location dispatched.`
    );
    this.saveState();
  }

  public addCoupon(coupon: Coupon) {
    this.state.coupons.unshift(coupon);
    this.addAuditLog('Super Admin', 'admin', 'COUPON_CREATED', `New coupon promo code created: ${coupon.code}`);
    this.saveState();
  }

  public addAuditLog(actor: string, role: string, action: string, details: string) {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      actor,
      role,
      action,
      details,
      timestamp: Date.now(),
    };
    this.state.auditLogs.unshift(log);
    if (this.state.auditLogs.length > 200) {
      this.state.auditLogs.pop();
    }
  }
}

export const platformStore = new Store();
