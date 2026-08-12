from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# Autentifikasi & skema akun 

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: Optional[int] = None
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


# Skema User Profile

class UserBase(BaseModel):
    full_name: str
    account_number: str
    balance: float

    class Config:
        from_attributes = True

class UserResponse(UserBase):
    user_id: int
    account_id: int
    created_at: datetime


# Skema Transaction 

class TransactionCreate(BaseModel):
    user_id: int
    type: str
    amount: float
    dest_account_number: Optional[str] = None

class TransactionResultResponse(BaseModel):
    transaction_id: int
    status: str
    is_fraud: bool
    fraud_probability: float
    is_balance_emptied: bool
    amount: float
    remaining_balance: float
    message: str

    class Config:
        from_attributes = True

class MLIndicators(BaseModel):
    is_balance_emptied: bool
    balance_error_anomaly: bool
    balance_error_amount: float
    step_delta_ratio: float
    dest_account_risk: str

class TransactionDetailResponse(BaseModel):
    transaction_id: int
    user_id: int
    created_at: str
    customer_name: str
    account_number: str
    type: str
    amount: float
    step: int
    recipient_account: Optional[str] = None
    recipient_name: Optional[str] = None
    old_balance: float
    new_balance: float
    risk_score: float
    status: str
    ml_indicators: MLIndicators

    class Config:
        from_attributes = True

class MetricsResponse(BaseModel):
    total_processed: int
    total_approved: int
    total_blocked: int