from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Arthayog Dormitory ERP"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "arthayog_super_secure_jwt_production_secret_key_change_in_prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    DATABASE_URL: str = "sqlite:///./arthayog.db"

    RAZORPAY_KEY_ID: str = "rzp_test_arthayog_sample_key"
    RAZORPAY_KEY_SECRET: str = "sample_razorpay_secret_key_12345"

    BOOKING_HOLD_TIMEOUT_MINUTES: int = 15

    INITIAL_OWNER_EMAIL: str = "owner@arthayog.com"
    INITIAL_OWNER_PASSWORD: str = "AdminSecurePassword123!"
    INITIAL_STAFF_EMAIL: str = "staff@arthayog.com"
    INITIAL_STAFF_PASSWORD: str = "StaffSecurePassword123!"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
