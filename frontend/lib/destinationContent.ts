export type Neighborhood = {
  name: string;
  tagline: string;
  description: string;
  vibe: string;
};

export type DestinationFaq = {
  question: string;
  answer: string;
};

export type DestinationContent = {
  highlightsTitle: string;
  highlightsLead: string;
  neighborhoods: Neighborhood[];
  customFaqs: DestinationFaq[];
};

const CITY_DESTINATION_CONTENT: Record<string, DestinationContent> = {
  "new-york": {
    highlightsTitle: "Explore New York's iconic neighborhoods",
    highlightsLead: "New York is a mosaic of distinct villages and cultural pockets. A local guide helps you understand the rhythm, history, and food of each district.",
    neighborhoods: [
      {
        name: "Greenwich Village & SoHo",
        tagline: "Cast-iron architecture, brownstones & bohemian roots",
        description: "Wander through tree-lined historic streets, iconic music history spots, legendary espresso cafes, and world-class boutique streets.",
        vibe: "Historic & Creative"
      },
      {
        name: "Lower East Side & Chinatown",
        tagline: "Immigrant heritage, legendary delis & vibrant street markets",
        description: "Taste your way through historic tenement streets, dumplings, artisanal coffee roasters, and dynamic street art alleys.",
        vibe: "Culinary & Culture"
      },
      {
        name: "DUMBO & Brooklyn Waterfront",
        tagline: "Skyline panoramas, cobblestone streets & creative energy",
        description: "Stroll across the Brooklyn Bridge, explore waterfront parks, historic warehouses, and capture the classic Manhattan skyline view.",
        vibe: "Scenic & Photography"
      },
      {
        name: "Central Park & Upper West Side",
        tagline: "Quiet rambling paths, brownstone avenues & classic NYC life",
        description: "Discover hidden arches, peaceful lake overlooks, and residential avenues known for cultural landmarks and classic neighborhood bakeries.",
        vibe: "Relaxed & Classic"
      }
    ],
    customFaqs: [
      {
        question: "What does a New York local guide do?",
        answer: "A New York local is a resident who hosts private, personalized walking experiences. Unlike commercial tour groups, a local tailors the walk to your personal interests—whether that's navigating the subway, discovering hidden eateries in the East Village, street photography in Brooklyn, or exploring historic architecture."
      },
      {
        question: "How are private experiences different from standard NYC bus or group tours?",
        answer: "Private local experiences are 100% one-on-one (or just you and your travel companions). There are no megaphones, no rigid bus schedules, and no 30-person crowds. You set the walking pace, stop whenever you want for food or photos, and explore real neighborhoods where New Yorkers actually live and spend time."
      },
      {
        question: "Can a New York local help me get oriented on my first day?",
        answer: "Yes! First-day city orientation is one of our most popular requests. A local can meet you at your hotel or a central subway hub, show you how the MetroCard/OMNY tap-to-pay subway system works, point out essential neighborhood conveniences, and help you map out the rest of your stay."
      },
      {
        question: "How does pricing and payment protection work?",
        answer: "Locals set transparent hourly rates and clear service packages with zero hidden fees. When you book on HireALocals, your payment is held safely until your scheduled meeting is successfully completed."
      },
      {
        question: "Can I request a custom itinerary for New York?",
        answer: "Absolutely. You can browse local profiles and message a local directly with your ideas, or use our 'Request a Local' feature to describe your dream NYC itinerary and have interested verified locals submit custom proposals."
      }
    ]
  },
  "london": {
    highlightsTitle: "Explore London's historic villages and markets",
    highlightsLead: "London is a city of distinct villages, royal parks, and global food markets. Discover the stories behind centuries of history with someone who walks these streets daily.",
    neighborhoods: [
      {
        name: "Soho, Covent Garden & Seven Dials",
        tagline: "Hidden courtyards, theatre history & historic pubs",
        description: "Navigate past bustling avenues to uncover secret alleyways, historic taverns, and vibrant independent cafes in Central London.",
        vibe: "Lively & Central"
      },
      {
        name: "Shoreditch & Spitalfields",
        tagline: "World-class street art, vintage markets & food culture",
        description: "Explore the creative hub of East London, renowned for Brick Lane curry houses, Sunday markets, independent craft studios, and colorful murals.",
        vibe: "Artistic & Trendy"
      },
      {
        name: "South Bank & Borough Market",
        tagline: "Thames river walks, gourmet stalls & historic wharves",
        description: "Walk along the riverside from Shakespeare's Globe to London Bridge, sampling artisan produce and taking in riverside architecture.",
        vibe: "Food & Heritage"
      },
      {
        name: "Kensington & Notting Hill",
        tagline: "Pastel mews, antique market stalls & quiet royal gardens",
        description: "Stroll along Portobello Road, photogenic mews houses, and quiet leafy streets away from busy commercial thoroughfares.",
        vibe: "Photogenic & Charming"
      }
    ],
    customFaqs: [
      {
        question: "What is the benefit of hiring a local in London?",
        answer: "London is vast and multi-layered. Having a trusted resident with you means discovering tucked-away alleys, navigating the Tube and bus network effortlessly, finding authentic British pubs, and exploring vibrant neighborhoods outside the typical tourist bubble."
      },
      {
        question: "How do I book a private walk with a London local?",
        answer: "Browse available London local profiles, choose the experience that suits you, and select an available date. You can message the local directly to customize the meeting point and plan before confirming your booking."
      },
      {
        question: "Are experiences private for my group only?",
        answer: "Yes, every experience booked on HireALocals is completely private for you and your travel party, ensuring personalized attention, flexible pacing, and customized conversations."
      }
    ]
  }
};

const DEFAULT_DESTINATION_CONTENT: DestinationContent = {
  highlightsTitle: "Discover authentic neighborhoods with a resident",
  highlightsLead: "Every great city has stories, corners, and food spots that only residents know. Connect with a trusted local to experience the true character of the city.",
  neighborhoods: [
    {
      name: "Historic Core & Old Quarters",
      tagline: "Architectural heritage, local lore & hidden alleys",
      description: "Unpack centuries of history, iconic landmarks, and peaceful side streets with a knowledgeable resident guide.",
      vibe: "History & Heritage"
    },
    {
      name: "Cultural & Arts District",
      tagline: "Galleries, independent boutiques & creative energy",
      description: "Explore neighborhood cafes, street murals, local artisan studios, and vibrant community gathering spots.",
      vibe: "Culture & Creativity"
    },
    {
      name: "Food Markets & Neighborhood Dining",
      tagline: "Fresh stalls, local culinary staples & neighborhood eateries",
      description: "Taste authentic regional specialties and discover where residents eat without paying tourist markups.",
      vibe: "Food & Dining"
    },
    {
      name: "Scenic Waterfronts & Green Spaces",
      tagline: "Panoramic viewpoints, peaceful parks & photo locations",
      description: "Enjoy relaxing walks, scenic lookouts, and memorable photo backdrops away from vehicle congestion.",
      vibe: "Scenic & Outdoors"
    }
  ],
  customFaqs: [
    {
      question: "What can a local guide help me with?",
      answer: "A local guide offers private, flexible experiences tailored to your interests—from neighborhood walking tours and food discovery to travel photography, first-day transit orientation, and custom itinerary advice."
    },
    {
      question: "How are HireALocals experiences different from standard group tours?",
      answer: "All experiences are 100% private. You avoid crowded tour buses, rigid schedules, and impersonal scripts. You set your own pace and can ask questions freely throughout your walk."
    },
    {
      question: "How does payment and safety work?",
      answer: "Profiles undergo verification review. Your payment is held securely in platform escrow and is only released after your scheduled experience takes place."
    }
  ]
};

export function getDestinationContent(citySlug: string): DestinationContent {
  const normalized = citySlug.toLowerCase().trim();
  return CITY_DESTINATION_CONTENT[normalized] || DEFAULT_DESTINATION_CONTENT;
}
