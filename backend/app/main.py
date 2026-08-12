import os
import sqlite3
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.services.ml_service import MLService
from app.api import auth, transaction

app = FastAPI(
    title="Fraud Detection API",
    description="Backend API untuk memproses transaksi dengan ML XGBoost dan Database SQLite",
    version="1.1.0" 
)


# CORS Setup

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include Routers

app.include_router(auth.router)
app.include_router(transaction.router)


# Model akan dimuat saat startup.
ml_service = MLService()

def get_ml_service():
    return ml_service

# router dengan dependency injection untuk ML service
app.include_router(
    transaction.router,
    dependencies=[Depends(get_ml_service)]
)

DB_PATH = os.path.join("data", "fraud_detection.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


# Pydantic Schemas

class TransactionRequest(BaseModel):
    user_id: int
    type: str
    amount: float
    dest_account_number: Optional[str] = None


# ENDPOINT 2: Mengambil Profil & Saldo User

@app.get("/api/users/{user_id}", tags=["Users"])
def get_user_profile(user_id: int, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
    user = cursor.fetchone()
    
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
        
    return dict(user)


# ENDPOINT 3: Memproses Transaksi (Telah Disederhanakan dengan MLService)

@app.post("/api/transactions", tags=["Transactions"])
def create_transaction(req: TransactionRequest, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    
    # 1. Ambil Saldo Awal (oldbalance_org)
    cursor.execute("SELECT balance FROM users WHERE user_id = ?", (req.user_id,))
    user_row = cursor.fetchone()
    
    if not user_row:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
        
    oldbalance_org = float(user_row["balance"])
    
    # Validasi Saldo
    if oldbalance_org < req.amount and req.type in ["CASH_OUT", "TRANSFER", "PAYMENT", "DEBIT"]:
        raise HTTPException(status_code=400, detail="Saldo tidak mencukupi")
        
    # 2. menentukan step transaksi 
    cursor.execute("SELECT created_at FROM transactions ORDER BY created_at ASC LIMIT 1")
    first_tx_time_row = cursor.fetchone()
    
    if first_tx_time_row and first_tx_time_row['created_at']:
        first_tx_time = datetime.strptime(first_tx_time_row['created_at'], '%Y-%m-%d %H:%M:%S')
        current_time = datetime.now()
       
        time_difference_hours = (current_time - first_tx_time).total_seconds() / 3600
        current_step = int(time_difference_hours) + 1 # Mulai dari 1
    else:
        
        current_step = 1

    # 3. Siapkan data untuk MLService
    newbalance_orig = max(0.0, oldbalance_org - req.amount)
    
    oldbalance_dest = 0.0 
    newbalance_dest = 0.0
    if req.type in ["TRANSFER", "CASH_OUT"]:
        newbalance_dest = oldbalance_dest + req.amount

    transaction_data = {
        "step": current_step, 
        "type": req.type,
        "amount": req.amount,
        "oldbalanceOrg": oldbalance_org,
        "newbalanceOrig": newbalance_orig,
        "oldbalanceDest": oldbalance_dest,
        "newbalanceDest": newbalance_dest
    }
    
    # 4. Prediksi menggunakan MLService
    fraud_probability, is_fraud, tx_status = ml_service.predict_fraud_risk(transaction_data)

    # 5. Simpan Log Transaksi ke database
    error_balance_orig = newbalance_orig + req.amount - oldbalance_org
    error_balance_dest = oldbalance_dest + req.amount - newbalance_dest
    is_balance_emptied = 1 if (req.amount == oldbalance_org) else 0

    cursor.execute('''
        INSERT INTO transactions (
            user_id, dest_account_number, type, amount, step,
            oldbalance_org, newbalance_orig, oldbalance_dest, newbalance_dest,
            fraud_probability, is_fraud, status,
            error_balance_orig, error_balance_dest, is_balance_emptied
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        req.user_id, req.dest_account_number, req.type, req.amount, transaction_data['step'],
        oldbalance_org, newbalance_orig, oldbalance_dest, newbalance_dest,
        fraud_probability, is_fraud, tx_status,
        error_balance_orig, error_balance_dest, is_balance_emptied
    ))
    
    # 6. Jika Transaksi Disetujui, Potong Saldo User
    if tx_status == "APPROVED":
        cursor.execute("UPDATE users SET balance = ? WHERE user_id = ?", (newbalance_orig, req.user_id))

    db.commit()

    return {
        "status": tx_status,
        "is_fraud": bool(is_fraud),
        "fraud_probability": round(fraud_probability, 4),
        "message": "Transaksi berhasil diproses" if tx_status == "APPROVED" else "Transaksi diblokir oleh Security System",
        "remaining_balance": newbalance_orig if tx_status == "APPROVED" else oldbalance_org
    }


# ENDPOINT 3B: Mengambil Semua Transaksi User

@app.get("/api/transactions", tags=["Transactions"])
def get_user_transactions(user_id: int, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute('''
        SELECT t.*, u.full_name, u.account_number
        FROM transactions t
        JOIN users u ON t.user_id = u.user_id
        WHERE t.user_id = ?
        ORDER BY t.created_at DESC
    ''', (user_id,))
    
    rows = cursor.fetchall()
    return [dict(row) for row in rows] if rows else []


# ENDPOINT 4: Mengambil Semua Transaksi (Admin)

@app.get("/api/admin/transactions", tags=["Admin"])
def get_all_transactions(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute('''
        SELECT 
            t.transaction_id,
            t.user_id,
            u.full_name,
            u.account_number,
            t.type,
            t.amount,
            t.status,
            t.fraud_probability,
            t.is_fraud,
            t.created_at
        FROM transactions t
        JOIN users u ON t.user_id = u.user_id
        ORDER BY t.created_at DESC
    ''')
    
    rows = cursor.fetchall()
    
    
    transactions = [dict(row) for row in rows]
    
    return transactions
def get_all_transactions(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute('''
        SELECT t.*, u.full_name, u.account_number 
        FROM transactions t
        JOIN users u ON t.user_id = u.user_id
        ORDER BY t.created_at DESC
    ''')
    rows = cursor.fetchall()
    return [dict(row) for row in rows]


# ENDPOINT 5: Menghitung Metrik (Admin)

@app.get("/api/metrics", tags=["Admin"])
def get_metrics(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM transactions")
    total_processed = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM transactions WHERE status = 'APPROVED' OR status = 'OVERRIDDEN'")
    total_approved = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM transactions WHERE status = 'REJECTED' OR status = 'BLOCKED'") # Disesuaikan
    total_blocked = cursor.fetchone()[0]
    
    return {
        "total_processed": total_processed,
        "total_approved": total_approved,
        "total_blocked": total_blocked
    }


# ENDPOINT 6: Evaluasi Ulang Transaksi (Disederhanakan dengan MLService)

@app.post("/api/admin/transactions/re-evaluate", tags=["Admin"])
def re_evaluate_transactions(db: sqlite3.Connection = Depends(get_db)):
    if ml_service.model is None:
        raise HTTPException(status_code=503, detail="Model ML tidak tersedia.")

    cursor = db.cursor()
    
    # 1. Ambil semua transaksi historis
    cursor.execute("SELECT * FROM transactions")
    transactions_to_evaluate = cursor.fetchall()
    
    updated_count = 0
    
    # 2. Iterasi dan prediksi ulang menggunakan MLService
    for tx in transactions_to_evaluate:
        tx_dict = dict(tx)
        
        # Siapkan data dalam format yang diharapkan model ai
        transaction_data = {
            "step": tx_dict.get('step', 1),
            "type": tx_dict.get('type'),
            "amount": tx_dict.get('amount'),
            "oldbalanceOrg": tx_dict.get('oldbalance_org'),
            "newbalanceOrig": tx_dict.get('newbalance_orig'),
            "oldbalanceDest": tx_dict.get('oldbalance_dest'),
            "newbalanceDest": tx_dict.get('newbalance_dest')
        }

        # Panggil service untuk prediksi ulang
        new_fraud_prob, new_is_fraud, new_status = ml_service.predict_fraud_risk(transaction_data)
        
        # Jangan ubah status jika sudah di-override oleh admin
        if tx_dict.get('status') == 'OVERRIDDEN':
            new_status = 'OVERRIDDEN'

        # 3. Update transaksi di database
        cursor.execute('''
            UPDATE transactions
            SET fraud_probability = ?, is_fraud = ?, status = ?
            WHERE transaction_id = ?
        ''', (new_fraud_prob, new_is_fraud, new_status, tx_dict['transaction_id']))
        
        updated_count += 1

    db.commit()
    
    return {
        "message": f"Evaluasi ulang selesai. {updated_count} transaksi telah diperbarui dengan model baru.",
        "updated_count": updated_count
    }