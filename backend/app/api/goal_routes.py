from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User, FinancialGoal
from ..schemas import GoalCreate, GoalUpdate, GoalOut, GoalContribute
from ..auth import get_current_user

router = APIRouter(prefix="/goals", tags=["Financial Goals"])


def format_goal_out(g: FinancialGoal) -> GoalOut:
    now = datetime.now(timezone.utc)
    target = max(1.0, g.target_amount)
    current = max(0.0, g.current_amount)
    remaining = max(0.0, target - current)
    progress_pct = round(min(100.0, (current / target * 100)), 1)

    # Required monthly saving based on target date
    required_monthly = 0.0
    if g.target_date and remaining > 0:
        target_dt = g.target_date.replace(tzinfo=timezone.utc) if g.target_date.tzinfo is None else g.target_date
        days_diff = (target_dt - now).days
        months_diff = max(1, days_diff // 30)
        required_monthly = round(remaining / months_diff, 2)
    elif g.monthly_contribution > 0:
        required_monthly = g.monthly_contribution

    # Projected completion date
    proj_completion = None
    if remaining == 0:
        proj_completion = "Completed 🎉"
    elif g.monthly_contribution > 0:
        months_to_go = int(remaining // g.monthly_contribution) + (1 if remaining % g.monthly_contribution else 0)
        proj_completion = f"{months_to_go} months remaining"

    return GoalOut(
        id=g.id,
        user_id=g.user_id,
        goal_name=g.goal_name,
        goal_type=g.goal_type,
        target_amount=g.target_amount,
        current_amount=g.current_amount,
        target_date=g.target_date,
        monthly_contribution=g.monthly_contribution,
        progress_percentage=progress_pct,
        remaining_amount=round(remaining, 2),
        required_monthly_saving=required_monthly,
        projected_completion_date=proj_completion,
        created_at=g.created_at,
        updated_at=g.updated_at
    )


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    goal_in: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    g = FinancialGoal(
        user_id=current_user.id,
        goal_name=goal_in.goal_name.strip(),
        goal_type=goal_in.goal_type,
        target_amount=goal_in.target_amount,
        current_amount=goal_in.current_amount,
        target_date=goal_in.target_date,
        monthly_contribution=goal_in.monthly_contribution
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    return format_goal_out(g)


@router.get("", response_model=List[GoalOut])
def get_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goals = db.query(FinancialGoal).filter(FinancialGoal.user_id == current_user.id).all()
    return [format_goal_out(g) for g in goals]


@router.get("/{goal_id}", response_model=GoalOut)
def get_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    g = db.query(FinancialGoal).filter(
        FinancialGoal.id == goal_id,
        FinancialGoal.user_id == current_user.id
    ).first()
    if not g:
        raise HTTPException(status_code=404, detail="Financial goal not found.")
    return format_goal_out(g)


@router.put("/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: int,
    goal_in: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    g = db.query(FinancialGoal).filter(
        FinancialGoal.id == goal_id,
        FinancialGoal.user_id == current_user.id
    ).first()
    if not g:
        raise HTTPException(status_code=404, detail="Financial goal not found.")

    update_data = goal_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(g, field, val)

    db.commit()
    db.refresh(g)
    return format_goal_out(g)


@router.post("/{goal_id}/contribute", response_model=GoalOut)
def contribute_to_goal(
    goal_id: int,
    contrib: GoalContribute,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    g = db.query(FinancialGoal).filter(
        FinancialGoal.id == goal_id,
        FinancialGoal.user_id == current_user.id
    ).first()
    if not g:
        raise HTTPException(status_code=404, detail="Financial goal not found.")

    g.current_amount += contrib.amount
    db.commit()
    db.refresh(g)
    return format_goal_out(g)


@router.delete("/{goal_id}", status_code=status.HTTP_200_OK)
def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    g = db.query(FinancialGoal).filter(
        FinancialGoal.id == goal_id,
        FinancialGoal.user_id == current_user.id
    ).first()
    if not g:
        raise HTTPException(status_code=404, detail="Financial goal not found.")

    db.delete(g)
    db.commit()
    return {"status": "success", "message": "Financial goal deleted successfully."}
