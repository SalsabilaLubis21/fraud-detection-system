import os
import joblib
import pandas as pd
import re

def camel_to_snake(name):
    """Mengubah string dari camelCase menjadi snake_case."""
    name = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', name).lower()

class MLService:
    def __init__(self):
        self.model = None
        self.model_features = None     
        self.internal_features = None   
        self.feature_mapping = None     
        self.load_model()

    def load_model(self):
        """
        Memuat model XGBoost, daftar fitur, dan membuat pemetaan nama fitur.
        """
        service_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(os.path.dirname(service_dir))
        models_dir = os.path.join(backend_dir, 'models')

        model_path = os.path.join(models_dir, 'xgboost_full_model.joblib')
        features_path = os.path.join(models_dir, 'full_model_features.joblib')

        # 1. Load Model XGBoost
        if os.path.exists(model_path):
            self.model = joblib.load(model_path)
            print(f"[MLService] Model (full) berhasil dimuat dari: {model_path}")
        else:
            print(f"[MLService] Peringatan: File model 'xgboost_full_model.joblib' tidak ditemukan di {model_path}")

        # 2. Load Urutan Fitur 
        if os.path.exists(features_path):
            self.model_features = joblib.load(features_path)
            self.internal_features = [camel_to_snake(f) for f in self.model_features]
            self.feature_mapping = dict(zip(self.internal_features, self.model_features))
            print(f"[MLService] Daftar fitur (full) berhasil dimuat dan dipetakan ke snake_case.")
        else:
            print(f"[MLService] Peringatan: File fitur 'full_model_features.joblib' tidak ditemukan di {features_path}")

    def predict_fraud_risk(self, transaction_data: dict):
        """
        Memprediksi risiko penipuan untuk transaksi berdasarkan model yang dilatih pada semua jenis transaksi.
        Menerima dictionary data transaksi lengkap sebagai input.
        """
        if not self.model or not self.model_features:
            print("[MLService] Peringatan: Model atau daftar fitur tidak dimuat. Mengembalikan prediksi default.")
            return 0.01, 0, "APPROVED"

        
        
        input_data_camel = {self.feature_mapping.get(camel_to_snake(k), k): v for k, v in transaction_data.items()}

        # Ekstrak nilai yang diperlukan untuk feature engineering
        amount = float(input_data_camel.get('amount', 0))
        old_orig = float(input_data_camel.get('oldbalanceOrg', 0))
        new_orig = float(input_data_camel.get('newbalanceOrig', 0))
        old_dest = float(input_data_camel.get('oldbalanceDest', 0))
        new_dest = float(input_data_camel.get('newbalanceDest', 0))
        tx_type = input_data_camel.get('type', '').upper()

        # Inisialisasi input_row dengan semua fitur model di set ke 0 atau nilai default
        input_row = {feature: 0 for feature in self.model_features}
        
        
        input_row.update({k: v for k, v in input_data_camel.items() if k in self.model_features})

        # Feature Engineering 
        input_row.update({
            'step': int(input_data_camel.get('step', 1)),
            'amount': amount,
            'oldbalanceOrg': old_orig,
            'newbalanceOrig': new_orig,
            'oldbalanceDest': old_dest,
            'newbalanceDest': new_dest,
            'errorBalanceOrig': new_orig + amount - old_orig,
            'errorBalanceDest': old_dest + amount - new_dest,
            'isBalanceEmptied': 1 if (old_orig > 0 and new_orig == 0) else 0
        })

        # One-Hot Encoding untuk tipe transaksi
        type_col_name = f'type_{tx_type}'
        if type_col_name in self.model_features:
            input_row[type_col_name] = 1
        else:
            print(f"[MLService] Info: Tipe transaksi '{tx_type}' tidak ada dalam fitur model, akan diabaikan.")

        # Buat DataFrame dengan urutan kolom yang benar
        try:
            input_df = pd.DataFrame([input_row])[self.model_features]
        except KeyError as e:
            print(f"[MLService] Error: Kolom fitur tidak cocok saat membuat DataFrame. Missing: {e}")
            return 0.01, 0, "APPROVED"

        # Lakukan prediksi
        probabilities = self.model.predict_proba(input_df)[0]
        fraud_probability = float(probabilities[1])

        # (threshold 0.5)
        is_fraud = 1 if fraud_probability >= 0.5 else 0
        status = "REJECTED" if is_fraud == 1 else "APPROVED"

        return fraud_probability, is_fraud, status