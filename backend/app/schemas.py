from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class RegisterInput(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=7, max_length=30)
    country: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=10, max_length=128)
    confirm_age: bool = False
    accept_terms: bool = False


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    email: EmailStr
    email_verified: bool = True


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    email_verified: bool = True
    image_url: str = ""


class BookingInput(BaseModel):
    local_profile_id: int
    service_id: Optional[int] = None
    booking_date: str
    start_time: str
    guests: int = Field(default=1, ge=1, le=20)
    hours: float = Field(default=2, ge=0.5, le=24)
    message: str = Field(default="", max_length=2000)
    meeting_point_name: str = Field(default="", max_length=200)
    meeting_address: str = Field(default="", max_length=500)
    meeting_instructions: str = Field(default="", max_length=1000)
    accept_booking_terms: bool = False


class ProviderApplicationInput(BaseModel):
    name: str
    email: EmailStr
    phone: str
    country_code: str
    city: str
    languages: str
    categories: str
    experience: str


class ContactInput(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str


class StatusUpdate(BaseModel):
    status: str


class LocalProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    headline: Optional[str] = Field(default=None, min_length=3, max_length=180)
    bio: Optional[str] = Field(default=None, min_length=20, max_length=5000)
    country_code: Optional[str] = Field(default=None, min_length=2, max_length=2)
    city_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    city_slug: Optional[str] = Field(default=None, min_length=2, max_length=100)
    languages: Optional[str] = Field(default=None, min_length=2, max_length=300)
    hourly_rate: Optional[float] = Field(default=None, ge=5, le=1000)
    image_url: Optional[str] = Field(default=None, max_length=2000)
    response_time: Optional[str] = Field(default=None, max_length=120)
    years_local: Optional[int] = Field(default=None, ge=0, le=100)


class ServiceInput(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    category: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=10, max_length=3000)
    duration_hours: float = Field(default=2.0, ge=0.5, le=24)
    price: float = Field(default=60.0, ge=5, le=10000)
    active: bool = True


class ServiceUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=160)
    category: Optional[str] = Field(default=None, min_length=2, max_length=80)
    description: Optional[str] = Field(default=None, min_length=10, max_length=3000)
    duration_hours: Optional[float] = Field(default=None, ge=0.5, le=24)
    price: Optional[float] = Field(default=None, ge=5, le=10000)
    active: Optional[bool] = None


class AvailabilityDayInput(BaseModel):
    weekday: int = Field(ge=0, le=6)
    enabled: bool = True
    start_time: str = Field(default="09:00", max_length=10)
    end_time: str = Field(default="17:00", max_length=10)


class AvailabilityUpdate(BaseModel):
    days: list[AvailabilityDayInput]


class MessageInput(BaseModel):
    body: str = Field(min_length=1, max_length=3000)

class TravelerProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=50)
    country: Optional[str] = Field(default=None, max_length=120)
    home_city: Optional[str] = Field(default=None, max_length=120)
    bio: Optional[str] = Field(default=None, max_length=2000)
    image_url: Optional[str] = Field(default=None, max_length=2000)


class ReviewInput(BaseModel):
    booking_id: int
    rating: int = Field(ge=1, le=5)
    title: str = Field(default="", max_length=120)
    comment: str = Field(min_length=5, max_length=3000)

class AdminSettingsUpdate(BaseModel):
    platform_fee_percent: float = Field(default=12.0, ge=0, le=50)
    support_email: EmailStr = "support@hirealocals.com"
    marketplace_mode: str = Field(default="open", max_length=20)
    require_local_verification: bool = True
    require_email_verification: bool = False


class CommissionUpdate(BaseModel):
    payout_status: str = Field(max_length=30)
    notes: str = Field(default="", max_length=2000)



class AvailabilityOverrideInput(BaseModel):
    booking_date: str = Field(min_length=10, max_length=10)
    enabled: bool = False
    start_time: str = Field(default="09:00", max_length=10)
    end_time: str = Field(default="17:00", max_length=10)
    note: str = Field(default="", max_length=500)


class MeetingPointInput(BaseModel):
    meeting_point_name: str = Field(default="", max_length=200)
    meeting_address: str = Field(default="", max_length=500)
    meeting_instructions: str = Field(default="", max_length=1000)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    token: str = Field(min_length=20, max_length=300)
    new_password: str = Field(min_length=10, max_length=128)


class VerifyEmailInput(BaseModel):
    token: str = Field(min_length=20, max_length=300)


class SupportUpdateInput(BaseModel):
    status: str = Field(default="open", max_length=30)
    admin_note: str = Field(default="", max_length=2000)


class SupportReplyInput(BaseModel):
    message: str = Field(min_length=2, max_length=5000)


class SeoCityInput(BaseModel):
    country_code: str = Field(min_length=2, max_length=2)
    country_slug: str = Field(min_length=2, max_length=40)
    country_name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=120)
    name: str = Field(min_length=2, max_length=120)
    tagline: str = Field(default="", max_length=240)
    description: str = Field(default="", max_length=3000)
    image_url: str = Field(default="", max_length=2000)
    meta_title: str = Field(default="", max_length=180)
    meta_description: str = Field(default="", max_length=320)
    seo_content: str = Field(default="", max_length=12000)
    published: bool = True
    featured: bool = False
    sort_order: int = Field(default=100, ge=0, le=10000)


class SeoCityUpdate(BaseModel):
    country_code: Optional[str] = Field(default=None, min_length=2, max_length=2)
    country_slug: Optional[str] = Field(default=None, min_length=2, max_length=40)
    country_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    slug: Optional[str] = Field(default=None, min_length=2, max_length=120)
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    tagline: Optional[str] = Field(default=None, max_length=240)
    description: Optional[str] = Field(default=None, max_length=3000)
    image_url: Optional[str] = Field(default=None, max_length=2000)
    meta_title: Optional[str] = Field(default=None, max_length=180)
    meta_description: Optional[str] = Field(default=None, max_length=320)
    seo_content: Optional[str] = Field(default=None, max_length=12000)
    published: Optional[bool] = None
    featured: Optional[bool] = None
    sort_order: Optional[int] = Field(default=None, ge=0, le=10000)


class BlogPostInput(BaseModel):
    slug: str = Field(min_length=3, max_length=180)
    title: str = Field(min_length=5, max_length=220)
    excerpt: str = Field(default="", max_length=800)
    category: str = Field(default="Travel Planning", max_length=120)
    image_url: str = Field(default="", max_length=2000)
    content: str = Field(default="", max_length=30000)
    meta_title: str = Field(default="", max_length=180)
    meta_description: str = Field(default="", max_length=320)
    published: bool = False
    featured: bool = False


class BlogPostUpdate(BaseModel):
    slug: Optional[str] = Field(default=None, min_length=3, max_length=180)
    title: Optional[str] = Field(default=None, min_length=5, max_length=220)
    excerpt: Optional[str] = Field(default=None, max_length=800)
    category: Optional[str] = Field(default=None, max_length=120)
    image_url: Optional[str] = Field(default=None, max_length=2000)
    content: Optional[str] = Field(default=None, max_length=30000)
    meta_title: Optional[str] = Field(default=None, max_length=180)
    meta_description: Optional[str] = Field(default=None, max_length=320)
    published: Optional[bool] = None
    featured: Optional[bool] = None


class ServiceCategoryInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(default="", max_length=120)
    description: str = Field(default="", max_length=1000)
    active: bool = True
    sort_order: int = Field(default=100, ge=0, le=10000)


class ServiceCategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    slug: Optional[str] = Field(default=None, max_length=120)
    description: Optional[str] = Field(default=None, max_length=1000)
    active: Optional[bool] = None
    sort_order: Optional[int] = Field(default=None, ge=0, le=10000)


class PaymentRefundInput(BaseModel):
    reason: str = Field(default="requested_by_customer", pattern="^(duplicate|fraudulent|requested_by_customer)$")
    cancel_booking: bool = True


class LaunchTaskUpdate(BaseModel):
    done: bool
    note: str = Field(default="", max_length=2000)
