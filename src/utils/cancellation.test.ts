import test from 'node:test';
import assert from 'node:assert/strict';
import { platformStore, POPULAR_LOCATIONS } from '../services/store';
import { STANDARD_CANCELLATION_REASONS } from '../types';

test('Cancellation flow: pre-trip searching cancellation is free and clears activeBooking', () => {
  platformStore.resetActiveBooking();
  const booking = platformStore.createBooking(
    POPULAR_LOCATIONS[0],
    POPULAR_LOCATIONS[1],
    'sedan',
    undefined,
    'rubi_cab'
  );

  assert.equal(booking.status, 'searching');
  assert.equal(platformStore.getCancellationFee('searching'), 0);

  const result = platformStore.cancelBooking('Found another ride', 'customer');
  assert.equal(result.success, true);
  assert.ok(result.record);
  assert.equal(result.record.cancellationFee, 0);
  assert.equal(result.record.reason, 'Found another ride');
  assert.equal(result.record.cancelledBy, 'customer');
  assert.equal(platformStore.getState().activeBooking, null);
});

test('Cancellation flow: timeout transition and retry', () => {
  platformStore.resetActiveBooking();
  platformStore.createBooking(
    POPULAR_LOCATIONS[0],
    POPULAR_LOCATIONS[1],
    'bike',
    undefined,
    'rubi_cab'
  );

  assert.equal(platformStore.getState().activeBooking?.status, 'searching');
  const timedOut = platformStore.handleSearchTimeout();
  assert.equal(timedOut, true);
  assert.equal(platformStore.getState().activeBooking?.status, 'searching_timeout');

  const retried = platformStore.retrySearchingCaptain();
  assert.equal(retried, true);
  assert.equal(platformStore.getState().activeBooking?.status, 'searching');

  // Cancel from searching
  platformStore.cancelBooking('Booked by mistake', 'customer');
  assert.equal(platformStore.getState().activeBooking, null);
});

test('Cancellation flow: releasing assigned captain when ride is cancelled after acceptance', () => {
  platformStore.resetActiveBooking();
  const booking = platformStore.createBooking(
    POPULAR_LOCATIONS[0],
    POPULAR_LOCATIONS[1],
    'auto',
    undefined,
    'rubi_cab'
  );

  // Simulate captain acceptance
  const eligibleCaptains = platformStore.getState().captains.filter((c) => c.isOnline && !c.isBusy);
  assert.ok(eligibleCaptains.length > 0);
  const testCaptain = eligibleCaptains[0];

  platformStore.captainAcceptRide(testCaptain.id);
  const activeBooking = platformStore.getState().activeBooking;
  assert.equal(activeBooking?.status, 'accepted');
  assert.equal(activeBooking?.captainId, testCaptain.id);

  // Verify captain is busy
  const busyCaptain = platformStore.getState().captains.find((c) => c.id === testCaptain.id);
  assert.equal(busyCaptain?.isBusy, true);

  // Cancellation fee applies once accepted
  const fee = platformStore.getCancellationFee(activeBooking.status);
  assert.equal(fee, platformStore.getState().fareSettings.cancellationFee);

  // Cancel ride with "Captain taking too long"
  const cancelResult = platformStore.cancelBooking(
    'Captain taking too long',
    'customer',
    'Captain has been stationary for 10 minutes'
  );
  assert.equal(cancelResult.success, true);
  assert.ok(cancelResult.record);
  assert.equal(cancelResult.record.reason, 'Captain taking too long');
  assert.equal(cancelResult.record.cancellationFee, fee);
  assert.equal(cancelResult.record.captainId, testCaptain.id);

  // Captain must be immediately freed up
  const freedCaptain = platformStore.getState().captains.find((c) => c.id === testCaptain.id);
  assert.equal(freedCaptain?.isBusy, false);

  // Duplicate cancellation must be blocked
  const duplicateResult = platformStore.cancelBooking('Booked by mistake', 'customer');
  assert.equal(duplicateResult.success, false);
});

test('Cancellation flow: 8 standard reasons are valid', () => {
  assert.equal(STANDARD_CANCELLATION_REASONS.length, 8);
  assert.ok(STANDARD_CANCELLATION_REASONS.includes('Captain taking too long'));
  assert.ok(STANDARD_CANCELLATION_REASONS.includes('Changed my destination'));
  assert.ok(STANDARD_CANCELLATION_REASONS.includes('Booked by mistake'));
  assert.ok(STANDARD_CANCELLATION_REASONS.includes('Found another ride'));
  assert.ok(STANDARD_CANCELLATION_REASONS.includes('Fare is too high'));
  assert.ok(STANDARD_CANCELLATION_REASONS.includes('Captain asked me to cancel'));
  assert.ok(STANDARD_CANCELLATION_REASONS.includes('Pickup location is incorrect'));
  assert.ok(STANDARD_CANCELLATION_REASONS.includes('Other reason'));
});
