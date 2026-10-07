import streamlit as st
import pandas as pd
import joblib


# ==========================================
# LOAD MODEL, SCALER AND COLUMN NAMES
# ==========================================

model = joblib.load("knn_heart_model.pkl")
scaler = joblib.load("heart_scaler.pkl")
columns = joblib.load("heart_columns.pkl")


# ==========================================
# TITLE
# ==========================================

st.title("❤️ Heart Disease Prediction by Prince")

st.markdown("Enter the following patient details:")


# ==========================================
# INPUT FEATURES
# ==========================================

# 1. Age
age = st.slider(
    "Age",
    min_value=18,
    max_value=100,
    value=40
)


# 2. Sex
# Assuming:
# 0 = Female
# 1 = Male

sex = st.selectbox(
    "Sex",
    [0, 1]
)


# 3. Chest Pain Type
chest_pain_type = st.selectbox(
    "Chest Pain Type",
    [0, 1, 2, 3]
)


# 4. Blood Pressure
bp = st.number_input(
    "Resting Blood Pressure (mm Hg)",
    min_value=80,
    max_value=200,
    value=120
)


# 5. Cholesterol
cholesterol = st.number_input(
    "Cholesterol (mg/dl)",
    min_value=100,
    max_value=600,
    value=200
)


# 6. Fasting Blood Sugar
fbs_over_120 = st.selectbox(
    "Fasting Blood Sugar > 120 mg/dl",
    [0, 1]
)


# 7. EKG Results
ekg_results = st.selectbox(
    "EKG Results",
    [0, 1, 2]
)


# 8. Maximum Heart Rate
max_hr = st.slider(
    "Maximum Heart Rate",
    min_value=60,
    max_value=220,
    value=150
)


# 9. Exercise Angina
exercise_angina = st.selectbox(
    "Exercise Angina",
    [0, 1]
)


# 10. ST Depression
st_depression = st.number_input(
    "ST Depression",
    min_value=0.0,
    max_value=6.0,
    value=1.0,
    step=0.1
)


# 11. Slope of ST
slope_of_st = st.selectbox(
    "Slope of ST",
    [0, 1, 2]
)


# 12. Number of Vessels
number_of_vessels_fluro = st.selectbox(
    "Number of Vessels",
    [0, 1, 2, 3]
)


# 13. Thallium
thallium = st.selectbox(
    "Thallium",
    [3, 6, 7]
)


# ==========================================
# PREDICTION BUTTON
# ==========================================

if st.button("Predict"):

    # ======================================
    # CREATE INPUT DATAFRAME
    # ======================================

    input_data = pd.DataFrame(
        [[
            age,
            sex,
            chest_pain_type,
            bp,
            cholesterol,
            fbs_over_120,
            ekg_results,
            max_hr,
            exercise_angina,
            st_depression,
            slope_of_st,
            number_of_vessels_fluro,
            thallium
        ]],
        columns=columns
    )

    # ======================================
    # SCALE INPUT DATA
    # ======================================

    input_data_scaled = scaler.transform(input_data)

    # ======================================
    # MAKE PREDICTION
    # ======================================

    prediction = model.predict(input_data_scaled)
    probability = model.predict_proba(input_data_scaled)[:, 1]

    # ======================================
    # DISPLAY RESULTS
    # ======================================

    if prediction[0] == 1:
        st.error("The patient is at risk of having heart disease.")
    else:
        st.success("The patient is not at risk of having heart disease.")

    st.write(f"Probability of having heart disease: {probability[0]:.2%}")
