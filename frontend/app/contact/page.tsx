import type { Metadata } from "next";

import {
  CircleHelp,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserRound,
  UsersRound
} from "lucide-react";

import ContactForm from "@/components/ContactForm";
import { getSiteContent } from "@/lib/content";

export const metadata:Metadata={
  title:"Contact & Support",
  description:
    "Contact HireALocals for booking, account, marketplace or local application support.",
  alternates:{
    canonical:"/contact"
  }
};

function phoneHref(value:string){
  return `tel:${value.replace(/[^\d+]/g,"")}`;
}

function whatsappHref(value:string){
  const digits=value.replace(/\D/g,"");

  return digits ?
     `https://wa.me/${digits}`
    : "";
}

export default async function ContactPage(){
  const content=await getSiteContent();

  const email=
    content.support_email?.trim()||
    "support@hirealocals.com";

  const devSupportPhone=
    process.env.NODE_ENV==="development" ?
       "+44 7700 900123"
      : "";

  const phone=
    content.support_phone?.trim()||
    devSupportPhone;

  const whatsapp=
    content.whatsapp_number?.trim()||
    devSupportPhone;

  const whatsappUrl=
    whatsapp
       ? whatsappHref(whatsapp)
      : "";

  return <div className="market-page contact-market-page">

    <section className="contact-market-hero">
      <div className="container contact-market-head">

        <span className="eyebrow">
          Contact & Support
        </span>

        <h1>
          How can
          <br/>
          we help?
        </h1>

        <p className="lead">
          Questions about an account, booking,
          becoming a local or the marketplace?
          Send us a message and our support team
          can reply by email.
        </p>

      </div>
    </section>


    <section className="section contact-help-section">
      <div className="container">

        <div className="support-topic-grid">

          <article>
            <CircleHelp size={21}/>
            <h3>Booking help</h3>
            <p>
              Questions about a request,
              booking details or trip status.
            </p>
          </article>

          <article>
            <UserRound size={21}/>
            <h3>Account help</h3>
            <p>
              Login, profile and traveler account questions.
            </p>
          </article>

          <article>
            <UsersRound size={21}/>
            <h3>Become a Local</h3>
            <p>
              Help with applications and local profiles.
            </p>
          </article>

          <article>
            <ShieldCheck size={21}/>
            <h3>Safety</h3>
            <p>
              Report a safety or marketplace concern.
            </p>
          </article>

        </div>


        <div className="contact-modern-layout">

          <aside className="contact-modern-aside">

            <span className="eyebrow">
              Direct support
            </span>

            <h2>
              Prefer another way to reach us?
            </h2>

            <a
              className="contact-method-card"
              href={`mailto:${email}`}
            >
              <span>
                <Mail size={20}/>
              </span>

              <div>
                <small>Email</small>
                <strong>{email}</strong>
              </div>
            </a>

            {phone&&
              <a
                className="contact-method-card"
                href={phoneHref(phone)}
              >
                <span>
                  <Phone size={20}/>
                </span>

                <div>
                  <small>Phone support</small>
                  <strong>{phone}</strong>
                  <em>Call support</em>
                </div>
              </a>
            }

            {whatsappUrl&&
              <a
                className="contact-method-card"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>
                  <MessageCircle size={20}/>
                </span>

                <div>
                  <small>WhatsApp support</small>
                  <strong>{whatsapp}</strong>
                  <em>Chat on WhatsApp</em>
                </div>
              </a>
            }

          </aside>


          <div className="contact-form-shell">
            <div className="contact-form-heading">
              <span className="eyebrow">
                Send a message
              </span>

              <h2>
                Tell us what you need help with.
              </h2>

              <p>
                Add enough detail for the support team
                to understand the issue.
              </p>
            </div>

            <ContactForm/>
          </div>

        </div>

      </div>
    </section>

  </div>;
}
