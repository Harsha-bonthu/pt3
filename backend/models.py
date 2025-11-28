from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user", nullable=False)
    items = relationship("Item", back_populates="owner")
    comments = relationship("Comment", back_populates="author")


class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    category = Column(String, index=True, default="general")
    description = Column(String, default="")
    file_path = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    owner = relationship("User", back_populates="items")
    comments = relationship("Comment", back_populates="item")


class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String, nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    item = relationship("Item", back_populates="comments")
    author = relationship("User", back_populates="comments")


class Audit(Base):
    __tablename__ = "audits"
    id = Column(Integer, primary_key=True, index=True)
    actor = Column(String, nullable=False)
    action = Column(String, nullable=False)
    target = Column(String, nullable=True)
    detail = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
