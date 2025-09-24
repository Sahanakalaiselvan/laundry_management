from sqlalchemy import Column, String, Integer, ForeignKey, Float, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

# ---------------------------
# User Model
# ---------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    plan = Column(String, nullable=False)
    role = Column(String, default="user", nullable=False)

    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")
    requests = relationship("LaundryRequest", back_populates="user", cascade="all, delete-orphan")

# ---------------------------
# Order Model
# ---------------------------
class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, index=True)
    item_type = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    status = Column(String, default="Pending", nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    total_price = Column(Float, nullable=False)
    hostel_name = Column(String, nullable=False)
    room_number = Column(String, nullable=False)
    pickup_time_slot = Column(String, nullable=False)
    date_created = Column(DateTime(timezone=True), server_default=func.now()) 
    
    feedback = Column(String, nullable=True)
 

    user = relationship("User", back_populates="orders")

# ---------------------------
# Laundry Request Model
# ---------------------------
class LaundryRequest(Base):
    __tablename__ = "laundry_requests"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    item_type = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    note = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    payment_method = Column(String, nullable=True)
    status = Column(String, default="Pending", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="requests")

# ---------------------------
# Pricing Model
# ---------------------------
class Pricing(Base):
    __tablename__ = "pricing"

    item_type = Column(String, primary_key=True, index=True)
    price = Column(Float, nullable=False)
