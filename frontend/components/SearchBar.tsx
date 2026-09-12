"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Compass,
  MapPin,
  Search,
  UsersRound,
} from "lucide-react";
import { apiUrl } from "@/lib/site";

export default function SearchBar() {
  const router = useRouter();
  const isDevelopment = process.env.NODE_ENV !== "production";

  const [cities, setCities] = useState<string[]>(
    isDevelopment
      ? ["London", "New York", "Edinburgh", "Miami"]
      : []
  );

  const [services, setServices] = useState<string[]>(
    isDevelopment
      ? ["Tour Guide", "Photographer", "Food Expert", "Local Guide", "Interpreter"]
      : []
  );

  const [city, setCity] = useState(isDevelopment ? "London" : "");
  const [service, setService] = useState(isDevelopment ? "Tour Guide" : "");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("1");
  const [optionsError, setOptionsError] = useState("");

  const [openDropdown, setOpenDropdown] = useState<"city" | "service" | "guests" | null>(null);

  const barRef = useRef<HTMLDivElement>(null);

  const guestOptions = [
    { value: "1", label: "1 guest" },
    { value: "2", label: "2 guests" },
    { value: "3", label: "3 guests" },
    { value: "4", label: "4 guests" },
    { value: "5", label: "5 guests" },
    { value: "6", label: "6 guests" },
  ];

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setOptionsError("");
        const [cityResponse, serviceResponse] = await Promise.all([
          fetch(`${apiUrl}/api/content/cities`),
          fetch(`${apiUrl}/api/content/service-categories`),
        ]);

        if (cityResponse.ok && alive) {
          const rows = await cityResponse.json();
          const names = rows
            .filter((row: any) => row.published !== false)
            .map((row: any) => row.name)
            .filter(Boolean);

          if (names.length) {
            setCities(names);
            setCity((current) => (names.includes(current) ? current : names[0]));
          }
        }

        if (serviceResponse.ok && alive) {
          const rows = await serviceResponse.json();
          const names = rows
            .filter((row: any) => row.active !== false)
            .map((row: any) => row.name)
            .filter(Boolean);

          if (names.length) {
            setServices(names);
            setService((current) => (names.includes(current) ? current : names[0]));
          }
        }
      } catch {
        if (!alive) return;

        setOptionsError("Destinations and experiences are temporarily unavailable.");

        if (!isDevelopment) {
          setCities([]);
          setServices([]);
          setCity("");
          setService("");
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [isDevelopment]);

  // Click outside and escape key handling
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenDropdown(null);
      }
    }

    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function search() {
    if (!city || !service) return;

    const params = new URLSearchParams();

    if (city) params.set("city", city);
    if (service) params.set("service", service);
    if (date) params.set("date", date);
    if (guests) params.set("guests", guests);

    router.push(`/explore?${params.toString()}`);
  }

  const selectedGuestLabel =
    guestOptions.find((g) => g.value === guests)?.label ||
    `${guests} guest${Number(guests) > 1 ? "s" : ""}`;

  return (
    <>
      <div ref={barRef} className="hal-searchbar" role="search" aria-label="Search HireALocals">
        {/* Destination Field */}
        <div
          className={`hal-search-field ${openDropdown === "city" ? "is-active" : ""}`}
          onClick={() => setOpenDropdown((curr) => (curr === "city" ? null : "city"))}
          role="button"
          tabIndex={0}
          aria-haspopup="listbox"
          aria-expanded={openDropdown === "city"}
          aria-label="Where to?"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpenDropdown((curr) => (curr === "city" ? null : "city"));
            }
          }}
        >
          <MapPin size={18} className="hal-search-icon" />
          <div className="hal-search-content">
            <span className="hal-search-label">Where to?</span>
            <div className="hal-search-value-wrap">
              <span className={`hal-search-value ${!city ? "is-placeholder" : ""}`}>
                {city || "Select city"}
              </span>
              <ChevronDown
                size={14}
                className={`hal-search-chevron ${openDropdown === "city" ? "is-open" : ""}`}
              />
            </div>
          </div>

          <select
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            {cities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          {openDropdown === "city" && (
            <div className="hal-search-dropdown" role="listbox" aria-label="Destinations">
              {cities.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="option"
                  aria-selected={city === item}
                  className={`hal-search-option ${city === item ? "is-selected" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCity(item);
                    setOpenDropdown(null);
                  }}
                >
                  <span>{item}</span>
                  {city === item && <Check size={14} className="hal-option-check" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Experience Type Field */}
        <div
          className={`hal-search-field ${openDropdown === "service" ? "is-active" : ""}`}
          onClick={() => setOpenDropdown((curr) => (curr === "service" ? null : "service"))}
          role="button"
          tabIndex={0}
          aria-haspopup="listbox"
          aria-expanded={openDropdown === "service"}
          aria-label="Experience type"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpenDropdown((curr) => (curr === "service" ? null : "service"));
            }
          }}
        >
          <Compass size={18} className="hal-search-icon" />
          <div className="hal-search-content">
            <span className="hal-search-label">Experience type</span>
            <div className="hal-search-value-wrap">
              <span className={`hal-search-value ${!service ? "is-placeholder" : ""}`}>
                {service || "Select experience"}
              </span>
              <ChevronDown
                size={14}
                className={`hal-search-chevron ${openDropdown === "service" ? "is-open" : ""}`}
              />
            </div>
          </div>

          <select
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            value={service}
            onChange={(e) => setService(e.target.value)}
          >
            {services.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          {openDropdown === "service" && (
            <div className="hal-search-dropdown" role="listbox" aria-label="Experience types">
              {services.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="option"
                  aria-selected={service === item}
                  className={`hal-search-option ${service === item ? "is-selected" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setService(item);
                    setOpenDropdown(null);
                  }}
                >
                  <span>{item}</span>
                  {service === item && <Check size={14} className="hal-option-check" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date Field */}
        <label className="hal-search-field hal-search-field-date" aria-label="Trip date">
          <CalendarDays size={18} className="hal-search-icon" />
          <div className="hal-search-content">
            <span className="hal-search-label">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Trip date"
              className="hal-search-date-input"
            />
          </div>
        </label>

        {/* Guests Field */}
        <div
          className={`hal-search-field hal-search-field-guests ${openDropdown === "guests" ? "is-active" : ""}`}
          onClick={() => setOpenDropdown((curr) => (curr === "guests" ? null : "guests"))}
          role="button"
          tabIndex={0}
          aria-haspopup="listbox"
          aria-expanded={openDropdown === "guests"}
          aria-label="Guests"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpenDropdown((curr) => (curr === "guests" ? null : "guests"));
            }
          }}
        >
          <UsersRound size={18} className="hal-search-icon" />
          <div className="hal-search-content">
            <span className="hal-search-label">Guests</span>
            <div className="hal-search-value-wrap">
              <span className="hal-search-value">{selectedGuestLabel}</span>
              <ChevronDown
                size={14}
                className={`hal-search-chevron ${openDropdown === "guests" ? "is-open" : ""}`}
              />
            </div>
          </div>

          <select
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
          >
            {guestOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          {openDropdown === "guests" && (
            <div className="hal-search-dropdown" role="listbox" aria-label="Guests">
              {guestOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="option"
                  aria-selected={guests === item.value}
                  className={`hal-search-option ${guests === item.value ? "is-selected" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setGuests(item.value);
                    setOpenDropdown(null);
                  }}
                >
                  <span>{item.label}</span>
                  {guests === item.value && <Check size={14} className="hal-option-check" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="button"
          className="btn hal-search-submit"
          onClick={search}
          disabled={!city || !service}
          aria-label="Search experiences"
        >
          <Search size={17} />
          <span>Search</span>
        </button>
      </div>

      {optionsError ? (
        <div className="hal-search-api-error" role="status">
          {optionsError}
        </div>
      ) : null}
    </>
  );
}
