
import os
from pathlib import Path

import joblib
import pandas as pd

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    Response
)
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session
from sqlalchemy import or_

from xgboost import XGBClassifier

from schemas import CustomerData
from database import get_db
from models import Customer, Prediction

from crud import (
    create_customer,
    create_prediction,
    get_customer_by_id,
    get_total_customers,
    get_total_predictions
)


# ==========================================
# 1. INITIALIZE FASTAPI
# ==========================================

app = FastAPI(
    title="Customer Churn Prediction API",
    description="Customer Churn Prediction using Logistic Regression and XGBoost",
    version="1.0"
)


# ==========================================
# 2. CORS CONFIGURATION
# ==========================================

origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ==========================================
# 3. LOAD MACHINE LEARNING MODELS
# ==========================================

BASE_DIR = Path(__file__).resolve().parent

# Logistic Regression
lr_model = joblib.load(
    BASE_DIR / "Logistic_Regression.pkl"
)

# XGBoost Preprocessor
xgb_preprocessor = joblib.load(
    BASE_DIR / "XGBoost_Preprocessor.pkl"
)

# XGBoost Classifier
xgb_classifier = XGBClassifier(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=4,
    subsample=0.8,
    colsample_bytree=0.8,
    eval_metric="logloss",
    random_state=42,
    n_jobs=-1
)

xgb_classifier.load_model(
    BASE_DIR / "XGBoost_Model.json"
)


# ==========================================
# 4. HOME ROUTE
# ==========================================

@app.get("/")
def home():

    return {
        "message": "Welcome to Customer Churn Prediction API",
        "status": "Running"
    }


# ==========================================
# 5. CUSTOMER CHURN PREDICTION
# ==========================================

@app.post("/predict")
def predict_churn(
    customer: CustomerData,
    db: Session = Depends(get_db)
):

    try:

        # Convert Pydantic object into dictionary
        customer_data = customer.model_dump()

        # Calculate ServiceCount automatically
        service_cols = [
            "OnlineSecurity",
            "OnlineBackup",
            "DeviceProtection",
            "TechSupport",
            "StreamingTV",
            "StreamingMovies"
        ]

        customer_data["ServiceCount"] = sum(
            customer_data[col] == "Yes"
            for col in service_cols
        )

        # Convert dictionary into DataFrame
        data = pd.DataFrame([customer_data])

        # ----------------------------------
        # Logistic Regression Prediction
        # ----------------------------------

        lr_prediction = int(
            lr_model.predict(data)[0]
        )

        lr_probability = float(
            lr_model.predict_proba(data)[0][1]
        )

        # ----------------------------------
        # XGBoost Prediction
        # ----------------------------------

        xgb_data = xgb_preprocessor.transform(data)

        xgb_prediction = int(
            xgb_classifier.predict(xgb_data)[0]
        )

        xgb_probability = float(
            xgb_classifier.predict_proba(xgb_data)[0][1]
        )

        # ----------------------------------
        # Prepare Customer Data for Database
        # ----------------------------------

        db_customer_data = {
            "gender": customer_data["gender"],
            "senior_citizen": customer_data["SeniorCitizen"],
            "partner": customer_data["Partner"],
            "dependents": customer_data["Dependents"],
            "tenure": customer_data["tenure"],
            "phone_service": customer_data["PhoneService"],
            "multiple_lines": customer_data["MultipleLines"],
            "internet_service": customer_data["InternetService"],
            "online_security": customer_data["OnlineSecurity"],
            "online_backup": customer_data["OnlineBackup"],
            "device_protection": customer_data["DeviceProtection"],
            "tech_support": customer_data["TechSupport"],
            "streaming_tv": customer_data["StreamingTV"],
            "streaming_movies": customer_data["StreamingMovies"],
            "contract": customer_data["Contract"],
            "paperless_billing": customer_data["PaperlessBilling"],
            "payment_method": customer_data["PaymentMethod"],
            "monthly_charges": customer_data["MonthlyCharges"],
            "total_charges": customer_data["TotalCharges"],
            "service_count": customer_data["ServiceCount"]
        }

        # ----------------------------------
        # Save Customer
        # ----------------------------------

        saved_customer = create_customer(
            db,
            db_customer_data
        )

        # ----------------------------------
        # Save Both Model Predictions
        # ----------------------------------

        create_prediction(
            db=db,
            customer_id=saved_customer.id,
            lr_prediction="Yes" if lr_prediction == 1 else "No",
            xgb_prediction="Yes" if xgb_prediction == 1 else "No",
            lr_probability=lr_probability,
            xgb_probability=xgb_probability
        )

        # Commit both records together
        db.commit()

        # ----------------------------------
        # Return Prediction Response
        # ----------------------------------

        return {
            "customer_id": saved_customer.id,

            "logistic_regression": {
                "prediction": "Yes" if lr_prediction == 1 else "No",
                "churn_probability": round(lr_probability, 4)
            },

            "xgboost": {
                "prediction": "Yes" if xgb_prediction == 1 else "No",
                "churn_probability": round(xgb_probability, 4)
            },

            "database_status": "Customer and predictions saved successfully"
        }

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# 6. GET ALL CUSTOMERS
# ==========================================

@app.get("/customers")
def customers_list(
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    db: Session = Depends(get_db)
):

    query = db.query(Customer)

    if search:

        query = query.filter(
            or_(
                Customer.gender.ilike(f"%{search}%"),
                Customer.contract.ilike(f"%{search}%"),
                Customer.payment_method.ilike(f"%{search}%"),
                Customer.internet_service.ilike(f"%{search}%")
            )
        )

    total = query.count()

    items = (
        query.order_by(Customer.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "total": total,

        "items": [
            {
                "id": c.id,
                "gender": c.gender,
                "tenure": c.tenure,
                "contract": c.contract,
                "internet_service": c.internet_service,
                "monthly_charges": c.monthly_charges,
                "created_at": c.created_at
            }
            for c in items
        ]
    }


# ==========================================
# 7. GET CUSTOMER BY ID
# ==========================================

@app.get("/customers/{customer_id}")
def customer_details(
    customer_id: int,
    db: Session = Depends(get_db)
):

    customer = get_customer_by_id(
        db,
        customer_id
    )

    if not customer:

        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    return {
        "id": customer.id,
        "gender": customer.gender,
        "senior_citizen": customer.senior_citizen,
        "partner": customer.partner,
        "dependents": customer.dependents,
        "tenure": customer.tenure,
        "contract": customer.contract,
        "internet_service": customer.internet_service,
        "monthly_charges": customer.monthly_charges,
        "total_charges": customer.total_charges,
        "service_count": customer.service_count,
        "created_at": customer.created_at,

        "predictions": [
            {
                "id": p.id,
                "lr_prediction": p.lr_prediction,
                "xgb_prediction": p.xgb_prediction,
                "lr_probability": p.lr_probability,
                "xgb_probability": p.xgb_probability,
                "predicted_at": p.predicted_at
            }
            for p in customer.predictions
        ]
    }


# ==========================================
# 8. GET PREDICTION HISTORY
# ==========================================

@app.get("/predictions")
def prediction_history(
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    db: Session = Depends(get_db)
):

    query = db.query(Prediction)

    if search:

        query = query.filter(
            or_(
                Prediction.lr_prediction.ilike(f"%{search}%"),
                Prediction.xgb_prediction.ilike(f"%{search}%")
            )
        )

    total = query.count()

    items = (
        query.order_by(Prediction.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "total": total,

        "items": [
            {
                "id": p.id,
                "customer_id": p.customer_id,
                "lr_prediction": p.lr_prediction,
                "xgb_prediction": p.xgb_prediction,
                "lr_probability": p.lr_probability,
                "xgb_probability": p.xgb_probability,
                "predicted_at": p.predicted_at
            }
            for p in items
        ]
    }


# ==========================================
# 9. DASHBOARD STATISTICS
# ==========================================

@app.get("/dashboard/stats")
def dashboard_stats(
    db: Session = Depends(get_db)
):

    total_customers = get_total_customers(db)

    total_predictions = get_total_predictions(db)

    lr_churn = (
        db.query(Prediction)
        .filter(Prediction.lr_prediction == "Yes")
        .count()
    )

    xgb_churn = (
        db.query(Prediction)
        .filter(Prediction.xgb_prediction == "Yes")
        .count()
    )

    return {
        "total_customers": total_customers,
        "total_predictions": total_predictions,
        "logistic_regression_churn_predictions": lr_churn,
        "xgboost_churn_predictions": xgb_churn
    }


# ==========================================
# 10. DELETE CUSTOMER
# ==========================================

@app.delete(
    "/customers/{customer_id}",
    status_code=204
)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db)
):

    customer = get_customer_by_id(
        db,
        customer_id
    )

    if not customer:

        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    db.delete(customer)

    db.commit()

    return Response(status_code=204)
