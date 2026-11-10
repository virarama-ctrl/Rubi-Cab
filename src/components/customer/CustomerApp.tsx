import React, { useState, useEffect, useRef } from 'react';
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
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Tag,
  Check,
  Edit2,
  Car,
  ChevronLeft,
  Loader2,
  Radio,
  SlidersHorizontal,
  ArrowUpDown,
  LocateFixed,
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

// 3-state expandable bottom sheet for mobile (Rapido style)
export type FarePanelExpansionState = 'collapsed' | 'half' | 'expanded';

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

  // Expandable / Collapsible Fare Panel State for Mobile (Rapido style)
  // 'collapsed': Selected vehicle + fare badge + drag handle (leaves maximum map space)
  // 'half': Choose Your Ride cards list with vehicle images, ETAs and fares
  // 'expanded': Full vehicle fleet + breakdown + promo + Confirm Ride button
  const [farePanelState, setFarePanelState] = useState<FarePanelExpansionState>('half');

  // Touch gesture tracking for swipe-up / swipe-down
  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);
  const isDraggingSheet = useRef<boolean>(false);

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
      } else if (
        bookingStage === 'SEARCHING_CAPTAIN' ||
        bookingStage === 'CAPTAIN_ASSIGNED' ||
        bookingStage === 'DRIVER_ARRIVING' ||
        bookingStage === 'TRIP_STARTED'
      ) {
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

  // Swap pickup and destination locations
  const handleSwapLocations = () => {
    if (!pickup && !destination) return;
    const temp = pickup;
    setPickup(destination);
    setDestination(temp);
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

  // Selected vehicle config and fare estimate
  const currentVehicleConfig =
    activeVehicleConfigs.find((v) => v.id === selectedVehicle) || activeVehicleConfigs[0];
  const selectedVehicleFareEstimate = estimateFare(
    selectedVehicle,
    calculatedDistanceKm,
    calculatedDurationMin,
    fareSettings,
    { serviceType: selectedService }
  );

  // Bottom Sheet Swipe Handlers (Swipe up to expand, swipe down to collapse)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
    isDraggingSheet.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingSheet.current) return;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (!isDraggingSheet.current) return;
    isDraggingSheet.current = false;
    const diff = touchCurrentY.current - touchStartY.current;

    // Threshold of 35px for swipe detection
    if (diff < -35) {
      // Swiped upward -> expand
      setFarePanelState((prev) => (prev === 'collapsed' ? 'half' : 'expanded'));
    } else if (diff > 35) {
      // Swiped downward -> collapse
      setFarePanelState((prev) => (prev === 'expanded' ? 'half' : 'collapsed'));
    }
  };

  // Toggle expansion state via chevron / handle click
  const handleToggleExpansion = () => {
    setFarePanelState((prev) => {
      if (prev === 'collapsed') return 'half';
      if (prev === 'half') return 'expanded';
      return 'collapsed';
    });
  };

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
    <div className="relative w-full h-[calc(100vh-68px)] md:h-[calc(100vh-68px)] min-h-[520px] bg-slate-100 overflow-hidden font-sans flex flex-col">
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

      {/* =========================================================================
          SECTION 1: TOP SECTION (COMPACT PICKUP & DESTINATION PANEL)
          Visible at the very top of mobile screens; also styled cleanly for desktop
          ========================================================================= */}
      <div className="relative z-30 w-full bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="max-w-xl mx-auto px-3 py-2 sm:p-3 space-y-1.5">
          {/* Top Bar: Service Toggle (RUBI CAB / RUBI PINK) + Shortcuts */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-xs font-bold border border-slate-200">
              <button
                type="button"
                onClick={() => handleToggleService('rubi_cab')}
                className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-black ${
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
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all text-[11px] font-black ${
                  isPink
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'text-pink-700 hover:text-pink-900'
                }`}
              >
                <Heart className="w-3 h-3 fill-current" />
                <span>RUBI PINK</span>
              </button>
            </div>

            {/* Quick Actions: Saved Places, SOS & Swap */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSavedPlacesModal(true)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs flex items-center justify-center transition-all"
                title="Saved Places"
              >
                <MapPin className="w-3.5 h-3.5 text-slate-700" />
              </button>
              <button
                onClick={handleSwapLocations}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs flex items-center justify-center transition-all"
                title="Swap Pickup and Destination"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-700" />
              </button>
              <button
                onClick={() => setShowSOSModal(true)}
                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                title="Emergency SOS"
              >
                <ShieldAlert className="w-3 h-3 text-red-600 animate-pulse" />
                <span className="text-[10px]">SOS</span>
              </button>
            </div>
          </div>

          {/* Location Fields: Pickup & Destination in clean two-row Rapido style */}
          <div className="relative space-y-1">
            {/* Connecting visual line between green pickup dot and black destination square */}
            <div className="absolute left-[13px] top-4 bottom-4 w-0.5 bg-slate-300 z-0 pointer-events-none" />

            {/* Pickup Location Field */}
            <div
              onClick={() => {
                setSearchQuery('');
                setSearchModalMode('pickup');
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 sm:py-2 rounded-xl border cursor-pointer transition-all relative z-10 ${
                !pickup
                  ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                  : 'bg-slate-50 hover:bg-slate-100/90 border-slate-200'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow-xs shrink-0 flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full" />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <div className="text-[9px] uppercase font-bold text-slate-400 leading-none">
                  FROM / {getTranslation(lang, 'pickupLocation')}
                </div>
                <div className="text-xs font-bold text-slate-900 truncate mt-0.5">
                  {pickup
                    ? lang === 'ta' && pickup.tamilName
                      ? pickup.tamilName
                      : pickup.name
                    : 'Set pickup location'}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDetectCurrentLocation(true);
                }}
                className="p-1 text-slate-400 hover:text-sky-600 rounded-md hover:bg-white shrink-0"
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
              className={`flex items-center gap-2 px-2.5 py-1.5 sm:py-2 rounded-xl border cursor-pointer transition-all relative z-10 ${
                pickup && !destination
                  ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                  : 'bg-slate-50 hover:bg-slate-100/90 border-slate-200'
              }`}
            >
              <div className="w-3 h-3 rounded-sm bg-slate-900 border border-white shadow-xs shrink-0" />
              <div className="flex-1 min-w-0 pr-1">
                <div className="text-[9px] uppercase font-bold text-slate-400 leading-none">
                  TO / {getTranslation(lang, 'dropLocation')}
                </div>
                <div className="text-xs font-bold text-slate-900 truncate mt-0.5">
                  {destination
                    ? lang === 'ta' && destination.tamilName
                      ? destination.tamilName
                      : destination.name
                    : 'Where to? (Search destination)'}
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>
          </div>

          {/* GPS Alert when permission denied */}
          {gpsStatus === 'denied' && !pickup && (
            <div className="p-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-800">
              <div className="flex items-center gap-1 min-w-0">
                <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="text-[10px] truncate">GPS permission off. Select pickup manually.</span>
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
      </div>

      {/* =========================================================================
          SECTION 2: MIDDLE SECTION (MAP IN THE MIDDLE)
          Occupies the largest available central area, completely free from overlapping panels
          ========================================================================= */}
      <div className="relative flex-1 w-full overflow-hidden z-0">
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

        {/* Floating Quick Recenter Button on Map */}
        <div className="absolute bottom-4 right-4 z-20">
          <button
            onClick={() => handleDetectCurrentLocation(true)}
            className="w-10 h-10 bg-white hover:bg-slate-50 text-slate-900 rounded-full shadow-lg border border-slate-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            title="Recenter GPS Location"
          >
            <LocateFixed className="w-5 h-5 text-slate-700" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: BOTTOM SECTION (EXPANDABLE & COLLAPSIBLE RAPIDO-STYLE FARE SHEET)
          Supports 3 states: 'collapsed' (max map space), 'half' (vehicle cards), 'expanded' (full details & confirm)
          Swipable upward / downward + Tap handle to toggle
          ========================================================================= */}
      <div className="relative z-30 w-full shrink-0">
        <div className="max-w-xl mx-auto">
          {/* Active Ride Card (When ride is searching, accepted, in progress, etc.) */}
          {activeBooking ? (
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

              {/* Radar searching screen */}
              {activeBooking.status === 'searching' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-slate-900/10 animate-ping" />
                    <div className="absolute w-12 h-12 rounded-full bg-slate-900/15 animate-pulse" />
                    <div className="relative w-10 h-10 rounded-2xl bg-white shadow-md border border-slate-200 flex items-center justify-center z-10">
                      <VehicleIllustration
                        type={activeBooking.vehicleType}
                        serviceType={activeBooking.serviceType}
                        size="sm"
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

                  <button
                    onClick={handleOpenCancelModal}
                    className="w-full py-2 bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    Cancel Ride
                  </button>
                </div>
              )}

              {/* Timeout Screen */}
              {activeBooking.status === 'searching_timeout' && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">No Captains Available Right Now</h3>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => platformStore.retrySearchingCaptain()}
                      className="flex-1 py-2 bg-slate-900 text-white text-xs font-black rounded-xl"
                    >
                      Retry Search
                    </button>
                    <button
                      onClick={handleOpenCancelModal}
                      className="flex-1 py-2 bg-white text-slate-700 text-xs font-bold rounded-xl border border-slate-300"
                    >
                      Cancel Ride
                    </button>
                  </div>
                </div>
              )}

              {/* OTP Handshake */}
              {(activeBooking.status === 'accepted' ||
                activeBooking.status === 'captain_arriving' ||
                activeBooking.status === 'arrived') && (
                <div className="p-3 rounded-2xl bg-amber-50 border-2 border-amber-300 text-center shadow-xs">
                  <div className="text-[10px] font-bold uppercase text-amber-900 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3 text-amber-700" />
                    <span>{getTranslation(lang, 'openingOtpTitle')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-slate-900 my-1 py-0.5 bg-white rounded-xl border border-amber-200 inline-block px-5 shadow-xs">
                    {activeBooking.openingOtp}
                  </div>
                  <p className="text-[11px] text-amber-800 font-medium">
                    {getTranslation(lang, 'openingOtpSubtitle')}
                  </p>
                </div>
              )}

              {activeBooking.status === 'destination_reached' && (
                <div className="p-3 rounded-2xl bg-purple-50 border-2 border-purple-300 text-center shadow-xs animate-pulse">
                  <div className="text-[10px] font-bold uppercase text-purple-900 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-purple-700" />
                    <span>{getTranslation(lang, 'closingOtpTitle')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-slate-900 my-1 py-0.5 bg-white rounded-xl border border-purple-200 inline-block px-5 shadow-xs">
                    {activeBooking.closingOtp}
                  </div>
                  <p className="text-[11px] text-purple-800 font-medium">
                    {getTranslation(lang, 'closingOtpSubtitle')}
                  </p>
                </div>
              )}

              {/* Captain Details */}
              {activeBooking.captain && (
                <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                  <img
                    src={activeBooking.captain.photoUrl}
                    alt={activeBooking.captain.name}
                    className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
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
                    <div className="text-[10px] font-mono text-slate-900 font-bold">
                      {activeBooking.captain.vehicleRegNumber}
                    </div>
                  </div>
                  <button
                    onClick={() => platformStore.initiateVirtualCall(activeBooking.id, 'rider')}
                    className="p-2 rounded-xl bg-white text-sky-600 border border-slate-200 shadow-xs flex flex-col items-center justify-center shrink-0"
                    title="Exotel Masked Virtual Call"
                  >
                    <Phone className="w-4 h-4 text-sky-600" />
                    <span className="text-[8px] font-bold text-slate-500">Call</span>
                  </button>
                </div>
              )}

              {/* Progress Bar */}
              {activeBooking.status === 'in_progress' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Trip in progress</span>
                    <span className="text-slate-900 font-bold font-mono">
                      {Math.round(progressPercent)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-900 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Trip Completion & Settlement */}
              {activeBooking.status === 'completed' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-600 font-semibold">Total Fare</span>
                    <span className="text-base font-black text-slate-900 font-mono">
                      ₹{activeBooking.finalFare}
                    </span>
                  </div>

                  {activeBooking.paymentStatus === 'completed' ? (
                    <button
                      onClick={() => {
                        platformStore.resetActiveBooking();
                        setBookingStage('LOCATION_SELECTION');
                      }}
                      className="w-full py-2.5 bg-slate-100 text-slate-800 font-bold rounded-xl text-xs"
                    >
                      Book Another Ride
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full py-3 bg-emerald-600 text-white font-black rounded-xl text-xs shadow-md"
                    >
                      Proceed to Pay ₹{activeBooking.finalFare}
                    </button>
                  )}
                </div>
              )}

              {/* Cancel Button */}
              {(activeBooking.status === 'accepted' ||
                activeBooking.status === 'captain_arriving' ||
                activeBooking.status === 'arrived') && (
                <button
                  onClick={handleOpenCancelModal}
                  className="w-full py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 rounded-xl text-xs font-semibold transition-all"
                >
                  Cancel Ride
                </button>
              )}
            </div>
          ) : (
            /* ===================================================================
               PRE-BOOKING FLOW: EXPANDABLE RAPIDO-STYLE BOTTOM FARE SHEET
               =================================================================== */
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 transition-all duration-300 ease-out select-none ${
                isPink ? 'border-pink-200' : 'border-slate-200'
              }`}
            >
              {/* Drag Handle & Expansion Toggle Header */}
              <div
                onClick={handleToggleExpansion}
                className="pt-2.5 pb-1 px-4 cursor-pointer flex flex-col items-center justify-center hover:bg-slate-50 rounded-t-3xl transition-colors"
                title="Swipe or tap to expand/collapse fare panel"
              >
                <div className="w-12 h-1.5 bg-slate-300 rounded-full mb-1" />
                <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                  <span>
                    {farePanelState === 'collapsed'
                      ? 'Tap or swipe up for all rides'
                      : farePanelState === 'half'
                      ? 'Choose Your Ride • Swipe for details'
                      : 'Tap or swipe down to minimize'}
                  </span>
                  {farePanelState === 'collapsed' ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-500 animate-bounce" />
                  ) : farePanelState === 'expanded' ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
              </div>

              {/* Content depending on Expansion State */}
              <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-3">
                {/* 1. STATE: COLLAPSED MODE (Leaves maximum space for the map) */}
                {farePanelState === 'collapsed' && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    {/* Selected Vehicle Thumbnail & Info */}
                    <div
                      onClick={() => setFarePanelState('half')}
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                    >
                      <div className="w-12 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                        <VehicleIllustration
                          type={currentVehicleConfig.id}
                          serviceType={selectedService}
                          size="sm"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-xs sm:text-sm text-slate-900 truncate">
                            {lang === 'ta' ? currentVehicleConfig.tamilName : currentVehicleConfig.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-medium">
                            {currentVehicleConfig.capacity} seats
                          </span>
                        </div>
                        <div className="text-[10px] text-emerald-600 font-semibold truncate">
                          {currentVehicleConfig.etaMinutes} min away • {calculatedDistanceKm} km
                        </div>
                      </div>
                    </div>

                    {/* Fare & Confirm Action */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-sm sm:text-base font-black text-slate-900 font-mono">
                          ₹{selectedVehicleFareEstimate.estimatedFare}
                        </div>
                        <div className="text-[9px] text-slate-400">incl. GST</div>
                      </div>

                      <button
                        onClick={handleConfirmRideBooking}
                        disabled={isCreatingBooking || (!pickup || !destination)}
                        className={`px-4 py-2.5 rounded-xl font-black text-xs tracking-wider uppercase shadow-md flex items-center gap-1.5 transition-all ${
                          isPink
                            ? 'bg-pink-600 hover:bg-pink-700 text-white'
                            : 'bg-slate-900 hover:bg-black text-white'
                        }`}
                      >
                        <span>BOOK</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. STATE: HALF EXPANDED (Choose Your Ride list with Vehicle Cards) */}
                {farePanelState === 'half' && (
                  <div className="space-y-3">
                    {/* Route Metrics Row */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <span className="text-sm font-black font-mono">{calculatedDistanceKm} km</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-600">~{calculatedDurationMin} mins ride</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {pickupDistrict && (
                          <span className="px-2 py-0.5 bg-slate-100 rounded-md font-semibold text-slate-700 text-[10px]">
                            {pickupDistrict.name}
                          </span>
                        )}
                        <button
                          onClick={() => setFarePanelState('expanded')}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-900 underline ml-1"
                        >
                          View Fare Details
                        </button>
                      </div>
                    </div>

                    {/* Vehicle Selection Cards (Rapido style scrollable list) */}
                    <div className="space-y-2 max-h-48 sm:max-h-56 overflow-y-auto pr-1">
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
                            className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                              isSelected
                                ? isPink
                                ? 'bg-pink-50/80 border-pink-500 shadow-md ring-1 ring-pink-500'
                                : 'bg-slate-50 border-slate-900 shadow-md ring-1 ring-slate-900'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {/* Vehicle Photo & Illustration Badge */}
                            <div className="relative w-14 h-11 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
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
                                  <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-medium">
                                    {veh.capacity} seats
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                                    ₹{fareEstimate.estimatedFare}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                                <span className="text-emerald-600 font-semibold">
                                  {veh.etaMinutes} min away
                                </span>
                                <span className="text-slate-400">
                                  Base ₹{fareEstimate.breakdown.baseFare} • ₹{fareEstimate.breakdown.distanceCharge} dist
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick Confirm Button */}
                    <button
                      onClick={handleConfirmRideBooking}
                      disabled={isCreatingBooking || (!pickup || !destination)}
                      className={`w-full py-3 rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${
                        isPink
                          ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-pink-500/25'
                          : 'bg-slate-900 hover:bg-black text-white shadow-slate-900/20'
                      }`}
                    >
                      {isCreatingBooking ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Dispatching Captain...</span>
                        </>
                      ) : (
                        <>
                          <span>
                            {isPink
                              ? `Confirm RUBI PINK ${selectedVehicle.toUpperCase()}`
                              : `Confirm ${selectedVehicle.toUpperCase()} • ₹${selectedVehicleFareEstimate.estimatedFare}`}
                          </span>
                          <ArrowRight className="w-4 h-4 stroke-[3]" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* 3. STATE: FULLY EXPANDED (Full options, fare breakdown, promo, details & Confirm button) */}
                {farePanelState === 'expanded' && (
                  <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black tracking-wider uppercase text-slate-900">
                          FARE DETAILS & VEHICLE OPTIONS
                        </span>
                      </div>
                      <button
                        onClick={() => setFarePanelState('half')}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-0.5"
                      >
                        <span>Minimize</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Vehicle List */}
                    <div className="space-y-2">
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
                            className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                              isSelected
                                ? isPink
                                ? 'bg-pink-50/80 border-pink-500 shadow-md ring-1 ring-pink-500'
                                : 'bg-slate-50 border-slate-900 shadow-md ring-1 ring-slate-900'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="relative w-14 h-11 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
                              <img
                                src={veh.imageUrl}
                                alt={veh.name}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-xs text-slate-900">
                                  {lang === 'ta' ? veh.tamilName : veh.name}
                                </span>
                                <span className="text-xs font-black text-slate-900 font-mono">
                                  ₹{fareEstimate.estimatedFare}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                                <span className="text-emerald-600 font-semibold">{veh.etaMinutes} min away</span>
                                <span className="text-slate-400">
                                  Base ₹{fareEstimate.breakdown.baseFare} • ₹{fareEstimate.breakdown.distanceCharge} dist
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Detailed Fare Breakdown Card */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
                      <div className="font-bold text-slate-900 text-xs mb-1">
                        Fare Breakdown ({selectedVehicle.toUpperCase()})
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>Base Fare</span>
                        <span className="font-mono">₹{selectedVehicleFareEstimate.breakdown.baseFare}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>Distance Charge ({calculatedDistanceKm} km)</span>
                        <span className="font-mono">₹{selectedVehicleFareEstimate.breakdown.distanceCharge}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>Estimated Ride Time (~{calculatedDurationMin} mins)</span>
                        <span className="font-mono">₹{selectedVehicleFareEstimate.breakdown.timeCharge}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>GST (5%) & Tolls</span>
                        <span className="font-mono">₹{selectedVehicleFareEstimate.breakdown.gstAmount}</span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-xs">
                        <span>Total Estimated Fare</span>
                        <span className="font-mono text-sm">₹{selectedVehicleFareEstimate.estimatedFare}</span>
                      </div>
                    </div>

                    {/* Promo Code Toggle */}
                    <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                      <button
                        type="button"
                        onClick={() => setShowPromoInput(!showPromoInput)}
                        className="flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold"
                      >
                        <Tag className="w-3.5 h-3.5 text-amber-500" />
                        <span>Promo Code: {appliedCoupon}</span>
                      </button>
                      <span className="text-[11px] text-emerald-600 font-bold">5% GST included</span>
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

                    {/* Prominent Confirm Ride Button */}
                    <button
                      onClick={handleConfirmRideBooking}
                      disabled={isCreatingBooking || (!pickup || !destination)}
                      className={`w-full py-3.5 rounded-2xl font-black text-sm tracking-wider uppercase shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${
                        isPink
                          ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-pink-500/25'
                          : 'bg-slate-900 hover:bg-black text-white shadow-slate-900/20'
                      }`}
                    >
                      {isCreatingBooking ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Dispatching Captain...</span>
                        </>
                      ) : (
                        <>
                          <span>CONFIRM RIDE NOW • ₹{selectedVehicleFareEstimate.estimatedFare}</span>
                          <ArrowRight className="w-4 h-4 stroke-[3]" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: DEDICATED LOCATION SEARCH MODAL (UBER / RAPIDO STYLE)
          ========================================================================= */}
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
                {searchModalMode === 'pickup' ? 'Set Pickup Location' : 'Set Destination'}
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

      {/* =========================================================================
          SECTION 5: SYSTEM MODALS
          ========================================================================= */}
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

      {/* Saved Places Modal */}
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

      {/* Cancellation Modal */}
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
