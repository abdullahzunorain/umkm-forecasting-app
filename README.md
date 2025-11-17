# 📊 UMKM Daily Stock Forecasting System

> **AI-Powered Inventory Optimization for Small & Medium Businesses**  
> Predict optimal stock levels, minimize waste, and maximize profitability through intelligent demand forecasting.

[![Live Demo](https://img.shields.io/badge/Demo-Watch%20Video-red?style=for-the-badge&logo=youtube)](https://www.youtube.com/watch?v=GqYfiNluMSA)
[![GitHub Pages](https://img.shields.io/badge/Demo-GitHub%20Pages-blue?style=for-the-badge&logo=github)](https://abdullahzunorain.github.io/umkm-forecasting-app/)
[![Railway](https://img.shields.io/badge/Deploy-Railway-purple?style=for-the-badge&logo=railway)](https://umkm-forecasting-app-production.up.railway.app)

---

## 🎯 Overview

The **UMKM Daily Stock Forecasting System** is an intelligent solution designed specifically for small and medium enterprises (Usaha Mikro, Kecil, dan Menengah) to optimize inventory management through advanced machine learning. By analyzing historical sales and production data, the system delivers accurate demand predictions, helping businesses reduce waste, prevent stockouts, and make data-driven decisions.

### Why This Matters

- **Reduce Losses**: Minimize overproduction and unsold inventory
- **Optimize Cash Flow**: Invest in the right amount of stock
- **Improve Efficiency**: Automate forecasting instead of manual guesswork
- **Data-Driven Decisions**: Get actionable insights from your business data

---

## ✨ Key Features

### 📤 **Data Management**
- Simple CSV upload interface for daily transaction data
- Automatic data validation and preprocessing
- Support for multiple products and date ranges

### 🤖 **AI-Powered Forecasting**
- Automated machine learning model training
- Multiple algorithm support for optimal accuracy
- Real-time prediction generation

### 📈 **Performance Analytics**
- Comprehensive model evaluation metrics
- Visual performance dashboards
- Historical accuracy tracking

### 💰 **Financial Impact Analysis**
- Revenue and expense projections
- Profit optimization recommendations
- ROI calculations for inventory decisions

### 🎯 **Actionable Insights**
- Product-specific recommendations
- Optimal stock level suggestions
- Seasonal trend identification

---

## 📸 System Screenshots

### Dataset Management
<img src="upload%20the%20dataset.png" alt="Dataset Upload Interface" width="600"/>

*User-friendly CSV upload with real-time preview and validation*

### Model Training
<img src="training%20in%20process.png" alt="AI Model Training Process" width="600"/>

*Automated machine learning pipeline with progress tracking*

### Performance Metrics
<img src="model%20training%20results.png" alt="Model Training Results Dashboard" width="600"/>

*Comprehensive accuracy metrics and model evaluation*

### Financial Dashboard
<img src="financial%20impact%20.png" alt="Financial Impact Analysis" width="600"/>

*Revenue, expense, and profit impact visualization*

### Business Intelligence
<img src="Business%20Recomendation.png" alt="AI-Generated Business Recommendations" width="600"/>

*Data-driven recommendations for inventory optimization*

---

## 📋 Data Requirements

### Required CSV Format

Your input CSV file must contain the following columns:

| Column Name  | Data Type | Description                              | Example      |
|--------------|-----------|------------------------------------------|--------------|
| `date`       | Date      | Transaction date (YYYY-MM-DD)            | 2024-01-15   |
| `product_name` | String  | Product identifier or name               | Roti Tawar   |
| `produced`   | Integer   | Number of units produced                 | 100          |
| `sold`       | Integer   | Number of units sold                     | 85           |
| `price`      | Float     | Selling price per unit (in currency)     | 15000.00     |
| `unit_cost`  | Float     | Production cost per unit (in currency)   | 8000.00      |
| `revenue`    | Float     | Total revenue (sold × price)             | 1275000.00   |
| `expense`    | Float     | Total expense (produced × unit_cost)     | 800000.00    |

### Data Quality Tips

✅ **Best Practices:**
- Ensure consistent date formatting
- Remove duplicate entries
- Fill missing values appropriately
- Use consistent product naming
- Include at least 30 days of historical data for better predictions

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.8+** installed on your system
- **Node.js 16+** (if running frontend separately)
- **Git** for version control

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/abdullahzunorain/umkm-forecasting-app.git
   cd umkm-forecasting-app
   ```

2. **Install Backend Dependencies**
   ```bash
   pip install -r requirements.txt
   ```
   
   Or using virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Install Frontend Dependencies** (if applicable)
   ```bash
   cd frontend
   npm install
   # or
   yarn install
   ```

### Running the Application

#### Backend Server
```bash
python backend/main.py
```
The API will be available at `http://localhost:5000` (or configured port)

#### Frontend Development Server
```bash
cd frontend
npm start
# or
yarn start
```
The interface will open at `http://localhost:3000`

---

## 🌐 Live Deployments

### Production Environments

| Platform      | URL                                                                                      | Status |
|---------------|------------------------------------------------------------------------------------------|--------|
| GitHub Pages  | [https://abdullahzunorain.github.io/umkm-forecasting-app/](https://abdullahzunorain.github.io/umkm-forecasting-app/) | ✅ Live |
| Railway       | [https://umkm-forecasting-app-production.up.railway.app](https://umkm-forecasting-app-production.up.railway.app) | ✅ Live |

---

## 🛠️ Technology Stack

### Backend
- **Python 3.8+** - Core programming language
- **Scikit-learn** - Machine learning algorithms
- **Pandas** - Data manipulation and analysis
- **NumPy** - Numerical computing
- **Flask/FastAPI** - RESTful API framework

### Frontend
- **React 18+** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Chart.js / Recharts** - Data visualization
- **Tailwind CSS** - Modern styling framework

### Data Science
- **Jupyter Notebook** - Exploratory data analysis
- **Matplotlib / Seaborn** - Statistical visualization
- **Statsmodels** - Time series analysis

### DevOps & Deployment
- **GitHub Pages** - Static site hosting
- **Railway** - Backend deployment
- **GitHub Actions** - CI/CD pipeline

---

## 📊 Model Performance

The system employs multiple forecasting algorithms and automatically selects the best performer:

- **ARIMA** - Autoregressive Integrated Moving Average
- **Random Forest** - Ensemble learning method
- **XGBoost** - Gradient boosting framework
- **Prophet** - Facebook's time series forecasting

Performance metrics include:
- Mean Absolute Error (MAE)
- Root Mean Squared Error (RMSE)
- Mean Absolute Percentage Error (MAPE)
- R² Score

---

## 🎥 Demo & Documentation

- **Video Tutorial**: [Watch on YouTube](https://www.youtube.com/watch?v=GqYfiNluMSA)
- **Live Demo**: Try the application on [GitHub Pages](https://abdullahzunorain.github.io/umkm-forecasting-app/)
- **API Documentation**: Available at `/api/docs` when running locally

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open-source and available for use and modification. See the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Abdullah Zunorain**

- GitHub: [@abdullahzunorain](https://github.com/abdullahzunorain)
- Project Link: [https://github.com/abdullahzunorain/umkm-forecasting-app](https://github.com/abdullahzunorain/umkm-forecasting-app)

---

## 🙏 Acknowledgments

- Inspired by the needs of small business owners in Indonesia
- Built with modern web technologies and machine learning best practices
- Community feedback and contributions

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

Made with ❤️ for UMKM businesses

</div>
