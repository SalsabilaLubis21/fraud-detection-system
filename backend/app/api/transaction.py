from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.database import get_db
from app.models import User, Transaction
from app.schemas import (
    TransactionCreate,
    TransactionResultResponse,
    TransactionDetailResponse,
    MetricsResponse,
)
from app.services.ml_service import MLService

router = APIRouter(prefix="/api", tags=["Transactions"])


# ENDPOINT 0: Mengambil Metrik (Admin Command Center)

@router.get("/metrics", response_model=MetricsResponse)
def get_transaction_metrics(db: Session = Depends(get_db)):
    """
    Menghitung dan mengembalikan metrik agregat dari seluruh transaksi
    untuk ditampilkan di dashboard Admin Portal.
    """
    total_processed = db.query(func.count(Transaction.transaction_id)).scalar()
    
    total_approved = db.query(func.count(Transaction.transaction_id)).filter(
        Transaction.status.in_(["APPROVED", "OVERRIDDEN"])
    ).scalar()
    
    total_blocked = db.query(func.sum(Transaction.is_fraud)).scalar() or 0

    return MetricsResponse(
        total_processed=total_processed,
        total_approved=total_approved,
        total_blocked=total_blocked,
    )



# ENDPOINT 1: Memproses Transaksi Baru (Customer Portal)

@router.post("", response_model=TransactionResultResponse)
def create_transaction(
    payload: TransactionCreate, 
    db: Session = Depends(get_db),
    ml_service: MLService = Depends()
):
    # 1. Cari data nasabah/user di database berdasarkan user_id
    user = db.query(User).filter(User.user_id == payload.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Nasabah tidak ditemukan"
        )

    # Ambil saldo terkini sebagai oldbalance_org
    oldbalance_org = user.balance

   

    # 2. Hitung Prediksi Skor Risiko Fraud menggunakan ML Service (XGBoost)
    fraud_prob, is_fraud, status_tx = ml_service.predict_fraud_risk(
        amount=payload.amount,
        oldbalance_org=oldbalance_org,
        tx_type=payload.type
    )

    # Calculate nominal saldo akhir pengirim
    newbalance_orig = max(0.0, oldbalance_org - payload.amount)

    is_balance_emptied = 1 if newbalance_orig <= 0.0 else 0

    # 3. Simpan Catatan Transaksi & Fitur ML ke database
    new_tx = Transaction(
        user_id=user.user_id,
        dest_account_number=payload.dest_account_number,
        type=payload.type.upper(),
        amount=payload.amount,
        step=1, 
        oldbalance_org=oldbalance_org,
        newbalance_orig=newbalance_orig,
        oldbalance_dest=0.0, 
        newbalance_dest=0.0, 
        error_balance_orig=(newbalance_orig + payload.amount - oldbalance_org),
        error_balance_dest=0.0,
        is_balance_emptied=is_balance_emptied,
        type_transfer=1 if payload.type.upper() == "TRANSFER" else 0,
        fraud_probability=fraud_prob,
        is_fraud=is_fraud,
        status=status_tx
    )

    db.add(new_tx)

    # 4. Potong Saldo HANYA jika Transaksi Lolos/Disetujui (APPROVED)
    final_balance = oldbalance_org
    if status_tx == "APPROVED":
        user.balance = newbalance_orig
        final_balance = newbalance_orig

    db.commit()
    db.refresh(new_tx)

    
    if status_tx == "APPROVED":
        msg = "Transaction Approved Normally."
    else: 
        msg = "For your security, this transaction has been blocked by the fraud detection system."

    # 5. SELALU kembalikan respons yang lengkap dan konsisten untuk respond transaksi
    return TransactionResultResponse(
        transaction_id=new_tx.transaction_id,
        status=status_tx,
        is_fraud=bool(is_fraud),
        fraud_probability=round(fraud_prob, 4),
        is_balance_emptied=bool(is_balance_emptied),
        amount=payload.amount,
        remaining_balance=final_balance,
        message=msg
    )


# ENDPOINT 2: Mengambil Semua Transaksi (Admin Command Center)

@router.get("/admin/transactions", response_model=List[TransactionDetailResponse])
def get_all_transactions(db: Session = Depends(get_db)):
    """
    Mengembalikan daftar seluruh transaksi yang diurutkan dari yang terbaru,
    digunakan oleh Admin Portal untuk monitoring dan analisis risikonya.
    """
    transactions = (
        db.query(Transaction)
        .join(User, Transaction.user_id == User.user_id)
        .order_by(Transaction.created_at.desc())
        .all()
    )

    response = []
    for tx in transactions:
        response.append(
            TransactionDetailResponse(
                transaction_id=tx.transaction_id,
                user_id=tx.user_id,
                created_at=tx.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                customer_name=tx.user.full_name,
                account_number=tx.user.account_number,
                type=tx.type,
                amount=tx.amount,
                step=tx.step,
                recipient_account=tx.dest_account_number,
                recipient_name=None,  
                old_balance=tx.oldbalance_org,
                new_balance=tx.newbalance_orig,
                risk_score=tx.fraud_probability,
                status=tx.status,
                ml_indicators={
                    "is_balance_emptied": bool(tx.is_balance_emptied),
                    "balance_error_anomaly": tx.amount > tx.oldbalance_org,
                    "balance_error_amount": tx.error_balance_orig,
                    "step_delta_ratio": 0, 
                    "dest_account_risk": "LOW",  
                },
            )
        )
    return response



# ENDPOINT 3: Mengambil Transaksi Spesifik Pengguna (Customer Portal)

@router.get("/users/{user_id}/transactions", response_model=List[TransactionDetailResponse])
def get_user_transactions(user_id: int, db: Session = Depends(get_db)):
    """
    Mengembalikan daftar transaksi untuk satu pengguna tertentu, diurutkan dari yang terbaru,
    untuk ditampilkan di Customer Portal.
    """
    
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pengguna dengan ID {user_id} tidak ditemukan."
        )

    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.created_at.desc())
        .all()
    )

    response = []
    for tx in transactions:
        response.append(
            TransactionDetailResponse(
                transaction_id=tx.transaction_id,
                user_id=tx.user_id,
                created_at=tx.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                customer_name=user.full_name,
                account_number=user.account_number,
                type=tx.type,
                amount=tx.amount,
                step=tx.step,
                recipient_account=tx.dest_account_number,
                recipient_name=None,
                old_balance=tx.oldbalance_org,
                new_balance=tx.newbalance_orig,
                risk_score=tx.fraud_probability,
                status=tx.status,
                ml_indicators={
                    "is_balance_emptied": bool(tx.is_balance_emptied),
                    "balance_error_anomaly": tx.amount > tx.oldbalance_org,
                    "balance_error_amount": tx.error_balance_orig,
                    "step_delta_ratio": 0,
                    "dest_account_risk": "LOW",
                },
            )
        )
    return response



