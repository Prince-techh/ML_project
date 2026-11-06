
from sqlalchemy.orm import Session

from models import Customer, Prediction


# -----------------------------------
# 1. Create Customer
# -----------------------------------

def create_customer(db: Session, customer_data: dict):
    customer = Customer(**customer_data)

    db.add(customer)
    db.flush()

    return customer


# -----------------------------------
# 2. Create Prediction
# -----------------------------------

def create_prediction(
    db: Session,
    customer_id: int,
    lr_prediction: str,
    xgb_prediction: str,
    lr_probability: float,
    xgb_probability: float
):
    prediction = Prediction(
        customer_id=customer_id,
        lr_prediction=lr_prediction,
        xgb_prediction=xgb_prediction,
        lr_probability=lr_probability,
        xgb_probability=xgb_probability
    )

    db.add(prediction)

    return prediction


# -----------------------------------
# 3. Get All Customers
# -----------------------------------

def get_customers(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(Customer)
        .order_by(Customer.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


# -----------------------------------
# 4. Get Customer By ID
# -----------------------------------

def get_customer_by_id(db: Session, customer_id: int):
    return (
        db.query(Customer)
        .filter(Customer.id == customer_id)
        .first()
    )


# -----------------------------------
# 5. Get All Predictions
# -----------------------------------

def get_predictions(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(Prediction)
        .order_by(Prediction.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


# -----------------------------------
# 6. Count Customers
# -----------------------------------

def get_total_customers(db: Session):
    return db.query(Customer).count()


# -----------------------------------
# 7. Count Predictions
# -----------------------------------

def get_total_predictions(db: Session):
    return db.query(Prediction).count()
