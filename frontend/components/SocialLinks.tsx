import React from "react";
import {
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  Linkedin as LinkedinIcon,
  Youtube as YoutubeIcon,
} from "lucide-react";
import type { SiteContent } from "@/lib/content";

/* --- Official Clean SVG Brand Icons for TikTok, Reddit, Pinterest --- */
function TikTokIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68 6.34 6.34 0 0 0 9.35 22a6.34 6.34 0 0 0 6.34-6.32V8.9a8.28 8.28 0 0 0 4.8 1.52v-3.73Z" />
    </svg>
  );
}

function RedditIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10Zm5.748-11.233a1.41 1.41 0 0 0-1.393-1.408 1.4 1.4 0 0 0-.96.386 7.42 7.42 0 0 0-3.328-.86l.608-2.855 1.986.42a1.05 1.05 0 1 0 1.087-.93 1.052 1.052 0 0 0-.995.707l-2.268-.48a.262.262 0 0 0-.31.201l-.697 3.284a7.485 7.485 0 0 0-3.454.854 1.405 1.405 0 1 0-1.63 2.298 2.66 2.66 0 0 0-.022.348c0 2.29 2.7 4.152 6.02 4.152s6.02-1.862 6.02-4.152a2.8 2.8 0 0 0-.023-.347 1.4 1.4 0 0 0 .668-.962 1.393 1.393 0 0 0-.323-1.095ZM9.006 13.5a1.05 1.05 0 1 1 1.05-1.05 1.05 1.05 0 0 1-1.05 1.05Zm5.988 2.378a3.784 3.784 0 0 1-2.994.75 3.784 3.784 0 0 1-2.994-.75.263.263 0 1 1 .37-.37 3.27 3.27 0 0 0 2.624.62 3.27 3.27 0 0 0 2.624-.62.263.263 0 0 1 .37.37Zm-.006-2.378a1.05 1.05 0 1 1 1.05-1.05 1.05 1.05 0 0 1-1.05 1.05Z" />
    </svg>
  );
}

function PinterestIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 0 0-3.66 19.31c-.05-.8-.1-2.03.02-2.9.11-.8 1.4-5.93 1.4-5.93s-.36-.72-.36-1.77c0-1.66.96-2.9 2.16-2.9 1.02 0 1.51.77 1.51 1.68 0 1.02-.65 2.56-1 3.98-.28 1.2.6 2.18 1.78 2.18 2.14 0 3.78-2.26 3.78-5.52 0-2.88-2.07-4.9-5.03-4.9-3.43 0-5.44 2.57-5.44 5.22 0 1.04.4 2.15.9 2.76.1.12.11.23.08.35-.1.38-.3 1.24-.34 1.41-.06.22-.18.27-.42.16-1.58-.74-2.57-3.05-2.57-4.9 0-3.99 2.9-7.66 8.37-7.66 4.4 0 7.81 3.13 7.81 7.32 0 4.36-2.75 7.88-6.57 7.88-1.28 0-2.49-.67-2.9-1.46l-.79 3.01c-.28 1.1-.99 2.47-1.48 3.28A10 10 0 1 0 12 2Z" />
    </svg>
  );
}

export type SocialPlatformId =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "reddit"
  | "pinterest"
  | "linkedin";

export interface SocialChannelConfig {
  id: SocialPlatformId;
  name: string;
  url: string;
  isConfigured: boolean;
  renderIcon: (props: { size?: number; className?: string }) => React.ReactNode;
}

/**
 * Validates whether a given URL is an actual specific profile URL
 * rather than an empty string, generic root domain, or placeholder.
 */
export function isRealProfileUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const fullUrl = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(fullUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    
    const supportedHosts = [
      "instagram.com",
      "tiktok.com",
      "youtube.com",
      "facebook.com",
      "reddit.com",
      "pinterest.com",
      "linkedin.com",
    ];

    const isSupported = supportedHosts.some((h) => host === h || host.endsWith(`.${h}`));
    if (!isSupported) {
      return false;
    }

    // Must have a real profile/account/channel path beyond "/"
    const path = parsed.pathname.replace(/^\/+|\/+$/g, "");
    if (!path || path.length === 0) {
      return false;
    }

    // Reject generic root navigations that are not personal/business profiles
    const genericKeywords = ["explore", "home", "login", "signup", "search", "share", "watch", "feed"];
    if (genericKeywords.includes(path.toLowerCase())) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Centralized social channels definition in EXACT required future priority order:
 * 1. Instagram
 * 2. TikTok
 * 3. YouTube
 * 4. Facebook
 * 5. Reddit
 * 6. Pinterest
 * 7. LinkedIn
 */
export function getSocialChannels(content?: Partial<SiteContent>): SocialChannelConfig[] {
  const igUrl = isRealProfileUrl(content?.instagram_url) ? content!.instagram_url!.trim() : "";
  const ttUrl = isRealProfileUrl(content?.tiktok_url) ? content!.tiktok_url!.trim() : "";
  const ytUrl = isRealProfileUrl(content?.youtube_url) ? content!.youtube_url!.trim() : "";
  const fbUrl = isRealProfileUrl(content?.facebook_url) ? content!.facebook_url!.trim() : "";
  const rdUrl = isRealProfileUrl(content?.reddit_url) ? content!.reddit_url!.trim() : "";
  const pinUrl = isRealProfileUrl(content?.pinterest_url) ? content!.pinterest_url!.trim() : "";
  const liUrl = isRealProfileUrl(content?.linkedin_url) ? content!.linkedin_url!.trim() : "";

  return [
    {
      id: "instagram",
      name: "Instagram",
      url: igUrl,
      isConfigured: Boolean(igUrl),
      renderIcon: ({ size = 16, className }) => <InstagramIcon size={size} className={className} />,
    },
    {
      id: "tiktok",
      name: "TikTok",
      url: ttUrl,
      isConfigured: Boolean(ttUrl),
      renderIcon: ({ size = 16, className }) => <TikTokIcon size={size} className={className} />,
    },
    {
      id: "youtube",
      name: "YouTube",
      url: ytUrl,
      isConfigured: Boolean(ytUrl),
      renderIcon: ({ size = 16, className }) => <YoutubeIcon size={size} className={className} />,
    },
    {
      id: "facebook",
      name: "Facebook",
      url: fbUrl,
      isConfigured: Boolean(fbUrl),
      renderIcon: ({ size = 16, className }) => <FacebookIcon size={size} className={className} />,
    },
    {
      id: "reddit",
      name: "Reddit",
      url: rdUrl,
      isConfigured: Boolean(rdUrl),
      renderIcon: ({ size = 16, className }) => <RedditIcon size={size} className={className} />,
    },
    {
      id: "pinterest",
      name: "Pinterest",
      url: pinUrl,
      isConfigured: Boolean(pinUrl),
      renderIcon: ({ size = 16, className }) => <PinterestIcon size={size} className={className} />,
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      url: liUrl,
      isConfigured: Boolean(liUrl),
      renderIcon: ({ size = 16, className }) => <LinkedinIcon size={size} className={className} />,
    },
  ];
}

export function hasActiveSocialChannels(content?: Partial<SiteContent>): boolean {
  return getSocialChannels(content).some((c) => c.isConfigured && c.url.length > 0);
}

interface SocialLinksProps {
  content?: Partial<SiteContent>;
  variant?: "footer" | "contact";
  className?: string;
  iconSize?: number;
}

export default function SocialLinks({
  content,
  variant = "footer",
  className = "",
  iconSize,
}: SocialLinksProps) {
  const channels = getSocialChannels(content);
  // Strictly render active configured channels with real profile URLs only
  const activeChannels = channels.filter((c) => c.isConfigured && c.url.length > 0);

  // If zero valid URLs exist, return null to completely collapse the section/card cleanly
  if (activeChannels.length === 0) {
    return null;
  }

  if (variant === "footer") {
    const size = iconSize ?? 15;
    return (
      <div
        className={`hal-support-socials ${className}`}
        aria-label="HireALocals official social profiles"
      >
        <span className="hal-support-socials-label">Follow us</span>
        <div className="hal-support-socials-icons">
          {activeChannels.map((channel) => (
            <a
              key={channel.id}
              href={channel.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`HireALocals on ${channel.name}`}
              className="hal-social-circle-btn"
            >
              {channel.renderIcon({ size })}
            </a>
          ))}
        </div>
      </div>
    );
  }

  // "contact" page variant
  const size = iconSize ?? 18;
  return (
    <div
      className={`contact-social-card ${className}`}
      aria-label="HireALocals official social channels"
    >
      <span className="contact-social-title">Follow our community</span>
      <div className="contact-social-grid">
        {activeChannels.map((channel) => (
          <a
            key={channel.id}
            href={channel.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`HireALocals on ${channel.name}`}
            className="contact-social-btn"
          >
            {channel.renderIcon({ size })}
            <span>{channel.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
