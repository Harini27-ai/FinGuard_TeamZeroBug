from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User, FinancialAccount
from ..schemas import AccountCreate, AccountUpdate, AccountOut
from ..auth import get_current_user

router = APIRouter(prefix="/accounts", tags=["Financial Accounts"])


@router.post("", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_account(
    acc_in: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Enforce strictly last 4 digits only
    clean_last4 = acc_in.last4.strip()[-4:]
    acc = FinancialAccount(
        user_id=current_user.id,
        bank_name=acc_in.bank_name.strip(),
        account_nickname=acc_in.account_nickname.strip(),
        account_type=acc_in.account_type,
        last4=clean_last4,
        current_balance=acc_in.current_balance,
        monthly_income=acc_in.monthly_income,
        account_status=acc_in.account_status
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc


@router.get("", response_model=List[AccountOut])
def get_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Strict user data isolation
    return db.query(FinancialAccount).filter(FinancialAccount.user_id == current_user.id).all()


@router.get("/{account_id}", response_model=AccountOut)
def get_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    acc = db.query(FinancialAccount).filter(
        FinancialAccount.id == account_id,
        FinancialAccount.user_id == current_user.id
    ).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Financial account not found.")
    return acc


@router.put("/{account_id}", response_model=AccountOut)
def update_account(
    account_id: int,
    acc_in: AccountUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    acc = db.query(FinancialAccount).filter(
        FinancialAccount.id == account_id,
        FinancialAccount.user_id == current_user.id
    ).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Financial account not found.")

    update_data = acc_in.model_dump(exclude_unset=True)
    if "last4" in update_data and update_data["last4"]:
        update_data["last4"] = update_data["last4"].strip()[-4:]

    for field, val in update_data.items():
        setattr(acc, field, val)

    db.commit()
    db.refresh(acc)
    return acc


@router.delete("/{account_id}", status_code=status.HTTP_200_OK)
def delete_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    acc = db.query(FinancialAccount).filter(
        FinancialAccount.id == account_id,
        FinancialAccount.user_id == current_user.id
    ).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Financial account not found.")

    db.delete(acc)
    db.commit()
    return {"status": "success", "message": "Financial account deleted successfully."}
