const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim();

const configuredPublicApiUrl =
  process.env.NEXT_PUBLIC_API_URL?.trim();

if (
  process.env.NODE_ENV === "production" &&
  !configuredPublicApiUrl
) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is required for a production HireALocals build."
  );
}

export const siteUrl = (
  configuredSiteUrl ||
  "https://hirealocals.com"
).replace(/\/$/, "");

const publicApiUrl = (
  configuredPublicApiUrl ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

/*
 * During local development browser requests use
 * Next.js same-origin /hal-api proxy to avoid changing
 * the production API CORS policy.
 */
export const apiUrl =
  process.env.NODE_ENV === "development"
    ? "/hal-api"
    : publicApiUrl;

/*
 * Server Components may use an internal/private API URL,
 * otherwise use the configured public API URL.
 */
export const serverApiUrl = (
  process.env.API_INTERNAL_URL?.trim() ||
  publicApiUrl
).replace(/\/$/, "");

export const brand = "HireALocals";

export function shareImageUrl(input:{
  title:string;
  subtitle?:string;
  eyebrow?:string;
  badge?:string;
}){
  const url = new URL("/api/og", siteUrl);

  url.searchParams.set(
    "title",
    input.title.slice(0,120)
  );

  if(input.subtitle){
    url.searchParams.set(
      "subtitle",
      input.subtitle.slice(0,180)
    );
  }

  if(input.eyebrow){
    url.searchParams.set(
      "eyebrow",
      input.eyebrow.slice(0,60)
    );
  }

  if(input.badge){
    url.searchParams.set(
      "badge",
      input.badge.slice(0,60)
    );
  }

  return url.toString();
}

