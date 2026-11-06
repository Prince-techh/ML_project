
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from database import Base


# Customer Table
class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)

    gender = Column(String(20))
    senior_citizen = Column(Integer)
    partner = Column(String(10))
    dependents = Column(String(10))
    tenure = Column(Integer)

    phone_service = Column(String(30))
    multiple_lines = Column(String(30))
    internet_service = Column(String(30))

    online_security = Column(String(30))
    online_backup = Column(String(30))
    device_protection = Column(String(30))
    tech_support = Column(String(30))
    streaming_tv = Column(String(30))
    streaming_movies = Column(String(30))

    contract = Column(String(30))
    paperless_billing = Column(String(10))
    payment_method = Column(String(50))

    monthly_charges = Column(Float)
    total_charges = Column(Float)
    service_count = Column(Integer)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    predictions = relationship(
        "Prediction",
        back_populates="customer",
        cascade="all, delete-orphan"
    )


# Prediction Table
class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)

    customer_id = Column(
        Integer,
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False
    )

    lr_prediction = Column(String(10))
    xgb_prediction = Column(String(10))

    lr_probability = Column(Float)
    xgb_probability = Column(Float)

    predicted_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer", back_populates="predictions")
