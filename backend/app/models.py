from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field


def utcnow():
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True, max_length=255)
    full_name: str = Field(max_length=120)
    password_hash: str
    role: str = Field(default="tourist", index=True, max_length=20)
    is_active: bool = True
    created_at: datetime = Field(default_factory=utcnow)


class LocalProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True)
    slug: str = Field(unique=True, index=True, max_length=180)
    display_name: str = Field(max_length=120)
    headline: str = Field(max_length=180)
    bio: str
    country_code: str = Field(index=True, max_length=2)
    city_slug: str = Field(index=True, max_length=100)
    city_name: str = Field(index=True, max_length=120)
    languages: str = "English"
    hourly_rate: float = 30.0
    rating: float = 0.0
    review_count: int = 0
    verified: bool = False
    image_url: str = ""
    response_time: str = "Within a few hours"
    years_local: int = 5
    created_at: datetime = Field(default_factory=utcnow)


class Service(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    local_profile_id: int = Field(foreign_key="localprofile.id", index=True)
    title: str = Field(max_length=160)
    category: str = Field(index=True, max_length=80)
    description: str
    duration_hours: float = 2.0
    price: float = 60.0
    active: bool = True


class Booking(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tourist_user_id: int = Field(foreign_key="user.id", index=True)
    local_profile_id: int = Field(foreign_key="localprofile.id", index=True)
    service_id: Optional[int] = Field(default=None, foreign_key="service.id")
    booking_date: str = Field(index=True, max_length=20)
    start_time: str = Field(max_length=10)
    guests: int = 1
    hours: float = 2.0
    message: str = ""
    subtotal: float = 0.0
    platform_fee: float = 0.0
    status: str = Field(default="pending", index=True, max_length=30)
    created_at: datetime = Field(default_factory=utcnow)


class Review(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: int = Field(foreign_key="booking.id", unique=True)
    tourist_user_id: int = Field(foreign_key="user.id")
    local_profile_id: int = Field(foreign_key="localprofile.id", index=True)
    rating: int
    title: str = ""
    comment: str
    created_at: datetime = Field(default_factory=utcnow)


class ProviderApplication(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=120)
    email: str = Field(index=True, max_length=255)
    phone: str = Field(max_length=50)
    country_code: str = Field(index=True, max_length=2)
    city: str = Field(index=True, max_length=120)
    languages: str
    categories: str
    experience: str
    status: str = Field(default="pending", index=True, max_length=30)
    created_at: datetime = Field(default_factory=utcnow)


class ContactMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=120)
    email: str = Field(max_length=255)
    subject: str = Field(max_length=180)
    message: str
    created_at: datetime = Field(default_factory=utcnow)


class WeeklyAvailability(SQLModel, table=True):
    """Weekly recurring availability for a local. Weekday is 0=Monday ... 6=Sunday."""
    id: Optional[int] = Field(default=None, primary_key=True)
    local_profile_id: int = Field(foreign_key="localprofile.id", index=True)
    weekday: int = Field(index=True, ge=0, le=6)
    enabled: bool = True
    start_time: str = Field(default="09:00", max_length=10)
    end_time: str = Field(default="17:00", max_length=10)
    updated_at: datetime = Field(default_factory=utcnow)


class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: int = Field(foreign_key="booking.id", index=True)
    sender_user_id: int = Field(foreign_key="user.id", index=True)
    body: str
    created_at: datetime = Field(default_factory=utcnow)

class TravelerProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True)
    phone: str = Field(default="", max_length=50)
    country: str = Field(default="", max_length=120)
    home_city: str = Field(default="", max_length=120)
    bio: str = Field(default="", max_length=2000)
    image_url: str = Field(default="", max_length=2000)
    updated_at: datetime = Field(default_factory=utcnow)


class Favorite(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tourist_user_id: int = Field(foreign_key="user.id", index=True)
    local_profile_id: int = Field(foreign_key="localprofile.id", index=True)
    created_at: datetime = Field(default_factory=utcnow)

class CommissionLedger(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: int = Field(foreign_key="booking.id", unique=True, index=True)
    gross_amount: float = 0.0
    local_amount: float = 0.0
    platform_fee: float = 0.0
    payout_status: str = Field(default="pending", index=True, max_length=30)
    notes: str = Field(default="", max_length=2000)
    updated_at: datetime = Field(default_factory=utcnow)


class ReviewModeration(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    review_id: int = Field(foreign_key="review.id", unique=True, index=True)
    status: str = Field(default="visible", index=True, max_length=30)
    updated_at: datetime = Field(default_factory=utcnow)


class SiteSetting(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(unique=True, index=True, max_length=120)
    value: str = Field(default="", max_length=2000)
    updated_at: datetime = Field(default_factory=utcnow)


class UploadRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_user_id: int = Field(foreign_key="user.id", index=True)
    kind: str = Field(index=True, max_length=50)
    original_name: str = Field(max_length=255)
    stored_path: str = Field(max_length=1000)
    mime_type: str = Field(max_length=120)
    size_bytes: int = 0
    status: str = Field(default="pending", index=True, max_length=30)
    public_url: str = Field(default="", max_length=2000)
    created_at: datetime = Field(default_factory=utcnow)



class AvailabilityOverride(SQLModel, table=True):
    """Date-specific availability. enabled=False means unavailable all day; enabled=True overrides weekly hours."""
    id: Optional[int] = Field(default=None, primary_key=True)
    local_profile_id: int = Field(foreign_key="localprofile.id", index=True)
    booking_date: str = Field(index=True, max_length=20)
    enabled: bool = False
    start_time: str = Field(default="09:00", max_length=10)
    end_time: str = Field(default="17:00", max_length=10)
    note: str = Field(default="", max_length=500)
    updated_at: datetime = Field(default_factory=utcnow)


class BookingDetail(SQLModel, table=True):
    """Scheduling/location metadata kept separate so existing Booking tables need no destructive migration."""
    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: int = Field(foreign_key="booking.id", unique=True, index=True)
    meeting_point_name: str = Field(default="", max_length=200)
    meeting_address: str = Field(default="", max_length=500)
    meeting_instructions: str = Field(default="", max_length=1000)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    updated_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    updated_at: datetime = Field(default_factory=utcnow)


class BookingEvent(SQLModel, table=True):
    """Audit timeline for booking lifecycle changes."""
    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: int = Field(foreign_key="booking.id", index=True)
    actor_user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    event_type: str = Field(index=True, max_length=50)
    from_status: str = Field(default="", max_length=30)
    to_status: str = Field(default="", max_length=30)
    note: str = Field(default="", max_length=1000)
    created_at: datetime = Field(default_factory=utcnow)


class UserEmailState(SQLModel, table=True):
    """Email verification kept separate so existing User tables need no destructive migration."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True)
    verified: bool = False
    verified_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=utcnow)


class AuthToken(SQLModel, table=True):
    """Hashed one-time tokens for email verification and password reset."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    kind: str = Field(index=True, max_length=30)
    token_hash: str = Field(unique=True, index=True, max_length=64)
    expires_at: datetime
    used_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utcnow)


class Notification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    kind: str = Field(index=True, max_length=50)
    title: str = Field(max_length=180)
    body: str = Field(default="", max_length=2000)
    link: str = Field(default="", max_length=500)
    read_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utcnow)


class EmailOutbox(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    to_email: str = Field(index=True, max_length=255)
    subject: str = Field(max_length=255)
    body_text: str
    status: str = Field(default="queued", index=True, max_length=30)
    last_error: str = Field(default="", max_length=1000)
    created_at: datetime = Field(default_factory=utcnow)
    sent_at: Optional[datetime] = None


class ConversationPreference(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    booking_id: int = Field(
        foreign_key="booking.id",
        index=True,
    )

    user_id: int = Field(
        foreign_key="user.id",
        index=True,
    )

    archived: bool = Field(
        default=False,
        index=True,
    )

    cleared_at: Optional[datetime] = None

    deleted_at: Optional[datetime] = None

    updated_at: datetime = Field(
        default_factory=utcnow
    )


class SupportState(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    contact_message_id: int = Field(foreign_key="contactmessage.id", unique=True, index=True)
    status: str = Field(default="open", index=True, max_length=30)
    admin_note: str = Field(default="", max_length=2000)
    assigned_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    updated_at: datetime = Field(default_factory=utcnow)


class SupportReply(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    contact_message_id: int = Field(foreign_key="contactmessage.id", index=True)
    admin_user_id: int = Field(foreign_key="user.id", index=True)
    message: str = Field(max_length=5000)
    created_at: datetime = Field(default_factory=utcnow)


class SeoCity(SQLModel, table=True):
    """DB-driven public destination/SEO landing page."""
    id: Optional[int] = Field(default=None, primary_key=True)
    path_key: str = Field(unique=True, index=True, max_length=220)
    country_code: str = Field(index=True, max_length=2)
    country_slug: str = Field(index=True, max_length=40)
    country_name: str = Field(max_length=120)
    slug: str = Field(index=True, max_length=120)
    name: str = Field(index=True, max_length=120)
    tagline: str = Field(default="", max_length=240)
    description: str = Field(default="", max_length=3000)
    image_url: str = Field(default="", max_length=2000)
    meta_title: str = Field(default="", max_length=180)
    meta_description: str = Field(default="", max_length=320)
    seo_content: str = Field(default="", max_length=12000)
    published: bool = Field(default=True, index=True)
    featured: bool = Field(default=False, index=True)
    sort_order: int = Field(default=100, index=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class BlogPost(SQLModel, table=True):
    """Simple dependency-free CMS article. Content uses lightweight markdown-like text."""
    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(unique=True, index=True, max_length=180)
    title: str = Field(max_length=220)
    excerpt: str = Field(default="", max_length=800)
    category: str = Field(default="Travel Planning", index=True, max_length=120)
    image_url: str = Field(default="", max_length=2000)
    content: str = Field(default="", max_length=30000)
    meta_title: str = Field(default="", max_length=180)
    meta_description: str = Field(default="", max_length=320)
    published: bool = Field(default=False, index=True)
    featured: bool = Field(default=False, index=True)
    published_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class ServiceCategory(SQLModel, table=True):
    """Admin-managed marketplace service taxonomy."""
    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(unique=True, index=True, max_length=120)
    name: str = Field(unique=True, index=True, max_length=120)
    description: str = Field(default="", max_length=1000)
    active: bool = Field(default=True, index=True)
    sort_order: int = Field(default=100, index=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class AuditLog(SQLModel, table=True):
    """Append-only operational/security audit trail for important marketplace actions."""
    id: Optional[int] = Field(default=None, primary_key=True)
    actor_user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    action: str = Field(index=True, max_length=100)
    entity_type: str = Field(index=True, max_length=80)
    entity_id: str = Field(default="", index=True, max_length=120)
    summary: str = Field(default="", max_length=2000)
    request_id: str = Field(default="", index=True, max_length=80)
    ip_hash: str = Field(default="", max_length=64)
    created_at: datetime = Field(default_factory=utcnow, index=True)


class RateLimitEvent(SQLModel, table=True):
    """Small hashed event log used for DB-backed rate limiting across API workers."""
    id: Optional[int] = Field(default=None, primary_key=True)
    route_key: str = Field(index=True, max_length=80)
    identity_hash: str = Field(index=True, max_length=64)
    created_at: datetime = Field(default_factory=utcnow, index=True)



class PaymentRecord(SQLModel, table=True):
    """Provider-neutral booking payment state for Safepay checkout and refunds."""
    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: int = Field(foreign_key="booking.id", unique=True, index=True)
    provider: str = Field(default="safepay", index=True, max_length=30)
    status: str = Field(default="unpaid", index=True, max_length=40)
    currency: str = Field(default="usd", max_length=8)
    amount_total_minor: int = 0
    platform_fee_minor: int = 0
    refunded_minor: int = 0
    checkout_session_id: str = Field(default="", index=True, max_length=180)
    payment_intent_id: str = Field(default="", index=True, max_length=180)
    charge_id: str = Field(default="", index=True, max_length=180)
    connected_account_id: str = Field(default="", index=True, max_length=180)
    refund_id: str = Field(default="", index=True, max_length=180)
    paid_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)



class UserConsent(SQLModel, table=True):
    """Immutable record of policy acceptance for account and booking actions."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    booking_id: Optional[int] = Field(default=None, foreign_key="booking.id", index=True)
    kind: str = Field(index=True, max_length=60)
    version: str = Field(max_length=80)
    request_id: str = Field(default="", index=True, max_length=80)
    ip_hash: str = Field(default="", max_length=64)
    accepted_at: datetime = Field(default_factory=utcnow, index=True)


class LaunchTask(SQLModel, table=True):
    """Manual operational launch checklist maintained by admins."""
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(unique=True, index=True, max_length=100)
    label: str = Field(max_length=220)
    category: str = Field(default="Operations", index=True, max_length=80)
    required: bool = True
    done: bool = False
    note: str = Field(default="", max_length=2000)
    updated_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    updated_at: datetime = Field(default_factory=utcnow)



class PaymentWebhookEvent(SQLModel, table=True):
    """Provider-neutral webhook idempotency and processing log."""
    id: Optional[int] = Field(default=None, primary_key=True)
    provider: str = Field(index=True, max_length=30)
    event_id: str = Field(unique=True, index=True, max_length=220)
    event_type: str = Field(default="", index=True, max_length=120)
    status: str = Field(default="processed", index=True, max_length=30)
    last_error: str = Field(default="", max_length=1000)
    processed_at: datetime = Field(default_factory=utcnow)


class TripRequest(SQLModel, table=True):
    """Custom traveler demand captured when direct marketplace match is unavailable."""
    id: Optional[int] = Field(default=None, primary_key=True)
    tourist_user_id: int = Field(foreign_key="user.id", index=True)
    country_code: str = Field(default="GB", index=True, max_length=2)
    city_name: str = Field(index=True, max_length=120)
    city_slug: str = Field(index=True, max_length=120)
    booking_date: str = Field(index=True, max_length=20)
    flexible_dates: bool = Field(default=False)
    date_end: Optional[str] = Field(default=None, max_length=20)
    preferred_time: str = Field(default="morning", max_length=30)
    duration_hours: float = Field(default=3.0)
    guests: int = Field(default=1)
    category: str = Field(default="Custom Experience", index=True, max_length=80)
    title: str = Field(default="", max_length=180)
    description: str = Field(default="", max_length=4000)
    interests: str = Field(default="", max_length=500)
    language_preference: str = Field(default="English", max_length=120)
    budget_amount: Optional[float] = Field(default=None)
    budget_currency: str = Field(default="USD", max_length=8)
    special_requirements: str = Field(default="", max_length=2000)
    meeting_preference: str = Field(default="", max_length=300)
    status: str = Field(default="submitted", index=True, max_length=30)
    selected_offer_id: Optional[int] = Field(default=None, index=True)
    converted_booking_id: Optional[int] = Field(default=None, foreign_key="booking.id", index=True)
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utcnow, index=True)
    updated_at: datetime = Field(default_factory=utcnow)


class RequestOffer(SQLModel, table=True):
    """Tailored price and itinerary quote submitted by a verified Local Partner."""
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_request_id: int = Field(foreign_key="triprequest.id", index=True)
    local_profile_id: int = Field(foreign_key="localprofile.id", index=True)
    offered_price: float = Field(default=0.0, gt=0)
    currency: str = Field(default="USD", max_length=8)
    duration_hours: float = Field(default=3.0)
    proposed_start_time: str = Field(default="10:00", max_length=10)
    proposal_message: str = Field(default="", max_length=4000)
    inclusions: str = Field(default="", max_length=1000)
    status: str = Field(default="submitted", index=True, max_length=30)
    created_at: datetime = Field(default_factory=utcnow, index=True)
    updated_at: datetime = Field(default_factory=utcnow)

