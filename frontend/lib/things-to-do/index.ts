import { CityThingsToDoData } from "./types";
import { londonThingsToDo } from "./london";
import { newYorkThingsToDo } from "./new-york";

export * from "./types";

/**
 * Data registry of cities with sufficient curated, city-specific activity content.
 * New launch cities (e.g. Edinburgh, Miami) can be plugged in modularly without bloated files.
 */
const CURATED_CITIES: Record<string, CityThingsToDoData> = {
  london: londonThingsToDo,
  "new-york": newYorkThingsToDo,
};

/**
 * Retrieve curated Things To Do data for a given city slug.
 * Returns null if the city has not been curated with authentic activity data.
 */
export function getCuratedThingsToDo(citySlug: string): CityThingsToDoData | null {
  if (!citySlug) return null;
  const normalized = citySlug.toLowerCase().trim();
  return CURATED_CITIES[normalized] || null;
}

/**
 * Check whether a city slug is eligible for an indexable Things To Do page.
 * Used for data-driven 404 gating and sitemap inclusion.
 */
export function isThingsToDoEligible(citySlug: string): boolean {
  return getCuratedThingsToDo(citySlug) !== null;
}

/**
 * Return all currently eligible curated city datasets.
 */
export function getAllEligibleThingsToDoCities(): CityThingsToDoData[] {
  return Object.values(CURATED_CITIES);
}
