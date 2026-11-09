import test from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineDistance,
  generateSixDigitOtp,
  verifyOtp,
  estimateFare,
  calculateFinalFare,
  sanitizeGPSRoute,
  DEFAULT_FARE_SETTINGS,
} from './fareEngine';

test('haversineDistance correctly calculates distance between known Indian coordinates', () => {
  const distance = haversineDistance(13.0827, 80.2707, 13.0500, 80.2824);
  assert.ok(distance > 3.0 && distance < 4.5, `Distance was ${distance} km, expected ~3.8 km`);
});

test('generateSixDigitOtp returns valid 6-digit numeric string', () => {
  for (let i = 0; i < 10; i++) {
    const otp = generateSixDigitOtp();
    assert.equal(otp.length, 6);
    assert.match(otp, /^\d{6}$/);
  }
});

test('verifyOtp handles correct, incorrect, and max retry limits', () => {
  const actualOtp = '582914';

  // 1. Correct OTP
  const result1 = verifyOtp('582914', actualOtp, 0, 3);
  assert.equal(result1.success, true);
  assert.equal(result1.attemptsRemaining, 3);

  // 2. Incorrect OTP on attempt 0
  const result2 = verifyOtp('123456', actualOtp, 0, 3);
  assert.equal(result2.success, false);
  assert.equal(result2.attemptsRemaining, 2);

  // 3. Exceeded retry limit
  const result3 = verifyOtp('582914', actualOtp, 3, 3);
  assert.equal(result3.success, false);
  assert.equal(result3.attemptsRemaining, 0);
  assert.match(result3.error || '', /Max OTP retry limit exceeded/);

  // 4. Invalid length
  const result4 = verifyOtp('123', actualOtp, 0, 3);
  assert.equal(result4.success, false);
  assert.match(result4.error || '', /6 digits/);
});

test('estimateFare calculates base fare, distance, time, and GST correctly for Bike', () => {
  const { estimatedFare, breakdown } = estimateFare('bike', 5, 15, DEFAULT_FARE_SETTINGS);
  assert.ok(estimatedFare >= 90 && estimatedFare <= 95);
  assert.equal(breakdown.baseFare, 25);
  assert.equal(breakdown.distanceCharge, 45);
  assert.equal(breakdown.timeCharge, 18);
  assert.ok(breakdown.platformCommission > 0);
  assert.ok(breakdown.captainNetEarnings > 0);
  assert.ok(breakdown.grossFare >= breakdown.platformCommission + breakdown.captainNetEarnings);
});

test('estimateFare supports Seven Seater (Family vehicle / SUV) category', () => {
  // Seven Seater: 10 km, 30 min in RUBI CAB
  // base ₹130, ₹28/km, ₹3.5/min
  // preSurge = 130 + (10 * 28 = 280) + (30 * 3.5 = 105) = 515
  // GST 5% of 515 = 25.75 -> ₹26
  // Gross = 515 + 26 = ₹541
  const { estimatedFare, breakdown } = estimateFare('seven_seater', 10, 30, DEFAULT_FARE_SETTINGS, {
    serviceType: 'rubi_cab',
  });
  assert.ok(estimatedFare >= 530 && estimatedFare <= 560);
  assert.equal(breakdown.baseFare, 130);
  assert.equal(breakdown.distanceCharge, 280);
});

test('estimateFare supports RUBI CAB PINK service with dedicated pricing', () => {
  // Mini in RUBI CAB PINK: base ₹65 (vs ₹60 in standard)
  const { breakdown: pinkBreakdown } = estimateFare('mini', 8, 20, DEFAULT_FARE_SETTINGS, {
    serviceType: 'rubi_pink',
  });
  const { breakdown: regularBreakdown } = estimateFare('mini', 8, 20, DEFAULT_FARE_SETTINGS, {
    serviceType: 'rubi_cab',
  });

  assert.equal(pinkBreakdown.serviceType, 'rubi_pink');
  assert.equal(regularBreakdown.serviceType, 'rubi_cab');
  assert.equal(pinkBreakdown.baseFare, 65);
  assert.equal(regularBreakdown.baseFare, 60);
});

test('calculateFinalFare enforces minimum fare when actual trip is extremely short', () => {
  const breakdown = calculateFinalFare('auto', 0.2, 2, 0, DEFAULT_FARE_SETTINGS);
  assert.ok(breakdown.grossFare >= 50);
});

test('calculateFinalFare accurately splits platform commission and captain net earnings', () => {
  const breakdown = calculateFinalFare('sedan', 10, 30, 5, DEFAULT_FARE_SETTINGS);
  assert.ok(breakdown.grossFare > 300);
  assert.ok(breakdown.platformCommission > 50);
  assert.ok(breakdown.captainNetEarnings > 200);
  assert.equal(breakdown.gstAmount, Math.round((breakdown.grossFare - breakdown.gstAmount) * 0.05));
});

test('sanitizeGPSRoute filters out impossible spoofed speed jumps', () => {
  const baseTime = Date.now();
  const rawCrumbs = [
    { lat: 13.0827, lng: 80.2707, timestamp: baseTime },
    { lat: 13.0840, lng: 80.2715, timestamp: baseTime + 60000 },
    { lat: 15.0000, lng: 82.0000, timestamp: baseTime + 65000 },
    { lat: 13.0855, lng: 80.2725, timestamp: baseTime + 120000 },
  ];

  const result = sanitizeGPSRoute(rawCrumbs);
  assert.equal(result.anomalyDetected, true);
  assert.equal(result.validRoute.length, 3);
  assert.ok(result.calculatedDistanceKm < 1.0);
});
