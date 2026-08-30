import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HelpChat from "@/components/HelpChat";
import MarketplaceStatusBanner from "@/components/MarketplaceStatusBanner";
import ScrollReveal from "@/components/ScrollReveal";
import { siteUrl } from "@/lib/site";

const googleVerification=process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined;

export const metadata: Metadata={
  metadataBase:new URL(siteUrl),
  applicationName:"HireALocals",
  title:{default:"HireALocals — Hire Trusted Locals for Better Trips",template:"%s | HireALocals"},
  description:"Find trusted locals for private tours, photography, food discoveries, orientation and practical trip help in selected UK and US cities.",
  alternates:{canonical:"/"},
  authors:[{name:"HireALocals",url:siteUrl}],
  creator:"HireALocals",
  publisher:"HireALocals",
  robots:{index:true,follow:true,googleBot:{index:true,follow:true,"max-image-preview":"large","max-snippet":-1,"max-video-preview":-1}},
  openGraph:{
    title:"HireALocals — Hire Trusted Locals for Better Trips",
    description:"Travel less like a tourist. Discover a city with someone who lives there.",
    type:"website",
    url:siteUrl,
    siteName:"HireALocals",
    locale:"en_GB",
    images:[{url:"/opengraph-image",width:1200,height:630,alt:"HireALocals — travel with trusted locals"}]
  },
  twitter:{card:"summary_large_image",title:"HireALocals",description:"Find trusted locals for private, flexible travel experiences.",images:["/opengraph-image"]},
  verification:googleVerification?{google:googleVerification}:undefined,
  category:"travel",
  formatDetection:{telephone:false,address:false,email:false}
};

const organizationId=`${siteUrl}/#organization`;
const websiteId=`${siteUrl}/#website`;

const organizationSchema={
  "@context":"https://schema.org",
  "@type":"Organization",
  "@id":organizationId,
  name:"HireALocals",
  url:siteUrl,
  logo:{"@type":"ImageObject",url:`${siteUrl}/icon.svg`},
  email:"support@hirealocals.com",
  description:"A marketplace connecting travelers with trusted locals for private travel services and practical destination help.",
  areaServed:[{"@type":"Country",name:"United Kingdom"},{"@type":"Country",name:"United States"}],
  contactPoint:{"@type":"ContactPoint",contactType:"customer support",email:"support@hirealocals.com",availableLanguage:["English"]}
};

const websiteSchema={
  "@context":"https://schema.org",
  "@type":"WebSite",
  "@id":websiteId,
  name:"HireALocals",
  url:siteUrl,
  publisher:{"@id":organizationId},
  inLanguage:"en",
  description:"Find and hire trusted locals for private travel experiences in selected UK and US cities."
};

const themeScript=`(function(){try{var saved=localStorage.getItem('hal-theme-pref');var theme=saved==='dark'||saved==='light'?saved:'light';document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme}catch(e){document.documentElement.dataset.theme='light';document.documentElement.style.colorScheme='light'}})();`;

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en" suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{__html:themeScript}}/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(organizationSchema)}}/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(websiteSchema)}}/>
    </head>
    <body><Header/><MarketplaceStatusBanner/><main>{children}</main><Footer/><HelpChat/><ScrollReveal/></body>
  </html>;
}
