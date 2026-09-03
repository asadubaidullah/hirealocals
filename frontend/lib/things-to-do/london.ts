import { CityThingsToDoData } from "./types";

export const londonThingsToDo: CityThingsToDoData = {
  citySlug: "london",
  cityName: "London",
  countrySlug: "uk",
  countryName: "United Kingdom",
  countryCode: "GB",
  heroEyebrow: "Insider Destination Guide",
  heroTitle: "Authentic Things to Do in London with a Local",
  heroLead:
    "Beyond the crowded bus tours and West End souvenir shops lies a city of historic villages, secret mews, world-class street markets, and quiet canal paths. Discover how Londoners actually experience their city.",
  metaTitle: "10 Best Things to Do in London with a Local (2026 Guide)",
  metaDescription:
    "Discover authentic things to do in London beyond standard tourist sights. Explore historic mews, Borough Market food trails, Shoreditch street art, and scenic walks.",
  activitiesCountText: "6 curated neighborhood activities",
  activities: [
    {
      id: "london-mews-kensington",
      title: "Wander Historic Mews & Secret Passages in Kensington & Covent Garden",
      category: "neighborhoods-culture",
      categoryLabel: "Historic Neighborhoods",
      bestFor: "First-timers, architecture lovers, and travelers seeking quiet streets",
      duration: "2 to 3 hours",
      neighborhood: "Kensington & Covent Garden",
      summary:
        "Step off bustling thoroughfares into quiet residential cobbled mews originally built for 18th-century horse carriages. In Covent Garden, hidden alleys like Goodwin's Court and Cecil Court retain original gas-lamp fixtures and historic bow-fronted antiquarian bookshops.",
      insiderTip:
        "Visit Kynance Mews in South Kensington for photogenic wisteria in spring and rich Virginia creeper foliage in autumn, best visited before midday for soft natural light.",
      practicalTip:
        "Wear flat, comfortable walking shoes. Nearest underground stations: South Kensington (District/Circle/Piccadilly) and Covent Garden (Piccadilly line).",
      relatedExperienceSlug: "tour-guide",
      relatedExperienceName: "Private Walking Guide"
    },
    {
      id: "london-borough-market-tasting",
      title: "Borough Market Food Trail & South Bank Riverside Exploration",
      category: "food-markets",
      categoryLabel: "Food & Markets",
      bestFor: "Food lovers, artisan market fans, and casual lunch walkers",
      duration: "2.5 to 3.5 hours",
      neighborhood: "London Bridge & Bankside",
      summary:
        "Explore one of the oldest trading markets in London, nestled beneath Victorian railway arches. Sample British farmhouse cheeses, fresh sourdough pastries, artisan hot ciders, and global street food stalls, followed by a breeze-filled riverside stroll along Bankside past Shakespeare's Globe.",
      insiderTip:
        "Arrive around 10:30 AM on a Thursday or Friday to experience all traders fully open before the peak office lunchtime crowd arrives at 12:30 PM.",
      practicalTip:
        "Traders operate almost entirely cashless—use contactless card or mobile wallet. London Bridge station has step-free street exits.",
      relatedExperienceSlug: "food-expert",
      relatedExperienceName: "Local Food Expert"
    },
    {
      id: "london-shoreditch-street-art",
      title: "Shoreditch Street Art Murals & Vintage Brick Lane Culture",
      category: "neighborhoods-culture",
      categoryLabel: "Art & Culture",
      bestFor: "Creative travelers, vintage shoppers, and photography enthusiasts",
      duration: "2 to 3 hours",
      neighborhood: "Shoreditch & Spitalfields",
      summary:
        "East London's creative hub offers an ever-evolving outdoor canvas of murals, indie craft studios, and immigrant heritage. Walk through Redchurch Street, Whitby Street, and Hanbury Street to examine world-class murals and discover independent vintage markets.",
      insiderTip:
        "Look up above eye level on Brick Lane to see historic Huguenot weaver attic windows and multi-layered community history.",
      practicalTip:
        "Shoreditch High Street (Overground) or Liverpool Street (Elizabeth line & Central line) provide the fastest direct transit.",
      relatedExperienceSlug: "photographer",
      relatedExperienceName: "Street Photography Walk"
    },
    {
      id: "london-regents-canal-walk",
      title: "Regent's Canal Waterside Walk from Camden to Little Venice",
      category: "scenic-walks",
      categoryLabel: "Scenic Walks",
      bestFor: "Couples, nature lovers, and travelers wanting a peaceful car-free walk",
      duration: "2 to 3 hours (approx. 4.5 km)",
      neighborhood: "Camden, Regent's Park & Maida Vale",
      summary:
        "Follow a tranquil 19th-century canal towpath past colorful canal boats, weeping willow trees, and the northern edge of Regent's Park. It offers an entirely car-free route cutting straight across northwest London.",
      insiderTip:
        "Take a brief 5-minute detour up Primrose Hill for one of the most protected, uninterrupted panoramic views of the central London skyline.",
      practicalTip:
        "The brick towpath can be narrow under bridges; keep to the pedestrian side when shared with passing commuter cyclists.",
      relatedExperienceSlug: "local-guide",
      relatedExperienceName: "City Orientation Walk"
    },
    {
      id: "london-city-roman-history",
      title: "Historic City of London & Medieval Alleyway Discovery",
      category: "history-heritage",
      categoryLabel: "History & Heritage",
      bestFor: "History enthusiasts, architecture admirers, and weekend walkers",
      duration: "2 to 2.5 hours",
      neighborhood: "The Square Mile (City of London)",
      summary:
        "Explore the ancient heart where Roman Londinium was founded over 2,000 years ago. Trace remaining sections of the Roman wall near Tower Hill, wander through the ornate Victorian roof of Leadenhall Market, and discover tranquil church courtyards designed by Sir Christopher Wren.",
      insiderTip:
        "The City of London is bustling with finance professionals on weekdays but wonderfully peaceful on Saturday and Sunday mornings.",
      practicalTip:
        "Combine your walk with free advance-booked access to high-rise public viewing platforms like Horizon 22 or Sky Garden.",
      relatedExperienceSlug: "tour-guide",
      relatedExperienceName: "Private Walking Guide"
    },
    {
      id: "london-south-bank-sunset",
      title: "Sunset River Thames Walk: Tower Bridge to Southwark Cathedral",
      category: "scenic-walks",
      categoryLabel: "Scenic Photography",
      bestFor: "Golden hour photography, evening strolls, and river vistas",
      duration: "1.5 to 2 hours",
      neighborhood: "South Bank & Bermondsey",
      summary:
        "Watch the city transition from dusk to evening as architectural landmarks illuminate the water. Walk the pedestrianized Queen's Walk from Tower Bridge, passing historic wharves, HMS Belfast, and admiring views of St Paul's Cathedral across the river.",
      insiderTip:
        "Pause outside Southwark Cathedral at dusk to admire the contrast between medieval stone architecture and the modern Shard skyscraper towering above.",
      practicalTip:
        "The promenade is wide, well-lit, and completely car-free, making it one of the safest and most enjoyable evening walks in London.",
      relatedExperienceSlug: "photographer",
      relatedExperienceName: "Street Photography Walk"
    }
  ],
  neighborhoods: [
    {
      name: "Soho & Covent Garden",
      vibe: "Lively & Historic",
      highlight: "Theatre heritage, historic gastropubs, and pedestrianized alleys like Seven Dials.",
      whyVisit: "Ideal for evening strolls, casual dinners, and independent retail away from big chains.",
      transitTip: "Piccadilly, Northern, and Central lines connect via Leicester Square or Tottenham Court Road."
    },
    {
      name: "Shoreditch & East End",
      vibe: "Artistic & Cultural",
      highlight: "Street art murals, Sunday flower markets on Columbia Road, and global street food.",
      whyVisit: "Offers a modern, dynamic counterpoint to London's royal and governmental districts.",
      transitTip: "Overground to Shoreditch High Street or Elizabeth line to Liverpool Street."
    },
    {
      name: "South Bank & Bankside",
      vibe: "Cultural & Riverside",
      highlight: "Borough Market, Shakespeare's Globe, and uninterrupted Thames promenade views.",
      whyVisit: "Unmatched skyline scenery and effortless pedestrian connectivity across central London.",
      transitTip: "London Bridge or Waterloo stations give immediate riverside access."
    },
    {
      name: "Kensington & Chelsea",
      vibe: "Leafy & Elegant",
      highlight: "Victorian mews houses, royal parks, museum quarter, and quiet garden squares.",
      whyVisit: "Great for unhurried walking, museum visits, and seeing traditional residential London.",
      transitTip: "District or Piccadilly line to South Kensington or Gloucester Road."
    }
  ],
  practicalGuide: {
    transitTips: [
      "Use contactless bank cards or Apple/Google Pay directly at Tube and bus gates—there is no need to buy paper tickets or physical Oyster cards.",
      "London buses are completely cashless. A single bus fare is capped with daily unlimited hopper transfers within an hour.",
      "The Elizabeth line provides ultra-fast, air-conditioned transit across central London from Paddington through Liverpool Street."
    ],
    bestTimeToVisit:
      "May to June and September to October offer mild walking weather, longer daylight, and manageable crowds.",
    pacingAdvice:
      "London is vast. Focus on one or two adjacent neighborhoods per day rather than zig-zagging across zones on the Underground."
  },
  faqs: [
    {
      question: "What are the most authentic things to do in London away from crowds?",
      answer:
        "Walking through historic residential mews in Kensington, following the car-free Regent's Canal towpath, exploring the City of London on weekend mornings, and visiting neighborhood street markets like Borough or Maltby Street early in the day provide rich, uncrowded experiences."
    },
    {
      question: "How can a local resident help enhance my time in London?",
      answer:
        "A local resident can help you navigate the transit network with ease, take you to hidden alleyways and independent pubs you'd otherwise pass by, and customize walks to your specific walking pace and interests."
    },
    {
      question: "How should I structure a 3-day itinerary in London?",
      answer:
        "We recommend dedicating Day 1 to Central London & historic mews; Day 2 to South Bank, Borough Market, and riverside walks; and Day 3 to East London's Shoreditch and Spitalfields cultural hubs."
    },
    {
      question: "Do I need to book activities or walking experiences far in advance?",
      answer:
        "Major national museum collections have free entry, but private guided walks and special exhibitions are best arranged at least 1 to 2 weeks ahead, especially during spring and summer travel peaks."
    }
  ]
};
