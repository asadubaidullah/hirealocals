export type ActivityCategory =
  | "neighborhoods-culture"
  | "food-markets"
  | "hidden-gems"
  | "scenic-walks"
  | "history-heritage";

export type ActivityItem = {
  id: string;
  title: string;
  category: ActivityCategory;
  categoryLabel: string;
  bestFor: string;
  duration: string;
  neighborhood: string;
  summary: string;
  insiderTip: string;
  practicalTip: string;
  relatedExperienceSlug?: string;
  relatedExperienceName?: string;
};

export type NeighborhoodSpotlight = {
  name: string;
  vibe: string;
  highlight: string;
  whyVisit: string;
  transitTip: string;
};

export type PracticalGuide = {
  transitTips: string[];
  bestTimeToVisit: string;
  pacingAdvice: string;
};

export type ThingsToDoFaq = {
  question: string;
  answer: string;
};

export type CityThingsToDoData = {
  citySlug: string;
  cityName: string;
  countrySlug: string;
  countryName: string;
  countryCode: string;
  heroEyebrow: string;
  heroTitle: string;
  heroLead: string;
  metaTitle: string;
  metaDescription: string;
  activitiesCountText: string;
  activities: ActivityItem[];
  neighborhoods: NeighborhoodSpotlight[];
  practicalGuide: PracticalGuide;
  faqs: ThingsToDoFaq[];
};
