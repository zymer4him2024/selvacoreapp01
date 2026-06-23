'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, Pencil } from 'lucide-react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { Address } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';

type AddressForm = Omit<Address, 'id'>;

interface AddressAutocompleteFieldProps {
  value: AddressForm;
  onChange: (next: AddressForm) => void;
  showLabel?: boolean;
  showCountry?: boolean;
  showLandmark?: boolean;
  // Render the manual fields up front (in addition to the search box) instead of
  // waiting for the user to start typing or click "Enter manually".
  alwaysShowFields?: boolean;
}

interface MapsBundle {
  places: google.maps.PlacesLibrary;
  geocoding: google.maps.GeocodingLibrary;
}

// Normalized address component shape so the new Places API (longText/shortText)
// and the legacy Geocoder (long_name/short_name) can share one parser.
interface NormComponent {
  long: string;
  short: string;
  types: string[];
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

function fromPlaceComponents(
  components: google.maps.places.AddressComponent[]
): NormComponent[] {
  return components.map((c) => ({
    long: c.longText ?? '',
    short: c.shortText ?? '',
    types: c.types,
  }));
}

function fromGeocoderComponents(
  components: google.maps.GeocoderAddressComponent[]
): NormComponent[] {
  return components.map((c) => ({
    long: c.long_name,
    short: c.short_name,
    types: c.types,
  }));
}

function parseComponents(components: NormComponent[]): Partial<AddressForm> {
  const get = (type: string, short = false) => {
    const c = components.find((x) => x.types.includes(type));
    return c ? (short ? c.short : c.long) : '';
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
  alwaysShowFields = false,
}: AddressAutocompleteFieldProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const placeElRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // The gmp-select handler is registered once but needs the latest value/onChange.
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const [ready, setReady] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let placeEl: google.maps.places.PlaceAutocompleteElement | null = null;

    const handleSelect = async (event: google.maps.places.PlacePredictionSelectEvent) => {
      const place = event.placePrediction.toPlace();
      try {
        await place.fetchFields({ fields: ['addressComponents'] });
      } catch {
        toast.error(t.components.address.failedResolve);
        return;
      }
      if (!place.addressComponents) return;
      const parsed = parseComponents(fromPlaceComponents(place.addressComponents));
      const current = valueRef.current;
      onChangeRef.current({
        ...current,
        street: parsed.street ?? current.street,
        city: parsed.city ?? current.city,
        state: parsed.state ?? current.state,
        postalCode: parsed.postalCode ?? current.postalCode,
        country: parsed.country ?? current.country,
      });
    };

    loadGoogleMaps()
      .then((libs) => {
        if (cancelled) return;
        // Always create the geocoder — it powers postal-code autofill and
        // "use my location", which work even when the search box is hidden.
        geocoderRef.current = new libs.geocoding.Geocoder();
        if (containerRef.current) {
          const el = new google.maps.places.PlaceAutocompleteElement({});
          el.style.width = '100%';
          el.addEventListener('gmp-select', handleSelect);
          containerRef.current.appendChild(el);
          placeEl = el;
          placeElRef.current = el;
        }
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error(t.components.address.autoUnavailable);
        setManualMode(true);
        setReady(true);
      });

    return () => {
      cancelled = true;
      if (placeEl) {
        placeEl.removeEventListener('gmp-select', handleSelect as unknown as EventListener);
        placeEl.remove();
      }
      placeElRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t.components.address.geolocNotSupported);
      return;
    }
    if (!geocoderRef.current) {
      toast.error(t.components.address.addrServiceNotReady);
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
              toast.error(t.components.address.noAddrAtLocation);
              return;
            }
            const parsed = parseComponents(fromGeocoderComponents(first.address_components));
            onChange({
              ...value,
              street: parsed.street ?? value.street,
              city: parsed.city ?? value.city,
              state: parsed.state ?? value.state,
              postalCode: parsed.postalCode ?? value.postalCode,
              country: parsed.country ?? value.country,
            });
            if (placeElRef.current) {
              placeElRef.current.value = first.formatted_address ?? '';
            }
            toast.success(t.components.address.addrFilled);
          })
          .catch(() => toast.error(t.components.address.failedResolve))
          .finally(() => setLocating(false));
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error(t.components.address.locationDenied);
        } else {
          toast.error(t.components.address.couldNotGetLocation);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Auto-fill city/state/country by geocoding the postal code. Fires on blur of
  // the postal field. Country (if already entered) narrows the lookup; otherwise
  // the geocoder picks the best global match. Street is never overwritten.
  const fillFromPostalCode = () => {
    const code = value.postalCode.trim();
    if (!code || !geocoderRef.current) return;
    const query = [code, value.country.trim()].filter(Boolean).join(', ');
    geocoderRef.current
      .geocode({ address: query })
      .then((res) => {
        const first = res.results[0];
        if (!first) return;
        const parsed = parseComponents(fromGeocoderComponents(first.address_components));
        onChange({
          ...value,
          city: parsed.city || value.city,
          state: parsed.state || value.state,
          country: parsed.country || value.country,
        });
      })
      .catch(() => {
        /* silent — leave whatever the user typed */
      });
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
            className="sc-input"
          >
            <option value="home">Home</option>
            <option value="office">Office</option>
            <option value="other">Other</option>
          </select>
        </div>
      )}

      {!manualMode && (
        <div>
          <label className="block text-xs font-medium mb-1">{t.components.address.search}</label>
          <div ref={containerRef} className="sc-address-autocomplete" />
          {!ready && (
            <p className="text-xs text-soft mt-1">Loading…</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={!ready || locating}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-hover disabled:opacity-50"
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
              className="inline-flex items-center gap-1.5 text-xs font-medium text-soft hover:text-ink"
            >
              <Pencil className="w-3.5 h-3.5" />
              Enter manually
            </button>
          </div>
        </div>
      )}

      {(manualMode || hasAddress || alwaysShowFields) && (
        <div className="space-y-3">
          {manualMode && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className="text-xs font-medium text-brand hover:text-brand-hover"
              >
                Use address search instead
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1">{t.components.address.street} *</label>
            <input
              type="text"
              value={value.street}
              onChange={(e) => onChange({ ...value, street: e.target.value })}
              placeholder={t.components.address.streetPlaceholder}
              className="sc-input"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">{t.components.address.city} *</label>
              <input
                type="text"
                value={value.city}
                onChange={(e) => onChange({ ...value, city: e.target.value })}
                className="sc-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">State</label>
              <input
                type="text"
                value={value.state}
                onChange={(e) => onChange({ ...value, state: e.target.value })}
                className="sc-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Postal</label>
              <input
                type="text"
                value={value.postalCode}
                onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
                onBlur={fillFromPostalCode}
                className="sc-input"
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
                className="sc-input"
              />
            </div>
          )}

          {showLandmark && (
            <div>
              <label className="block text-xs font-medium mb-1">{t.components.address.landmarkOptional}</label>
              <input
                type="text"
                value={value.landmark ?? ''}
                onChange={(e) => onChange({ ...value, landmark: e.target.value })}
                className="sc-input"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
