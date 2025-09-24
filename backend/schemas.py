from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# -------- USER --------
class UserBase(BaseModel):
    username: str
    email: EmailStr
    phone: str
    plan: str
    role: str = "user"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: str

    model_config = {
        "from_attributes": True
    }

# -------- ORDER --------
class OrderBase(BaseModel):
    item_type: str
    quantity: int
    status: str = "Pending"
    hostel_name: str
    room_number: str
    pickup_time_slot: str

class OrderCreate(OrderBase):
    user_id: str

class OrderResponse(OrderBase):
    id: str
    user_id: str
    total_price: float

    model_config = {
        "from_attributes": True
    }

# ✅ NEW: Full Order schema with date + feedback (for GET /all-orders)
class OrderOut(OrderBase):
    id: str
    user_id: str
    total_price: float
    date_created: Optional[datetime]
    feedback: Optional[str] = None

    model_config = {
        "from_attributes": True
    }

# -------- STATUS UPDATE --------
class StatusUpdate(BaseModel):
    status: str

# -------- PRICING --------
class PricingUpdate(BaseModel):
    item_type: str
    price: float

class PricingResponse(PricingUpdate):
    model_config = {
        "from_attributes": True
    }

# -------- LAUNDRY REQUEST --------
class LaundryRequestBase(BaseModel):
    item_type: str
    quantity: int
    note: Optional[str] = None
    payment_method: Optional[str] = None

class LaundryRequestCreate(LaundryRequestBase):
    user_id: str

class LaundryRequestResponse(LaundryRequestBase):
    id: str
    user_id: str
    status: str
    image_url: Optional[str] = None

    model_config = {
        "from_attributes": True
    }
