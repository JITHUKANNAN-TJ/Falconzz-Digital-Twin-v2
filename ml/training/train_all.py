import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, mean_absolute_error, mean_squared_error, r2_score, confusion_matrix
from backend.intelligence.feature_pipeline import FEATURE_NAMES
from backend.config import settings

def train_models(dataset_path: str = "ml/datasets/run_to_failure_dataset.csv", output_dir: str = "backend/models"):
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs("ml/evaluation", exist_ok=True)
    
    print(f"Loading dataset from {dataset_path}...")
    df = pd.read_csv(dataset_path)
    
    X = df[FEATURE_NAMES]
    y_anomaly = df["is_anomaly"]
    y_fault = df["fault_class"]
    y_rul = df["rul_hours"]
    
    # Stratified Train/Val/Test Split (70% train, 15% val, 15% test)
    X_train, X_temp, y_f_train, y_f_temp, y_r_train, y_r_temp, y_a_train, y_a_temp = train_test_split(
        X, y_fault, y_rul, y_anomaly, test_size=0.30, random_state=42, stratify=y_fault
    )
    X_val, X_test, y_f_val, y_f_test, y_r_val, y_r_test, y_a_val, y_a_test = train_test_split(
        X_temp, y_f_temp, y_r_temp, y_a_temp, test_size=0.50, random_state=42, stratify=y_f_temp
    )
    
    # 1. Train Isolation Forest for Anomaly Detection
    print("Training Isolation Forest Anomaly Detector...")
    # Train on normal baseline subset
    normal_mask = (y_f_train == "NORMAL")
    X_normal_train = X_train[normal_mask]
    
    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=0.03,
        random_state=42,
        n_jobs=-1
    )
    iso_forest.fit(X_normal_train)
    joblib.dump(iso_forest, os.path.join(output_dir, "anomaly_detector.joblib"))
    
    # 2. Train Multi-Class Fault Classifier
    print("Training Random Forest Multi-Class Fault Classifier...")
    fault_classifier = RandomForestClassifier(
        n_estimators=120,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    fault_classifier.fit(X_train, y_f_train)
    joblib.dump(fault_classifier, os.path.join(output_dir, "fault_classifier.joblib"))
    
    # 3. Train Gradient Boosting RUL Regressors (Point estimate + 10th & 90th quantiles)
    print("Training Gradient Boosting RUL Regressors (with Quantile Uncertainty)...")
    rul_regressor = GradientBoostingRegressor(
        n_estimators=150,
        learning_rate=0.08,
        max_depth=5,
        random_state=42
    )
    rul_regressor.fit(X_train, y_r_train)
    joblib.dump(rul_regressor, os.path.join(output_dir, "rul_regressor.joblib"))
    
    # Lower quantile (10th percentile)
    rul_lower = GradientBoostingRegressor(
        loss="quantile", alpha=0.10, n_estimators=100, max_depth=4, random_state=42
    )
    rul_lower.fit(X_train, y_r_train)
    joblib.dump(rul_lower, os.path.join(output_dir, "rul_lower_quantile.joblib"))
    
    # Upper quantile (90th percentile)
    rul_upper = GradientBoostingRegressor(
        loss="quantile", alpha=0.90, n_estimators=100, max_depth=4, random_state=42
    )
    rul_upper.fit(X_train, y_r_train)
    joblib.dump(rul_upper, os.path.join(output_dir, "rul_upper_quantile.joblib"))
    
    # Save feature names list
    with open(os.path.join(output_dir, "feature_names.json"), "w") as f:
        json.dump(FEATURE_NAMES, f, indent=2)
        
    # Evaluate on Test Set
    print("\nEvaluating Models on Independent Test Set...")
    # Fault Classification metrics
    y_f_pred = fault_classifier.predict(X_test)
    acc = accuracy_score(y_f_test, y_f_pred)
    prec, rec, f1, _ = precision_recall_fscore_support(y_f_test, y_f_pred, average="weighted")
    cm = confusion_matrix(y_f_test, y_f_pred)
    classes = list(fault_classifier.classes_)
    
    # RUL Metrics
    y_r_pred = rul_regressor.predict(X_test)
    mae = mean_absolute_error(y_r_test, y_r_pred)
    rmse = np.sqrt(mean_squared_error(y_r_test, y_r_pred))
    r2 = r2_score(y_r_test, y_r_pred)
    
    # Anomaly Metrics
    # In IsolationForest, -1 is anomaly, 1 is normal
    iso_preds = iso_forest.predict(X_test)
    iso_bin_pred = (iso_preds == -1).astype(int)
    a_prec, a_rec, a_f1, _ = precision_recall_fscore_support(y_a_test, iso_bin_pred, average="binary", zero_division=0)
    
    eval_metrics = {
        "dataset_size": len(df),
        "train_samples": len(X_train),
        "val_samples": len(X_val),
        "test_samples": len(X_test),
        "fault_classification": {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "classes": classes,
            "confusion_matrix": cm.tolist()
        },
        "rul_estimation": {
            "mae_hours": round(float(mae), 3),
            "rmse_hours": round(float(rmse), 3),
            "r2_score": round(float(r2), 4)
        },
        "anomaly_detection": {
            "precision": round(float(a_prec), 4),
            "recall": round(float(a_rec), 4),
            "f1_score": round(float(a_f1), 4)
        },
        "feature_importances": {
            name: round(float(imp), 4) for name, imp in zip(FEATURE_NAMES, fault_classifier.feature_importances_)
        }
    }
    
    with open("ml/evaluation/metrics.json", "w") as f:
        json.dump(eval_metrics, f, indent=2)
        
    print(f"Classification Accuracy: {acc*100:.2f}% | F1: {f1:.4f}")
    print(f"RUL MAE: {mae:.2f} hrs | RMSE: {rmse:.2f} hrs | R²: {r2:.4f}")
    print("Models and evaluation metrics serialized successfully.")
    return eval_metrics

if __name__ == "__main__":
    train_models()
