import Link from "next/link";
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Youtube
} from "lucide-react";
import { getSiteContent } from "@/lib/content";

function phoneHref(value: string) {
  return `tel:${value.replace(/[^+\d]/g, "")}`;
}

function whatsappHref(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

export default async function Footer() {
  const content = await getSiteContent();

  const email = content.support_email?.trim() || "support@hirealocals.com";
  const phone =
    content.support_phone?.trim() ||
    process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() ||
    "";

  const whatsapp =
    content.whatsapp_number?.trim() ||
    phone ||
    "";

  const whatsappUrl = whatsapp ? whatsappHref(whatsapp) : "";

  return (
    <footer className="footer hal-footer" role="contentinfo">
      <div className="container">
        <div className="hal-footer-grid">
          {/* Brand Column */}
          <div className="hal-footer-brand">
            <Link href="/" className="logo" aria-label="HireALocals Home">
              HireA<span>Locals</span>
            </Link>
            <p>
              Connect with verified local residents for private walking experiences, authentic food discoveries, and practical travel orientation.
            </p>
            <div className="hal-footer-trust-micro">
              <ShieldCheck size={16} />
              <span>Verified Hosts & Secure Escrow</span>
            </div>
          </div>

          {/* Nav Column 1: Explore */}
          <div className="hal-footer-col">
            <strong>Explore</strong>
            <nav className="hal-footer-nav" aria-label="Footer Explore Navigation">
              <Link href="/explore">Find a Local</Link>
              <Link href="/destinations">Destinations</Link>
              <Link href="/experiences">Experiences</Link>
              <Link href="/blog">Travel Guides</Link>
              <Link href="/request-a-local">Request a Local</Link>
            </nav>
          </div>

          {/* Nav Column 2: Company */}
          <div className="hal-footer-col">
            <strong>Company</strong>
            <nav className="hal-footer-nav" aria-label="Footer Company Navigation">
              <Link href="/about">About</Link>
              <Link href="/how-it-works">How it works</Link>
              <Link href="/safety">Trust & Safety</Link>
              <Link href="/contact">Contact & Support</Link>
            </nav>
          </div>

          {/* Nav Column 3: For Locals & Legal */}
          <div className="hal-footer-col">
            <strong>For Locals & Legal</strong>
            <nav className="hal-footer-nav" aria-label="Footer Local & Legal Navigation">
              <Link href="/become-a-local">Become a Local</Link>
              <Link href="/local-dashboard">Local Dashboard</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy">Privacy Policy</Link>
            </nav>
          </div>

          {/* Column 4: Dedicated Contact & Actions Card */}
          <div className="hal-footer-support">
            <strong>{content.footer_help_title || "Contact & Support"}</strong>

            <div className="hal-support-info">
              <a
                href={`mailto:${email}`}
                className="hal-support-email-link"
                aria-label={`Email support at ${email}`}
              >
                <Mail size={15} />
                <span>{email}</span>
              </a>

              {phone ? (
                <span className="hal-support-phone-text">
                  <Phone size={14} />
                  <span>{phone}</span>
                </span>
              ) : null}
            </div>

            <div className="hal-support-actions-grid">
              {phone ? (
                <a
                  href={phoneHref(phone)}
                  className="hal-support-btn hal-support-btn-call"
                  aria-label={`Call HireALocals at ${phone}`}
                >
                  <Phone size={16} />
                  <span>Call us</span>
                </a>
              ) : (
                <a
                  href={`mailto:${email}`}
                  className="hal-support-btn hal-support-btn-call"
                  aria-label={`Email support at ${email}`}
                >
                  <Mail size={16} />
                  <span>Email us</span>
                </a>
              )}

              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hal-support-btn hal-support-btn-wa"
                  aria-label="Chat with HireALocals on WhatsApp"
                >
                  <MessageCircle size={16} />
                  <span>WhatsApp</span>
                </a>
              ) : null}

              <Link
                href="/contact"
                className="hal-support-btn hal-support-btn-msg"
                aria-label="Send a message to HireALocals support"
              >
                <Send size={15} />
                <span>Message us</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="hal-footer-bottom">
          <div className="hal-footer-copy">
            <span>&copy; {new Date().getFullYear()} HireALocals.com. All rights reserved.</span>
            <span className="hal-footer-bullet">&bull;</span>
            <span className="hal-footer-tag">Private Local Experiences</span>
          </div>

          <div className="hal-footer-socials" aria-label="Social media links">
            {content.instagram_url ? (
              <a href={content.instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Instagram size={17} />
              </a>
            ) : null}

            {content.facebook_url ? (
              <a href={content.facebook_url} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <Facebook size={17} />
              </a>
            ) : null}

            {content.youtube_url ? (
              <a href={content.youtube_url} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <Youtube size={17} />
              </a>
            ) : null}

            {content.linkedin_url ? (
              <a href={content.linkedin_url} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <Linkedin size={17} />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
