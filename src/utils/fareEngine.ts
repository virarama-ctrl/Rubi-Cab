import { FareBreakdown, FareSettings, GPSBreadcrumb, ServiceType, VehicleType } from '../types';

/**
 * Default fare settings for RUBI CAB and RUBI CAB PINK
 */
export const DEFAULT_FARE_SETTINGS: FareSettings = {
  gstRatePercent: 5, // 5% GST on transport aggregators
  platformCommissionPercent: 20, // 20% platform commission
  tdsPercent: 1, // 1% TDS under Section 194O of Indian IT Act
  waitingChargePerMin: 2, // ₹2 per minute beyond initial 3 minutes
  nightSurgeMultiplier: 1.25, // 10pm - 5am
  peakHourSurgeMultiplier: 1.35, // 8:30am - 11am & 5:30pm - 8:30pm
  cancellationFee: 35, // ₹35 cancellation penalty
  minWithdrawalAmount: 200, // ₹200 minimum captain payout
  rubiCabCategories: {
    bike: {
      baseFare: 25,
      perKmRate: 9,
      perMinRate: 1.2,
      minFare: 35,
    },
    auto: {
      baseFare: 35,
      perKmRate: 14,
      perMinRate: 1.8,
      minFare: 50,
    },
    mini: {
      baseFare: 60,
      perKmRate: 18,
      perMinRate: 2.2,
      minFare: 90,
    },
    sedan: {
      baseFare: 90,
      perKmRate: 22,
      perMinRate: 2.8,
      minFare: 140,
    },
    seven_seater: {
      baseFare: 130,
      perKmRate: 28,
      perMinRate: 3.5,
      minFare: 200,
    },
  },
  rubiPinkCategories: {
    bike: {
      baseFare: 25,
      perKmRate: 9,
      perMinRate: 1.2,
      minFare: 35,
    },
    auto: {
      baseFare: 35,
      perKmRate: 14,
      perMinRate: 1.8,
      minFare: 50,
    },
    mini: {
      baseFare: 65,
      perKmRate: 18,
      perMinRate: 2.2,
      minFare: 95,
    },
    sedan: {
      baseFare: 95,
      perKmRate: 22,
      perMinRate: 2.8,
      minFare: 145,
    },
    seven_seater: {
      baseFare: 140,
      perKmRate: 28,
      perMinRate: 3.5,
      minFare: 210,
    },
  },
  categories: {
    bike: {
      baseFare: 25,
      perKmRate: 9,
      perMinRate: 1.2,
      minFare: 35,
    },
    auto: {
      baseFare: 35,
      perKmRate: 14,
      perMinRate: 1.8,
      minFare: 50,
    },
    mini: {
      baseFare: 60,
      perKmRate: 18,
      perMinRate: 2.2,
      minFare: 90,
    },
    sedan: {
      baseFare: 90,
      perKmRate: 22,
      perMinRate: 2.8,
      minFare: 140,
    },
    seven_seater: {
      baseFare: 130,
      perKmRate: 28,
      perMinRate: 3.5,
      minFare: 200,
    },
  },
};

/**
 * Calculate Haversine distance in kilometers between two lat/lng points
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 100) / 100;
}

export const calculateHaversineDistance = haversineDistance;

/**
 * Generate a cryptographically random 6-digit OTP
 */
export function generateSixDigitOtp(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return num.toString();
}

/**
 * Verify OTP with max retry limits
 */
export function verifyOtp(
  enteredOtp: string,
  actualOtp: string,
  currentAttempts: number,
  maxAttempts: number = 3
): { success: boolean; attemptsRemaining: number; error?: string } {
  const sanitizedEntered = enteredOtp.trim();
  const sanitizedActual = actualOtp.trim();

  if (currentAttempts >= maxAttempts) {
    return {
      success: false,
      attemptsRemaining: 0,
      error: 'Max OTP retry limit exceeded. Please contact support.',
    };
  }

  if (sanitizedEntered.length !== 6 || !/^\d{6}$/.test(sanitizedEntered)) {
    return {
      success: false,
      attemptsRemaining: maxAttempts - currentAttempts,
      error: 'OTP must be exactly 6 digits.',
    };
  }

  if (sanitizedEntered === sanitizedActual) {
    return {
      success: true,
      attemptsRemaining: maxAttempts - currentAttempts,
    };
  }

  const nextAttempts = currentAttempts + 1;
  const remaining = Math.max(0, maxAttempts - nextAttempts);
  return {
    success: false,
    attemptsRemaining: remaining,
    error: `Incorrect OTP. ${remaining} attempts remaining.`,
  };
}

/**
 * Check if the given timestamp falls into peak hours or night hours
 */
export function determineSurgeMultiplier(
  date: Date,
  settings: FareSettings = DEFAULT_FARE_SETTINGS
): { multiplier: number; reason?: string } {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const timeVal = hour + minute / 60;

  // Night hours: 10:00 PM (22:00) to 5:00 AM
  if (timeVal >= 22 || timeVal < 5) {
    return {
      multiplier: settings.nightSurgeMultiplier,
      reason: 'Night Fare (10 PM - 5 AM)',
    };
  }

  // Morning Peak: 8:30 AM to 11:00 AM
  if (timeVal >= 8.5 && timeVal <= 11) {
    return {
      multiplier: settings.peakHourSurgeMultiplier,
      reason: 'Morning Peak Hour Surge',
    };
  }

  // Evening Peak: 5:30 PM to 8:30 PM
  if (timeVal >= 17.5 && timeVal <= 20.5) {
    return {
      multiplier: settings.peakHourSurgeMultiplier,
      reason: 'Evening Peak Hour Surge',
    };
  }

  return { multiplier: 1.0 };
}

/**
 * Estimate fare prior to booking with RUBI CAB and RUBI CAB PINK pricing support
 */
export function estimateFare(
  vehicleType: VehicleType,
  distanceKm: number,
  durationMinutes: number,
  settings: FareSettings = DEFAULT_FARE_SETTINGS,
  options?: {
    serviceType?: ServiceType;
    surgeMultiplier?: number;
    discountAmount?: number;
  }
): { estimatedFare: number; breakdown: FareBreakdown } {
  const service = options?.serviceType || 'rubi_cab';
  const categoryMatrix =
    service === 'rubi_pink'
      ? settings.rubiPinkCategories || settings.categories
      : settings.rubiCabCategories || settings.categories;

  const rates = categoryMatrix[vehicleType] || DEFAULT_FARE_SETTINGS.rubiCabCategories[vehicleType];
  const surge = options?.surgeMultiplier ?? 1.0;
  const discount = Math.max(0, options?.discountAmount ?? 0);

  const baseFare = rates.baseFare;
  const distanceCharge = Math.round(distanceKm * rates.perKmRate);
  const timeCharge = Math.round(durationMinutes * rates.perMinRate);
  const waitingCharge = 0;

  const preSurge = baseFare + distanceCharge + timeCharge;
  const surgeAmount = Math.round(preSurge * (surge - 1));
  const subTotalBeforeTax = Math.max(rates.minFare, preSurge + surgeAmount - discount);

  const gstAmount = Math.round((subTotalBeforeTax * settings.gstRatePercent) / 100);
  const grossFare = subTotalBeforeTax + gstAmount;

  // Platform Commission & TDS deduction
  const platformCommission = Math.round((subTotalBeforeTax * settings.platformCommissionPercent) / 100);
  const tdsAmount = Math.round((subTotalBeforeTax * settings.tdsPercent) / 100);
  const captainNetEarnings = Math.max(0, subTotalBeforeTax - platformCommission - tdsAmount);

  const breakdown: FareBreakdown = {
    serviceType: service,
    baseFare,
    distanceKm: Math.round(distanceKm * 10) / 10,
    distanceCharge,
    durationMinutes: Math.round(durationMinutes),
    timeCharge,
    waitingMinutes: 0,
    waitingCharge,
    surgeMultiplier: surge,
    surgeAmount,
    discount,
    gstAmount,
    grossFare,
    platformCommission,
    tdsAmount,
    captainNetEarnings,
  };

  return {
    estimatedFare: grossFare,
    breakdown,
  };
}

/**
 * Calculate final audited fare after trip completion with actual GPS distance and duration
 */
export function calculateFinalFare(
  vehicleType: VehicleType,
  actualDistanceKm: number,
  actualDurationMinutes: number,
  waitingMinutes: number = 0,
  settings: FareSettings = DEFAULT_FARE_SETTINGS,
  surgeMultiplier: number = 1.0,
  discount: number = 0,
  serviceType: ServiceType = 'rubi_cab'
): FareBreakdown {
  const categoryMatrix =
    serviceType === 'rubi_pink'
      ? settings.rubiPinkCategories || settings.categories
      : settings.rubiCabCategories || settings.categories;

  const rates = categoryMatrix[vehicleType] || DEFAULT_FARE_SETTINGS.rubiCabCategories[vehicleType];
  const baseFare = rates.baseFare;

  // Charge based on actual GPS distance
  const distanceCharge = Math.round(actualDistanceKm * rates.perKmRate);
  const timeCharge = Math.round(actualDurationMinutes * rates.perMinRate);

  // Free waiting time of 3 minutes allowed; beyond that apply per-minute charge
  const chargeableWaitingMinutes = Math.max(0, waitingMinutes - 3);
  const waitingCharge = Math.round(chargeableWaitingMinutes * settings.waitingChargePerMin);

  const preSurge = baseFare + distanceCharge + timeCharge + waitingCharge;
  const surgeAmount = Math.round(preSurge * (surgeMultiplier - 1));
  const subTotal = Math.max(rates.minFare, preSurge + surgeAmount - discount);

  // Indian GST (5%) on ride hailing
  const gstAmount = Math.round((subTotal * settings.gstRatePercent) / 100);
  const grossFare = subTotal + gstAmount;

  // Platform commission deducted from pre-tax subtotal
  const platformCommission = Math.round((subTotal * settings.platformCommissionPercent) / 100);
  const tdsAmount = Math.round((subTotal * settings.tdsPercent) / 100);
  const captainNetEarnings = Math.max(0, subTotal - platformCommission - tdsAmount);

  return {
    serviceType,
    baseFare,
    distanceKm: Math.round(actualDistanceKm * 100) / 100,
    distanceCharge,
    durationMinutes: Math.round(actualDurationMinutes),
    timeCharge,
    waitingMinutes,
    waitingCharge,
    surgeMultiplier,
    surgeAmount,
    discount,
    gstAmount,
    grossFare,
    platformCommission,
    tdsAmount,
    captainNetEarnings,
  };
}

/**
 * Filter GPS breadcrumbs to remove erratic jumps or spoofed telemetry
 */
export function sanitizeGPSRoute(crumbs: GPSBreadcrumb[]): {
  validRoute: GPSBreadcrumb[];
  calculatedDistanceKm: number;
  anomalyDetected: boolean;
} {
  if (crumbs.length < 2) {
    return {
      validRoute: crumbs,
      calculatedDistanceKm: 0,
      anomalyDetected: false,
    };
  }

  const valid: GPSBreadcrumb[] = [crumbs[0]];
  let totalDist = 0;
  let anomalyDetected = false;

  for (let i = 1; i < crumbs.length; i++) {
    const prev = valid[valid.length - 1];
    const curr = crumbs[i];

    const dist = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    const timeDeltaHours = (curr.timestamp - prev.timestamp) / (1000 * 60 * 60);

    const impliedSpeedKmh = timeDeltaHours > 0 ? dist / timeDeltaHours : 0;

    if (impliedSpeedKmh > 130 && dist > 0.5) {
      anomalyDetected = true;
      continue;
    }

    totalDist += dist;
    valid.push(curr);
  }

  return {
    validRoute: valid,
    calculatedDistanceKm: Math.round(totalDist * 100) / 100,
    anomalyDetected,
  };
}
