/// <reference types="google.maps" />
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  LocateFixed,
  Plus,
  Minus,
  Navigation,
  Car,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import {
  Booking,
  CaptainProfile,
  GPSBreadcrumb,
  Language,
  LocationPoint,
  VehicleType,
} from '../../types';
import { getDistrictFromCoordinates } from '../../data/tamilNaduData';
import { reverseGeocodeCoordinates } from '../../utils/reverseGeocoding';
import { VehicleIllustration } from './VehicleIllustration';

// Google Maps API Key retrieved from runtime environment or build secrets
const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_GOOGLE_MAPS_API_KEY) ||
  (typeof process !== 'undefined' && process.env?.GOOGLE_MAPS_API_KEY) ||
  '';

// Default light map center: Tamil Nadu geographic center (near Dindigul / Trichy)
const TAMIL_NADU_CENTER = { lat: 11.1271, lng: 78.6569 };
const DEFAULT_ZOOM = 8; // Statewide Tamil Nadu zoom view

interface InteractiveMapProps {
  pickup?: LocationPoint | null;
  destination?: LocationPoint | null;
  captains?: CaptainProfile[];
  activeCaptain?: CaptainProfile | null;
  routeProgressPercent?: number; // 0 to 100
  breadcrumbs?: GPSBreadcrumb[];
  onSelectLocation?: (point: LocationPoint, type: 'pickup' | 'destination') => void;
  onLocationSelect?: (point: LocationPoint, type: 'pickup' | 'destination') => void;
  onRouteComputed?: (distanceMeters: number, durationSeconds: number) => void;
  selectionMode?: 'pickup' | 'destination' | null;
  showAllCaptains?: boolean;
  className?: string;
  isTripActive?: boolean;
  activeBooking?: Booking | null;
  lang?: Language;
  onRecenter?: () => void;
  currentLocation?: LocationPoint | null;
}

/**
 * Child component that accesses Google Maps SDK context via hooks to calculate
 * road-following Routes and adjust camera bounds.
 */
interface GoogleMapRouteHandlerProps {
  pickup: LocationPoint | null;
  destination: LocationPoint | null;
  activeBooking?: Booking | null;
  onRouteComputed?: (distanceMeters: number, durationSeconds: number) => void;
}

const GoogleMapRouteHandler: React.FC<GoogleMapRouteHandlerProps> = ({
  pickup,
  destination,
  activeBooking,
  onRouteComputed,
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map) return;

    // Clean up previous polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    // If both pickup and destination exist, fit bounds and compute route
    if (pickup && destination) {
      // 1. Fit viewport to include both points with padding for bottom sheet
      try {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend({ lat: pickup.lat, lng: pickup.lng });
        bounds.extend({ lat: destination.lat, lng: destination.lng });
        map.fitBounds(bounds, { top: 90, right: 50, bottom: 260, left: 50 });
      } catch (err) {
        // Fallback center
        map.panTo({ lat: (pickup.lat + destination.lat) / 2, lng: (pickup.lng + destination.lng) / 2 });
      }

      // 2. Compute modern Route if Routes library is loaded
      if (routesLib && (routesLib as any).Route) {
        const request = {
          origin: { lat: pickup.lat, lng: pickup.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          travelMode: 'DRIVING' as any,
          fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
        };

        (routesLib as any).Route.computeRoutes(request)
          .then(({ routes }: { routes: any[] }) => {
            if (!routes || routes.length === 0) return;
            const primaryRoute = routes[0];

            if (typeof primaryRoute.createPolylines === 'function') {
              const newPolylines = primaryRoute.createPolylines();
              newPolylines.forEach((line: google.maps.Polyline) => {
                line.setOptions({
                  strokeColor: '#0F172A', // Midnight Slate primary line
                  strokeWeight: 5,
                  strokeOpacity: 0.95,
                  zIndex: 20,
                });
                line.setMap(map);
              });
              polylinesRef.current = newPolylines;
            }

            if (onRouteComputed && primaryRoute.distanceMeters && primaryRoute.durationMillis) {
              onRouteComputed(primaryRoute.distanceMeters, Math.round(primaryRoute.durationMillis / 1000));
            }
          })
          .catch(() => {
            // Fallback direct road polyline if computeRoutes request fails
            const line = new google.maps.Polyline({
              path: [
                { lat: pickup.lat, lng: pickup.lng },
                {
                  lat: (pickup.lat + destination.lat) / 2 + (destination.lng - pickup.lng) * 0.08,
                  lng: (pickup.lng + destination.lng) / 2 - (destination.lat - pickup.lat) * 0.08,
                },
                { lat: destination.lat, lng: destination.lng },
              ],
              strokeColor: '#0F172A',
              strokeWeight: 4,
              strokeOpacity: 0.85,
              zIndex: 20,
              map,
            });
            polylinesRef.current = [line];
          });
      } else {
        // Simple direct line if routes library is still initializing
        const line = new google.maps.Polyline({
          path: [
            { lat: pickup.lat, lng: pickup.lng },
            { lat: destination.lat, lng: destination.lng },
          ],
          strokeColor: '#0F172A',
          strokeWeight: 4,
          strokeOpacity: 0.8,
          zIndex: 20,
          map,
        });
        polylinesRef.current = [line];
      }
    } else if (pickup) {
      map.panTo({ lat: pickup.lat, lng: pickup.lng });
      map.setZoom(15);
    }
  }, [map, routesLib, pickup?.lat, pickup?.lng, destination?.lat, destination?.lng]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, []);

  return null;
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  pickup = null,
  destination = null,
  captains = [],
  activeCaptain: propActiveCaptain,
  routeProgressPercent: propRouteProgress = 0,
  breadcrumbs = [],
  onSelectLocation,
  onLocationSelect,
  onRouteComputed,
  selectionMode = null,
  showAllCaptains = true,
  className = '',
  isTripActive: propIsTripActive = false,
  activeBooking = null,
  lang = 'en',
  onRecenter,
  currentLocation = null,
}) => {
  const activeCaptain = propActiveCaptain || activeBooking?.captain || null;
  const isTripActive =
    propIsTripActive ||
    activeBooking?.status === 'in_progress' ||
    activeBooking?.status === 'destination_reached';
  const handleSelectCallback = onLocationSelect || onSelectLocation;

  // Track map status
  const [useGoogleMaps, setUseGoogleMaps] = useState<boolean>(Boolean(GOOGLE_MAPS_API_KEY));
  const [mapAuthFailed, setMapAuthFailed] = useState<boolean>(false);
  const [fallbackZoom, setFallbackZoom] = useState<number>(1);
  const [fallbackPan, setFallbackPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Listen to Google Maps auth failure or quota events
  useEffect(() => {
    const handleAuthFailure = () => {
      setMapAuthFailed(true);
      setUseGoogleMaps(false);
    };
    window.addEventListener('gmp-quota-exceeded', handleAuthFailure);
    return () => window.removeEventListener('gmp-quota-exceeded', handleAuthFailure);
  }, []);

  // Compute center for initial map render - NEVER hardcode to Chennai
  const initialCenter = pickup
    ? { lat: pickup.lat, lng: pickup.lng }
    : currentLocation
    ? { lat: currentLocation.lat, lng: currentLocation.lng }
    : TAMIL_NADU_CENTER; // Center of Tamil Nadu (Dindigul/Trichy region)

  const initialZoom = pickup || currentLocation ? 14 : 7;

  // Calculate moving vehicle coordinates during an active trip
  const getMovingVehicleLocation = () => {
    if (!pickup || !destination) {
      if (activeCaptain) {
        return {
          lat: activeCaptain.currentLat,
          lng: activeCaptain.currentLng,
          heading: activeCaptain.heading || 0,
        };
      }
      return null;
    }

    const t = Math.max(0, Math.min(1, propRouteProgress / 100));
    // Curvature midpoint
    const midLat = (pickup.lat + destination.lat) / 2 + (destination.lng - pickup.lng) * 0.05;
    const midLng = (pickup.lng + destination.lng) / 2 - (destination.lat - pickup.lat) * 0.05;

    // Quadratic interpolation
    const curLat = (1 - t) * (1 - t) * pickup.lat + 2 * (1 - t) * t * midLat + t * t * destination.lat;
    const curLng = (1 - t) * (1 - t) * pickup.lng + 2 * (1 - t) * t * midLng + t * t * destination.lng;

    // Calculate heading angle
    const dLat = destination.lat - pickup.lat;
    const dLng = destination.lng - pickup.lng;
    const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;

    return { lat: curLat, lng: curLng, heading: angle };
  };

  const movingVehicle = getMovingVehicleLocation();

  // Handle map click in Google Maps with real reverse geocoding
  const handleGoogleMapClick = async (e: any) => {
    if (!selectionMode || !handleSelectCallback) return;
    if (e.detail?.latLng) {
      const lat = e.detail.latLng.lat;
      const lng = e.detail.latLng.lng;
      const geocoded = await reverseGeocodeCoordinates(lat, lng);
      handleSelectCallback(geocoded, selectionMode);
    }
  };

  // Recenter handler
  const handleRecenterClick = () => {
    if (onRecenter) {
      onRecenter();
    } else {
      setFallbackPan({ x: 0, y: 0 });
      setFallbackZoom(1);
    }
  };

  // --- LIGHT VECTOR FALLBACK MAP LOGIC (if Google Maps key not configured or offline) ---
  const computeBounds = () => {
    if (pickup && destination) {
      const minLat = Math.min(pickup.lat, destination.lat);
      const maxLat = Math.max(pickup.lat, destination.lat);
      const minLng = Math.min(pickup.lng, destination.lng);
      const maxLng = Math.max(pickup.lng, destination.lng);
      const latDelta = Math.max(maxLat - minLat, 0.06);
      const lngDelta = Math.max(maxLng - minLng, 0.06);
      return {
        minLat: minLat - latDelta * 0.3,
        maxLat: maxLat + latDelta * 0.3,
        minLng: minLng - lngDelta * 0.3,
        maxLng: maxLng + lngDelta * 0.3,
      };
    }
    if (pickup) {
      const pad = 0.08;
      return {
        minLat: pickup.lat - pad,
        maxLat: pickup.lat + pad,
        minLng: pickup.lng - pad,
        maxLng: pickup.lng + pad,
      };
    }
    return {
      minLat: 8.08,
      maxLat: 13.55,
      minLng: 76.2,
      maxLng: 80.35,
    };
  };

  const fallbackBounds = computeBounds();

  const projectToFallbackMap = (lat: number, lng: number) => {
    const latSpan = fallbackBounds.maxLat - fallbackBounds.minLat || 0.01;
    const lngSpan = fallbackBounds.maxLng - fallbackBounds.minLng || 0.01;
    const x = ((lng - fallbackBounds.minLng) / lngSpan) * 800;
    const y = ((fallbackBounds.maxLat - lat) / latSpan) * 600;
    return {
      x: Math.max(20, Math.min(780, x)),
      y: Math.max(20, Math.min(580, y)),
    };
  };

  const unprojectFromFallbackMap = (x: number, y: number) => {
    const latSpan = fallbackBounds.maxLat - fallbackBounds.minLat || 0.01;
    const lngSpan = fallbackBounds.maxLng - fallbackBounds.minLng || 0.01;
    const lng = fallbackBounds.minLng + (x / 800) * lngSpan;
    const lat = fallbackBounds.maxLat - (y / 600) * latSpan;
    return {
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
    };
  };

  const fallbackPickupPos = pickup ? projectToFallbackMap(pickup.lat, pickup.lng) : null;
  const fallbackDestPos = destination ? projectToFallbackMap(destination.lat, destination.lng) : null;

  const handleFallbackMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - fallbackPan.x, y: e.clientY - fallbackPan.y };
    }
  };

  const handleFallbackMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setFallbackPan({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    }
  };

  const handleFallbackMouseUp = () => {
    setIsDragging(false);
  };

  const handleFallbackSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!selectionMode || !handleSelectCallback) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left - fallbackPan.x) / (rect.width * fallbackZoom)) * 800;
    const clickY = ((e.clientY - rect.top - fallbackPan.y) / (rect.height * fallbackZoom)) * 600;
    const coords = unprojectFromFallbackMap(clickX, clickY);
    const district = getDistrictFromCoordinates(coords.lat, coords.lng);
    const newPoint: LocationPoint = {
      id: `fallback_${Date.now()}`,
      name: `Pin (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
      address: district ? `${district.name} District, Tamil Nadu` : 'Tamil Nadu',
      lat: coords.lat,
      lng: coords.lng,
      category: 'custom',
    };
    handleSelectCallback(newPoint, selectionMode);
  };

  return (
    <div
      className={`relative w-full h-full min-h-[460px] bg-slate-100 overflow-hidden select-none rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm ${className}`}
    >
      {/* 1. PRIMARY RENDERER: GOOGLE MAPS JAVASCRIPT API VIA @vis.gl/react-google-maps */}
      {useGoogleMaps && !mapAuthFailed ? (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'routes', 'geometry', 'core']}>
          <div className="w-full h-full min-h-[460px]">
            <GoogleMap
              id="rubi-cab-map"
              // Mandatory attribution identifier per AI Studio governance
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              // Mandatory mapId for AdvancedMarkerElement
              mapId="DEMO_MAP_ID"
              defaultCenter={initialCenter}
              defaultZoom={initialZoom}
              gestureHandling="greedy"
              disableDefaultUI={true}
              onClick={handleGoogleMapClick}
              className="w-full h-full"
            >
              {/* Dynamic Route Handler & Viewport bounds manager */}
              <GoogleMapRouteHandler
                pickup={pickup}
                destination={destination}
                activeBooking={activeBooking}
                onRouteComputed={onRouteComputed}
              />

              {/* Current Location Blue Marker (Uber style) */}
              {currentLocation && (
                <AdvancedMarker
                  position={{ lat: currentLocation.lat, lng: currentLocation.lng }}
                  title="Current Location"
                >
                  <div className="relative flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-sky-500/25 animate-ping absolute" />
                    <div className="w-4 h-4 rounded-full bg-sky-600 border-2 border-white shadow-md relative z-10" />
                  </div>
                </AdvancedMarker>
              )}

              {/* Pickup Marker (Clean Uber green circle with tag) - Draggable for pin adjustment */}
              {pickup && (
                <AdvancedMarker
                  position={{ lat: pickup.lat, lng: pickup.lng }}
                  title={`Pickup: ${pickup.name} (Drag to adjust)`}
                  draggable={!isTripActive}
                  onDragEnd={async (e: any) => {
                    if (handleSelectCallback) {
                      const latLng = e.latLng;
                      const lat = typeof latLng?.lat === 'function' ? latLng.lat() : latLng?.lat ?? pickup.lat;
                      const lng = typeof latLng?.lng === 'function' ? latLng.lng() : latLng?.lng ?? pickup.lng;
                      const geocoded = await reverseGeocodeCoordinates(lat, lng);
                      handleSelectCallback(geocoded, 'pickup');
                    }
                  }}
                >
                  <div className="flex flex-col items-center cursor-grab active:cursor-grabbing group">
                    <div className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md mb-1 whitespace-nowrap border border-slate-700">
                      PICKUP
                    </div>
                    <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  </div>
                </AdvancedMarker>
              )}

              {/* Destination Marker (Clean Uber black square with tag) - Draggable for pin adjustment */}
              {destination && (
                <AdvancedMarker
                  position={{ lat: destination.lat, lng: destination.lng }}
                  title={`Drop: ${destination.name} (Drag to adjust)`}
                  draggable={!isTripActive}
                  onDragEnd={async (e: any) => {
                    if (handleSelectCallback) {
                      const latLng = e.latLng;
                      const lat = typeof latLng?.lat === 'function' ? latLng.lat() : latLng?.lat ?? destination.lat;
                      const lng = typeof latLng?.lng === 'function' ? latLng.lng() : latLng?.lng ?? destination.lng;
                      const geocoded = await reverseGeocodeCoordinates(lat, lng);
                      handleSelectCallback(geocoded, 'destination');
                    }
                  }}
                >
                  <div className="flex flex-col items-center cursor-grab active:cursor-grabbing group">
                    <div className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md mb-1 whitespace-nowrap border border-slate-700">
                      DROP
                    </div>
                    <div className="w-5 h-5 rounded-md bg-slate-900 border-2 border-white shadow-lg flex items-center justify-center">
                      <div className="w-2 h-2 rounded-sm bg-amber-400" />
                    </div>
                  </div>
                </AdvancedMarker>
              )}

              {/* Assigned Captain or Moving Vehicle Marker during Trip */}
              {(movingVehicle || (activeCaptain && !isTripActive)) && (
                <AdvancedMarker
                  position={{
                    lat: movingVehicle?.lat ?? activeCaptain!.currentLat,
                    lng: movingVehicle?.lng ?? activeCaptain!.currentLng,
                  }}
                  title={`Assigned Captain: ${activeCaptain?.name || 'Captain'} • ${activeCaptain?.vehicleModel || ''}`}
                  zIndex={35}
                >
                  <div className="flex flex-col items-center select-none">
                    {/* Distinct Assigned Captain Tag */}
                    <div className="bg-slate-900 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-amber-400/60 mb-1 flex items-center gap-1.5 whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{activeCaptain?.name ? `${activeCaptain.name.split(' ')[0]} (Assigned)` : 'Assigned Captain'}</span>
                    </div>

                    <div className="relative flex items-center justify-center">
                      {/* Pulsing ring for assigned captain */}
                      <div className="absolute w-12 h-12 rounded-full bg-amber-400/35 animate-ping pointer-events-none" />
                      <div
                        className="relative p-1.5 bg-white rounded-2xl border-2 border-amber-500 shadow-xl flex items-center justify-center transition-transform duration-300"
                        style={{
                          transform: `rotate(${movingVehicle?.heading ?? activeCaptain?.heading ?? 0}deg)`,
                        }}
                      >
                        <VehicleIllustration
                          type={activeBooking?.vehicleType || activeCaptain?.vehicleType || 'sedan'}
                          serviceType={activeBooking?.serviceType || (activeCaptain?.isPinkEligible ? 'rubi_pink' : 'rubi_cab')}
                          size="sm"
                          isAssigned={true}
                        />
                      </div>
                    </div>
                  </div>
                </AdvancedMarker>
              )}

              {/* Nearby Available Captains */}
              {showAllCaptains &&
                !isTripActive &&
                captains
                  .filter((c) => c.isOnline && !c.isBusy && c.id !== activeCaptain?.id)
                  .map((captain) => (
                    <AdvancedMarker
                      key={captain.id}
                      position={{ lat: captain.currentLat, lng: captain.currentLng }}
                      title={`${captain.name} • ${captain.vehicleModel}`}
                      zIndex={15}
                    >
                      <div className="flex flex-col items-center group select-none">
                        <div
                          className="p-1 bg-white hover:bg-slate-50 text-slate-900 rounded-xl border border-slate-300 shadow-md flex items-center justify-center hover:scale-110 transition-transform duration-200"
                          style={{
                            transform: captain.heading ? `rotate(${captain.heading}deg)` : undefined,
                          }}
                        >
                          <VehicleIllustration
                            type={captain.vehicleType || 'sedan'}
                            serviceType={captain.isPinkEligible ? 'rubi_pink' : 'rubi_cab'}
                            size="sm"
                          />
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow pointer-events-none mt-0.5 whitespace-nowrap">
                          {captain.vehicleModel}
                        </div>
                      </div>
                    </AdvancedMarker>
                  ))}
            </GoogleMap>
          </div>
        </APIProvider>
      ) : (
        /* 2. LIGHT-THEME VECTOR MAP FALLBACK (Zero External Failure Rate) */
        <div
          className="w-full h-full cursor-grab active:cursor-grabbing relative"
          onMouseDown={handleFallbackMouseDown}
          onMouseMove={handleFallbackMouseMove}
          onMouseUp={handleFallbackMouseUp}
          onMouseLeave={handleFallbackMouseUp}
        >
          <svg
            className="w-full h-full transition-transform duration-75"
            viewBox="0 0 800 600"
            preserveAspectRatio="xMidYMid slice"
            onClick={handleFallbackSvgClick}
            style={{
              transform: `translate(${fallbackPan.x}px, ${fallbackPan.y}px) scale(${fallbackZoom})`,
              transformOrigin: 'center center',
            }}
          >
            <defs>
              {/* Subtle light road grid */}
              <pattern id="lightRoadGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="1.2" />
              </pattern>
            </defs>

            {/* Light cream-white map ground (Uber light theme) */}
            <rect x="0" y="0" width="800" height="600" fill="#f8fafc" />

            {/* Soft pale blue coastal water body on East */}
            <path
              d="M 700 0 Q 660 180 680 300 T 720 600 L 800 600 L 800 0 Z"
              fill="#e0f2fe"
              stroke="#bae6fd"
              strokeWidth="1.5"
            />

            {/* City road network */}
            <rect x="0" y="0" width="800" height="600" fill="url(#lightRoadGrid)" />

            {/* Major Arterial Highways (NH 44, NH 48, GST Road) */}
            <path
              d="M 60 580 Q 220 400 380 260 T 640 90"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M 520 600 L 490 350 Q 480 220 540 110"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="5"
            />
            <ellipse
              cx="380"
              cy="300"
              rx="210"
              ry="170"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="4"
              strokeDasharray="6 4"
            />

            {/* Regional Tamil Nadu Hubs */}
            {[
              { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
              { name: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
              { name: 'Madurai', lat: 9.9252, lng: 78.1198 },
              { name: 'Salem', lat: 11.6643, lng: 78.146 },
              { name: 'Trichy', lat: 10.7905, lng: 78.7047 },
              { name: 'Theni', lat: 10.0104, lng: 77.4768 },
              { name: 'Tiruppur', lat: 11.1085, lng: 77.3411 },
            ].map((hub) => {
              const pos = projectToFallbackMap(hub.lat, hub.lng);
              return (
                <g key={hub.name}>
                  <circle cx={pos.x} cy={pos.y} r="3" fill="#94a3b8" />
                  <text
                    x={pos.x + 5}
                    y={pos.y + 3}
                    fill="#64748b"
                    fontSize="9"
                    fontWeight="600"
                    fontFamily="sans-serif"
                  >
                    {hub.name}
                  </text>
                </g>
              );
            })}

            {/* Road-following Polyline between Pickup & Destination */}
            {fallbackPickupPos && fallbackDestPos && (
              <g>
                <path
                  d={`M ${fallbackPickupPos.x} ${fallbackPickupPos.y} Q ${(fallbackPickupPos.x + fallbackDestPos.x) / 2 + (fallbackDestPos.y - fallbackPickupPos.y) * 0.12} ${(fallbackPickupPos.y + fallbackDestPos.y) / 2 - (fallbackDestPos.x - fallbackPickupPos.x) * 0.12} ${fallbackDestPos.x} ${fallbackDestPos.y}`}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="7"
                  strokeOpacity="0.4"
                  strokeLinecap="round"
                />
                <path
                  d={`M ${fallbackPickupPos.x} ${fallbackPickupPos.y} Q ${(fallbackPickupPos.x + fallbackDestPos.x) / 2 + (fallbackDestPos.y - fallbackPickupPos.y) * 0.12} ${(fallbackPickupPos.y + fallbackDestPos.y) / 2 - (fallbackDestPos.x - fallbackPickupPos.x) * 0.12} ${fallbackDestPos.x} ${fallbackDestPos.y}`}
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </g>
            )}

            {/* Nearby Captains with category-specific vehicle illustrations */}
            {showAllCaptains &&
              !isTripActive &&
              captains
                .filter((c) => c.isOnline && !c.isBusy && c.id !== activeCaptain?.id)
                .map((captain) => {
                  const pos = projectToFallbackMap(captain.currentLat, captain.currentLng);
                  const heading = captain.heading || 0;
                  return (
                    <g key={captain.id} transform={`translate(${pos.x}, ${pos.y})`}>
                      <foreignObject x="-16" y="-16" width="32" height="32">
                        <div
                          className="w-8 h-8 rounded-xl bg-white border border-slate-300 shadow-md flex items-center justify-center p-0.5"
                          style={{ transform: `rotate(${heading}deg)` }}
                        >
                          <VehicleIllustration
                            type={captain.vehicleType || 'sedan'}
                            serviceType={captain.isPinkEligible ? 'rubi_pink' : 'rubi_cab'}
                            size="sm"
                          />
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}

            {/* Assigned Captain or Moving Vehicle on Fallback Map */}
            {(movingVehicle || (activeCaptain && !isTripActive)) && (() => {
              const capLat = movingVehicle?.lat ?? activeCaptain!.currentLat;
              const capLng = movingVehicle?.lng ?? activeCaptain!.currentLng;
              const heading = movingVehicle?.heading ?? activeCaptain?.heading ?? 0;
              const pos = projectToFallbackMap(capLat, capLng);
              return (
                <g key="assigned-fallback-captain" transform={`translate(${pos.x}, ${pos.y})`}>
                  <circle r="20" fill="#F59E0B" opacity="0.3" className="animate-ping" />
                  <foreignObject x="-22" y="-22" width="44" height="44">
                    <div
                      className="w-11 h-11 rounded-2xl bg-white border-2 border-amber-500 shadow-xl flex items-center justify-center p-0.5"
                      style={{ transform: `rotate(${heading}deg)` }}
                    >
                      <VehicleIllustration
                        type={activeBooking?.vehicleType || activeCaptain?.vehicleType || 'sedan'}
                        serviceType={activeBooking?.serviceType || (activeCaptain?.isPinkEligible ? 'rubi_pink' : 'rubi_cab')}
                        size="sm"
                        isAssigned={true}
                      />
                    </div>
                  </foreignObject>
                </g>
              );
            })()}

            {/* Pickup Marker */}
            {fallbackPickupPos && (
              <g transform={`translate(${fallbackPickupPos.x}, ${fallbackPickupPos.y})`}>
                <circle r="14" fill="#10b981" opacity="0.2" className="animate-ping" />
                <circle r="8" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                <g transform="translate(0, -24)">
                  <rect
                    x="-28"
                    y="0"
                    width="56"
                    height="18"
                    rx="9"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="12"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="700"
                  >
                    PICKUP
                  </text>
                </g>
              </g>
            )}

            {/* Drop Marker */}
            {fallbackDestPos && (
              <g transform={`translate(${fallbackDestPos.x}, ${fallbackDestPos.y})`}>
                <rect
                  x="-7"
                  y="-7"
                  width="14"
                  height="14"
                  rx="3"
                  fill="#0f172a"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <g transform="translate(0, -24)">
                  <rect
                    x="-24"
                    y="0"
                    width="48"
                    height="18"
                    rx="9"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="12"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="700"
                  >
                    DROP
                  </text>
                </g>
              </g>
            )}
          </svg>
        </div>
      )}

      {/* Floating Mode Notice when user is selecting pin on map */}
      {selectionMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white font-semibold px-4 py-2 rounded-full text-xs shadow-xl flex items-center gap-2 z-20 animate-bounce">
          <Navigation className="w-3.5 h-3.5 text-amber-400" />
          <span>Tap anywhere on map to set {selectionMode.toUpperCase()}</span>
        </div>
      )}

      {/* Uber-Style Floating Recenter & Zoom Controls */}
      <div className="absolute bottom-6 right-4 flex flex-col gap-2 z-20">
        <button
          onClick={handleRecenterClick}
          className="w-10 h-10 bg-white hover:bg-slate-50 text-slate-800 rounded-full shadow-lg border border-slate-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          title="Recenter Location"
          aria-label="Recenter Location"
        >
          <LocateFixed className="w-5 h-5 text-slate-700" />
        </button>

        {!useGoogleMaps && (
          <div className="flex flex-col bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setFallbackZoom((z) => Math.min(z + 0.3, 3))}
              className="p-2.5 hover:bg-slate-50 text-slate-700 border-b border-slate-100 flex items-center justify-center"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setFallbackZoom((z) => Math.max(z - 0.3, 0.7))}
              className="p-2.5 hover:bg-slate-50 text-slate-700 flex items-center justify-center"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
