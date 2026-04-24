'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, Pencil } from 'lucide-react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { Address } from '@/types';
import toast from 'react-hot-toast';

type AddressForm = Omit<Address, 'id'>;

interface AddressAutocompleteFieldProps {
  value: AddressForm;
  onChange: (next: AddressForm) => void;
  showLabel?: boolean;
  showCountry?: boolean;
  showLandmark?: boolean;
}

interface MapsBundle {
  places: google.maps.PlacesLibrary;
  geocoding: google.maps.GeocodingLibrary;
}

let loaderPromise: Promise<MapsBundle> | null = null;

function loadGoogleMaps(): Promise<MapsBundle> {
  if (loaderPromise) return loaderPromise;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key missing'));
  }
  setOptions({ key: apiKey, v: 'weekly' });
  loaderPromise = Promise.all([
    importLibrary('places'),
    importLibrary('geocoding'),
  ]).then(([places, geocoding]) => ({ places, geocoding }));
  return loaderPromise;
}

function parseGooglePlace(
  components: google.maps.GeocoderAddressComponent[]
): Partial<AddressForm> {
  const get = (type: string, short = false) => {
    const c = components.find((x) => x.types.includes(type));
    return c ? (short ? c.short_name : c.long_name) : '';
  };

  const streetNumber = get('street_number');
  const route = get('route');
  const street = [streetNumber, route].filter(Boolean).join(' ').trim();
  const city =
    get('locality') ||
    get('postal_town') ||
    get('sublocality_level_1') ||
    get('administrative_area_level_2');
  const state = get('administrative_area_level_1', true);
  const postalCode = get('postal_code');
  const country = get('country', true);

  return { street, city, state, postalCode, country };
}

export default function AddressAutocompleteField({
  value,
  onChange,
  showLabel = true,
  showCountry = true,
  showLandmark = true,
}: AddressAutocompleteFieldProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const [ready, setReady] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((libs) => {
        if (cancelled) return;
        if (!searchInputRef.current) {
          setReady(true);
          return;
        }
        const auto = new libs.places.Autocomplete(searchInputRef.current, {
          types: ['address'],
          fields: ['address_components', 'formatted_address'],
        });
        auto.addListener('place_changed', () => {
          const place = auto.getPlace();
          if (!place.address_components) return;
          const parsed = parseGooglePlace(place.address_components);
          onChange({
            ...value,
            street: parsed.street ?? value.street,
            city: parsed.city ?? value.city,
            state: parsed.state ?? value.state,
            postalCode: parsed.postalCode ?? value.postalCode,
            country: parsed.country ?? value.country,
          });
          setManualMode(false);
        });
        autocompleteRef.current = auto;
        geocoderRef.current = new libs.geocoding.Geocoder();
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Address autocomplete unavailable — please enter manually');
        setManualMode(true);
        setReady(true);
      });
    return () => {
      cancelled = true;
      if (autocompleteRef.current) {
        google.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported on this device');
      return;
    }
    if (!geocoderRef.current) {
      toast.error('Address service not ready — please try again');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        geocoderRef
          .current!.geocode({ location })
          .then((res) => {
            const first = res.results[0];
            if (!first) {
              toast.error('No address found at current location');
              return;
            }
            const parsed = parseGooglePlace(first.address_components);
            onChange({
              ...value,
              street: parsed.street ?? value.street,
              city: parsed.city ?? value.city,
              state: parsed.state ?? value.state,
              postalCode: parsed.postalCode ?? value.postalCode,
              country: parsed.country ?? value.country,
            });
            if (searchInputRef.current) {
              searchInputRef.current.value = first.formatted_address ?? '';
            }
            toast.success('Address filled from your location');
          })
          .catch(() => toast.error('Failed to resolve address from location'))
          .finally(() => setLocating(false));
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Location permission denied');
        } else {
          toast.error('Could not get current location');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const hasAddress =
    value.street.trim() || value.city.trim() || value.state.trim() || value.postalCode.trim();

  return (
    <div className="space-y-3">
      {showLabel && (
        <div>
          <label className="block text-xs font-medium mb-1">Label</label>
          <select
            value={value.label}
            onChange={(e) =>
              onChange({ ...value, label: e.target.value as 'home' | 'office' | 'other' })
            }
            className="w-full px-3 py-2 bg-surface border border-border rounded-apple focus:border-primary focus:outline-none text-sm"
          >
            <option value="home">Home</option>
            <option value="office">Office</option>
            <option value="other">Other</option>
          </select>
        </div>
      )}

      {!manualMode && (
        <div>
          <label className="block text-xs font-medium mb-1">Search address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={ready ? 'Start typing your address…' : 'Loading…'}
              disabled={!ready}
              className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-apple focus:border-primary focus:outline-none text-sm disabled:opacity-60"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={!ready || locating}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover disabled:opacity-50"
            >
              {locating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MapPin className="w-3.5 h-3.5" />
              )}
              {locating ? 'Locating…' : 'Use my current location'}
            </button>
            <button
              type="button"
              onClick={() => setManualMode(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              <Pencil className="w-3.5 h-3.5" />
              Enter manually
            </button>
          </div>
        </div>
      )}

      {(manualMode || hasAddress) && (
        <div className="space-y-3">
          {manualMode && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className="text-xs font-medium text-primary hover:text-primary-hover"
              >
                Use address search instead
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1">Street *</label>
            <input
              type="text"
              value={value.street}
              onChange={(e) => onChange({ ...value, street: e.target.value })}
              placeholder="123 Main Street"
              className="w-full px-3 py-2 bg-surface border border-border rounded-apple focus:border-primary focus:outline-none text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">City *</label>
              <input
                type="text"
                value={value.city}
                onChange={(e) => onChange({ ...value, city: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-apple focus:border-primary focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">State</label>
              <input
                type="text"
                value={value.state}
                onChange={(e) => onChange({ ...value, state: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-apple focus:border-primary focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Postal</label>
              <input
                type="text"
                value={value.postalCode}
                onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-apple focus:border-primary focus:outline-none text-sm"
              />
            </div>
          </div>

          {showCountry && (
            <div>
              <label className="block text-xs font-medium mb-1">Country</label>
              <input
                type="text"
                value={value.country}
                onChange={(e) => onChange({ ...value, country: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-apple focus:border-primary focus:outline-none text-sm"
              />
            </div>
          )}

          {showLandmark && (
            <div>
              <label className="block text-xs font-medium mb-1">Landmark (optional)</label>
              <input
                type="text"
                value={value.landmark ?? ''}
                onChange={(e) => onChange({ ...value, landmark: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-apple focus:border-primary focus:outline-none text-sm"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
