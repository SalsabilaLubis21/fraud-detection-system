import sqlite3
import os
import random
from datetime import datetime, timedelta
from passlib.context import CryptContext

# sistem keamanan kata sandi menggunakan bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 1. Hapus file database lama jika ada untuk memastikan skema bersih
db_path = os.path.join('data', 'fraud_detection.db')
if os.path.exists(db_path):
    os.remove(db_path)

# 2. Pastikan folder 'data' ada
os.makedirs('data', exist_ok=True)

# 3. Hubungkan ke database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print(f"Membuat database di: {db_path} ...")

# Reset / Hapus tabel lama jika ada agar data terbarui dengan bersih
cursor.execute('DROP TABLE IF EXISTS transactions')
cursor.execute('DROP TABLE IF EXISTS users')
cursor.execute('DROP TABLE IF EXISTS accounts')

# 3. Buat Tabel accounts (Credentials Login)
cursor.execute('''
CREATE TABLE IF NOT EXISTS accounts (
    account_id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
''')

# 4. Buat Tabel users (Profil Nasabah & Saldo)
cursor.execute('''
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    account_number TEXT UNIQUE NOT NULL,
    balance REAL NOT NULL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);
''')

# 5. Buat Tabel transactions (Log Transaksi & Feature XGBoost)
cursor.execute('''
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    dest_account_number TEXT,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    step INTEGER DEFAULT 1,
    oldbalance_org REAL NOT NULL,
    newbalance_orig REAL NOT NULL,
    oldbalance_dest REAL DEFAULT 0.0,
    newbalance_dest REAL DEFAULT 0.0,
    error_balance_orig REAL NOT NULL,
    error_balance_dest REAL DEFAULT 0.0,
    is_balance_emptied INTEGER NOT NULL DEFAULT 0,
    type_transfer INTEGER NOT NULL DEFAULT 0,
    fraud_probability REAL,
    is_fraud INTEGER,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
''')

# 6. Masukkan Data 1 Admin & 5 Customer dengan Password Hashing
accounts_to_insert = [
    (1, 'security.officer@amanbank.id', 'adminPass2026!', 'ADMIN'),
    (2, 'budi.santoso@amanbank.id', 'password123', 'CUSTOMER'),
    (3, 'salsabila.herlin@amanbank.id', 'password123', 'CUSTOMER'),
    (4, 'siti.aminah@amanbank.id', 'password123', 'CUSTOMER'),
    (5, 'andi.pratama@amanbank.id', 'password123', 'CUSTOMER'),
    (6, 'dewi.lestari@amanbank.id', 'password123', 'CUSTOMER')
]

hashed_accounts = []
for acc_id, email, password, role in accounts_to_insert:
    hashed_password = pwd_context.hash(password)
    hashed_accounts.append((acc_id, email, hashed_password, role))

cursor.executemany('''
INSERT INTO accounts (account_id, email, password_hash, role) VALUES (?, ?, ?, ?);
''', hashed_accounts)


#  Profil 5 Nasabah 
cursor.execute('''
INSERT INTO users (user_id, account_id, full_name, account_number, balance) VALUES 
(1, 2, 'Budi Santoso', '102938475612', 3500.0),
(2, 3, 'Salsabila Herlin', '102938475613', 8500.0),
(3, 4, 'Siti Aminah', '102938475614', 12000.0),
(4, 5, 'Andi Pratama', '102938475615', 2500.0),
(5, 6, 'Dewi Lestari', '102938475616', 15000.0);
''')

# 7. Generate Data Transaksi Dummy yang Banyak
transaction_types = ['CASH_OUT', 'TRANSFER', 'CASH_IN', 'PAYMENT', 'DEBIT']
dest_accounts = ['9928310029', '8812390112', '7723910293', '6629103921', '5519203941']

now = datetime.now()

# Template skenario 
dummy_scenarios = [
   
    ('CASH_OUT', 2480.0, 1, 250.0),
    ('TRANSFER', 150.0, 0, 0.0),
    ('CASH_OUT', 500.0, 0, 0.0),
    ('TRANSFER', 12500.0, 1, 1200.0),
    ('CASH_OUT', 200.0, 0, 0.0),
    ('TRANSFER', 5000.0, 0, 0.0),
    ('CASH_OUT', 300.0, 0, 0.0),
    ('CASH_IN', 1000.0, 0, 0.0),
    ('PAYMENT', 120.0, 0, 0.0),
    ('DEBIT', 85.0, 0, 0.0),
    ('TRANSFER', 15000.0, 1, 0.0),
    ('CASH_OUT', 750.0, 0, 0.0),
    ('TRANSFER', 400.0, 0, 0.0),
    ('CASH_OUT', 6200.0, 1, 500.0),
    ('PAYMENT', 450.0, 0, 0.0),
]

for idx, sc in enumerate(dummy_scenarios):
    user_id = random.randint(1, 5)
    tx_type, amount, is_emptied, error_bal = sc
    
    
    created_time = (now - timedelta(minutes=idx * 15)).strftime('%Y-%m-%d %H:%M:%S')
    
    oldbal = amount + random.randint(500, 5000) if is_emptied == 0 else amount
    newbal = 0.0 if is_emptied == 1 else (oldbal - amount)
    
    type_transfer = 1 if tx_type in ['TRANSFER', 'CASH_OUT'] else 0
    dest_acc = random.choice(dest_accounts)

    cursor.execute('''
    INSERT INTO transactions (
        user_id, dest_account_number, type, amount, step,
        oldbalance_org, newbalance_orig, oldbalance_dest, newbalance_dest,
        error_balance_orig, error_balance_dest, is_balance_emptied,
        type_transfer, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        user_id, dest_acc, tx_type, amount, 1,
        oldbal, newbal, 0.0, amount,
        error_bal, 0.0, is_emptied,
        type_transfer, created_time
    ))

# 8. Simpan Perubahan
conn.commit()
conn.close()

print("Database fraud_detection.db berhasil dibuat ulang dengan skema baru dan 15 transaksi mentah!")