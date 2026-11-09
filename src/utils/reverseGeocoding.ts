import { LocationPoint } from '../types';
import { getDistrictFromCoordinates, searchTamilNaduLocations } from '../data/tamilNaduData';

/**
 * Reverse geocode latitude and longitude to get the real-world address.
 * Priority:
 * 1. Google Maps Geocoder API (real street, landmark, area, city in Tamil Nadu / India)
 * 2. District & City reverse resolution from all 38 Tamil Nadu districts
 *
 * CRITICAL: NEVER hardcodes or defaults to Chennai coordinates.
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<LocationPoint> {
  // 1. Attempt Google Maps Geocoder if loaded
  if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      const response = await new Promise<any>((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === 'OK' && results && results[0]) {
            resolve(results[0]);
          } else {
            reject(new Error(`Geocoding status: ${status}`));
          }
        });
      });

      if (response) {
        const formattedAddress: string = response.formatted_address || '';
        const addressComponents: any[] = response.address_components || [];

        // Extract neighborhood, locality, district, and city
        let locality = '';
        let neighborhood = '';
        let districtName = '';
        let stateName = 'Tamil Nadu';

        for (const comp of addressComponents) {
          if (comp.types.includes('sublocality_level_1') || comp.types.includes('sublocality')) {
            neighborhood = comp.long_name;
          }
          if (comp.types.includes('locality')) {
            locality = comp.long_name;
          }
          if (comp.types.includes('administrative_area_level_2')) {
            districtName = comp.long_name;
          }
          if (comp.types.includes('administrative_area_level_1')) {
            stateName = comp.long_name;
          }
        }

        const district = districtName || locality || getDistrictFromCoordinates(lat, lng).name;
        const mainName = neighborhood || locality || formattedAddress.split(',')[0]?.trim() || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

        return {
          id: `gps_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: mainName,
          address: formattedAddress || `${mainName}, ${district}, ${stateName}`,
          lat,
          lng,
          district,
          city: locality || district,
          state: stateName,
          category: 'custom',
        };
      }
    } catch (err) {
      // Fallback gracefully to Tamil Nadu spatial district resolution
    }
  }

  // 2. High-precision Tamil Nadu District fallback
  const resolvedDistrict = getDistrictFromCoordinates(lat, lng);
  const cityOrHq = resolvedDistrict.headquarters || resolvedDistrict.name;

  return {
    id: `gps_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: `${cityOrHq} Area (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    tamilName: `${resolvedDistrict.tamilName} பகுதி`,
    address: `${cityOrHq}, ${resolvedDistrict.name} District, Tamil Nadu`,
    lat,
    lng,
    district: resolvedDistrict.name,
    city: cityOrHq,
    state: 'Tamil Nadu',
    category: 'custom',
  };
}

/**
 * Autocomplete place search across Tamil Nadu:
 * Combines Google Places Autocomplete API with our curated statewide database of all 38 districts.
 * Ensures zero restriction to Chennai.
 */
export async function searchPlacesAcrossTamilNadu(query: string): Promise<LocationPoint[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Local results across all 38 districts (Coimbatore, Madurai, Salem, Theni, Trichy, Ooty, etc.)
  const localResults = searchTamilNaduLocations(trimmed);

  // If Google Places AutocompleteService is available, get live suggestions
  if (typeof window !== 'undefined' && (window as any).google?.maps?.places?.AutocompleteService) {
    try {
      const service = new (window as any).google.maps.places.AutocompleteService();
      const predictions: any[] = await new Promise((resolve) => {
        service.getPlacePredictions(
          {
            input: trimmed,
            componentRestrictions: { country: 'in' },
            // Broad geographical bounds covering all of Tamil Nadu & South India
            locationBias: {
              center: { lat: 11.1271, lng: 78.6569 },
              radius: 400000, // 400km covers entire Tamil Nadu
            },
          },
          (results: any, status: any) => {
            if (status === 'OK' && results) {
              resolve(results);
            } else {
              resolve([]);
            }
          }
        );
      });

      if (predictions && predictions.length > 0) {
        // Map predictions into LocationPoint objects
        const googlePoints: LocationPoint[] = predictions.slice(0, 5).map((p) => {
          return {
            id: `gplace_${p.place_id}`,
            placeId: p.place_id,
            name: p.structured_formatting?.main_text || p.description.split(',')[0],
            address: p.description,
            // Default center if geometry not yet fetched; will be fetched upon selection
            lat: 11.1271,
            lng: 78.6569,
            category: 'custom',
          };
        });

        // Merge Google and local points without duplicates
        const merged = [...googlePoints];
        for (const loc of localResults) {
          if (!merged.some((m) => m.name.toLowerCase() === loc.name.toLowerCase())) {
            merged.push(loc);
          }
        }
        return merged.slice(0, 10);
      }
    } catch (e) {
      // Fall through to local results
    }
  }

  return localResults.slice(0, 10);
}

/**
 * Fetch detailed lat/lng geometry for a selected Google Place prediction
 */
export async function fetchPlaceDetailsGeometry(
  place: LocationPoint
): Promise<LocationPoint> {
  if (!place.placeId || (place.lat !== 11.1271 && place.lng !== 78.6569)) {
    return place;
  }

  if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      const result: any = await new Promise((resolve, reject) => {
        geocoder.geocode({ placeId: place.placeId }, (results: any, status: any) => {
          if (status === 'OK' && results && results[0]) {
            resolve(results[0]);
          } else {
            reject(new Error(`Place details error: ${status}`));
          }
        });
      });

      if (result && result.geometry?.location) {
        const lat = result.geometry.location.lat();
        const lng = result.geometry.location.lng();
        const dist = getDistrictFromCoordinates(lat, lng);
        return {
          ...place,
          lat,
          lng,
          address: result.formatted_address || place.address,
          district: dist.name,
          city: dist.headquarters,
        };
      }
    } catch (err) {
      // Fallback
    }
  }

  return place;
}
