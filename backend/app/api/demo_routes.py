from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User, UserSession
from ..schemas import TokenResponse
from ..auth import get_current_user, hash_password, create_access_token, create_refresh_token
from ..services.demo_service import seed_demo_data_for_user

router = APIRouter(prefix="/demo", tags=["Demo Data & Sandbox"])


@router.post("/seed")
def seed_demo_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return seed_demo_data_for_user(db, current_user)


@router.post("/quick-login", response_model=TokenResponse)
def quick_demo_login(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Creates or retrieves the standard demo account 'demo@finguard.ai',
    seeds complete realistic synthetic data, and returns authorization tokens.
    """
    demo_email = "demo@finguard.ai"
    user = db.query(User).filter(User.email == demo_email).first()

    if not user:
        user = User(
            name="Rahul Sharma",
            email=demo_email,
            phone="+91 98765 43210",
            password_hash=hash_password("DemoPassword123!")
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Seed demo data for this user
    seed_demo_data_for_user(db, user)

    # Tokens
    access_token = create_access_token({"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    client_ip = request.client.host if request.client else "127.0.0.1"
    session = UserSession(
        user_id=user.id,
        refresh_token=refresh_token,
        ip_address=client_ip,
        user_agent="FinGuard Demo Evaluator Browser"
    )
    db.add(session)
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user
    )
