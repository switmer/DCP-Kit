import React, { FC, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useLoadScript } from "@react-google-maps/api";
import { Library } from "@googlemaps/js-api-loader";
import { Icon } from "@/components/ui/Icon";

type Props = {
  className?: string;
  classNameSuggestionsList?: string;
  autoFocus?: boolean;
  value?: string;
  placeholder?: string;
  handleChange?: (value: string) => void;
  onChange?: (e: any) => void;
  bypassPlacesApi?: boolean;
  setNewEntityInfo?: (p: any) => void;
  setNewLocation: (location: google.maps.places.PlaceResult | null) => void;
  setShowLocationInput?: (a: boolean) => void;
};

const libraries: Library[] = ["places"];

export const LocationInput: FC<Props> = (props) => {
  const [userInput, setUserInput] = useState(props.value);
  const [isFocused, setIsFocused] = useState(false);
  // const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // const [selectedPlace, setSelectedPlace] = useState<any>();

  const autocompleteService =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestionsRef = useRef<HTMLUListElement | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout>();

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_KEY as string,
    libraries,
  });

  useEffect(() => {
    if (isLoaded) {
      //-- initialize AutocompleteService and PlacesService after api is loaded.
      autocompleteService.current =
        new window.google.maps.places.AutocompleteService();

      placesService.current = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );
    }
  }, [isLoaded]);

  useEffect(() => {
    //-- cleanup timeout on unmount.
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  if (loadError) return <p>Error loading Google Maps API</p>;
  if (!isLoaded) return <p>Loading...</p>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (!value || value === "") {
      props.setNewLocation(null);
      setSuggestions([]);
      setUserInput("");

      return;
    }

    setUserInput(value);
    props.setNewEntityInfo &&
      props.setNewEntityInfo((p: any) => {
        return {
          ...p,
          address: value,
        };
      });

    if (value && autocompleteService.current) {
      autocompleteService.current.getPlacePredictions(
        { input: value },
        (predictions: any) => {
          setSuggestions(predictions || []);
        }
      );
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (suggestion: any) => {
    setUserInput(suggestion.description);
    props.setShowLocationInput?.(false);
    setSuggestions([]);

    //-- get detailed location information using PlacesService with the place_id.
    if (placesService.current) {
      placesService.current.getDetails(
        { placeId: suggestion.place_id },
        (placeDetails) => {
          if (placeDetails) {
            // setSelectedPlace(placeDetails);
            props.setNewLocation(placeDetails);
            // setUserInput(placeDetails.formatted_address);
          }
        }
      );
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    //-- check if the mouse click is within the suggestions list...
    const clickedWithinSuggestions = suggestionsRef.current?.contains(
      e.relatedTarget as Node
    );

    //- ...and if it's outside both the input and dropdown, close the dropdown.
    if (!clickedWithinSuggestions) {
      blurTimeoutRef.current = setTimeout(() => {
        setIsFocused(false);
        setSuggestions([]);
      }, 150);
    }
  };

  const handleInputFocus = () => null;

  return (
    <div className="relative">
      <input
        autoFocus={props.autoFocus}
        ref={inputRef}
        className={cn(
          "",
          props.className && props.className,
          isFocused && "border border-lime-300"
        )}
        placeholder={props.placeholder}
        type="text"
        value={userInput}
        onChange={handleChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
      />

      {suggestions.length > 0 && (
        <ul
          className={cn(
            "z-[1000] absolute top-[40px] w-full m-0 p-0 p-2 bg-stone-950 border border-white border-opacity-10 rounded-lg list-none",
            props.classNameSuggestionsList
          )}
          // style={{
          //   position: "absolute",
          //   top: "40px",
          //   width: "100%",
          //   backgroundColor: "#666",
          //   boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          //   zIndex: 1000,
          //   listStyleType: "none",
          //   margin: 0,
          //   padding: 0,
          // }}
        >
          <div className="flex items-center gap-2 p-2">
            <Icon
              name="google-color"
              className="w-[13px] h-[13px] text-white/60"
            />
            <li className="text-xs font-bold text-white/60">Google Results</li>
          </div>

          {suggestions.map((suggestion: any, i) => (
            <li
              className={cn(
                "flex items-center justify-start gap-2 px-[6px] pl-[12px] py-[8px] text-white/70 text-[13px] leading-5 cursor-pointer hover:bg-zinc-800 hover:text-white/90 hover:rounded-lg",
                i + 1 === suggestions.length && "border-none"
              )}
              key={suggestion.place_id}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectSuggestion(suggestion);
              }}
              // style={{
              //   padding: "6px",
              //   cursor: "pointer",
              //   borderBottom: "1px solid #464646",
              // }}
            >
              <Icon name="pin" className="w-4 h-4 text-white/30" />
              {suggestion.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
