"use client";

import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { MapPinIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@ui/lib";

export interface AddressResult {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface AddressAutocompleteProps {
  id: string;
  label: string;
  value: string;
  onChange: (result: AddressResult) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * AddressAutocomplete Component
 * 
 * Provides address input with Google Places autocomplete.
 * Falls back to manual input if Google API is unavailable.
 * 
 * @see Story 6.2: Create Quote 3-Column Cockpit
 * @see UX Spec 6.1.3 Address Autocomplete
 */
export function AddressAutocomplete({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  className,
}: AddressAutocompleteProps) {
  const t = useTranslations();
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize Google Places services
  useEffect(() => {
    if (typeof window !== "undefined" && window.google?.maps?.places) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
      // Create a dummy div for PlacesService (required by API)
      const dummyDiv = document.createElement("div");
      placesService.current = new google.maps.places.PlacesService(dummyDiv);
      setIsGoogleLoaded(true);
    }
  }, []);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions from Google Places
  const fetchSuggestions = useCallback((input: string) => {
    if (!autocompleteService.current || input.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    autocompleteService.current.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: "fr" }, // Restrict to France
        types: ["address", "establishment"],
      },
      (predictions, status) => {
        setIsLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      }
    );
  }, []);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce API call
    debounceTimer.current = setTimeout(() => {
      if (isGoogleLoaded) {
        fetchSuggestions(newValue);
      }
    }, 300);

    // If Google is not loaded, just update the value without coordinates
    if (!isGoogleLoaded) {
      onChange({
        address: newValue,
        latitude: null,
        longitude: null,
      });
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current) {
      // Fallback: use description without coordinates
      setInputValue(prediction.description);
      onChange({
        address: prediction.description,
        latitude: null,
        longitude: null,
      });
      setShowSuggestions(false);
      return;
    }

    // Get place details for coordinates
    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["formatted_address", "geometry"],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const address = place.formatted_address || prediction.description;
          const lat = place.geometry?.location?.lat() ?? null;
          const lng = place.geometry?.location?.lng() ?? null;

          setInputValue(address);
          onChange({
            address,
            latitude: lat,
            longitude: lng,
          });
        } else {
          // Fallback
          setInputValue(prediction.description);
          onChange({
            address: prediction.description,
            latitude: null,
            longitude: null,
          });
        }
        setShowSuggestions(false);
      }
    );
  };

  // Handle blur - update value without coordinates if no selection made
  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      if (inputValue !== value) {
        onChange({
          address: inputValue,
          latitude: null,
          longitude: null,
        });
      }
    }, 200);
  };

  return (
    <div className={cn("space-y-2 relative", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="relative">
        <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          id={id}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 pr-9"
          autoComplete="off"
        />
        {isLoading && (
          <Loader2Icon className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
              onClick={() => handleSelectSuggestion(prediction)}
            >
              <div className="flex items-start gap-2">
                <MapPinIcon className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <div className="font-medium">
                    {prediction.structured_formatting.main_text}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {prediction.structured_formatting.secondary_text}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Fallback message when Google is not loaded */}
      {!isGoogleLoaded && inputValue.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("quotes.create.addressManualEntry")}
        </p>
      )}
    </div>
  );
}

export default AddressAutocomplete;
