import Link from "next/link";
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Phone,
  Youtube
} from "lucide-react";
import { getSiteContent } from "@/lib/content";

function phoneHref(value:string){
  return `tel:${value.replace(/[^+\d]/g,"")}`;
}

function whatsappHref(value:string){
  const digits=value.replace(/\D/g,"");
  return digits?`https://wa.me/${digits}`:"";
}

export default async function Footer(){
  const content=await getSiteContent();

  const email=content.support_email?.trim()||"support@hirealocals.com";
  const devSupportNumber =
    process.env.NODE_ENV === "development"
      ? "+44 7700 900123"
      : "";

  const phone =
    content.support_phone?.trim() ||
    devSupportNumber;

  const whatsapp =
    content.whatsapp_number?.trim() ||
    phone;

  const whatsappUrl =
    whatsappHref(whatsapp);


  return (
    <footer className="footer hal-footer">
      <div className="container">

        <div className="hal-footer-grid">

          <div className="hal-footer-brand">
            <Link href="/" className="logo">
              HireA<span>Locals</span>
            </Link>

            <p>
              Connect with local people for private experiences
              and practical travel help.
            </p>
          </div>

          <div className="hal-footer-col">
            <strong>Explore</strong>
            <Link href="/explore">Find a Local</Link>
            <Link href="/destinations">Destinations</Link>
            <Link href="/experiences">Experiences</Link>
            <Link href="/blog">Travel Guides</Link>
          </div>

          <div className="hal-footer-col">
            <strong>Company</strong>
            <Link href="/about">About</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/safety">Trust & Safety</Link>
            <Link href="/contact">Contact</Link>
          </div>

          <div className="hal-footer-col">
            <strong>For locals</strong>
            <Link href="/become-a-local">Become a Local</Link>
            <Link href="/local-dashboard">Local dashboard</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </div>

          <div className="hal-footer-support">
            <strong>Support</strong>

            <a href={`mailto:${email}`} className="hal-support-link">
              <Mail size={16}/>
              <span>{email}</span>
            </a>

            {phone ?
               <a
                  href={phoneHref(phone)}
                  className="hal-support-action"
                >
                  <Phone size={16}/>
                  <span>Call {phone}</span>
                </a>
              : null
            }

            {whatsappUrl ?
               <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hal-support-action whatsapp"
                >
                  <MessageCircle size={16}/>
                  <span>WhatsApp</span>
                </a>
              : null
            }
          </div>

        </div>

        <div className="hal-footer-bottom">

          <span>{"\u00A9"} 2026 HireALocals.com. All rights reserved.</span>

          <div className="hal-footer-socials">
            {content.instagram_url&&
              <a href={content.instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Instagram size={17}/>
              </a>
            }

            {content.facebook_url&&
              <a href={content.facebook_url} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <Facebook size={17}/>
              </a>
            }

            {content.youtube_url&&
              <a href={content.youtube_url} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <Youtube size={17}/>
              </a>
            }

            {content.linkedin_url&&
              <a href={content.linkedin_url} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <Linkedin size={17}/>
              </a>
            }
          </div>

        </div>

      </div>
    </footer>
  );
}





