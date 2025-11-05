
# UMKM Daily Stock Forecasting System

📦 **Predict optimal stock levels and minimize daily business losses using AI.**

---

## Overview
This system helps small and medium businesses (UMKM) forecast daily stock requirements to reduce waste and maximize profits. It processes your sales and production data, trains AI models, and provides actionable recommendations.

---

## Features
- 📤 Upload daily transaction CSV files  
- ⚙️ Train machine learning models automatically  
- 📊 View predictions and performance metrics  
- 💰 Analyze financial impact  
- 🎯 Get actionable business recommendations  

---

## Required CSV Format
Your CSV should contain the following columns:

| Column       | Description                       |
|--------------|-----------------------------------|
| date         | Transaction date                  |
| product_name | Product identifier                |
| produced     | Units produced                    |
| sold         | Units sold                         |
| price        | Selling price per unit             |
| unit_cost    | Cost per unit                     |
| revenue      | Total revenue                     |
| expense      | Total expense                     |

---

## Getting Started
1. Clone the repository:
```bash
git clone https://github.com/abdullahzunorain/umkm-forecasting-app.git
````

2. Navigate to the project folder:

```bash
cd umkm-forecasting-app
```

3. Install dependencies (Python & frontend):

```bash
# Backend
pip install -r requirements.txt

# Frontend (if using npm/yarn)
cd frontend
npm install
```

4. Run the application:

```bash
# Backend
python backend/main.py

# Frontend (if separate dev server)
npm start
```

---

## Deployment

* GitHub Pages: `https://abdullahzunorain.github.io/umkm-forecasting-app/`
* Railway: `https://umkm-forecasting-app-production.up.railway.app`

---

## Technologies

* Python (Data Processing, ML)
* Jupyter Notebook (Exploration & Analysis)
* TypeScript / React (Frontend)
* GitHub Pages / Railway (Deployment)

---

## License

MIT License

```
Here’s a clean, safe, and simple README snippet you can use for your project, showing how to configure the backend without exposing secrets:

````markdown
# UMKM Daily Stock Forecasting System

Predict optimal daily stock levels to minimize losses and maximize profits.

---

## Features

- Upload daily transaction data (CSV)
- Train machine learning models automatically
- View prediction results and performance metrics
- Analyze financial impact
- Get actionable recommendations

---

## Getting Started

1. **Clone the repository**

```bash
git clone https://github.com/abdullahzunorain/umkm-forecasting-app.git
cd umkm-forecasting-app
````

2. **Install dependencies**

For the backend (Python):

```bash
python -m venv venv
venv\Scripts\activate       # Windows
source venv/bin/activate    # macOS/Linux
pip install -r requirements.txt
```

For the frontend:

No installation required for static deployment; just open `index.html` or deploy to GitHub Pages.

3. **Configure the backend URL**

* Copy `frontend/config.example.js` to `frontend/config.js`.
* Replace the placeholder URL with your deployed backend URL:

```js
// config.js
window.API_URL = 'https://your-backend-url.com';
```

**Important:** Do **not** commit your real `config.js` with sensitive URLs or credentials if the repository is public.

---

## Deployment

* For GitHub Pages: Deploy the `frontend` folder.
* For backend hosting: Use Railway, Heroku, or any preferred cloud provider.

---

## CSV Format

Your CSV should include these columns:

* `date` - Transaction date
* `product_name` - Product identifier
* `produced` - Units produced
* `sold` - Units sold
* `price` - Selling price per unit
* `unit_cost` - Cost per unit
* `revenue` - Total revenue
* `expense` - Total expense

---

## License

This project is open-source. Feel free to use and modify it.


