import { CityThingsToDoData } from "./types";

export const newYorkThingsToDo: CityThingsToDoData = {
  citySlug: "new-york",
  cityName: "New York",
  countrySlug: "usa",
  countryName: "United States",
  countryCode: "US",
  heroEyebrow: "Insider Destination Guide",
  heroTitle: "Authentic Things to Do in New York with a Local",
  heroLead:
    "Look beyond Times Square and crowded observation decks. New York is a mosaic of distinct village streets, historic immigrant food trails, peaceful urban waterways, and world-class street art. Experience the city the way New Yorkers live it.",
  metaTitle: "10 Best Things to Do in New York with a Local (2026 Guide)",
  metaDescription:
    "Discover authentic things to do in New York beyond tourist traps. Explore West Village brownstones, Chinatown food trails, Brooklyn Bridge walks, and Central Park secrets.",
  activitiesCountText: "6 curated neighborhood activities",
  activities: [
    {
      id: "nyc-greenwich-village-walk",
      title: "Wander West Village Brownstones & Historic Bohemian Alleys",
      category: "neighborhoods-culture",
      categoryLabel: "Historic Neighborhoods",
      bestFor: "Architecture lovers, literary enthusiasts, and relaxed afternoon walkers",
      duration: "2 to 3 hours",
      neighborhood: "Greenwich Village & West Village",
      summary:
        "Stroll through tree-lined diagonal streets that break away from Manhattan's rigid grid system. Discover 19th-century Greek Revival brownstones, secluded courtyard enclaves like Grove Court, historic jazz basements, and quiet independent bookstores.",
      insiderTip:
        "Pause at Washington Square Park to watch local chess masters near the marble arch, and visit C.O. Bigelow on 6th Avenue—the oldest apothecary in America, operating continuously since 1838.",
      practicalTip:
        "Subway lines A, C, E, B, D, F, and M stop directly at West 4th St-Washington Square for easy access.",
      relatedExperienceSlug: "local-guide",
      relatedExperienceName: "City Orientation Walk"
    },
    {
      id: "nyc-chinatown-les-food-trail",
      title: "Lower East Side to Chinatown Tenement & Culinary Heritage Trail",
      category: "food-markets",
      categoryLabel: "Food & Markets",
      bestFor: "Food explorers, cultural history enthusiasts, and street food lovers",
      duration: "2.5 to 3.5 hours",
      neighborhood: "Lower East Side & Chinatown",
      summary:
        "Trace generations of immigrant history across two intertwined enclaves. Taste hand-pulled noodles, fresh dim sum, classic Jewish deli staples, and artisan bakeries along historic Orchard and Doyers streets.",
      insiderTip:
        "Walk down Doyers Street—the historic curving alley once famous in Chinatown lore—which is now pedestrian-only with vibrant outdoor dining tables.",
      practicalTip:
        "While most shops accept contactless card payments, keeping $10 to $20 cash on hand is helpful for small grab-and-go dumpling windows.",
      relatedExperienceSlug: "food-expert",
      relatedExperienceName: "Local Food Expert"
    },
    {
      id: "nyc-brooklyn-bridge-dumbo",
      title: "Brooklyn Bridge Crossing & DUMBO Waterfront Skyline Walk",
      category: "scenic-walks",
      categoryLabel: "Scenic Photography",
      bestFor: "First-timers, photographers, and panoramic skyline admirers",
      duration: "2 to 3 hours",
      neighborhood: "DUMBO & Brooklyn Bridge Park",
      summary:
        "Walk across the iconic 1883 suspension bridge along the elevated pedestrian walkway. Step into DUMBO's cobblestone avenues, explore converted 19th-century warehouse galleries, and capture uninterrupted views of Lower Manhattan from Brooklyn Bridge Park.",
      insiderTip:
        "Walk early in the morning (before 8:30 AM) starting from the Brooklyn side toward Manhattan for softer morning light and fewer crowds.",
      practicalTip:
        "The pedestrian path is elevated above vehicle lanes with dedicated barriers separated from bicycles.",
      relatedExperienceSlug: "photographer",
      relatedExperienceName: "Street Photography Walk"
    },
    {
      id: "nyc-central-park-ramble",
      title: "Central Park Hidden Ramble Paths & Lake Waterways",
      category: "hidden-gems",
      categoryLabel: "Hidden Gems",
      bestFor: "Nature lovers, couples, and visitors wanting a peaceful respite from Midtown",
      duration: "2 to 3 hours",
      neighborhood: "Central Park (Mid-Park)",
      summary:
        "Escape the avenues into Frederick Law Olmsted's forested 36-acre Ramble sanctuary. Discover winding stone paths, rustic wooden bridges, quiet bird-watching lookouts, and the romantic cast-iron Bow Bridge stretching across the Lake.",
      insiderTip:
        "Head to the Conservatory Water (the model sailboat pond) for a relaxed outdoor espresso, or explore the North Woods for natural cascades.",
      practicalTip:
        "Central Park's interior paths are entirely vehicle-free. Download an offline map to navigate the winding trails of The Ramble.",
      relatedExperienceSlug: "tour-guide",
      relatedExperienceName: "Private Walking Guide"
    },
    {
      id: "nyc-highline-chelsea",
      title: "High Line Aerial Rail Park & Meatpacking Architecture Stroll",
      category: "neighborhoods-culture",
      categoryLabel: "Urban Architecture",
      bestFor: "Modern design lovers, art enthusiasts, and sunset strollers",
      duration: "1.5 to 2.5 hours",
      neighborhood: "Chelsea & Meatpacking District",
      summary:
        "Traverse an elevated 1.45-mile former freight railroad turned linear botanical park. Walk above street level admiring native grasses, rotating contemporary art installations, historic industrial facades, and sweeping Hudson River vistas.",
      insiderTip:
        "Take the 15th Street stairs down to explore Chelsea Market's artisan food hall, or end at the northern overlook near Hudson Yards.",
      practicalTip:
        "The High Line is entirely pedestrian-only; bikes, scooters, and pets are not permitted, creating a serene walking pace.",
      relatedExperienceSlug: "local-guide",
      relatedExperienceName: "City Orientation Walk"
    },
    {
      id: "nyc-bushwick-street-art",
      title: "Bushwick Street Murals & Independent Creative Studio District",
      category: "neighborhoods-culture",
      categoryLabel: "Art & Culture",
      bestFor: "Street art admirers, creative travelers, and modern cultural discovery",
      duration: "2 to 3 hours",
      neighborhood: "Bushwick, Brooklyn",
      summary:
        "Explore one of the world's most vibrant outdoor mural districts centered around the Bushwick Collective. Warehouse facades showcase monumental murals by celebrated international street artists alongside independent coffee roasters and vintage shops.",
      insiderTip:
        "The murals along Troutman Street and St. Nicholas Avenue change regularly, giving every visit fresh large-scale artwork to admire.",
      practicalTip:
        "Take the L subway train directly to Jefferson Street; the station exits directly into the main mural zone.",
      relatedExperienceSlug: "photographer",
      relatedExperienceName: "Street Photography Walk"
    }
  ],
  neighborhoods: [
    {
      name: "West Village & Greenwich Village",
      vibe: "Charming & Historic",
      highlight: "Tree-canopied brownstone avenues, historic cafes, and off-Broadway theatres.",
      whyVisit: "The quintessentially romantic NYC neighborhood with unhurried sidewalk culture.",
      transitTip: "A, C, E, B, D, F, M trains via West 4th St station."
    },
    {
      name: "Lower East Side & Chinatown",
      vibe: "Energetic & Culinary",
      highlight: "Dumpling spots, immigrant tenement heritage, and creative night markets.",
      whyVisit: "Deep culinary variety and tangible multi-generational neighborhood character.",
      transitTip: "F, J, M, Z trains via Delancey/Essex or B, D trains via Grand St."
    },
    {
      name: "DUMBO & Brooklyn Heights",
      vibe: "Scenic & Cobblestoned",
      highlight: "Riverfront promenade, iconic bridge views, and restored industrial architecture.",
      whyVisit: "Best panoramic skyline viewing location in the entire metropolitan area.",
      transitTip: "A, C trains to High St or F train to York St."
    },
    {
      name: "Chelsea & Meatpacking",
      vibe: "Modern & Creative",
      highlight: "The High Line park, world-class gallery district, and waterfront piers.",
      whyVisit: "A striking blend of 19th-century industrial brick and cutting-edge contemporary design.",
      transitTip: "A, C, E or L trains via 14th St / 8th Ave."
    }
  ],
  practicalGuide: {
    transitTips: [
      "Use OMNY tap-to-pay with your credit card or phone at subway turnstiles. A 7-day fare cap automatically applies after 12 paid rides within a Monday–Sunday cycle.",
      "Aptly named avenues run north–south, while numbered streets run east–west. Numbers climb as you travel uptown.",
      "The NYC Ferry ($4.50) is an affordable and scenic way to travel between Manhattan, Brooklyn, and Queens along the East River."
    ],
    bestTimeToVisit:
      "Mid-September through November and April to June offer pleasant walking temperatures and scenic foliage in city parks.",
    pacingAdvice:
      "Manhattan blocks are longer than they appear on maps. Group your activities geographically by borough or neighborhood clusters."
  },
  faqs: [
    {
      question: "What are unique things to do in New York away from tourist crowds?",
      answer:
        "Exploring the quiet brownstone streets of the West Village, walking the peaceful trails of The Ramble in Central Park, checking out the Bushwick street art collective, and exploring neighborhood bakeries in Chinatown offer genuine local experiences."
    },
    {
      question: "How can a local host make a New York trip smoother?",
      answer:
        "A local host can help first-time visitors master the subway system, show you where real New Yorkers eat on a budget, and guide you through neighborhood histories that standard guidebooks overlook."
    },
    {
      question: "How should I structure a 4-day trip to New York?",
      answer:
        "We suggest: Day 1 Lower Manhattan & Chinatown/LES; Day 2 West Village & High Line; Day 3 Central Park & Upper West Side; Day 4 Brooklyn Bridge, DUMBO, and Brooklyn neighborhoods."
    },
    {
      question: "Is New York easy to explore on foot?",
      answer:
        "Yes, New York is one of the most walkable cities in the world. Combine neighborhood walking with short subway hops between districts for the most efficient travel."
    }
  ]
};
