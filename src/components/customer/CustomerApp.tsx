import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Clock,
  ShieldAlert,
  Search,
  Star,
  Phone,
  CheckCircle2,
  Lock,
  ArrowRight,
  User,
  Heart,
  Plus,
  Briefcase,
  Building,
  ShieldCheck,
  X,
  ChevronRight,
  AlertCircle,
  Tag,
  Check,
  Edit2,
  Car,
  ChevronLeft,
  Loader2,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Booking,
  CustomerBookingStage,
  Language,
  LocationPoint,
  PaymentMode,
  SavedLocationItem,
  ServiceType,
  VehicleType,
} from '../../types';
import {
  POPULAR_LOCATIONS,
  platformStore,
  VEHICLE_CONFIGS,
} from '../../services/store';
import {
  searchTamilNaduLocations,
  getDistrictFromCoordinates,
  TAMIL_NADU_DISTRICTS,
} from '../../data/tamilNaduData';
import { calculateHaversineDistance, estimateFare } from '../../utils/fareEngine';
import { getTranslation } from '../../utils/translations';
import {
  reverseGeocodeCoordinates,
  searchPlacesAcrossTamilNadu,
  fetchPlaceDetailsGeometry,
} from '../../utils/reverseGeocoding';
import { InteractiveMap } from '../common/InteractiveMap';
import { PaymentModal } from '../common/PaymentModal';
import { InvoiceModal } from '../common/InvoiceModal';
import { SOSModal } from '../common/SOSModal';
import { VehicleIllustration } from '../common/VehicleIllustration';
import { CancellationModal } from './CancellationModal';

interface CustomerAppProps {
  lang: Language;
}

export const CustomerApp: React.FC<CustomerAppProps> = ({ lang }) => {
  const [storeState, setStoreState] = useState(platformStore.getState());

  // CRITICAL REQUIREMENT: ZERO HARDCODED CHENNAI DEFAULTS.
  // Initial states start as null until GPS detection or manual selection.
  const [pickup, setPickup] = useState<LocationPoint | null>(null);
  const [destination, setDestination] = useState<LocationPoint | null>(null);
  const [currentGPS, setCurrentGPS] = useState<LocationPoint | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'prompt' | 'granted' | 'denied' | 'locating'>('prompt');
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Road-following route measurements from Google Maps Routes API (or high-fidelity calculation)
  const [roadRouteData, setRoadRouteData] = useState<{
    distanceKm: number;
    durationMin: number;
  } | null>(null);

  // Booking Flow Stage State Machine
  const [bookingStage, setBookingStage] = useState<CustomerBookingStage>('LOCATION_SELECTION');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('auto');
  const [mapSelectionMode, setMapSelectionMode] = useState<'pickup' | 'destination' | null>(null);

  // Dedicated Full-Screen / Modal Search State with Tamil Nadu & Places Autocomplete
  const [searchModalMode, setSearchModalMode] = useState<'pickup' | 'destination' | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<LocationPoint[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Duplicate-click guard for ride creation
  const [isCreatingBooking, setIsCreatingBooking] = useState<boolean>(false);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [showSOSModal, setShowSOSModal] = useState<boolean>(false);
  const [showSavedPlacesModal, setShowSavedPlacesModal] = useState<boolean>(false);
  const [showPromoInput, setShowPromoInput] = useState<boolean>(false);
  const [couponCode, setCouponCode] = useState<string>('RUBI50');
  const [appliedCoupon, setAppliedCoupon] = useState<string>('RUBI50');
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [ratingReview, setRatingReview] = useState<string>('');
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);

  // Cancellation Modal and Toast
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancellationToast, setCancellationToast] = useState<string | null>(null);
  const [cancellationError, setCancellationError] = useState<string | null>(null);

  // Captain searching timeout timer (40 seconds)
  const [searchSecondsElapsed, setSearchSecondsElapsed] = useState<number>(0);
  const SEARCH_TIMEOUT_SECONDS = 40;

  useEffect(() => {
    const unsubscribe = platformStore.subscribe(() => {
      setStoreState({ ...platformStore.getState() });
    });
    return unsubscribe;
  }, []);

  const activeBooking = storeState.activeBooking;
  const fareSettings = storeState.fareSettings;
  const customer = storeState.currentCustomer;
  const selectedService = storeState.selectedService;
  const isPink = selectedService === 'rubi_pink';

  // Synchronize booking stage with activeBooking from store
  useEffect(() => {
    if (activeBooking) {
      if (activeBooking.status === 'searching' || activeBooking.status === 'searching_timeout') {
        setBookingStage('SEARCHING_CAPTAIN');
      } else if (activeBooking.status === 'accepted') {
        setBookingStage('CAPTAIN_ASSIGNED');
      } else if (activeBooking.status === 'captain_arriving' || activeBooking.status === 'arrived') {
        setBookingStage('DRIVER_ARRIVING');
      } else if (activeBooking.status === 'otp_verified' || activeBooking.status === 'in_progress') {
        setBookingStage('TRIP_STARTED');
      } else if (activeBooking.status === 'destination_reached' || activeBooking.status === 'completed') {
        setBookingStage('TRIP_COMPLETED');
      } else if (activeBooking.status === 'cancelled') {
        setBookingStage('CANCELLED');
      }
    } else {
      // If no active booking, stage depends on location choices
      if (!pickup || !destination) {
        setBookingStage('LOCATION_SELECTION');
      } else if (bookingStage === 'SEARCHING_CAPTAIN' || bookingStage === 'CAPTAIN_ASSIGNED' || bookingStage === 'DRIVER_ARRIVING' || bookingStage === 'TRIP_STARTED') {
        // Reset to location selection when ride completes or resets
        setBookingStage('LOCATION_SELECTION');
      }
    }
  }, [activeBooking?.status, activeBooking?.id, pickup, destination]);

  // Compute live progress percentage if trip is in progress
  const [progressPercent, setProgressPercent] = useState<number>(0);

  useEffect(() => {
    if (!activeBooking) {
      setProgressPercent(0);
      return;
    }

    if (activeBooking.status === 'in_progress') {
      const interval = setInterval(() => {
        setProgressPercent((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 2.5;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else if (
      activeBooking.status === 'destination_reached' ||
      activeBooking.status === 'completed'
    ) {
      setProgressPercent(100);
    } else {
      setProgressPercent(0);
    }
  }, [activeBooking?.status]);

  // 1. DEVICE GPS DETECTION WITH REVERSE GEOCODING (ZERO CHENNAI FALLBACK)
  const handleDetectCurrentLocation = async (isManualClick: boolean = false) => {
    setGpsStatus('locating');
    setGpsError(null);

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          try {
            const livePoint = await reverseGeocodeCoordinates(lat, lng);
            setCurrentGPS(livePoint);
            setPickup(livePoint);
            setGpsStatus('granted');
            if (searchModalMode === 'pickup') {
              setSearchModalMode(null);
            }
          } catch (err) {
            const district = getDistrictFromCoordinates(lat, lng);
            const livePoint: LocationPoint = {
              id: `gps_${Date.now()}`,
              name: 'Current Location',
              tamilName: 'தற்போதைய இடம்',
              address: `${district.name} District, Tamil Nadu`,
              lat,
              lng,
              district: district.name,
              category: 'custom',
            };
            setCurrentGPS(livePoint);
            setPickup(livePoint);
            setGpsStatus('granted');
          }
        },
        (err) => {
          // GPS Permission Denied or Unavailable
          // CRITICAL: NEVER silently fall back to Chennai coordinates!
          setGpsStatus('denied');
          if (isManualClick) {
            setGpsError(
              err.code === 1
                ? 'GPS location permission denied. Please search or pick your location on the map.'
                : 'Unable to retrieve GPS signal. Please search your pickup location manually.'
            );
            // Open manual location search so user can type their location
            setSearchQuery('');
            setSearchModalMode('pickup');
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    } else {
      setGpsStatus('denied');
      if (isManualClick) {
        setGpsError('Geolocation is not supported by your browser.');
        setSearchModalMode('pickup');
      }
    }
  };

  // Run initial location detection on mount
  useEffect(() => {
    handleDetectCurrentLocation(false);
  }, []);

  // Searching across Tamil Nadu / Google Places with debounce
  useEffect(() => {
    if (!searchModalMode) return;
    let cancelled = false;

    if (!searchQuery.trim()) {
      // Show popular Tamil Nadu district hubs
      setSearchResults(POPULAR_LOCATIONS);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchPlacesAcrossTamilNadu(searchQuery);
        if (!cancelled) {
          setSearchResults(results);
          setIsSearching(false);
        }
      } catch (e) {
        if (!cancelled) {
          setSearchResults(searchTamilNaduLocations(searchQuery).slice(0, 10));
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, searchModalMode]);

  // Handle selection of a search result (fetching geometry if from Google Places)
  const handleSelectSearchResult = async (loc: LocationPoint) => {
    let resolvedPoint = loc;
    if (loc.placeId) {
      resolvedPoint = await fetchPlaceDetailsGeometry(loc);
    }

    if (searchModalMode === 'pickup') {
      setPickup(resolvedPoint);
      setSearchModalMode(null);
      // If destination also chosen, transition to route preview
      if (destination) {
        setBookingStage('ROUTE_PREVIEW');
      }
    } else {
      setDestination(resolvedPoint);
      setSearchModalMode(null);
      // If pickup also chosen, transition to route preview
      if (pickup) {
        setBookingStage('ROUTE_PREVIEW');
      }
    }
  };

  // Map location selection (from clicking or dragging pin on map)
  const handleMapLocationSelect = (point: LocationPoint, type: 'pickup' | 'destination') => {
    if (type === 'pickup') {
      setPickup(point);
    } else {
      setDestination(point);
    }
    setMapSelectionMode(null);
    if ((type === 'pickup' && destination) || (type === 'destination' && pickup)) {
      setBookingStage('ROUTE_PREVIEW');
    }
  };

  // Callback from InteractiveMap GoogleMapRouteHandler when road route is computed
  const handleRouteComputed = (distanceMeters: number, durationSeconds: number) => {
    const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
    const durationMin = Math.max(1, Math.round(durationSeconds / 60));
    setRoadRouteData({ distanceKm, durationMin });
  };

  // Switch Service (RUBI CAB vs RUBI CAB PINK)
  const handleToggleService = (service: ServiceType) => {
    platformStore.setSelectedService(service);
    if (service === 'rubi_pink') {
      setCouponCode('PINKSAFE');
      setAppliedCoupon('PINKSAFE');
    } else {
      setCouponCode('RUBI50');
      setAppliedCoupon('RUBI50');
    }
  };

  // Calculate Distance & Duration
  // Prefer exact road route data from Google Maps Routes API if available; otherwise calculate Haversine with 1.25 road curvature
  const calculatedDistanceKm =
    roadRouteData?.distanceKm ??
    (pickup && destination
      ? Math.max(1.2, Math.round(calculateHaversineDistance(pickup.lat, pickup.lng, destination.lat, destination.lng) * 1.25 * 10) / 10)
      : 8.5);

  const calculatedDurationMin =
    roadRouteData?.durationMin ??
    Math.max(4, Math.round(calculatedDistanceKm * 2.2));

  // Determine current pickup district and check available captains
  const pickupDistrict = pickup ? getDistrictFromCoordinates(pickup.lat, pickup.lng) : null;
  const isDistrictServiceActive = pickupDistrict ? pickupDistrict.isActive : true;

  const nearbyCaptains = pickup
    ? platformStore.findEligibleCaptains(pickupDistrict?.name, selectedService, selectedVehicle)
    : [];

  // Filter available vehicle configs for selected service
  const activeVehicleConfigs = VEHICLE_CONFIGS.filter((v) =>
    isPink ? v.activeForRubiPink : v.activeForRubiCab
  );

  // Captain search timeout logic
  useEffect(() => {
    if (activeBooking?.status !== 'searching') {
      setSearchSecondsElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setSearchSecondsElapsed((prev) => {
        const next = prev + 1;
        if (next >= SEARCH_TIMEOUT_SECONDS) {
          platformStore.handleSearchTimeout();
          return SEARCH_TIMEOUT_SECONDS;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeBooking?.status, activeBooking?.id]);

  // STEP 6: Execute Ride Confirmation (Guard against double-clicks and verify active district)
  const handleConfirmRideBooking = () => {
    if (!pickup || !destination) return;
    if (isCreatingBooking) return;

    if (!isDistrictServiceActive) {
      alert(`RUBI CAB is expanding to ${pickupDistrict?.name || 'this area'} soon. Currently not active.`);
      return;
    }

    setIsCreatingBooking(true);
    try {
      platformStore.createBooking(
        pickup,
        destination,
        selectedVehicle,
        appliedCoupon,
        selectedService
      );
      setBookingStage('SEARCHING_CAPTAIN');
    } finally {
      setTimeout(() => setIsCreatingBooking(false), 1000);
    }
  };

  // Open Cancellation Modal
  const handleOpenCancelModal = () => {
    setShowCancelModal(true);
  };

  // Execute Cancellation Transaction
  const handleConfirmCancellation = (reason: string, explanation?: string) => {
    const result = platformStore.cancelBooking(reason, 'customer', explanation);
    setShowCancelModal(false);
    if (result.success) {
      setCancellationToast('Ride cancelled successfully');
      setBookingStage('LOCATION_SELECTION');
      setTimeout(() => setCancellationToast(null), 4000);
    } else {
      setCancellationError(result.error || 'Failed to cancel booking');
      setTimeout(() => setCancellationError(null), 4000);
    }
  };

  // Payment Success callback
  const handlePaymentSuccess = (mode: PaymentMode, txnId: string) => {
    platformStore.completePayment(mode, txnId);
    setShowPaymentModal(false);
    setShowInvoiceModal(true);
  };

  // Submit Rating
  const handleSubmitRating = (e: React.FormEvent) => {
    e.preventDefault();
    platformStore.submitRating(ratingStars, ratingReview, 'customer');
    setRatingSubmitted(true);
  };

  return (
    <div className="relative w-full h-[calc(100vh-68px)] min-h-[580px] bg-slate-100 overflow-hidden font-sans">
      {/* Toast Notification Banner */}
      {cancellationToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{cancellationToast}</span>
        </div>
      )}
      {cancellationError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-red-700 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-red-300" />
          <span>{cancellationError}</span>
        </div>
      )}

      {/* 1. MAIN VISUAL ELEMENT: FULL-SCREEN INTERACTIVE MAP */}
      <div className="absolute inset-0 w-full h-full z-0">
        <InteractiveMap
          pickup={pickup}
          destination={destination}
          activeBooking={activeBooking}
          selectionMode={mapSelectionMode}
          onLocationSelect={handleMapLocationSelect}
          onRouteComputed={handleRouteComputed}
          currentLocation={currentGPS}
          onRecenter={() => handleDetectCurrentLocation(true)}
          lang={lang}
          className="w-full h-full rounded-none border-none"
        />
      </div>

      {/* 2. TOP FLOATING CONTROLS: RUBI CAB / PINK TOGGLE & EMERGENCY SOS */}
      <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-20 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto space-y-2">
          {/* Service Switcher Bar */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-2.5 sm:p-3 flex items-center justify-between gap-2">
            {/* Minimalist Service Switcher: RUBI CAB vs RUBI PINK */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold border border-slate-200">
              <button
                type="button"
                onClick={() => handleToggleService('rubi_cab')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  !isPink
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                RUBI CAB
              </button>
              <button
                type="button"
                onClick={() => handleToggleService('rubi_pink')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  isPink
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'text-pink-700 hover:text-pink-900'
                }`}
              >
                <Heart className="w-3 h-3 fill-current" />
                <span>RUBI PINK</span>
              </button>
            </div>

            {/* Emergency SOS & Saved Places Shortcuts */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowSavedPlacesModal(true)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 text-xs flex items-center justify-center transition-all"
                title="Saved Places"
              >
                <MapPin className="w-4 h-4 text-slate-700" />
              </button>
              <button
                onClick={() => setShowSOSModal(true)}
                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 text-xs font-bold flex items-center gap-1 transition-all"
                title="Emergency SOS"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                <span className="hidden sm:inline">SOS</span>
              </button>
            </div>
          </div>

          {/* STEP 1 & 2: Top Location Search Fields (Visible during LOCATION_SELECTION or ROUTE_PREVIEW) */}
          {!activeBooking && bookingStage !== 'SEARCHING_CAPTAIN' && (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-3 space-y-2">
              <div className="relative space-y-1.5">
                {/* Connecting line between pickup dot and destination square */}
                <div className="absolute left-[15px] top-6 bottom-6 w-0.5 bg-slate-300 z-0" />

                {/* Pickup Location Field */}
                <div
                  onClick={() => {
                    setSearchQuery('');
                    setSearchModalMode('pickup');
                  }}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all relative z-10 ${
                    !pickup
                      ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                      : 'bg-slate-50 hover:bg-slate-100/90 border-slate-200'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm shrink-0 flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-0.5">
                      {getTranslation(lang, 'pickupLocation')}
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {pickup
                        ? lang === 'ta' && pickup.tamilName
                          ? pickup.tamilName
                          : pickup.name
                        : 'Tap to set pickup location'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDetectCurrentLocation(true);
                    }}
                    className="p-1 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-white"
                    title="Detect Current GPS Location"
                  >
                    <Navigation className="w-3.5 h-3.5 text-sky-600" />
                  </button>
                </div>

                {/* Destination Location Field */}
                <div
                  onClick={() => {
                    setSearchQuery('');
                    setSearchModalMode('destination');
                  }}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all relative z-10 ${
                    pickup && !destination
                      ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                      : 'bg-slate-50 hover:bg-slate-100/90 border-slate-200'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-sm bg-slate-900 border-2 border-white shadow-sm shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-0.5">
                      {getTranslation(lang, 'dropLocation')}
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {destination
                        ? lang === 'ta' && destination.tamilName
                          ? destination.tamilName
                          : destination.name
                        : 'Where to? (Search destination)'}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              </div>

              {/* GPS Alert when permission denied */}
              {gpsStatus === 'denied' && !pickup && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-[11px] truncate">GPS permission off. Select pickup manually.</span>
                  </div>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchModalMode('pickup');
                    }}
                    className="text-[10px] font-bold text-amber-900 underline shrink-0 ml-1"
                  >
                    Search
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. DYNAMIC BOTTOM SHEET ACCORDING TO ROUTE-FIRST STAGES */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
        <div className="max-w-xl mx-auto pointer-events-auto">
          {/* Active Booking Flow Card */}
          {activeBooking ? (
            /* --- ACTIVE RIDE CARD WITH UNIQUE TWO-STAGE OTP --- */
            <div className="bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-4 sm:p-5 space-y-3.5">
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto -mt-1 mb-1" />

              {/* Trip Status & Reference */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      activeBooking.status === 'in_progress'
                        ? 'bg-sky-500 animate-ping'
                        : activeBooking.status === 'completed'
                        ? 'bg-emerald-500'
                        : 'bg-amber-500 animate-pulse'
                    }`}
                  />
                  <span className="font-black text-sm text-slate-900">
                    {activeBooking.status === 'searching' && getTranslation(lang, 'statusSearching')}
                    {activeBooking.status === 'accepted' && getTranslation(lang, 'statusAccepted')}
                    {activeBooking.status === 'captain_arriving' && 'Captain Arriving'}
                    {activeBooking.status === 'arrived' && getTranslation(lang, 'statusArrived')}
                    {activeBooking.status === 'in_progress' && getTranslation(lang, 'statusInProgress')}
                    {activeBooking.status === 'destination_reached' &&
                      getTranslation(lang, 'statusDestinationReached')}
                    {activeBooking.status === 'completed' && getTranslation(lang, 'statusCompleted')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      activeBooking.serviceType === 'rubi_pink'
                        ? 'bg-pink-100 text-pink-700'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {activeBooking.serviceType === 'rubi_pink' ? 'RUBI PINK' : 'RUBI CAB'}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    {activeBooking.bookingRef}
                  </span>
                </div>
              </div>

              {/* STEP 7: CAPTAIN SEARCHING SCREEN WITH RADAR ANIMATION */}
              {activeBooking.status === 'searching' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                  {/* Radar Sonar Animation */}
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-slate-900/10 animate-ping" />
                    <div className="absolute w-14 h-14 rounded-full bg-slate-900/15 animate-pulse" />
                    <div className="relative w-12 h-12 rounded-2xl bg-white shadow-lg border border-slate-200 flex items-center justify-center z-10">
                      <VehicleIllustration
                        type={activeBooking.vehicleType}
                        serviceType={activeBooking.serviceType}
                        size="md"
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Connecting with Nearby Captains...
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Dispatching to {activeBooking.vehicleType.toUpperCase()} captains in {activeBooking.pickup.district || pickupDistrict?.name || 'Tamil Nadu'}
                    </p>
                    <div className="text-[11px] font-mono font-bold text-amber-600 mt-1">
                      Searching: {SEARCH_TIMEOUT_SECONDS - searchSecondsElapsed}s remaining
                    </div>
                  </div>

                  {/* Trip Summary Mini Card */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-left space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 truncate">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate font-semibold">{activeBooking.pickup.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700 truncate">
                      <div className="w-2 h-2 rounded-sm bg-slate-900 shrink-0" />
                      <span className="truncate font-semibold">{activeBooking.destination.name}</span>
                    </div>
                    <div className="pt-1 flex items-center justify-between border-t border-slate-100 text-[11px]">
                      <span className="text-slate-500">
                        {activeBooking.estimatedDistanceKm} km • {activeBooking.estimatedDurationMin} mins
                      </span>
                      <span className="font-bold text-slate-900">₹{activeBooking.estimatedFare}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleOpenCancelModal}
                    className="w-full py-2.5 bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-300 hover:border-red-200 rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    Cancel Ride
                  </button>
                </div>
              )}

              {/* SEARCH TIMEOUT SCREEN WITH RETRY & CANCEL OPTIONS */}
              {activeBooking.status === 'searching_timeout' && (
                <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      No Captains Available Right Now
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      We searched for {SEARCH_TIMEOUT_SECONDS}s across your pickup area, but all nearby captains are currently busy.
                    </p>
                  </div>

                  {/* Route Summary */}
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200 text-left text-xs text-slate-700">
                    <div className="flex items-center justify-between font-semibold">
                      <span>
                        {activeBooking.pickup.name.split(',')[0]} → {activeBooking.destination.name.split(',')[0]}
                      </span>
                      <span className="font-mono text-slate-900 font-bold">₹{activeBooking.estimatedFare}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => platformStore.retrySearchingCaptain()}
                      className="flex-1 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl shadow-md transition-all"
                    >
                      Retry Search
                    </button>
                    <button
                      onClick={handleOpenCancelModal}
                      className="flex-1 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all"
                    >
                      Cancel Ride
                    </button>
                  </div>
                </div>
              )}

              {/* CRITICAL TWO-STAGE OTP DISPLAY */}
              {/* Stage 1: Opening OTP */}
              {(activeBooking.status === 'accepted' || activeBooking.status === 'captain_arriving' || activeBooking.status === 'arrived') && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-center shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900 mb-0.5 flex items-center justify-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>{getTranslation(lang, 'openingOtpTitle')}</span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-slate-900 my-1 py-1 bg-white rounded-xl border border-amber-200 inline-block px-6 shadow-sm">
                    {activeBooking.openingOtp}
                  </div>
                  <p className="text-xs text-amber-800 font-medium">
                    {getTranslation(lang, 'openingOtpSubtitle')}
                  </p>
                </div>
              )}

              {/* Stage 2: Closing OTP */}
              {activeBooking.status === 'destination_reached' && (
                <div className="p-3.5 rounded-2xl bg-purple-50 border-2 border-purple-300 text-center shadow-sm animate-pulse">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-purple-900 mb-0.5 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-700" />
                    <span>{getTranslation(lang, 'closingOtpTitle')}</span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-slate-900 my-1 py-1 bg-white rounded-xl border border-purple-200 inline-block px-6 shadow-sm">
                    {activeBooking.closingOtp}
                  </div>
                  <p className="text-xs text-purple-800 font-medium">
                    {getTranslation(lang, 'closingOtpSubtitle')}
                  </p>
                </div>
              )}

              {/* Captain Details & Exotel Masked Call */}
              {activeBooking.captain && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                  <img
                    src={activeBooking.captain.photoUrl}
                    alt={activeBooking.captain.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {activeBooking.captain.name}
                      </span>
                      <span className="text-xs text-amber-600 font-bold flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        {activeBooking.captain.rating}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium truncate">
                      {activeBooking.captain.vehicleModel}
                    </div>
                    <div className="text-[10px] font-mono text-slate-900 font-bold flex items-center gap-2">
                      <span>{activeBooking.captain.vehicleRegNumber}</span>
                      {activeBooking.captain.isPinkEligible && (
                        <span className="text-[9px] px-1.5 rounded bg-pink-100 text-pink-700 font-bold">
                          PINK Certified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Masked Virtual Call Button */}
                  <button
                    onClick={() => platformStore.initiateVirtualCall(activeBooking.id, 'rider')}
                    className="p-2.5 rounded-xl bg-white hover:bg-slate-100 text-sky-600 border border-slate-200 shadow-sm transition-all flex flex-col items-center justify-center shrink-0"
                    title="Exotel Masked Virtual Call"
                  >
                    <Phone className="w-4 h-4 text-sky-600" />
                    <span className="text-[9px] font-bold text-slate-500 mt-0.5">Call</span>
                  </button>
                </div>
              )}

              {/* Live Trip Progress Bar */}
              {activeBooking.status === 'in_progress' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Trip in progress to destination</span>
                    <span className="text-slate-900 font-bold font-mono">
                      {Math.round(progressPercent)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-900 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Trip Completion & Payment Settlement */}
              {activeBooking.status === 'completed' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-600 font-semibold">Total Fare</span>
                    <span className="text-lg font-black text-slate-900 font-mono">
                      ₹{activeBooking.finalFare}
                    </span>
                  </div>

                  {activeBooking.paymentStatus === 'completed' ? (
                    <div className="space-y-2">
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Payment Settled ({activeBooking.paymentMethod?.toUpperCase()})</span>
                        </span>
                        <button
                          onClick={() => setShowInvoiceModal(true)}
                          className="text-[11px] underline font-bold"
                        >
                          Invoice
                        </button>
                      </div>

                      {/* Rating Form */}
                      {!ratingSubmitted ? (
                        <form onSubmit={handleSubmitRating} className="space-y-2 pt-1">
                          <div className="text-xs font-bold text-slate-800">
                            Rate your ride with {activeBooking.captain?.name}
                          </div>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setRatingStars(star)}
                                className="p-1"
                              >
                                <Star
                                  className={`w-5 h-5 ${
                                    star <= ratingStars
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-300'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            placeholder="Feedback (e.g. Smooth driving, very polite)"
                            value={ratingReview}
                            onChange={(e) => setRatingReview(e.target.value)}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="w-full py-2 bg-slate-900 text-white font-bold rounded-xl text-xs"
                          >
                            Submit Rating
                          </button>
                        </form>
                      ) : (
                        <div className="text-xs text-emerald-600 text-center font-semibold">
                          Thank you for your rating!
                        </div>
                      )}

                      <button
                        onClick={() => {
                          platformStore.resetActiveBooking();
                          setBookingStage('LOCATION_SELECTION');
                        }}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all"
                      >
                        Book Another Ride
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20"
                    >
                      Proceed to Pay ₹{activeBooking.finalFare}
                    </button>
                  )}
                </div>
              )}

              {/* Cancel ride button for accepted or arrived states */}
              {(activeBooking.status === 'accepted' ||
                activeBooking.status === 'captain_arriving' ||
                activeBooking.status === 'arrived') && (
                <button
                  onClick={handleOpenCancelModal}
                  className="w-full py-2.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 rounded-xl text-xs font-semibold transition-all mt-2"
                >
                  Cancel Ride
                </button>
              )}
            </div>
          ) : (
            /* --- PRE-BOOKING FLOW: ROUTE-FIRST STAGES (STEP 3 to 6) --- */
            <div>
              {/* STEP 1: INITIAL STATE WHEN PICKUP OR DESTINATION MISSING */}
              {(!pickup || !destination) && (
                <div className="bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-4 sm:p-5 space-y-3">
                  <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto -mt-1 mb-2" />
                  <div className="text-center py-2">
                    <h3 className="text-base font-black text-slate-900">
                      {!pickup ? 'Where are you starting from?' : 'Where do you want to go?'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      {!pickup
                        ? 'Set your pickup location across Tamil Nadu or use GPS current location.'
                        : 'Choose your destination to preview the exact road route and travel duration.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchModalMode(!pickup ? 'pickup' : 'destination');
                      }}
                      className="p-3 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all"
                    >
                      <Search className="w-4 h-4" />
                      <span>{!pickup ? 'Search Pickup' : 'Search Drop'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDetectCurrentLocation(true)}
                      className="p-3 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-2xl text-xs font-bold border border-sky-200 flex items-center justify-center gap-2 transition-all"
                    >
                      <Navigation className="w-4 h-4 text-sky-600" />
                      <span>Use My GPS</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 & 4: ROUTE PREVIEW & "CONFIRM YOUR LOCATIONS" CARD */}
              {pickup && destination && (bookingStage === 'ROUTE_PREVIEW' || bookingStage === 'LOCATION_SELECTION') && (
                <div className="bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-4 sm:p-5 space-y-4">
                  <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto -mt-1 mb-1" />

                  {/* Header Title */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                      <h3 className="text-xs font-black tracking-wider uppercase text-slate-900">
                        CONFIRM YOUR LOCATIONS
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Step 1 of 2
                    </span>
                  </div>

                  {/* Road Route Metrics Badge */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <span className="text-base font-black font-mono">{calculatedDistanceKm} km</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-700">~{calculatedDurationMin} mins journey</span>
                    </div>
                    {pickupDistrict && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                        {pickupDistrict.name} District
                      </span>
                    )}
                  </div>

                  {/* Pickup Row with Edit Button */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Pickup Location</div>
                        <div className="text-xs font-bold text-slate-900 truncate">{pickup.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{pickup.address}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchModalMode('pickup');
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition-all"
                    >
                      <Edit2 className="w-3 h-3 text-slate-600" />
                      <span>EDIT</span>
                    </button>
                  </div>

                  {/* Destination Row with Edit Button */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-4 h-4 rounded-sm bg-slate-900 border-2 border-white shadow-xs shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Destination Location</div>
                        <div className="text-xs font-bold text-slate-900 truncate">{destination.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{destination.address}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchModalMode('destination');
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition-all"
                    >
                      <Edit2 className="w-3 h-3 text-slate-600" />
                      <span>EDIT</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 text-center italic">
                    Tip: Drag the green or black pin on the map to fine-tune exact gate or pickup spot.
                  </p>

                  {/* STEP 4: "CONFIRM LOCATIONS" BUTTON (Advances to Vehicle Selection) */}
                  <button
                    onClick={() => setBookingStage('VEHICLE_SELECTION')}
                    className="w-full py-3.5 bg-slate-900 hover:bg-black text-white font-black rounded-2xl text-xs sm:text-sm tracking-wider uppercase shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                  >
                    <span>CONFIRM LOCATIONS</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              )}

              {/* STEP 5: VEHICLE SELECTION ("Choose Your Ride") */}
              {pickup && destination && bookingStage === 'VEHICLE_SELECTION' && (
                <div
                  className={`bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-4 sm:p-5 space-y-3.5 transition-all ${
                    isPink ? 'border-pink-200' : 'border-slate-200'
                  }`}
                >
                  <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto -mt-1 mb-1" />

                  {/* Top Bar with Back Button to Edit Locations */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setBookingStage('ROUTE_PREVIEW')}
                      className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 p-1 rounded-lg"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back to Locations</span>
                    </button>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900 font-mono">
                        {calculatedDistanceKm} km • ~{calculatedDurationMin} mins
                      </span>
                    </div>
                  </div>

                  {/* Title & Service Availability Check */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900">Choose Your Ride</h3>
                    {isPink && (
                      <span className="text-[10px] px-2 py-0.5 bg-pink-50 text-pink-700 font-bold rounded-md border border-pink-200">
                        Women Safety Fleet
                      </span>
                    )}
                  </div>

                  {/* District Captain Availability Notice */}
                  {pickupDistrict && nearbyCaptains.length === 0 && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-[11px]">
                        Captains in {pickupDistrict.name} will be dispatched statewide.
                      </span>
                    </div>
                  )}

                  {/* VEHICLE CARDS: Bike, Auto, Mini, Sedan, Seven Seater */}
                  <div className="space-y-2 max-h-56 sm:max-h-64 overflow-y-auto pr-1">
                    {activeVehicleConfigs.map((veh) => {
                      const isSelected = selectedVehicle === veh.id;
                      const fareEstimate = estimateFare(
                        veh.id,
                        calculatedDistanceKm,
                        calculatedDurationMin,
                        fareSettings,
                        { serviceType: selectedService }
                      );

                      return (
                        <div
                          key={veh.id}
                          onClick={() => setSelectedVehicle(veh.id)}
                          className={`p-2.5 sm:p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                            isSelected
                              ? isPink
                                ? 'bg-pink-50/80 border-pink-500 shadow-md ring-1 ring-pink-500'
                                : 'bg-slate-50 border-slate-900 shadow-md ring-1 ring-slate-900'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {/* Vehicle Image & Category Badge */}
                          <div className="relative w-16 h-12 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
                            <img
                              src={veh.imageUrl}
                              alt={veh.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-white/95 rounded-tl-lg p-0.5 border-t border-l border-slate-200 shadow-xs">
                              <VehicleIllustration
                                type={veh.id}
                                serviceType={selectedService}
                                size="sm"
                              />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-xs sm:text-sm text-slate-900">
                                  {lang === 'ta' ? veh.tamilName : veh.name}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-medium">
                                  {veh.capacity} seats
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-black text-slate-900 font-mono">
                                  ₹{fareEstimate.estimatedFare}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                              <span className="text-emerald-600 font-semibold">
                                {veh.etaMinutes} min away
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Base ₹{fareEstimate.breakdown.baseFare} • ₹{fareEstimate.breakdown.distanceCharge} dist
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Promo Code Toggle */}
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <button
                      type="button"
                      onClick={() => setShowPromoInput(!showPromoInput)}
                      className="flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold"
                    >
                      <Tag className="w-3.5 h-3.5 text-amber-500" />
                      <span>Promo: {appliedCoupon}</span>
                    </button>
                    <span className="text-[11px] text-emerald-600 font-bold">5% GST & Tolls included</span>
                  </div>

                  {showPromoInput && (
                    <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <input
                        type="text"
                        placeholder="Coupon (e.g. RUBI50)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="bg-transparent text-slate-900 font-mono uppercase focus:outline-none w-full text-xs px-2"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon(couponCode);
                          setShowPromoInput(false);
                        }}
                        className="px-3 py-1 bg-slate-900 text-white font-bold rounded-lg text-[10px]"
                      >
                        Apply
                      </button>
                    </div>
                  )}

                  {/* Advance to Ride Confirmation Review Step */}
                  <button
                    onClick={() => setBookingStage('RIDE_CONFIRMATION')}
                    className={`w-full py-3.5 font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 text-sm tracking-wide transition-all active:scale-[0.99] ${
                      isPink
                        ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-pink-500/25'
                        : 'bg-slate-900 hover:bg-black text-white shadow-slate-900/20'
                    }`}
                  >
                    <span>Review & Confirm Ride</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              )}

              {/* STEP 6: CONFIRM RIDE SUMMARY CARD */}
              {pickup && destination && bookingStage === 'RIDE_CONFIRMATION' && (
                <div className="bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-4 sm:p-5 space-y-4">
                  <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto -mt-1 mb-1" />

                  {/* Back to Vehicle Selection */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setBookingStage('VEHICLE_SELECTION')}
                      className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 p-1 rounded-lg"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back to Vehicles</span>
                    </button>
                    <span className="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Final Review
                    </span>
                  </div>

                  {/* Summary Card */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    {/* Selected Vehicle Row */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                          <VehicleIllustration
                            type={selectedVehicle}
                            serviceType={selectedService}
                            size="sm"
                          />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase text-slate-400">Selected Vehicle</div>
                          <div className="text-sm font-black text-slate-900 capitalize">
                            {selectedVehicle.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Estimated Fare</div>
                        <div className="text-lg font-black font-mono text-slate-900">
                          ₹{estimateFare(
                            selectedVehicle,
                            calculatedDistanceKm,
                            calculatedDurationMin,
                            fareSettings,
                            { serviceType: selectedService }
                          ).estimatedFare}
                        </div>
                      </div>
                    </div>

                    {/* Route Details */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-500 text-[10px] uppercase block">Pickup</span>
                          <span className="font-bold text-slate-900 block truncate">{pickup.name}</span>
                          <span className="text-[11px] text-slate-500 block truncate">{pickup.address}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm bg-slate-900 mt-1 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-500 text-[10px] uppercase block">Destination</span>
                          <span className="font-bold text-slate-900 block truncate">{destination.name}</span>
                          <span className="text-[11px] text-slate-500 block truncate">{destination.address}</span>
                        </div>
                      </div>
                    </div>

                    {/* Metrics Row */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Distance: {calculatedDistanceKm} km</span>
                      <span>Duration: ~{calculatedDurationMin} mins</span>
                      <span>Promo: {appliedCoupon}</span>
                    </div>
                  </div>

                  {/* Service Availability Warning if Pickup District is inactive */}
                  {!isDistrictServiceActive && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>
                        Service is not yet activated in {pickupDistrict?.name}. Please choose an active district.
                      </span>
                    </div>
                  )}

                  {/* PROMINENT "CONFIRM RIDE" BUTTON (Dispatches booking & starts captain searching) */}
                  <button
                    onClick={handleConfirmRideBooking}
                    disabled={isCreatingBooking || !isDistrictServiceActive}
                    className={`w-full py-4 font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base tracking-wider uppercase transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${
                      isPink
                        ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-pink-500/25'
                        : 'bg-slate-900 hover:bg-black text-white shadow-slate-900/25'
                    }`}
                  >
                    {isCreatingBooking ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Dispatching Ride...</span>
                      </>
                    ) : (
                      <>
                        <span>CONFIRM RIDE</span>
                        <ArrowRight className="w-5 h-5 stroke-[3]" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. DEDICATED LOCATION SEARCH MODAL (UBER / RAPIDO STYLE) */}
      {searchModalMode && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in fade-in duration-200">
          {/* Search Header */}
          <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-white">
            <button
              onClick={() => setSearchModalMode(null)}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600"
              aria-label="Back"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h2 className="text-sm font-black text-slate-900">
                {searchModalMode === 'pickup'
                  ? 'Set Pickup Location'
                  : 'Set Destination'}
              </h2>
              <p className="text-[11px] text-slate-500">
                Search across all 38 Tamil Nadu districts & Google Places
              </p>
            </div>
          </div>

          {/* Search Input Field */}
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2.5 p-3 bg-white rounded-2xl border border-slate-300 focus-within:border-slate-900 shadow-sm">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchModalMode === 'pickup'
                    ? 'Search pickup address, area, railway station...'
                    : 'Search destination, hospital, college, mall...'
                }
                className="w-full bg-transparent text-sm text-slate-900 font-medium focus:outline-none placeholder:text-slate-400"
              />
              {isSearching && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              {searchQuery && !isSearching && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Action Buttons: Use GPS & Choose on Map */}
            <div className="flex items-center gap-2 mt-3 overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  handleDetectCurrentLocation(true);
                  setSearchModalMode(null);
                }}
                className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl border border-sky-200 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all"
              >
                <Navigation className="w-3.5 h-3.5 text-sky-600" />
                <span>Use Current Location</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMapSelectionMode(searchModalMode);
                  setSearchModalMode(null);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all"
              >
                <MapPin className="w-3.5 h-3.5 text-slate-600" />
                <span>Choose on Map</span>
              </button>
            </div>
          </div>

          {/* Search Content & Autocomplete List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Frequent Places Shortcuts */}
            {!searchQuery && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Saved & Frequent Places
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {customer.frequentPlaces?.map((fp) => (
                    <div
                      key={fp.id}
                      onClick={() => handleSelectSearchResult(fp.location)}
                      className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 cursor-pointer flex items-center gap-2.5 transition-all"
                    >
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                        {fp.icon === 'home' && <MapPin className="w-4 h-4 text-emerald-600" />}
                        {fp.icon === 'briefcase' && <Briefcase className="w-4 h-4 text-sky-600" />}
                        {fp.icon === 'building' && <Building className="w-4 h-4 text-amber-600" />}
                        {fp.icon === 'map-pin' && <MapPin className="w-4 h-4 text-slate-600" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {fp.label}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {fp.location.address}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Autocomplete List Results */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                {searchQuery ? 'Matching Locations in Tamil Nadu' : 'Popular Tamil Nadu Hubs'}
              </div>
              <div className="divide-y divide-slate-100">
                {searchResults.map((loc) => (
                  <div
                    key={loc.id}
                    onClick={() => handleSelectSearchResult(loc)}
                    className="py-3 px-2 hover:bg-slate-50 rounded-xl cursor-pointer flex items-start gap-3 transition-all"
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {lang === 'ta' && loc.tamilName ? loc.tamilName : loc.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {loc.address}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODALS */}
      {showPaymentModal && activeBooking && (
        <PaymentModal
          booking={activeBooking}
          onPaymentSuccess={handlePaymentSuccess}
          onClose={() => setShowPaymentModal(false)}
          lang={lang}
        />
      )}

      {showInvoiceModal && activeBooking && (
        <InvoiceModal
          booking={activeBooking}
          onClose={() => setShowInvoiceModal(false)}
          lang={lang}
        />
      )}

      {showSOSModal && (
        <SOSModal
          booking={activeBooking}
          onClose={() => setShowSOSModal(false)}
          lang={lang}
        />
      )}

      {/* SAVED PLACES MODAL */}
      {showSavedPlacesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900">Saved Places</h3>
              <button
                onClick={() => setShowSavedPlacesModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Select any saved destination for 1-tap booking.
            </p>
            <div className="space-y-2">
              {customer.frequentPlaces?.map((fp) => (
                <div
                  key={fp.id}
                  onClick={() => {
                    handleSelectSearchResult(fp.location);
                    setShowSavedPlacesModal(false);
                  }}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 cursor-pointer flex items-center gap-3 transition-all"
                >
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900">{fp.label}</div>
                    <div className="text-[11px] text-slate-500 truncate">{fp.location.address}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION MODAL */}
      <CancellationModal
        isOpen={showCancelModal}
        booking={activeBooking}
        cancellationFee={fareSettings.cancellationFee}
        onClose={() => setShowCancelModal(false)}
        onConfirmCancel={handleConfirmCancellation}
      />
    </div>
  );
};
