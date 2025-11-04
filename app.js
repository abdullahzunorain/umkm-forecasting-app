// API Base URL
// If you deploy the frontend separately (e.g., GitHub Pages), create a small
// `config.js` that sets `window.API_URL = 'https://your-backend-url'` before
// loading this script. This keeps the code backwards-compatible with local dev.
const API_URL = window.API_URL || 'http://localhost:8000';

// Global state
let sessionId = null;
let uploadedData = null;
let trainingResults = null;

// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const trainBtn = document.getElementById('trainBtn');
const datasetInfo = document.getElementById('datasetInfo');
const modelStatus = document.getElementById('modelStatus');

const welcomeScreen = document.getElementById('welcomeScreen');
const loadingScreen = document.getElementById('loadingScreen');
const resultsScreen = document.getElementById('resultsScreen');
const financialScreen = document.getElementById('financialScreen');
const recommendationsScreen = document.getElementById('recommendationsScreen');

// Step management
function setActiveStep(stepNumber) {
    document.querySelectorAll('.step').forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');
        
        if (stepNum < stepNumber) {
            step.classList.add('completed');
        } else if (stepNum === stepNumber) {
            step.classList.add('active');
        }
    });
}

// Screen management
function showScreen(screenId) {
    [welcomeScreen, loadingScreen, resultsScreen, financialScreen, recommendationsScreen].forEach(screen => {
        screen.classList.add('hidden');
    });
    
    const screenMap = {
        'welcome': welcomeScreen,
        'loading': loadingScreen,
        'results': resultsScreen,
        'financial': financialScreen,
        'recommendations': recommendationsScreen
    };
    
    if (screenMap[screenId]) {
        screenMap[screenId].classList.remove('hidden');
    }
}

// File upload handlers
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileUpload(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
    }
});

// Upload file to backend
async function handleFileUpload(file) {
    if (!file.name.endsWith('.csv')) {
        alert('Please upload a CSV file');
        return;
    }
    
    showScreen('loading');
    document.getElementById('loadingText').textContent = 'Uploading and processing data...';
    setActiveStep(1);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        uploadedData = await response.json();
        sessionId = uploadedData.session_id;
        
        displayDatasetInfo(uploadedData);
        trainBtn.disabled = false;
        showScreen('welcome');
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.innerHTML = `
            <strong>✓ File uploaded successfully!</strong><br>
            Processed ${uploadedData.total_records.toLocaleString()} records from ${uploadedData.date_range.start} to ${uploadedData.date_range.end}
        `;
        welcomeScreen.insertBefore(successMsg, welcomeScreen.firstChild);
        
    } catch (error) {
        showScreen('welcome');
        alert('Error uploading file: ' + error.message);
    }
}

// Display dataset info
function displayDatasetInfo(data) {
    datasetInfo.style.display = 'block';
    
    const stats = `
        <div class="stat-item">
            <span class="stat-label">Total Records:</span>
            <span class="stat-value">${data.total_records.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Products:</span>
            <span class="stat-value">${data.products.count}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Date Range:</span>
            <span class="stat-value">${data.date_range.days} days</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Avg Produced:</span>
            <span class="stat-value">${data.sales_stats.mean_produced.toFixed(1)} units</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Avg Sold:</span>
            <span class="stat-value">${data.sales_stats.mean_sold.toFixed(1)} units</span>
        </div>
    `;
    
    document.getElementById('datasetStats').innerHTML = stats;
}

// Train models
trainBtn.addEventListener('click', async () => {
    if (!sessionId) {
        alert('Please upload a file first');
        return;
    }
    
    showScreen('loading');
    document.getElementById('loadingText').textContent = 'Training models... This may take a few minutes';
    setActiveStep(2);
    
    try {
        const response = await fetch(`${API_URL}/api/train/${sessionId}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Training failed');
        }
        
        trainingResults = await response.json();
        
        displayModelStatus(trainingResults);
        displayResults(trainingResults);
        displayFinancialAnalysis(trainingResults);
        displayRecommendations(trainingResults);
        
        setActiveStep(3);
        showScreen('results');
        
    } catch (error) {
        showScreen('welcome');
        alert('Error training models: ' + error.message);
    }
});

// Display model status
function displayModelStatus(results) {
    modelStatus.style.display = 'block';
    
    const perf = results.model_performance[results.best_model];
    
    const info = `
        <div class="stat-item">
            <span class="stat-label">Best Model:</span>
            <span class="stat-value">${results.best_model}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Test MAE:</span>
            <span class="stat-value">${perf.test_mae.toFixed(2)} units</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Test R²:</span>
            <span class="stat-value">${perf.test_r2.toFixed(4)}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Test MAPE:</span>
            <span class="stat-value">${perf.test_mape.toFixed(2)}%</span>
        </div>
    `;
    
    document.getElementById('modelInfo').innerHTML = info;
}

// Display results
function displayResults(results) {
    const content = `
        <div class="success-message">
            <strong>✓ Training completed successfully!</strong><br>
            Best model: ${results.best_model}
        </div>
        
        <h3 style="margin-bottom: 15px;">Model Performance Comparison</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Model</th>
                        <th>MAE</th>
                        <th>RMSE</th>
                        <th>R² Score</th>
                        <th>MAPE (%)</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(results.model_performance).map(([name, metrics]) => `
                        <tr style="${name === results.best_model ? 'background: #c6f6d5;' : ''}">
                            <td><strong>${name}</strong> ${name === results.best_model ? '🏆' : ''}</td>
                            <td>${metrics.test_mae.toFixed(2)}</td>
                            <td>${metrics.test_rmse.toFixed(2)}</td>
                            <td>${metrics.test_r2.toFixed(4)}</td>
                            <td>${metrics.test_mape.toFixed(2)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <h3 style="margin-top: 30px; margin-bottom: 15px;">Prediction Accuracy</h3>
        <div class="metric-grid">
            <div class="metric-card">
                <h4>Within ±5%</h4>
                <div class="value">${((results.accuracy_breakdown.within_5pct / results.accuracy_breakdown.total) * 100).toFixed(1)}%</div>
            </div>
            <div class="metric-card">
                <h4>Within ±10%</h4>
                <div class="value">${((results.accuracy_breakdown.within_10pct / results.accuracy_breakdown.total) * 100).toFixed(1)}%</div>
            </div>
            <div class="metric-card">
                <h4>Within ±20%</h4>
                <div class="value">${((results.accuracy_breakdown.within_20pct / results.accuracy_breakdown.total) * 100).toFixed(1)}%</div>
            </div>
            <div class="metric-card">
                <h4>Total Predictions</h4>
                <div class="value">${results.accuracy_breakdown.total.toLocaleString()}</div>
            </div>
        </div>
        
        <h3 style="margin-top: 30px; margin-bottom: 15px;">Train/Test Split Information</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Split</th>
                        <th>Size</th>
                        <th>Period</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Train</strong></td>
                        <td>${results.split_info.train_size.toLocaleString()} samples</td>
                        <td>${results.split_info.train_period}</td>
                    </tr>
                    <tr>
                        <td><strong>Validation</strong></td>
                        <td>${results.split_info.val_size.toLocaleString()} samples</td>
                        <td>-</td>
                    </tr>
                    <tr>
                        <td><strong>Test</strong></td>
                        <td>${results.split_info.test_size.toLocaleString()} samples</td>
                        <td>${results.split_info.test_period}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
            <button class="btn btn-success" onclick="setActiveStep(4); showScreen('financial')">
                View Financial Impact →
            </button>
        </div>
    `;
    
    document.getElementById('resultsContent').innerHTML = content;
}

// Display financial analysis (robust version)
function displayFinancialAnalysis(results) {
    if (!results || !results.financial_scenarios) {
        console.error("Missing financial_scenarios in results:", results);
        document.getElementById("financialContent").innerHTML =
            "<p style='color:red;'>Error: Financial data not available.</p>";
        return;
    }

    const scenarios = results.financial_scenarios;

    // Normalize keys to lowercase with underscores for consistent access
    const normalizeScenario = (s) => ({
        total_profit: s["Total Profit"] ?? s.total_profit ?? 0,
        total_waste: s["Total Waste"] ?? s.total_waste ?? 0,
        total_stockouts: s["Total Stockouts"] ?? s.total_stockouts ?? 0,
        service_level: s["Service Level"] ?? s.service_level ?? 0,
    });

    const baseline = normalizeScenario(scenarios.Baseline || {});
    const ml = normalizeScenario(scenarios["ML Prediction"] || {});

    const profitImprovement =
        baseline.total_profit !== 0
            ? ((ml.total_profit - baseline.total_profit) /
                Math.abs(baseline.total_profit)) *
              100
            : 0;

    const wasteReduction =
        baseline.total_waste !== 0
            ? ((baseline.total_waste - ml.total_waste) / baseline.total_waste) *
              100
            : 0;

    const content = `
        <div class="success-message">
            <strong>💰 Financial Impact Summary</strong><br>
            Profit improvement: ${profitImprovement > 0 ? "+" : ""}${profitImprovement.toFixed(
                1
            )}% over baseline
        </div>

        <h3 style="margin-bottom: 15px;">Scenario Comparison</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Scenario</th>
                        <th>Total Profit</th>
                        <th>Waste (units)</th>
                        <th>Stockouts</th>
                        <th>Service Level</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(scenarios)
                        .map(([name, raw]) => {
                            const data = normalizeScenario(raw);
                            return `
                                <tr style="${name === "ML Prediction" ? "background: #c6f6d5;" : ""}">
                                    <td><strong>${name}</strong> ${
                                name === "ML Prediction" ? "← Recommended" : ""
                            }</td>
                                    <td>IDR ${data.total_profit.toLocaleString()}</td>
                                    <td>${data.total_waste.toFixed(0)}</td>
                                    <td>${data.total_stockouts.toFixed(0)}</td>
                                    <td>${data.service_level.toFixed(1)}%</td>
                                </tr>
                            `;
                        })
                        .join("")}
                </tbody>
            </table>
        </div>

        <h3 style="margin-top: 30px; margin-bottom: 15px;">Key Metrics</h3>
        <div class="metric-grid">
            <div class="metric-card" style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);">
                <h4>Profit Improvement</h4>
                <div class="value">${profitImprovement > 0 ? "+" : ""}${profitImprovement.toFixed(
                    1
                )}%</div>
            </div>
            <div class="metric-card" style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);">
                <h4>Waste Reduction</h4>
                <div class="value">${wasteReduction.toFixed(1)}%</div>
            </div>
            <div class="metric-card" style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);">
                <h4>Service Level</h4>
                <div class="value">${ml.service_level.toFixed(1)}%</div>
            </div>
            <div class="metric-card" style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);">
                <h4>Additional Profit</h4>
                <div class="value">IDR ${(ml.total_profit - baseline.total_profit).toLocaleString()}</div>
            </div>
        </div>

        <div class="recommendation-box">
            <h4>💡 Financial Insights</h4>
            <ul>
                <li>Current baseline approach results in profit of IDR ${baseline.total_profit.toLocaleString()}</li>
                <li>ML-optimized approach projects profit of IDR ${ml.total_profit.toLocaleString()}</li>
                <li>Net improvement of IDR ${(ml.total_profit - baseline.total_profit).toLocaleString()} (${profitImprovement.toFixed(
                    1
                )}%)</li>
                <li>Waste reduced by ${wasteReduction.toFixed(1)}%</li>
                <li>Service level maintained at ${ml.service_level.toFixed(1)}%</li>
            </ul>
        </div>

        <div style="margin-top: 30px; text-align: center; display: flex; gap: 15px; justify-content: center;">
            <button class="btn" onclick="setActiveStep(3); showScreen('results')">
                ← Back to Results
            </button>
            <button class="btn btn-success" onclick="setActiveStep(5); showScreen('recommendations')">
                View Recommendations →
            </button>
        </div>
    `;

    document.getElementById("financialContent").innerHTML = content;
}

// Display recommendations
async function displayRecommendations(results) {
    let productPerf = [];
    
    try {
        const response = await fetch(`${API_URL}/api/product-performance/${sessionId}`);
        if (response.ok) {
            const data = await response.json();
            productPerf = data.products;
        }
    } catch (error) {
        console.error('Error fetching product performance:', error);
    }
    
    const bestProducts = productPerf.slice(0, 3).map(p => p.product);
    const worstProducts = productPerf.slice(-3).map(p => p.product);
    
    const content = `
        <div class="success-message">
            <strong>🎯 Actionable Business Recommendations</strong><br>
            Based on model analysis and financial projections
        </div>
        
        <h3 style="margin-bottom: 15px;">1. Production Strategy</h3>
        <div class="recommendation-box">
            <h4>📦 Recommended Approach</h4>
            <ul>
                <li><strong>Use ML predictions as base production quantity</strong> - The model shows ${results.model_performance[results.best_model].test_mape.toFixed(1)}% average error</li>
                <li><strong>Add 5-10% safety buffer</strong> for high-demand periods (Ramadan, near-Eid)</li>
                <li><strong>Maintain tighter inventory</strong> for products with stable demand patterns</li>
                <li><strong>Review predictions daily</strong> and adjust based on actual sales</li>
            </ul>
        </div>
        
        <h3 style="margin-top: 30px; margin-bottom: 15px;">2. Product-Specific Actions</h3>
        ${productPerf.length > 0 ? `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Avg Actual</th>
                        <th>Avg Predicted</th>
                        <th>MAE</th>
                        <th>MAPE (%)</th>
                        <th>Recommendation</th>
                    </tr>
                </thead>
                <tbody>
                    ${productPerf.slice(0, 5).map(p => `
                        <tr>
                            <td><strong>${p.product}</strong></td>
                            <td>${p.avg_actual.toFixed(1)}</td>
                            <td>${p.avg_predicted.toFixed(1)}</td>
                            <td>${p.mae.toFixed(2)}</td>
                            <td>${p.mape.toFixed(2)}%</td>
                            <td>${p.mae < 5 ? '✓ Trust model' : p.mae < 10 ? '⚠ Add buffer' : '❌ Manual review'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : '<p>Product performance data not available</p>'}
        
        <h3 style="margin-top: 30px; margin-bottom: 15px;">3. Seasonal Considerations</h3>
        <div class="recommendation-box">
            <h4>📅 Calendar Events</h4>
            <ul>
                <li><strong>Ramadan Period:</strong> Distinct demand patterns captured by the model - trust predictions closely</li>
                <li><strong>Pre-Eid (5-7 days before):</strong> Increase production by 15-20% for all products</li>
                <li><strong>Post-Eid (7 days after):</strong> Reduce production gradually, monitor actual demand</li>
                <li><strong>Weekend Patterns:</strong> Sunday closures accounted for, Saturday may need adjustment</li>
                <li><strong>National Holidays:</strong> Zero production recommended (Jan 1, Aug 17, Dec 25)</li>
            </ul>
        </div>
        
        <h3 style="margin-top: 30px; margin-bottom: 15px;">4. Implementation Guidelines</h3>
        <div class="recommendation-box">
            <h4>🚀 How to Use This System</h4>
            <ul>
                <li><strong>Daily:</strong> Use model predictions for next-day production planning</li>
                <li><strong>Weekly:</strong> Review forecast accuracy and adjust safety buffers as needed</li>
                <li><strong>Monthly:</strong> Retrain model with latest data to capture new patterns</li>
                <li><strong>Track Metrics:</strong> Monitor waste reduction, service level, and actual vs predicted</li>
                <li><strong>Document Adjustments:</strong> Keep notes on manual overrides and their outcomes</li>
            </ul>
        </div>
        
        <h3 style="margin-top: 30px; margin-bottom: 15px;">5. Continuous Improvement</h3>
        <div class="recommendation-box">
            <h4>📈 Next Steps</h4>
            <ul>
                <li><strong>Current Performance:</strong> ${results.model_performance[results.best_model].test_r2.toFixed(2)} R² score indicates good predictive power</li>
                <li><strong>Potential Gains:</strong> Additional ${(((results.financial_scenarios.Perfect.total_profit - results.financial_scenarios.ML_Prediction.total_profit) / Math.abs(results.financial_scenarios.Baseline.total_profit)) * 100).toFixed(1)}% improvement possible with perfect forecasting</li>
                <li><strong>To Close Gap:</strong>
                    <ul>
                        <li>Collect customer feedback on stockouts</li>
                        <li>Add weather data if available (affects foot traffic)</li>
                        <li>Track promotional calendars and special events</li>
                        <li>Monitor competitor activities and market trends</li>
                        <li>Consider implementing dynamic pricing for slow-moving items</li>
                    </ul>
                </li>
            </ul>
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background: #e8f5e9; border-radius: 10px; border-left: 4px solid #48bb78;">
            <h3 style="color: #48bb78; margin-bottom: 15px;">✅ Expected Outcomes</h3>
            <p style="color: #666; line-height: 1.8;">
                If implemented correctly, this forecasting system should deliver:
            </p>
            <ul style="color: #666; line-height: 2; margin-top: 10px;">
                <li><strong>Profit Improvement:</strong> ${(((results.financial_scenarios.ML_Prediction.total_profit - results.financial_scenarios.Baseline.total_profit) / Math.abs(results.financial_scenarios.Baseline.total_profit)) * 100).toFixed(1)}% over baseline approach</li>
                <li><strong>Waste Reduction:</strong> ${(((results.financial_scenarios.Baseline.total_waste - results.financial_scenarios.ML_Prediction.total_waste) / results.financial_scenarios.Baseline.total_waste) * 100).toFixed(1)}% fewer units wasted</li>
                <li><strong>Service Level:</strong> ${results.financial_scenarios.ML_Prediction.service_level.toFixed(1)}% customer satisfaction</li>
                <li><strong>Annual Impact:</strong> Projected IDR ${((results.financial_scenarios.ML_Prediction.total_profit / results.split_info.test_size) * 365).toLocaleString()} annually</li>
            </ul>
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
            <button class="btn" onclick="setActiveStep(4); showScreen('financial')">
                ← Back to Financial Analysis
            </button>
        </div>
    `;
    
    document.getElementById('recommendationsContent').innerHTML = content;
}

// Step click handlers
document.querySelectorAll('.step').forEach((step, index) => {
    step.addEventListener('click', () => {
        const stepNum = index + 1;
        
        if (stepNum === 1) {
            showScreen('welcome');
            setActiveStep(1);
        } else if (stepNum === 2 && sessionId) {
            setActiveStep(2);
        } else if (stepNum === 3 && trainingResults) {
            showScreen('results');
            setActiveStep(3);
        } else if (stepNum === 4 && trainingResults) {
            showScreen('financial');
            setActiveStep(4);
        } else if (stepNum === 5 && trainingResults) {
            showScreen('recommendations');
            setActiveStep(5);
        }
    });
});









// // API Base URL
// const API_URL = 'http://localhost:8000';

// // Global state
// let sessionId = null;
// let uploadedData = null;
// let trainingResults = null;

// // DOM Elements
// const fileInput = document.getElementById('fileInput');
// const uploadArea = document.getElementById('uploadArea');
// const trainBtn = document.getElementById('trainBtn');
// const datasetInfo = document.getElementById('datasetInfo');
// const modelStatus = document.getElementById('modelStatus');

// const welcomeScreen = document.getElementById('welcomeScreen');
// const loadingScreen = document.getElementById('loadingScreen');
// const resultsScreen = document.getElementById('resultsScreen');
// const financialScreen = document.getElementById('financialScreen');
// const recommendationsScreen = document.getElementById('recommendationsScreen');

// // Step management
// function setActiveStep(stepNumber) {
//     document.querySelectorAll('.step').forEach((step, index) => {
//         const stepNum = index + 1;
//         step.classList.remove('active', 'completed');
        
//         if (stepNum < stepNumber) {
//             step.classList.add('completed');
//         } else if (stepNum === stepNumber) {
//             step.classList.add('active');
//         }
//     });
// }

// // Screen management
// function showScreen(screenId) {
//     [welcomeScreen, loadingScreen, resultsScreen, financialScreen, recommendationsScreen].forEach(screen => {
//         screen.classList.add('hidden');
//     });
    
//     const screenMap = {
//         'welcome': welcomeScreen,
//         'loading': loadingScreen,
//         'results': resultsScreen,
//         'financial': financialScreen,
//         'recommendations': recommendationsScreen
//     };
    
//     if (screenMap[screenId]) {
//         screenMap[screenId].classList.remove('hidden');
//     }
// }

// // File upload handlers
// uploadArea.addEventListener('click', () => fileInput.click());

// uploadArea.addEventListener('dragover', (e) => {
//     e.preventDefault();
//     uploadArea.classList.add('dragover');
// });

// uploadArea.addEventListener('dragleave', () => {
//     uploadArea.classList.remove('dragover');
// });

// uploadArea.addEventListener('drop', (e) => {
//     e.preventDefault();
//     uploadArea.classList.remove('dragover');
    
//     const files = e.dataTransfer.files;
//     if (files.length > 0) {
//         handleFileUpload(files[0]);
//     }
// });

// fileInput.addEventListener('change', (e) => {
//     if (e.target.files.length > 0) {
//         handleFileUpload(e.target.files[0]);
//     }
// });

// // Upload file to backend
// async function handleFileUpload(file) {
//     if (!file.name.endsWith('.csv')) {
//         alert('Please upload a CSV file');
//         return;
//     }
    
//     showScreen('loading');
//     document.getElementById('loadingText').textContent = 'Uploading and processing data...';
//     setActiveStep(1);
    
//     const formData = new FormData();
//     formData.append('file', file);
    
//     try {
//         const response = await fetch(`${API_URL}/api/upload`, {
//             method: 'POST',
//             body: formData
//         });
        
//         if (!response.ok) {
//             throw new Error('Upload failed');
//         }
        
//         uploadedData = await response.json();
//         sessionId = uploadedData.session_id;
        
//         displayDatasetInfo(uploadedData);
//         trainBtn.disabled = false;
//         showScreen('welcome');
        
//         // Show success message
//         const successMsg = document.createElement('div');
//         successMsg.className = 'success-message';
//         successMsg.innerHTML = `
//             <strong>✓ File uploaded successfully!</strong><br>
//             Processed ${uploadedData.total_records.toLocaleString()} records from ${uploadedData.date_range.start} to ${uploadedData.date_range.end}
//         `;
//         welcomeScreen.insertBefore(successMsg, welcomeScreen.firstChild);
        
//     } catch (error) {
//         showScreen('welcome');
//         alert('Error uploading file: ' + error.message);
//     }
// }

// // Display dataset info
// function displayDatasetInfo(data) {
//     datasetInfo.style.display = 'block';
    
//     const stats = `
//         <div class="stat-item">
//             <span class="stat-label">Total Records:</span>
//             <span class="stat-value">${data.total_records.toLocaleString()}</span>
//         </div>
//         <div class="stat-item">
//             <span class="stat-label">Products:</span>
//             <span class="stat-value">${data.products.count}</span>
//         </div>
//         <div class="stat-item">
//             <span class="stat-label">Date Range:</span>
//             <span class="stat-value">${data.date_range.days} days</span>
//         </div>
//         <div class="stat-item">
//             <span class="stat-label">Avg Produced:</span>
//             <span class="stat-value">${data.sales_stats.mean_produced.toFixed(1)} units</span>
//         </div>
//         <div class="stat-item">
//             <span class="stat-label">Avg Sold:</span>
//             <span class="stat-value">${data.sales_stats.mean_sold.toFixed(1)} units</span>
//         </div>
//     `;
    
//     document.getElementById('datasetStats').innerHTML = stats;
// }

// // Train models
// trainBtn.addEventListener('click', async () => {
//     if (!sessionId) {
//         alert('Please upload a file first');
//         return;
//     }
    
//     showScreen('loading');
//     document.getElementById('loadingText').textContent = 'Training models... This may take a few minutes';
//     setActiveStep(2);
    
//     try {
//         const response = await fetch(`${API_URL}/api/train/${sessionId}`, {
//             method: 'POST'
//         });
        
//         if (!response.ok) {
//             throw new Error('Training failed');
//         }
        
//         trainingResults = await response.json();
        
//         displayModelStatus(trainingResults);
//         displayResults(trainingResults);
//         displayFinancialAnalysis(trainingResults);
//         displayRecommendations(trainingResults);
        
//         setActiveStep(3);
//         showScreen('results');
        
//     } catch (error) {
//         showScreen('welcome');
//         alert('Error training models: ' + error.message);
//     }
// });

// // Display model status
// function displayModelStatus(results) {
//     modelStatus.style.display = 'block';
    
//     const perf = results.model_performance[results.best_model];
    
//     const info = `
//         <div class="stat-item">
//             <span class="stat-label">Best Model:</span>
//             <span class="stat-value">${results.best_model}</span>
//         </div>
//         <div class="stat-item">
//             <span class="stat-label">Test MAE:</span>
//             <span class="stat-value">${perf.test_mae.toFixed(2)} units</span>
//         </div>
//         <div class="stat-item">
//             <span class="stat-label">Test R²:</span>
//             <span class="stat-value">${perf.test_r2.toFixed(4)}</span>
//         </div>
//         <div class="stat-item">
//             <span class="stat-label">Test MAPE:</span>
//             <span class="stat-value">${perf.test_mape.toFixed(2)}%</span>
//         </div>
//     `;
    
//     document.getElementById('modelInfo').innerHTML = info;
// }

// // Display results
// function displayResults(results) {
//     const content = `
//         <div class="success-message">
//             <strong>✓ Training completed successfully!</strong><br>
//             Best model: ${results.best_model}
//         </div>
        
//         <h3 style="margin-bottom: 15px;">Model Performance Comparison</h3>
//         <div class="table-container">
//             <table>
//                 <thead>
//                     <tr>
//                         <th>Model</th>
//                         <th>MAE</th>
//                         <th>RMSE</th>
//                         <th>R² Score</th>
//                         <th>MAPE (%)</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     ${Object.entries(results.model_performance).map(([name, metrics]) => `
//                         <tr style="${name === results.best_model ? 'background: #c6f6d5;' : ''}">
//                             <td><strong>${name}</strong> ${name === results.best_model ? '🏆' : ''}</td>
//                             <td>${metrics.test_mae.toFixed(2)}</td>
//                             <td>${metrics.test_rmse.toFixed(2)}</td>
//                             <td>${metrics.test_r2.toFixed(4)}</td>
//                             <td>${metrics.test_mape.toFixed(2)}%</td>
//                         </tr>
//                     `).join('')}
//                 </tbody>
//             </table>
//         </div>
        
//         <h3 style="margin-top: 30px; margin-bottom: 15px;">Prediction Accuracy</h3>
//         <div class="metric-grid">
//             <div class="metric-card">
//                 <h4>Within ±5%</h4>
//                 <div class="value">${((results.accuracy_breakdown.within_5pct / results.accuracy_breakdown.total) * 100).toFixed(1)}%</div>
//             </div>
//             <div class="metric-card">
//                 <h4>Within ±10%</h4>
//                 <div class="value">${((results.accuracy_breakdown.within_10pct / results.accuracy_breakdown.total) * 100).toFixed(1)}%</div>
//             </div>
//             <div class="metric-card">
//                 <h4>Within ±20%</h4>
//                 <div class="value">${((results.accuracy_breakdown.within_20pct / results.accuracy_breakdown.total) * 100).toFixed(1)}%</div>
//             </div>
//             <div class="metric-card">
//                 <h4>Total Predictions</h4>
//                 <div class="value">${results.accuracy_breakdown.total.toLocaleString()}</div>
//             </div>
//         </div>
        
//         <h3 style="margin-top: 30px; margin-bottom: 15px;">Train/Test Split Information</h3>
//         <div class="table-container">
//             <table>
//                 <thead>
//                     <tr>
//                         <th>Split</th>
//                         <th>Size</th>
//                         <th>Period</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     <tr>
//                         <td><strong>Train</strong></td>
//                         <td>${results.split_info.train_size.toLocaleString()} samples</td>
//                         <td>${results.split_info.train_period}</td>
//                     </tr>
//                     <tr>
//                         <td><strong>Validation</strong></td>
//                         <td>${results.split_info.val_size.toLocaleString()} samples</td>
//                         <td>-</td>
//                     </tr>
//                     <tr>
//                         <td><strong>Test</strong></td>
//                         <td>${results.split_info.test_size.toLocaleString()} samples</td>
//                         <td>${results.split_info.test_period}</td>
//                     </tr>
//                 </tbody>
//             </table>
//         </div>
        
//         <div style="margin-top: 30px; text-align: center;">
//             <button class="btn btn-success" onclick="setActiveStep(4); showScreen('financial')">
//                 View Financial Impact →
//             </button>
//         </div>
//     `;
    
//     document.getElementById('resultsContent').innerHTML = content;
// }

// // Display financial analysis
// function displayFinancialAnalysis(results) {
//     const scenarios = results.financial_scenarios;
//     const baseline = scenarios.Baseline.total_profit;
//     const mlKey = scenarios['ML Prediction'] ? 'ML Prediction' : 'ML_Prediction';
//     const ml = scenarios[mlKey].total_profit;
//     const improvement = ((ml - baseline) / Math.abs(baseline)) * 100;
    
//     const content = `
//         <div class="success-message">
//             <strong>💰 Financial Impact Summary</strong><br>
//             Profit improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}% over baseline
//         </div>
        
//         <h3 style="margin-bottom: 15px;">Scenario Comparison</h3>
//         <div class="table-container">
//             <table>
//                 <thead>
//                     <tr>
//                         <th>Scenario</th>
//                         <th>Total Profit</th>
//                         <th>Waste (units)</th>
//                         <th>Stockouts</th>
//                         <th>Service Level</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     ${Object.entries(scenarios).map(([name, data]) => `
//                         <tr style="${(name === 'ML Prediction' || name === 'ML_Prediction') ? 'background: #c6f6d5;' : ''}">
//                             <td><strong>${name.replace('_', ' ')}</strong> ${(name === 'ML Prediction' || name === 'ML_Prediction') ? '← Recommended' : ''}</td>
//                             <td>IDR ${data.total_profit.toLocaleString()}</td>
//                             <td>${data.total_waste.toFixed(0)}</td>
//                             <td>${data.total_stockouts.toFixed(0)}</td>
//                             <td>${data.service_level.toFixed(1)}%</td>
//                         </tr>
//                     `).join('')}
//                 </tbody>
//             </table>
//         </div>
        
//         <h3 style="margin-top: 30px; margin-bottom: 15px;">Key Metrics</h3>
//         <div class="metric-grid">
//             <div class="metric-card" style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);">
//                 <h4>Profit Improvement</h4>
//                 <div class="value">${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%</div>
//             </div>
//             <div class="metric-card" style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);">
//                 <h4>Waste Reduction</h4>
//                 <div class="value">${(((scenarios.Baseline.total_waste - scenarios[mlKey].total_waste) / scenarios.Baseline.total_waste) * 100).toFixed(1)}%</div>
//             </div>
//             <div class="metric-card" style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);">
//                 <h4>Service Level</h4>
//                 <div class="value">${scenarios[mlKey].service_level.toFixed(1)}%</div>
//             </div>
//             <div class="metric-card" style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);">
//                 <h4>Additional Profit</h4>
//                 <div class="value">IDR ${(ml - baseline).toLocaleString()}</div>
//             </div>
//         </div>
        
//         <div class="recommendation-box">
//             <h4>💡 Financial Insights</h4>
//             <ul>
//                 <li>Current baseline approach results in profit of IDR ${baseline.toLocaleString()}</li>
//                 <li>ML-optimized approach projects profit of IDR ${ml.toLocaleString()}</li>
//                 <li>Net improvement of IDR ${(ml - baseline).toLocaleString()} (${improvement.toFixed(1)}%)</li>
//                 <li>Waste reduced by ${(((scenarios.Baseline.total_waste - scenarios[mlKey].total_waste) / scenarios.Baseline.total_waste) * 100).toFixed(1)}%</li>
//                 <li>Service level maintained at ${scenarios[mlKey].service_level.toFixed(1)}%</li>
//             </ul>
//         </div>
        
//         <div style="margin-top: 30px; text-align: center; display: flex; gap: 15px; justify-content: center;">
//             <button class="btn" onclick="setActiveStep(3); showScreen('results')">
//                 ← Back to Results
//             </button>
//             <button class="btn btn-success" onclick="setActiveStep(5); showScreen('recommendations')">
//                 View Recommendations →
//             </button>
//         </div>
//     `;
    
//     document.getElementById('financialContent').innerHTML = content;
// }

// // Display recommendations
// async function displayRecommendations(results) {
//     let productPerf = [];
    
//     // Determine correct ML key
//     const mlKey = results.financial_scenarios['ML Prediction'] ? 'ML Prediction' : 'ML_Prediction';
    
//     try {
//         const response = await fetch(`${API_URL}/api/product-performance/${sessionId}`);
//         if (response.ok) {
//             const data = await response.json();
//             productPerf = data.products;
//         }
//     } catch (error) {
//         console.error('Error fetching product performance:', error);
//     }
    
//     const bestProducts = productPerf.slice(0, 3).map(p => p.product);
//     const worstProducts = productPerf.slice(-3).map(p => p.product);
    
//     const content = `
//         <div class="success-message">
//             <strong>🎯 Actionable Business Recommendations</strong><br>
//             Based on model analysis and financial projections
//         </div>
        
//         <h3 style="margin-bottom: 15px;">1. Production Strategy</h3>
//         <div class="recommendation-box">
//             <h4>📦 Recommended Approach</h4>
//             <ul>
//                 <li><strong>Use ML predictions as base production quantity</strong> - The model shows ${results.model_performance[results.best_model].test_mape.toFixed(1)}% average error</li>
//                 <li><strong>Add 5-10% safety buffer</strong> for high-demand periods (Ramadan, near-Eid)</li>
//                 <li><strong>Maintain tighter inventory</strong> for products with stable demand patterns</li>
//                 <li><strong>Review predictions daily</strong> and adjust based on actual sales</li>
//             </ul>
//         </div>
        
//         <h3 style="margin-top: 30px; margin-bottom: 15px;">2. Product-Specific Actions</h3>
//         ${productPerf.length > 0 ? `
//         <div class="table-container">
//             <table>
//                 <thead>
//                     <tr>
//                         <th>Product</th>
//                         <th>Avg Actual</th>
//                         <th>Avg Predicted</th>
//                         <th>MAE</th>
//                         <th>MAPE (%)</th>
//                         <th>Recommendation</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     ${productPerf.slice(0, 5).map(p => `
//                         <tr>
//                             <td><strong>${p.product}</strong></td>
//                             <td>${p.avg_actual.toFixed(1)}</td>
//                             <td>${p.avg_predicted.toFixed(1)}</td>
//                             <td>${p.mae.toFixed(2)}</td>
//                             <td>${p.mape.toFixed(2)}%</td>
//                             <td>${p.mae < 5 ? '✓ Trust model' : p.mae < 10 ? '⚠ Add buffer' : '❌ Manual review'}</td>
//                         </tr>
//                     `).join('')}
//                 </tbody>
//             </table>
//         </div>
//         ` : '<p>Product performance data not available</p>'}
        
//         <h3 style="margin-top: 30px; margin-bottom: 15px;">3. Seasonal Considerations</h3>
//         <div class="recommendation-box">
//             <h4>📅 Calendar Events</h4>
//             <ul>
//                 <li><strong>Ramadan Period:</strong> Distinct demand patterns captured by the model - trust predictions closely</li>
//                 <li><strong>Pre-Eid (5-7 days before):</strong> Increase production by 15-20% for all products</li>
//                 <li><strong>Post-Eid (7 days after):</strong> Reduce production gradually, monitor actual demand</li>
//                 <li><strong>Weekend Patterns:</strong> Sunday closures accounted for, Saturday may need adjustment</li>
//                 <li><strong>National Holidays:</strong> Zero production recommended (Jan 1, Aug 17, Dec 25)</li>
//             </ul>
//         </div>
        
//         <h3 style="margin-top: 30px; margin-bottom: 15px;">4. Implementation Guidelines</h3>
//         <div class="recommendation-box">
//             <h4>🚀 How to Use This System</h4>
//             <ul>
//                 <li><strong>Daily:</strong> Use model predictions for next-day production planning</li>
//                 <li><strong>Weekly:</strong> Review forecast accuracy and adjust safety buffers as needed</li>
//                 <li><strong>Monthly:</strong> Retrain model with latest data to capture new patterns</li>
//                 <li><strong>Track Metrics:</strong> Monitor waste reduction, service level, and actual vs predicted</li>
//                 <li><strong>Document Adjustments:</strong> Keep notes on manual overrides and their outcomes</li>
//             </ul>
//         </div>
        
//         <h3 style="margin-top: 30px; margin-bottom: 15px;">5. Continuous Improvement</h3>
//         <div class="recommendation-box">
//             <h4>📈 Next Steps</h4>
//             <ul>
//                 <li><strong>Current Performance:</strong> ${results.model_performance[results.best_model].test_r2.toFixed(2)} R² score indicates good predictive power</li>
//                 <li><strong>Potential Gains:</strong> Additional ${(((results.financial_scenarios.Perfect.total_profit - results.financial_scenarios[mlKey].total_profit) / Math.abs(results.financial_scenarios.Baseline.total_profit)) * 100).toFixed(1)}% improvement possible with perfect forecasting</li>
//                 <li><strong>To Close Gap:</strong>
//                     <ul>
//                         <li>Collect customer feedback on stockouts</li>
//                         <li>Add weather data if available (affects foot traffic)</li>
//                         <li>Track promotional calendars and special events</li>
//                         <li>Monitor competitor activities and market trends</li>
//                         <li>Consider implementing dynamic pricing for slow-moving items</li>
//                     </ul>
//                 </li>
//             </ul>
//         </div>
        
//         <div style="margin-top: 30px; padding: 20px; background: #e8f5e9; border-radius: 10px; border-left: 4px solid #48bb78;">
//             <h3 style="color: #48bb78; margin-bottom: 15px;">✅ Expected Outcomes</h3>
//             <p style="color: #666; line-height: 1.8;">
//                 If implemented correctly, this forecasting system should deliver:
//             </p>
//             <ul style="color: #666; line-height: 2; margin-top: 10px;">
//                 <li><strong>Profit Improvement:</strong> ${(((results.financial_scenarios[mlKey].total_profit - results.financial_scenarios.Baseline.total_profit) / Math.abs(results.financial_scenarios.Baseline.total_profit)) * 100).toFixed(1)}% over baseline approach</li>
//                 <li><strong>Waste Reduction:</strong> ${(((results.financial_scenarios.Baseline.total_waste - results.financial_scenarios[mlKey].total_waste) / results.financial_scenarios.Baseline.total_waste) * 100).toFixed(1)}% fewer units wasted</li>
//                 <li><strong>Service Level:</strong> ${results.financial_scenarios[mlKey].service_level.toFixed(1)}% customer satisfaction</li>
//                 <li><strong>Annual Impact:</strong> Projected IDR ${((results.financial_scenarios[mlKey].total_profit / results.split_info.test_size) * 365).toLocaleString()} annually</li>
//             </ul>
//         </div>
        
//         <div style="margin-top: 30px; text-align: center;">
//             <button class="btn" onclick="setActiveStep(4); showScreen('financial')">
//                 ← Back to Financial Analysis
//             </button>
//         </div>
//     `;
    
//     document.getElementById('recommendationsContent').innerHTML = content;
// }

// // Step click handlers
// document.querySelectorAll('.step').forEach((step, index) => {
//     step.addEventListener('click', () => {
//         const stepNum = index + 1;
        
//         if (stepNum === 1) {
//             showScreen('welcome');
//             setActiveStep(1);
//         } else if (stepNum === 2 && sessionId) {
//             setActiveStep(2);
//         } else if (stepNum === 3 && trainingResults) {
//             showScreen('results');
//             setActiveStep(3);
//         } else if (stepNum === 4 && trainingResults) {
//             showScreen('financial');
//             setActiveStep(4);
//         } else if (stepNum === 5 && trainingResults) {
//             showScreen('recommendations');
//             setActiveStep(5);
//         }
//     });
// });