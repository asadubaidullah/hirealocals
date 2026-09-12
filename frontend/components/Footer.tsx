import Link from "next/link";
import {
  Compass,
  Headphones,
  HeartHandshake,
  Mail,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getSiteContent } from "@/lib/content";
import FooterNavAccordions from "./FooterNavAccordions";
import SocialLinks from "@/components/SocialLinks";

function phoneHref(value: string) {
  return `tel:${value.replace(/[^+\d]/g, "")}`;
}

function WhatsAppIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.189 8.189 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.3z" />
    </svg>
  );
}

export default async function Footer() {
  const content = await getSiteContent();

  const email = content.support_email?.trim() || "support@hirealocals.com";
  const phone = "+1 (305) 770-6921";
  const phoneDisplay = "+1 305 770 6921";
  const callHref = phoneHref(phone);
  const whatsappUrl = "https://wa.me/13057706921";

  return (
    <footer className="footer hal-footer" role="contentinfo">
      <div className="container">
        <div className="hal-footer-grid">
          {/* 1. LEFT BRAND AREA */}
          <div className="hal-footer-brand">
            <Link href="/" className="logo hal-footer-logo" aria-label="HireALocals Home">
              HireA<span>Locals</span>
            </Link>

            <div className="hal-footer-tagline">
              PEOPLE. PLACES. REAL EXPERIENCES.
            </div>

            <p className="hal-footer-desc">
              Connect with verified local residents for private walking experiences, authentic food discoveries, and practical travel orientation.
            </p>

            <div className="hal-footer-trust-pill">
              <ShieldCheck size={16} className="hal-trust-icon" />
              <span>Verified Hosts &amp; Secure Payments</span>
            </div>

            {/* 3 Benefit Icons/Labels */}
            <div className="hal-footer-benefits">
              <div className="hal-benefit-item">
                <div className="hal-benefit-icon-wrap">
                  <Sparkles size={14} />
                </div>
                <span>Authentic Experiences</span>
              </div>
              <div className="hal-benefit-item">
                <div className="hal-benefit-icon-wrap">
                  <HeartHandshake size={14} />
                </div>
                <span>Support Local Communities</span>
              </div>
              <div className="hal-benefit-item">
                <div className="hal-benefit-icon-wrap">
                  <Compass size={14} />
                </div>
                <span>Travel Better Together</span>
              </div>
            </div>
          </div>

          {/* 2. CENTER NAVIGATION (3 Columns Desktop / Accordions Mobile) */}
          <FooterNavAccordions />

          {/* 3. RIGHT SUPPORT CARD */}
          <div className="hal-footer-support-card">
            {/* Card Top */}
            <div className="hal-support-head">
              <div className="hal-support-headset-circle">
                <Headphones size={18} />
              </div>
              <div className="hal-support-head-text">
                <h3 className="hal-support-title">Need help?</h3>
                <span className="hal-support-subtitle">We&apos;re here for you.</span>
              </div>
            </div>

            {/* Two Full-Width Compact Rows */}
            <div className="hal-support-rows">
              <a
                href={`mailto:${email}`}
                className="hal-support-row"
                aria-label={`Send us an email at ${email}`}
              >
                <div className="hal-support-row-icon">
                  <Mail size={15} />
                </div>
                <div className="hal-support-row-content">
                  <span className="hal-support-row-primary">{email}</span>
                  <span className="hal-support-row-secondary">Send us an email</span>
                </div>
              </a>

              <Link
                href="/contact"
                className="hal-support-row"
                aria-label="Message us online"
              >
                <div className="hal-support-row-icon">
                  <MessageSquare size={15} />
                </div>
                <div className="hal-support-row-content">
                  <span className="hal-support-row-primary">Message us</span>
                  <span className="hal-support-row-secondary">We&apos;re online to help</span>
                </div>
              </Link>
            </div>

            {/* Bottom Two Equal CTA Buttons */}
            <div className="hal-support-cta-grid">
              <a
                href={callHref}
                className="hal-support-cta-btn hal-cta-call"
                aria-label={`Call us at ${phoneDisplay}`}
              >
                <Phone size={15} className="hal-cta-icon" />
                <div className="hal-cta-text">
                  <span className="hal-cta-label">Call us</span>
                  <span className="hal-cta-value">{phoneDisplay}</span>
                </div>
              </a>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hal-support-cta-btn hal-cta-wa"
                aria-label="Chat on WhatsApp"
              >
                <WhatsAppIcon size={16} className="hal-cta-icon" />
                <div className="hal-cta-text">
                  <span className="hal-cta-label">WhatsApp</span>
                  <span className="hal-cta-value">Chat on WhatsApp</span>
                </div>
              </a>
            </div>

            {/* Official Social Links in Support Card */}
            <SocialLinks content={content} variant="footer" iconSize={15} />
          </div>
        </div>

        {/* 4. FOOTER BOTTOM ROW - COMPACT SINGLE STRIP */}
        <div className="hal-footer-bottom">
          <div className="hal-footer-copy">
            <span>&copy; {new Date().getFullYear()} HireALocals.com. All rights reserved.</span>
            <span className="hal-footer-bullet" aria-hidden="true">&bull;</span>
            <span className="hal-footer-tag">Private Local Experiences</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
