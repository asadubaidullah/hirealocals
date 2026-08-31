POLISHED_CSS = """
/* ==========================================================================
   HIREALOCALS DEFINITIVE GLOBAL UI/UX POLISH STYLESHEET
   ========================================================================== */

/* 1. GLOBAL HEADER & NAVIGATION */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 72px;
  background: rgba(251, 250, 246, 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(223, 230, 226, 0.85);
  transition: background 0.2s ease, border-color 0.2s ease;
}

html[data-theme="dark"] .header {
  background: rgba(13, 27, 21, 0.94);
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.nav {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.header-logo {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.04em;
  color: var(--ink);
  text-decoration: none;
  flex-shrink: 0;
}

.header-logo-word {
  display: inline-flex;
  align-items: center;
}

.header-logo-word strong {
  color: var(--green);
  font-weight: 900;
}

.navlinks {
  display: flex;
  align-items: center;
  gap: 8px;
}

.navlink {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  color: var(--muted);
  text-decoration: none;
  transition: color 0.16s ease, background 0.16s ease;
}

.navlink:hover {
  color: var(--ink);
  background: rgba(19, 121, 91, 0.06);
}

.navlink.is-active,
.navlink.active {
  color: var(--green2);
  background: var(--mint);
  font-weight: 800;
}

html[data-theme="dark"] .navlink.is-active,
html[data-theme="dark"] .navlink.active {
  background: rgba(19, 121, 91, 0.22);
  color: #34d399;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.nav-actions .btn {
  height: 40px;
  padding: 0 16px;
  font-size: 13.5px;
  font-weight: 700;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.notification-bell {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--white);
  color: var(--ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.notification-bell:hover {
  background: var(--mint);
  color: var(--green2);
  border-color: #c5e4d5;
}

.notification-bell span {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: #dc2626;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 2px var(--cream);
}

.mobile-menu-toggle {
  display: none;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--white);
  color: var(--ink);
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: all 0.15s ease;
}

.mobile-menu-toggle:hover {
  background: var(--mint);
  color: var(--green2);
}

/* MOBILE DRAWER */
.mobile-menu-shell {
  position: absolute;
  top: 72px;
  left: 0;
  right: 0;
  background: rgba(251, 250, 246, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--line);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.08);
  padding: 20px 0 28px;
  z-index: 99;
  animation: mobileMenuSlide 0.2s ease-out both;
}

html[data-theme="dark"] .mobile-menu-shell {
  background: rgba(13, 27, 21, 0.98);
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

@keyframes mobileMenuSlide {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.mobile-menu-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mobile-menu-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mobile-menu-links .navlink,
.mobile-menu-links a {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  text-decoration: none;
  min-height: 46px;
  transition: background 0.15s ease, color 0.15s ease;
}

.mobile-menu-links a:hover {
  background: var(--mint);
  color: var(--green2);
}

.mobile-menu-divider {
  height: 1px;
  background: var(--line);
  margin: 4px 0;
}

.mobile-account-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.mobile-account-actions .btn {
  height: 44px;
  font-size: 14px;
  font-weight: 800;
  border-radius: 12px;
  width: 100%;
}

@media (max-width: 900px) {
  .navlinks, .nav-actions .btn {
    display: none;
  }
  .mobile-menu-toggle {
    display: flex;
  }
}

/* 2. HOMEPAGE HERO SYSTEM */
.hal-home-hero {
  padding: 44px 0 54px;
  overflow: hidden;
}

.hal-home-hero-inner {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 48px;
  align-items: center;
}

.hal-home-hero-copy {
  display: flex;
  flex-direction: column;
}

.hal-home-hero-copy .eyebrow {
  margin-bottom: 12px;
  letter-spacing: 0.12em;
}

.hal-home-hero-copy h1 {
  font-size: clamp(34px, 4.8vw, 58px);
  line-height: 1.08;
  letter-spacing: -0.04em;
  color: var(--ink);
  margin: 0 0 18px;
  font-weight: 900;
}

.hal-home-hero-copy h1 span {
  color: var(--green);
}

.hal-home-hero-copy p {
  font-size: clamp(16px, 1.8vw, 19px);
  color: var(--muted);
  line-height: 1.5;
  margin: 0 0 28px;
  max-width: 580px;
}

.hal-home-search {
  width: 100%;
  margin-bottom: 24px;
}

.hal-home-trustbar {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  padding-top: 6px;
}

.hal-home-trustbar span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
}

.hal-home-trustbar span svg {
  color: var(--green);
  flex-shrink: 0;
}

.hal-home-hero-photo {
  position: relative;
  display: flex;
  justify-content: center;
}

.hal-hero-image-wrapper {
  position: relative;
  width: 100%;
  max-width: 460px;
  height: 520px;
  border-radius: 26px;
  overflow: hidden;
  box-shadow: 0 20px 48px rgba(19, 121, 91, 0.12);
  border: 1px solid var(--line);
}

.hal-hero-image-wrapper picture,
.hero-main-img {
  width: 100%;
  height: 100%;
  display: block;
}

.hero-main-img {
  object-fit: cover;
  object-position: center 25%;
}

.hal-home-floating-local {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(223, 230, 226, 0.9);
  border-radius: 18px;
  padding: 12px 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 14px;
  text-decoration: none;
  color: var(--ink);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hal-home-floating-local:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.14);
}

html[data-theme="dark"] .hal-home-floating-local {
  background: rgba(19, 36, 29, 0.95);
  border-color: rgba(255, 255, 255, 0.12);
}

.hal-home-floating-local .avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid #fff;
}

.floating-card-body {
  flex: 1;
  min-width: 0;
}

.floating-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.floating-card-header strong {
  font-size: 15px;
  font-weight: 800;
}

.verified-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--green);
  color: #fff;
  font-size: 10px;
  font-weight: 900;
}

.floating-card-sub {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--muted);
  margin-top: 1px;
}

.floating-card-price {
  font-size: 12.5px;
  color: var(--ink);
  margin-top: 2px;
  display: block;
}

.floating-card-price strong {
  color: var(--green2);
  font-size: 14px;
}

/* HERO RESPONSIVE */
@media (max-width: 900px) {
  .hal-home-hero {
    padding: 28px 0 40px;
  }
  .hal-home-hero-inner {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .hal-hero-image-wrapper {
    max-width: 100%;
    height: 340px;
    border-radius: 20px;
  }
  .hero-main-img {
    object-position: center 20%;
  }
  .hal-home-floating-local {
    bottom: 14px;
    left: 14px;
    right: 14px;
    padding: 10px 14px;
  }
}

@media (max-width: 480px) {
  .hal-home-hero-copy h1 {
    font-size: 32px;
  }
  .hal-hero-image-wrapper {
    height: 250px;
  }
}

/* 3. STANDARDIZED LOCAL CARD SYSTEM */
.local-card-shell {
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  position: relative;
  display: flex;
  flex-direction: column;
}

.local-card-shell:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 36px rgba(19, 121, 91, 0.10);
  border-color: #cde8dc;
}

html[data-theme="dark"] .local-card-shell {
  background: #142820;
  border-color: rgba(255, 255, 255, 0.08);
}

.local-card-link {
  display: flex;
  flex-direction: column;
  flex: 1;
  text-decoration: none;
  color: inherit;
}

.local-card-shell img.cover {
  width: 100%;
  height: 240px;
  object-fit: cover;
  display: block;
  background: #eef3f0;
}

.local-card-shell .card-body {
  padding: 18px 18px 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.local-card-shell .local-meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.local-card-shell .local-meta strong {
  font-size: 17px;
  font-weight: 800;
  color: var(--ink);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.local-city-label {
  font-size: 12.5px;
  color: var(--muted);
  margin-top: 2px;
}

.local-card-shell .rating {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 800;
  color: #b45309;
  flex-shrink: 0;
  background: #fef3c7;
  padding: 3px 8px;
  border-radius: 999px;
}

html[data-theme="dark"] .local-card-shell .rating {
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
}

.local-card-headline {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.45;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 38px;
}

.local-card-shell .chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.local-card-shell .chip {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--green2);
  background: var(--mint);
  border: 1px solid #d2eae0;
  padding: 4px 9px;
  border-radius: 8px;
}

html[data-theme="dark"] .local-card-shell .chip {
  background: rgba(19, 121, 91, 0.2);
  border-color: rgba(19, 121, 91, 0.35);
  color: #6ee7b7;
}

.local-card-bottom {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.local-language-label {
  font-size: 12px;
  color: var(--muted);
}

.local-card-bottom .price {
  font-size: 18px;
  font-weight: 900;
  color: var(--green2);
}

.local-rate-label {
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
}

.save-local-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.save-local-btn:hover {
  transform: scale(1.08);
  color: #dc2626;
}

.save-local-btn.saved {
  color: #dc2626;
}

/* 4. STANDARDIZED MARKETPLACE GRIDS */
.hal-local-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
}

.hal-destination-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.hal-destination-card {
  position: relative;
  height: 280px;
  border-radius: 20px;
  overflow: hidden;
  text-decoration: none;
  color: #fff;
  box-shadow: var(--shadow);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hal-destination-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
}

.hal-destination-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hal-destination-card::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(8, 24, 16, 0.82) 0%, rgba(8, 24, 16, 0.05) 60%);
}

.hal-destination-card div {
  position: absolute;
  bottom: 18px;
  left: 18px;
  right: 18px;
  z-index: 2;
}

.hal-destination-card strong {
  display: block;
  font-size: 20px;
  font-weight: 900;
}

.hal-destination-card span {
  font-size: 13px;
  color: #d1fae5;
}

.hal-service-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.hal-service-card {
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 22px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.hal-service-card:hover {
  transform: translateY(-2px);
  border-color: #bce3d2;
  box-shadow: 0 10px 28px rgba(19, 121, 91, 0.08);
}

html[data-theme="dark"] .hal-service-card {
  background: #142820;
  border-color: rgba(255, 255, 255, 0.08);
}

.hal-service-card span {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--mint);
  color: var(--green2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

html[data-theme="dark"] .hal-service-card span {
  background: rgba(19, 121, 91, 0.25);
  color: #34d399;
}

.hal-service-card h3 {
  font-size: 16px;
  font-weight: 800;
  margin: 0 0 4px;
}

.hal-service-card p {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
  line-height: 1.4;
}

.hal-how-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
}

.hal-how-grid article {
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 28px 24px;
}

html[data-theme="dark"] .hal-how-grid article {
  background: #142820;
  border-color: rgba(255, 255, 255, 0.08);
}

.hal-how-grid article span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--mint);
  color: var(--green2);
  font-size: 14px;
  font-weight: 900;
  margin-bottom: 16px;
}

.hal-how-grid article h3 {
  font-size: 17px;
  font-weight: 800;
  margin: 0 0 8px;
}

.hal-how-grid article p {
  font-size: 14px;
  color: var(--muted);
  margin: 0;
  line-height: 1.5;
}

.hal-section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
}

.hal-section-heading h2 {
  font-size: clamp(26px, 3vw, 36px);
  margin: 4px 0 0;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.hal-section-heading a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 800;
  color: var(--green);
  text-decoration: none;
  flex-shrink: 0;
  padding-bottom: 4px;
}

.hal-section-heading a:hover {
  color: var(--green2);
}

/* RESPONSIVE BREAKPOINTS FOR GRIDS */
@media (max-width: 1080px) {
  .hal-local-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .hal-destination-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .hal-local-grid {
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .hal-service-grid, .hal-how-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .hal-section-heading {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 20px;
  }
}

@media (max-width: 540px) {
  .hal-local-grid {
    grid-template-columns: 1fr;
  }
}
"""

with open('frontend/app/globals.css', 'r', encoding='utf-8', errors='ignore') as f:
    existing = f.read()

# Append or replace the polish styles cleanly
with open('frontend/app/globals.css', 'w', encoding='utf-8') as f:
    f.write(existing + "\n\n" + POLISHED_CSS)

print("Appended polished CSS module successfully!")
