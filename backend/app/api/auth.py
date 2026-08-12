from fastapi.responses import JSONResponse
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.database import get_db
from app.models import Account, User
from app.schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["Auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/login") # Hapus response_model untuk sementara agar bisa kirim debug
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    # --- LOGIKA DEBUGGING BARU ---
    account = db.query(Account).filter(Account.email == payload.email).first()
    
    if not account:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "[DEBUG] Akun tidak ditemukan.", "email_sent": payload.email}
        )

    try:
        is_valid = pwd_context.verify(payload.password, account.password_hash)
        if not is_valid:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "[DEBUG] Password salah.", "db_hash": account.password_hash, "password_sent": payload.password}
            )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "[DEBUG] Terjadi error saat verifikasi.", "error": str(e), "db_hash": account.password_hash}
        )

    # --- Jika Login Berhasil ---
    user = db.query(User).filter(User.account_id == account.account_id).first()

    # Logika untuk menentukan user_id dan full_name berdasarkan role
    if account.role == "ADMIN":
        user_id = None
        full_name = "Admin System"
    elif user:
        user_id = user.user_id
        full_name = user.full_name
    else:
        # Jika customer tapi profil tidak ditemukan, ini adalah error server
        # karena data tidak konsisten.
        logging.error(f"Inkonsistensi data: Akun customer (ID: {account.account_id}) tidak memiliki profil user.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Data profil pengguna tidak ditemukan."
        )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "access_token": f"fake-jwt-token-{account.account_id}",
            "token_type": "bearer",
            "role": account.role,
            "user_id": user_id,
            "full_name": full_name
        }
    )