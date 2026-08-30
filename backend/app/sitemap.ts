import type { MetadataRoute } from "next";
import { serverApiUrl, siteUrl } from "@/lib/site";
import { getCities, getBlogPosts } from "@/lib/content";

export const dynamic="force-dynamic";

function dateOrUndefined(value?:string|null){
  if(!value)return undefined;
  const date=new Date(value);
  return Number.isNaN(date.getTime())?undefined:date;
}

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const staticPaths=["","/explore","/how-it-works","/safety","/become-a-local","/about","/contact","/blog","/terms","/privacy"];
  const [cities,posts,localRows]=await Promise.all([
    getCities(),
    getBlogPosts(),
    fetch(`${serverApiUrl}/api/locals`,{cache:"no-store"}).then(r=>r.ok?r.json():[]).catch(()=>[])
  ]);

  const entries:MetadataRoute.Sitemap=[
    ...staticPaths.map(path=>({url:`${siteUrl}${path}`})),
    ...cities.map(city=>({url:`${siteUrl}/${city.country_slug}/${city.slug}`,lastModified:dateOrUndefined(city.updated_at)})),
    ...localRows.filter((row:any)=>row?.profile?.slug).map((row:any)=>({url:`${siteUrl}/locals/${row.profile.slug}`,lastModified:dateOrUndefined(row.profile.updated_at)})),
    ...posts.map(post=>({url:`${siteUrl}/blog/${post.slug}`,lastModified:dateOrUndefined(post.updated_at||post.published_at)}))
  ];

  const seen=new Set<string>();
  return entries.filter(entry=>{
    if(seen.has(entry.url))return false;
    seen.add(entry.url);
    return true;
  });
}
