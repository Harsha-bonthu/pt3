from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    password: str


class UserUpdate(BaseModel):
    username: Optional[str]
    password: Optional[str]
    role: Optional[str]


class UserOut(BaseModel):
    id: int
    username: str
    role: Optional[str] = "user"

    class Config:
        orm_mode = True


class ItemCreate(BaseModel):
    title: str
    category: Optional[str] = "general"
    description: Optional[str] = ""


class ItemUpdate(BaseModel):
    title: Optional[str]
    category: Optional[str]
    description: Optional[str]



class ItemOut(BaseModel):
    id: int
    title: str
    category: str
    description: str
    owner_id: int
    created_at: datetime
    file_url: Optional[str] = None

    class Config:
        orm_mode = True


class CommentCreate(BaseModel):
    content: str


class CommentOut(BaseModel):
    id: int
    content: str
    item_id: int
    user_id: int
    created_at: datetime

    class Config:
        orm_mode = True


class AuditOut(BaseModel):
    id: int
    actor: str
    action: str
    target: Optional[str]
    detail: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True


class AuditPage(BaseModel):
    items: List[AuditOut]
    total: int

    class Config:
        orm_mode = True
