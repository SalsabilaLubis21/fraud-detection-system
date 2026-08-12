import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Fraud Detection API"
    DEBUG: bool = True

    # Database

    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATABASE_URL: str = f"sqlite:///{os.path.join(BASE_DIR, 'data', 'fraud_detection.db')}"

    # JWT
    SECRET_KEY: str = "SUPER_SECRET_KEY_JWT_FRAUD_DETECTION_2026_CHANGE_ME"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 hari

    # Path Machine Learning Model 
    MODEL_PATH: str = os.path.join(BASE_DIR, "models", "xgboost_fraud_model.joblib")

    class Config:
        env_file = ".env"

settings = Settings()