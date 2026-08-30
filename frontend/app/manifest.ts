import type { MetadataRoute } from "next";
export default function manifest():MetadataRoute.Manifest{
  return {
    name:"HireALocals",
    short_name:"HireALocals",
    description:"Find trusted locals for private travel experiences and practical trip help.",
    start_url:"/",
    display:"standalone",
    background_color:"#f7f8f5",
    theme_color:"#0f7a59",
    icons:[{src:"/icon.svg",sizes:"any",type:"image/svg+xml"}]
  };
}

