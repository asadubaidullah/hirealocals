from sqlmodel import Session, select
from .database import engine
from .models import User, LocalProfile, Service, SeoCity, BlogPost, ServiceCategory
from .security import hash_password

DEMO_LOCALS = [
    {
        "email": "james@example.com", "name": "James Wilson", "password": "LocalDemo123!",
        "profile": dict(slug="james-wilson-london", display_name="James Wilson", headline="London storyteller & hidden-gems guide", bio="Born and raised in London, James loves showing visitors the character behind the landmarks: quiet lanes, old pubs, local markets and stories that rarely make it into guidebooks.", country_code="GB", city_slug="london", city_name="London", languages="English, Spanish", hourly_rate=32, rating=4.9, review_count=126, verified=False, image_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80", response_time="Usually within 1 hour", years_local=18),
        "services": [
            ("Hidden London Walking Experience", "Tour Guide", "A flexible private walk through famous streets and lesser-known corners.", 3, 89),
            ("London Food & Market Walk", "Food Expert", "Taste local favourites while exploring one of London's best-known market areas.", 2.5, 78),
        ]
    },
    {
        "email": "maya@example.com", "name": "Maya Carter", "password": "LocalDemo123!",
        "profile": dict(slug="maya-carter-new-york", display_name="Maya Carter", headline="NYC photographer & neighbourhood local", bio="Maya combines street photography with an easygoing New York walk, helping visitors leave with great memories and photos rather than rushed snapshots.", country_code="US", city_slug="new-york", city_name="New York", languages="English, French", hourly_rate=45, rating=4.8, review_count=84, verified=False, image_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80", response_time="Usually within 2 hours", years_local=11),
        "services": [
            ("NYC Photo Walk", "Photographer", "A relaxed private photo walk through the neighbourhoods you choose.", 2, 110),
            ("Local NYC Orientation", "Local Guide", "Get comfortable with transit, neighbourhoods and practical local tips on your first day.", 2, 80),
        ]
    },
    {
        "email": "olivia@example.com", "name": "Olivia Hart", "password": "LocalDemo123!",
        "profile": dict(slug="olivia-hart-edinburgh", display_name="Olivia Hart", headline="Edinburgh history lover & family-friendly local", bio="Olivia creates friendly, flexible walks for couples and families who want history without a classroom feel.", country_code="GB", city_slug="edinburgh", city_name="Edinburgh", languages="English, German", hourly_rate=29, rating=5.0, review_count=58, verified=False, image_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80", response_time="Usually within 3 hours", years_local=14),
        "services": [
            ("Old Town Stories", "Tour Guide", "A private Old Town walk shaped around your pace and interests.", 2.5, 72),
        ]
    },
    {
        "email": "daniel@example.com", "name": "Daniel Brooks", "password": "LocalDemo123!",
        "profile": dict(slug="daniel-brooks-miami", display_name="Daniel Brooks", headline="Miami food, culture & bilingual local", bio="Daniel helps visitors discover Miami beyond the beach, with a focus on neighbourhood culture and casual local food.", country_code="US", city_slug="miami", city_name="Miami", languages="English, Spanish", hourly_rate=38, rating=4.9, review_count=69, verified=False, image_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80", response_time="Usually within 1 hour", years_local=16),
        "services": [
            ("Miami Local Food Explorer", "Food Expert", "A private, flexible food-focused local experience.", 3, 98),
        ]
    },
]

SEO_CITIES = [
    dict(country_code="GB", country_slug="uk", country_name="United Kingdom", slug="london", name="London", tagline="Stories, markets and neighbourhoods beyond the postcard.", description="Meet trusted London locals for private walks, food discoveries, photography, first-day orientation and flexible help shaped around your trip.", image_url="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1400&q=80", featured=True, sort_order=10),
    dict(country_code="GB", country_slug="uk", country_name="United Kingdom", slug="manchester", name="Manchester", tagline="Music, football culture and northern character.", description="Explore Manchester with people who know its neighbourhoods, culture and everyday favourites.", image_url="https://images.unsplash.com/photo-1515586838455-8f8f940d6853?auto=format&fit=crop&w=1400&q=80", sort_order=20),
    dict(country_code="GB", country_slug="uk", country_name="United Kingdom", slug="birmingham", name="Birmingham", tagline="Canals, food and a city best understood locally.", description="Find a Birmingham local for personal tours, practical trip help and authentic neighbourhood recommendations.", image_url="/images/destinations/birmingham.jpg", sort_order=30),
    dict(country_code="GB", country_slug="uk", country_name="United Kingdom", slug="edinburgh", name="Edinburgh", tagline="Old streets, dramatic views and stories everywhere.", description="Book a local in Edinburgh for history walks, family-friendly exploring, photography and personal trip planning.", image_url="https://images.unsplash.com/photo-1506377585622-bedcbb027afc?auto=format&fit=crop&w=1400&q=80", featured=True, sort_order=40),
    dict(country_code="GB", country_slug="uk", country_name="United Kingdom", slug="liverpool", name="Liverpool", tagline="Music, waterfront history and warm local energy.", description="Discover Liverpool with locals who can tailor the city to your interests and pace.", image_url="https://images.unsplash.com/photo-1579197120180-23066892f0eb?auto=format&fit=crop&w=1400&q=80", sort_order=50),
    dict(country_code="US", country_slug="usa", country_name="United States", slug="new-york", name="New York", tagline="Your own New York, one neighbourhood at a time.", description="Hire a New York local for neighbourhood walks, photos, food, orientation and practical city help.", image_url="https://images.unsplash.com/photo-1522083165195-3424ed129620?auto=format&fit=crop&w=1400&q=80", featured=True, sort_order=60),
    dict(country_code="US", country_slug="usa", country_name="United States", slug="los-angeles", name="Los Angeles", tagline="Big city, many neighbourhoods — make it personal.", description="Connect with LA locals for food, photography, culture and flexible private exploring.", image_url="https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?auto=format&fit=crop&w=1400&q=80", sort_order=70),
    dict(country_code="US", country_slug="usa", country_name="United States", slug="miami", name="Miami", tagline="Beach energy, Latin culture and neighbourhood flavour.", description="Meet Miami locals for cultural walks, food discovery, photography and travel help.", image_url="https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?auto=format&fit=crop&w=1400&q=80", featured=True, sort_order=80),
    dict(country_code="US", country_slug="usa", country_name="United States", slug="las-vegas", name="Las Vegas", tagline="There is more to Vegas than the Strip.", description="Find locals who can help you discover food, neighbourhoods, photo spots and practical Vegas advice.", image_url="https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?auto=format&fit=crop&w=1400&q=80", sort_order=90),
    dict(country_code="US", country_slug="usa", country_name="United States", slug="chicago", name="Chicago", tagline="Architecture, food and neighbourhood pride.", description="Book Chicago locals for flexible walking experiences, food, photography and first-day orientation.", image_url="https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=80", sort_order=100),
]

BLOG_POSTS = [
    dict(slug="how-to-hire-a-local-guide-london", title="How to Hire a Local Guide in London: What to Look For", excerpt="A practical checklist for choosing a trustworthy local, agreeing on the plan and getting more value from a private experience.", category="London", image_url="https://images.unsplash.com/photo-1486299267070-83823f5448dd?auto=format&fit=crop&w=1200&q=80", content="""Hiring a local can be one of the easiest ways to make a London visit feel less rushed. The best choice is not automatically the person with the longest list of landmarks; it is the person whose style, availability and interests match yours.\n\n## Start with the kind of help you actually want\nSome travelers want history. Others want food, photography, a family-friendly pace or simply help understanding how the city fits together. Decide that first, then compare profiles around that need.\n\n## Check the practical details\n- Languages and communication style\n- Exact meeting area\n- What the quoted price includes\n- Expected walking or transport\n- Cancellation and rescheduling rules\n\n## Leave room for flexibility\nA private local experience is most valuable when it can react to weather, energy levels and what you discover along the way.""", published=True, featured=True),
    dict(slug="first-time-new-york-local-tips", title="First Time in New York 12 Local Tips That Make the Trip Easier", excerpt="From neighbourhood planning to subway habits, these are the small things that make a first New York trip smoother.", category="New York", image_url="https://images.unsplash.com/photo-1496588152823-86ff7695e68f?auto=format&fit=crop&w=1200&q=80", content="""Good New York planning is less about collecting the longest attraction list and more about arranging each day so the geography makes sense.\n\n## Use neighbourhoods as your planning unit\nGroup nearby places together. It reduces time lost in transit and leaves more room for spontaneous local discoveries.\n\n## Ask specific questions\nTell a local what you enjoy, who you are traveling with and what you definitely do not want. Specific input produces much better recommendations.\n\n## Build buffer time\nNew York rewards curiosity. Leave some space between fixed reservations so a market, view, cafe or neighbourhood recommendation can become part of the day.""", published=True),
    dict(slug="private-guide-vs-group-tour", title="Private Local vs Group Tour: Which Is Better for Your Trip?", excerpt="Compare flexibility, price, pace and personalisation before deciding how you want to explore a city.", category="Travel Planning", image_url="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80", content="""Private local experiences and group tours solve different travel problems. A group tour can be efficient and inexpensive per person, while a private local is usually strongest when flexibility matters.\n\n## Choose a group tour when\n- You want a fixed highlights route\n- The lowest per-person price matters most\n- You enjoy meeting other travelers\n\n## Choose a private local when\n- Your interests are specific\n- Your pace needs to stay flexible\n- You want practical neighbourhood advice alongside the experience\n\nThe right choice is the one that matches the trip rather than the most popular format.""", published=True),
]

SERVICE_CATEGORIES = [
    ("Tour Guide", "Private sightseeing, history and neighbourhood exploring."),
    ("Local Guide", "Flexible local orientation and city help."),
    ("Food Expert", "Local food, markets and neighbourhood flavours."),
    ("Photographer", "Travel photography and photo walks."),
    ("Interpreter", "Language support for travelers and business visitors."),
    ("Trip Planner", "Personal local planning before or during the trip."),
    ("Shopping Companion", "Local shopping help and market guidance."),
    ("Airport Assistance", "Arrival orientation and practical airport help."),
]


def _slug(value: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "item"


def seed_if_empty(seed_demo_data: bool = True):
    with Session(engine) as session:
        if seed_demo_data and not session.exec(select(User)).first():
            admin = User(email="admin@hirealocals.com", full_name="HireALocals Admin", role="admin", password_hash=hash_password("AdminDemo123!"))
            tourist = User(email="traveler@example.com", full_name="Demo Traveler", role="tourist", password_hash=hash_password("TouristDemo123!"))
            session.add(admin); session.add(tourist); session.commit()
            for item in DEMO_LOCALS:
                user = User(email=item["email"], full_name=item["name"], role="local", password_hash=hash_password(item["password"]))
                session.add(user); session.commit(); session.refresh(user)
                profile = LocalProfile(user_id=user.id, **item["profile"])
                session.add(profile); session.commit(); session.refresh(profile)
                for title, category, description, hours, price in item["services"]:
                    session.add(Service(local_profile_id=profile.id, title=title, category=category, description=description, duration_hours=hours, price=price))
                session.commit()

        # V2.9 content tables are seeded independently so existing installations receive them.
        if not session.exec(select(SeoCity)).first():
            for item in SEO_CITIES:
                item = dict(item)
                item["path_key"] = f"{item['country_slug']}/{item['slug']}"
                item["meta_title"] = f"Hire a Local in {item['name']}"
                item["meta_description"] = item["description"][:320]
                item["seo_content"] = f"## Explore {item['name']} with a local\n{item['description']}\n\n## Plan around your interests\nCompare locals by services, languages, reviews, availability and price before sending a booking request."
                session.add(SeoCity(**item))
            session.commit()

        if not session.exec(select(BlogPost)).first():
            from datetime import datetime, timezone, timedelta
            now = datetime.now(timezone.utc)
            for i, item in enumerate(BLOG_POSTS):
                item = dict(item)
                item["meta_title"] = item["title"]
                item["meta_description"] = item["excerpt"][:320]
                item["published_at"] = now - timedelta(days=i + 1)
                session.add(BlogPost(**item))
            session.commit()

        if not session.exec(select(ServiceCategory)).first():
            for i, (name, description) in enumerate(SERVICE_CATEGORIES):
                session.add(ServiceCategory(name=name, slug=_slug(name), description=description, active=True, sort_order=(i + 1) * 10))
            session.commit()
