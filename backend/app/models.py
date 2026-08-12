from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class Account(Base):
    __tablename__ = "accounts"

    account_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="customer", nullable=False)  # 'customer' / 'admin'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relasi One-to-One ke Users
    user_profile = relationship("User", back_populates="account", uselist=False, cascade="all, delete")


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("accounts.account_id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    account_number = Column(String, unique=True, index=True, nullable=False)
    balance = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relasi
    account = relationship("Account", back_populates="user_profile")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete")


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    dest_account_number = Column(String, nullable=True)
    type = Column(String, nullable=False)  
    amount = Column(Float, nullable=False)
    step = Column(Integer, default=1)

    # 10 Fitur ML 
    oldbalance_org = Column(Float, nullable=False)
    newbalance_orig = Column(Float, nullable=False)
    oldbalance_dest = Column(Float, default=0.0)
    newbalance_dest = Column(Float, default=0.0)
    error_balance_orig = Column(Float, nullable=False)
    error_balance_dest = Column(Float, default=0.0)
    is_balance_emptied = Column(Integer, default=0)
    type_transfer = Column(Integer, default=0)

    # Hasil Prediksi XGBoost
    fraud_probability = Column(Float, nullable=False)
    is_fraud = Column(Integer, nullable=False, default=0)
    status = Column(String, nullable=False, default="APPROVED")  # 'APPROVED' / 'BLOCKED'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relasi
    user = relationship("User", back_populates="transactions")