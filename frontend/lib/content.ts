import { serverApiUrl } from "@/lib/site";

import {
  cities as fallbackCities,
  blogPosts as fallbackBlogPosts,
  serviceCategories as fallbackCategories
} from "@/lib/data";

export type SeoCity = {
  id:number;
  country_code:string;
  country_slug:string;
  country_name:string;
  slug:string;
  name:string;
  tagline:string;
  description:string;
  image_url:string;
  meta_title:string;
  meta_description:string;
  seo_content:string;
  published:boolean;
  featured:boolean;
  sort_order:number;
  local_count?:number;
  url?:string;
  updated_at?:string;
};

export type CmsPost = {
  id:number;
  slug:string;
  title:string;
  excerpt:string;
  category:string;
  image_url:string;
  content?:string;
  meta_title:string;
  meta_description:string;
  published:boolean;
  featured:boolean;
  published_at?:string|null;
  updated_at?:string;
};

export type ServiceCategory = {
  id:number;
  slug:string;
  name:string;
  description:string;
  active:boolean;
  sort_order:number;
};

export type SiteContent = {
  support_email:string;
  support_phone:string;
  whatsapp_number:string;
  facebook_url:string;
  youtube_url:string;
  linkedin_url:string;
  instagram_url:string;
  footer_help_title:string;
  footer_social_title:string;
};

const cityImageOverrides:Record<string,string> = {
  "uk/birmingham":"/images/destinations/birmingham.jpg"
};

function normalizeCityImage(city:SeoCity):SeoCity {
  const key=`${city.country_slug}/${city.slug}`;
  const override=cityImageOverrides[key];

  return override
    ? {...city,image_url:override}
    : city;
}

const allowDemoFallback =
  process.env.NODE_ENV !== "production";


function fallbackCityRows():SeoCity[] {
  return fallbackCities.map((c,i)=>({
    id:-(i+1),
    country_code:c.countryCode,
    country_slug:c.countrySlug,
    country_name:c.countryName,
    slug:c.slug,
    name:c.name,
    tagline:c.tagline,
    description:c.description,
    image_url:c.image,
    meta_title:`Hire a Local in ${c.name}`,
    meta_description:c.description,
    seo_content:"",
    published:true,
    featured:[
      "london",
      "new-york",
      "edinburgh",
      "miami"
    ].includes(c.slug),
    sort_order:(i+1)*10
  }));
}


function fallbackPosts():CmsPost[] {
  return fallbackBlogPosts.map((p,i)=>({
    id:-(i+1),
    slug:p.slug,
    title:p.title,
    excerpt:p.excerpt,
    category:p.category,
    image_url:p.image,
    content:"",
    meta_title:p.title,
    meta_description:p.excerpt,
    published:true,
    featured:i===0,
    published_at:p.date
  }));
}


function fallbackServiceRows():ServiceCategory[] {
  return fallbackCategories.map((name,i)=>({
    id:-(i+1),
    slug:name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,"-"),
    name,
    description:"",
    active:true,
    sort_order:(i+1)*10
  }));
}


async function jsonOr<T>(
  path:string,
  developmentFallback:T,
  productionFallback:T
):Promise<T> {

  try {
    const r = await fetch(
      `${serverApiUrl}${path}`,
      {
        next:{
          revalidate:60
        }
      }
    );

    if(!r.ok) {
      return allowDemoFallback
        ? developmentFallback
        : productionFallback;
    }

    return await r.json();
  }
  catch {
    return allowDemoFallback
      ? developmentFallback
      : productionFallback;
  }
}


export async function getCities():Promise<SeoCity[]> {
  const rows=await jsonOr(
    "/api/content/cities",
    fallbackCityRows(),
    []
  );

  return rows.map(normalizeCityImage);
}


export async function getFeaturedCities():Promise<SeoCity[]> {
  const rows = await getCities();

  const picked =
    rows.filter(c=>c.featured);

  return picked.length
    ? picked
    : rows.slice(0,4);
}


export async function getCity(
  country:string,
  city:string
):Promise<SeoCity|null> {

  try {
    const r = await fetch(
      `${serverApiUrl}/api/content/cities/${encodeURIComponent(country)}/${encodeURIComponent(city)}`,
      {
        next:{
          revalidate:60
        }
      }
    );

    if(r.status===404) {
      return null;
    }

    if(!r.ok) {
      if(allowDemoFallback) {
        return (
          fallbackCityRows().find(
            c =>
              c.country_slug===country &&
              c.slug===city
          ) || null
        );
      }

      throw new Error(
        "City content is temporarily unavailable."
      );
    }

    return await r.json();
  }
  catch(error) {

    if(allowDemoFallback) {
      return (
        fallbackCityRows().find(
          c =>
            c.country_slug===country &&
            c.slug===city
        ) || null
      );
    }

    throw error;
  }
}


export async function getBlogPosts():Promise<CmsPost[]> {
  return jsonOr(
    "/api/content/blog",
    fallbackPosts(),
    []
  );
}


export async function getBlogPost(
  slug:string
):Promise<CmsPost|null> {

  const fallback =
    fallbackPosts().find(
      post=>post.slug===slug
    ) || null;

  try {
    const r = await fetch(
      `${serverApiUrl}/api/content/blog/${encodeURIComponent(slug)}`,
      {
        next:{
          revalidate:60
        }
      }
    );

    if(r.status===404) {
      return allowDemoFallback
        ? fallback
        : null;
    }

    if(!r.ok) {
      if(allowDemoFallback) {
        return fallback;
      }

      throw new Error(
        "Travel guide content is temporarily unavailable."
      );
    }

    return await r.json();
  }
  catch(error) {

    if(allowDemoFallback) {
      return fallback;
    }

    throw error;
  }
}


export async function getServiceCategories():
Promise<ServiceCategory[]> {

  return jsonOr(
    "/api/content/service-categories",
    fallbackServiceRows(),
    []
  );
}


export async function getSiteContent():
Promise<SiteContent> {

  /*
   * Safe fallback only:
   * real support email,
   * no fake phone,
   * no fake WhatsApp/social URLs.
   */

  const fallback:SiteContent = {
    support_email:
      "support@hirealocals.com",

    support_phone:"",
    whatsapp_number:"",

    facebook_url:"",
    youtube_url:"",
    linkedin_url:"",
    instagram_url:"",

    footer_help_title:
      "Need help?",

    footer_social_title:
      "Follow HireALocals"
  };

  return jsonOr(
    "/api/content/site",
    fallback,
    fallback
  );
}

