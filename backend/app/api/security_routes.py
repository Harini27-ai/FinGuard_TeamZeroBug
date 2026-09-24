from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..db import get_db
from ..models import User, UserSession
from ..schemas import SessionOut, SecurityOverviewOut, ChangePasswordRequest
from ..auth import get_current_user, verify_password, hash_password

router = APIRouter(prefix="/security", tags=["Security & Sessions"])


@router.get("/overview", response_model=SecurityOverviewOut)
def get_security_overview(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id
    ).order_by(desc(UserSession.created_at)).all()

    current_ip = request.client.host if request.client else "127.0.0.1"

    session_outs: List[SessionOut] = []
    current_sess_out = None
    last_login_dt = None

    for i, s in enumerate(sessions):
        is_curr = (i == 0)  # Most recent active session
        so = SessionOut(
            id=s.id,
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            is_current=is_curr,
            is_revoked=s.is_revoked,
            created_at=s.created_at,
            expires_at=s.expires_at
        )
        if is_curr and not current_sess_out:
            current_sess_out = so
        if not s.is_revoked:
            session_outs.append(so)
        if i == 0:
            last_login_dt = s.created_at

    return SecurityOverviewOut(
        current_session=current_sess_out,
        active_sessions=session_outs[:10],
        last_login=last_login_dt,
        total_sessions=len(sessions)
    )


@router.post("/logout-others")
def logout_other_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Invalidate all older sessions except the latest
    latest_sess = db.query(UserSession).filter(
        UserSession.user_id == current_user.id
    ).order_by(desc(UserSession.created_at)).first()

    if latest_sess:
        db.query(UserSession).filter(
            UserSession.user_id == current_user.id,
            UserSession.id != latest_sess.id,
            UserSession.is_revoked == False
        ).update({"is_revoked": True})
        db.commit()

    return {"status": "success", "message": "Logged out of all other sessions."}


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password entered is incorrect.")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")

    current_user.password_hash = hash_password(req.new_password)
    # Revoke old sessions on password change
    db.query(UserSession).filter(
        UserSession.user_id == current_user.id
    ).update({"is_revoked": True})

    db.commit()
    return {"status": "success", "message": "Password changed successfully."}


@router.delete("/account")
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Cascade deletes all user data
    db.delete(current_user)
    db.commit()
    return {"status": "success", "message": "User account and all associated financial data permanently deleted."}
