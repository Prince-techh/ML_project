# ChurnGuard Frontend

React + Vite frontend for the Customer Churn Prediction FastAPI backend.

## Run locally

1. Keep your FastAPI backend running at `http://127.0.0.1:8000`.
2. Open a terminal in this `frontend` folder.
3. Install dependencies:

```bash
npm install
```

4. Copy `.env.example` to `.env` (optional if using the default API URL).
5. Start the frontend:

```bash
npm run dev
```

6. Open `http://localhost:5173`.

## Backend integration

The API base URL is configured in `src/services/api.js`. To change it, set:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Restart Vite after changing `.env`.

## Important notes

- The prediction form uses the field names and allowed categorical values from the supplied FastAPI `CustomerData` schema.
- The UI expects `/predict` to return `customer_id`, `lr_prediction`, `xgb_prediction`, `lr_probability`, and `xgb_probability`.
- Dashboard stat keys are read from common names such as `total_customers`, `total_predictions`, `lr_churn_predictions`, and `xgb_churn_predictions`. If your `/dashboard/stats` response uses different key names, adjust the four mappings in `Dashboard` in `src/App.jsx`.
- This frontend does not include authentication.
