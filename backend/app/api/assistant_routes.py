from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User
from ..schemas import AssistantChatRequest, AssistantChatResponse
from ..auth import get_current_user
from ..services.assistant_service import answer_assistant_question

router = APIRouter(prefix="/assistant", tags=["AI Financial Assistant"])


@router.post("/chat", response_model=AssistantChatResponse)
def chat_with_assistant(
    req: AssistantChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return answer_assistant_question(db, current_user, req.question)
