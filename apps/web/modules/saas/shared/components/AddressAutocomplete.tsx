"use client";

import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { MapPinIcon, Loader2Icon, MapIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@ui/lib";
import { useGoogleMaps } from "../providers/GoogleMapsProvider";
import { AddressMapPickerDialog } from "./AddressMapPickerDialog";

export interface AddressResult {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

// Type for new Places API suggestions
interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
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
  /** Current coordinates for map picker (optional) */
  coordinates?: { lat: number; lng: number } | null;
  /** Show map picker button (default: true) */
  showMapPicker?: boolean;
}

/**
 * AddressAutocomplete Component
 * 
 * Provides address input with Google Places autocomplete.
 * Uses the new Places API (Place class) for better compatibility.
 * Falls back to legacy API or manual input if new API is unavailable.
 * 
 * Story 10.1: Migrated to new Google Places API
 * 
 * @see Story 6.2: Create Quote 3-Column Cockpit
 * @see Story 10.1: Fix Google Maps Integration
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
  coordinates,
  showMapPicker = true,
}: AddressAutocompleteProps) {
  const t = useTranslations();
  const { isLoaded: isGoogleLoaded } = useGoogleMaps();
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // Create session token for billing optimization
  useEffect(() => {
    if (isGoogleLoaded && window.google?.maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
  }, [isGoogleLoaded]);

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

  // Fetch suggestions using new Places API
  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 3 || !isGoogleLoaded) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      // Try new Places API first (google.maps.places.AutocompleteSuggestion)
      if (window.google?.maps?.places?.AutocompleteSuggestion) {
        const request: google.maps.places.AutocompleteRequest = {
          input,
          includedPrimaryTypes: ["geocode", "establishment"],
          includedRegionCodes: ["fr"],
          sessionToken: sessionTokenRef.current || undefined,
        };

        const response = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        
        const formattedSuggestions: PlaceSuggestion[] = [];
        for (const s of response.suggestions) {
          if (s.placePrediction) {
            formattedSuggestions.push({
              placeId: s.placePrediction.placeId,
              mainText: s.placePrediction.mainText?.text || "",
              secondaryText: s.placePrediction.secondaryText?.text || "",
              fullText: s.placePrediction.text?.text || "",
            });
          }
        }

        setSuggestions(formattedSuggestions);
        setShowSuggestions(formattedSuggestions.length > 0);
      } else if (window.google?.maps?.places?.AutocompleteService) {
        // Fallback to legacy AutocompleteService
        const service = new google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          {
            input,
            componentRestrictions: { country: "fr" },
            types: ["geocode"],
            sessionToken: sessionTokenRef.current || undefined,
          },
          (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              const formattedSuggestions: PlaceSuggestion[] = predictions.map((p) => ({
                placeId: p.place_id,
                mainText: p.structured_formatting.main_text,
                secondaryText: p.structured_formatting.secondary_text || "",
                fullText: p.description,
              }));
              setSuggestions(formattedSuggestions);
              setShowSuggestions(formattedSuggestions.length > 0);
            } else {
              setSuggestions([]);
            }
          }
        );
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("[AddressAutocomplete] Error fetching suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [isGoogleLoaded]);

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
      fetchSuggestions(newValue);
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

  // Handle suggestion selection using new Place class
  const handleSelectSuggestion = useCallback(async (suggestion: PlaceSuggestion) => {
    setInputValue(suggestion.fullText);
    setShowSuggestions(false);

    try {
      // Try new Place class first
      if (window.google?.maps?.places?.Place) {
        const place = new google.maps.places.Place({ id: suggestion.placeId });
        await place.fetchFields({ fields: ["formattedAddress", "location"] });
        
        const address = place.formattedAddress || suggestion.fullText;
        const lat = place.location?.lat() ?? null;
        const lng = place.location?.lng() ?? null;

        onChange({ address, latitude: lat, longitude: lng });
        
        // Create new session token after successful selection
        if (window.google?.maps?.places?.AutocompleteSessionToken) {
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        }
        return;
      }

      // Fallback to legacy PlacesService
      if (window.google?.maps?.places?.PlacesService) {
        const dummyDiv = document.createElement("div");
        const service = new google.maps.places.PlacesService(dummyDiv);
        
        service.getDetails(
          {
            placeId: suggestion.placeId,
            fields: ["formatted_address", "geometry"],
            sessionToken: sessionTokenRef.current || undefined,
          },
          (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place) {
              const address = place.formatted_address || suggestion.fullText;
              const lat = place.geometry?.location?.lat() ?? null;
              const lng = place.geometry?.location?.lng() ?? null;

              onChange({ address, latitude: lat, longitude: lng });
            } else {
              onChange({ address: suggestion.fullText, latitude: null, longitude: null });
            }
            
            // Create new session token after selection
            if (window.google?.maps?.places?.AutocompleteSessionToken) {
              sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
            }
          }
        );
        return;
      }

      // No API available - use text only
      onChange({ address: suggestion.fullText, latitude: null, longitude: null });
    } catch (error) {
      console.error("[AddressAutocomplete] Error getting place details:", error);
      onChange({ address: suggestion.fullText, latitude: null, longitude: null });
    }
  }, [onChange]);

  // Track if a suggestion is being selected to prevent blur interference
  const isSelectingRef = useRef(false);

  // Handle blur - update value without coordinates if no selection made
  const handleBlur = () => {
    // Delay to allow click on suggestion to complete
    setTimeout(() => {
      // Don't update if we're in the middle of selecting a suggestion
      if (isSelectingRef.current) {
        isSelectingRef.current = false;
        return;
      }
      if (inputValue !== value) {
        onChange({
          address: inputValue,
          latitude: null,
          longitude: null,
        });
      }
      setShowSuggestions(false);
    }, 150);
  };

  // Handle map picker selection
  const handleMapSelect = useCallback((result: AddressResult) => {
    setInputValue(result.address);
    onChange(result);
    setMapDialogOpen(false);
  }, [onChange]);

  return (
    <div className={cn("space-y-2 relative", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
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
        
        {/* Map picker button */}
        {showMapPicker && isGoogleLoaded && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setMapDialogOpen(true)}
            disabled={disabled}
            title={t("common.map.selectOnMap")}
          >
            <MapIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Map picker dialog */}
      <AddressMapPickerDialog
        open={mapDialogOpen}
        onOpenChange={setMapDialogOpen}
        initialPosition={coordinates}
        onConfirm={handleMapSelect}
      />

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-[9999] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.placeId}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
              onMouseDown={(e) => {
                // Prevent blur from firing before selection is complete
                e.preventDefault();
                isSelectingRef.current = true;
                handleSelectSuggestion(suggestion);
              }}
            >
              <div className="flex items-start gap-2">
                <MapPinIcon className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <div className="font-medium">
                    {suggestion.mainText}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {suggestion.secondaryText}
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
