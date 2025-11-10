'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, Search, Crosshair, AlertCircle } from 'lucide-react';

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}

interface GoogleMapsLocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
  initialAddress?: string;
  initialLatitude?: number;
  initialLongitude?: number;
  className?: string;
  height?: string;
}

const GoogleMapsLocationPicker: React.FC<GoogleMapsLocationPickerProps> = ({
  onLocationSelect,
  initialAddress = '',
  initialLatitude,
  initialLongitude,
  className = '',
  height = '400px'
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(initialAddress);
  const [currentLocation, setCurrentLocation] = useState<LocationData>({
    address: initialAddress,
    latitude: initialLatitude || 39.8283,
    longitude: initialLongitude || -98.5795
  });

  // Default to center USA coordinates if no initial coordinates provided
  const defaultCenter = {
    lat: initialLatitude || 39.8283,
    lng: initialLongitude || -98.5795
  };

  const initializeMap = useCallback(async () => {
    if (!mapRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get API key from environment variables
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        throw new Error('Google Maps API key is not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables.');
      }

      const loader = new Loader({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['places', 'geometry']
      });

      const google = await loader.load();
      
      // Initialize map
      const map = new google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      mapInstanceRef.current = map;

      // Initialize marker
      const marker = new google.maps.Marker({
        position: defaultCenter,
        map: map,
        draggable: true,
        title: 'Driver Base Location'
      });

      markerRef.current = marker;

      // Initialize autocomplete for search input
      if (searchInputRef.current) {
        const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'us' } // Restrict to USA
        });

        autocompleteRef.current = autocomplete;

        // Handle place selection from autocomplete
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          
          if (place.geometry && place.geometry.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const address = place.formatted_address || '';

            updateLocation(lat, lng, address);
          }
        });
      }

      // Handle map clicks
      map.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          
          // Reverse geocode to get address
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat, lng } },
            (results, status) => {
              if (status === 'OK' && results && results[0]) {
                updateLocation(lat, lng, results[0].formatted_address);
              } else {
                updateLocation(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
              }
            }
          );
        }
      });

      // Handle marker drag
      marker.addListener('dragend', () => {
        const position = marker.getPosition();
        if (position) {
          const lat = position.lat();
          const lng = position.lng();
          
          // Reverse geocode to get address
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat, lng } },
            (results, status) => {
              if (status === 'OK' && results && results[0]) {
                updateLocation(lat, lng, results[0].formatted_address);
              } else {
                updateLocation(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
              }
            }
          );
        }
      });

      setIsLoaded(true);
      setIsLoading(false);

      // If we have initial coordinates, update the location
      if (initialLatitude && initialLongitude) {
        updateLocation(initialLatitude, initialLongitude, initialAddress);
      }

    } catch (err) {
      console.error('Error initializing Google Maps:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Google Maps');
      setIsLoading(false);
    }
  }, [defaultCenter.lat, defaultCenter.lng, initialAddress]);

  const updateLocation = useCallback((lat: number, lng: number, address: string) => {
    const locationData: LocationData = {
      latitude: lat,
      longitude: lng,
      address: address
    };

    setCurrentLocation(locationData);
    setSearchValue(address);

    // Update map and marker
    if (mapInstanceRef.current && markerRef.current) {
      const position = { lat, lng };
      mapInstanceRef.current.setCenter(position);
      markerRef.current.setPosition(position);
    }

    // Notify parent component
    onLocationSelect(locationData);
  }, [onLocationSelect]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Reverse geocode to get address
        if (window.google) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat, lng } },
            (results, status) => {
              setIsLoading(false);
              if (status === 'OK' && results && results[0]) {
                updateLocation(lat, lng, results[0].formatted_address);
              } else {
                updateLocation(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
              }
            }
          );
        } else {
          setIsLoading(false);
          updateLocation(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      },
      (error) => {
        setIsLoading(false);
        console.error('Error getting current location:', error);
        alert('Unable to get your current location. Please search for an address or click on the map.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [updateLocation]);

  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  if (error) {
    return (
      <div className={`border border-red-300 rounded-lg p-4 bg-red-50 ${className}`}>
        <div className="flex items-center space-x-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Google Maps Error</span>
        </div>
        <p className="text-red-600 text-sm mt-2">{error}</p>
        <p className="text-red-600 text-xs mt-1">
          Please ensure you have added your Google Maps API key to the environment variables.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search for an address..."
          className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={isLoading}
          className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-blue-600 disabled:opacity-50"
          title="Use current location"
        >
          <Crosshair className="h-4 w-4" />
        </button>
      </div>

      {/* Map Container */}
      <div className="relative border border-gray-300 rounded-lg overflow-hidden">
        <div
          ref={mapRef}
          style={{ height }}
          className="w-full"
        />
        
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Loading map...</span>
            </div>
          </div>
        )}

        {/* Map Instructions */}
        {isLoaded && (
          <div className="absolute top-3 left-3 bg-white bg-opacity-90 rounded-lg px-3 py-2 text-xs text-gray-600 shadow-sm">
            <div className="flex items-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span>Click on map or drag marker to set location</span>
            </div>
          </div>
        )}
      </div>

      {/* Selected Location Info */}
      {currentLocation.address && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <div className="font-medium text-gray-700 mb-1">Selected Location:</div>
          <div className="text-gray-600">{currentLocation.address}</div>
          <div className="text-gray-500 text-xs mt-1">
            Lat: {currentLocation.latitude.toFixed(6)}, Lng: {currentLocation.longitude.toFixed(6)}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMapsLocationPicker;