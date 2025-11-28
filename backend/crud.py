from sqlalchemy.orm import Session
from . import models
from .auth import get_password_hash, verify_password, create_access_token


def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def create_user(db: Session, username: str, password: str, role: str = "user"):
    hashed = get_password_hash(password)
    user = models.User(username=username, hashed_password=hashed, role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_item_for_user(db: Session, owner_id: int, title: str, category: str = "general", description: str = ""):
    item = models.Item(title=title, category=category, description=description, owner_id=owner_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def list_items_for_user(db: Session, owner_id: int):
    return db.query(models.Item).filter(models.Item.owner_id == owner_id).order_by(models.Item.created_at.desc()).all()


def stats_items_by_category(db: Session, owner_id: int):
    from sqlalchemy import func
    rows = db.query(models.Item.category, func.count(models.Item.id)).filter(models.Item.owner_id == owner_id).group_by(models.Item.category).all()
    return {row[0]: row[1] for row in rows}


def update_item(db: Session, item_id: int, owner_id: int, **fields):
    item = db.query(models.Item).filter(models.Item.id == item_id, models.Item.owner_id == owner_id).first()
    if not item:
        return None
    for k, v in fields.items():
        if hasattr(item, k) and v is not None:
            setattr(item, k, v)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def delete_item(db: Session, item_id: int, owner_id: int):
    item = db.query(models.Item).filter(models.Item.id == item_id, models.Item.owner_id == owner_id).first()
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True


def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def set_item_file_path(db: Session, item_id: int, owner_id: int, path: str):
    item = db.query(models.Item).filter(models.Item.id == item_id, models.Item.owner_id == owner_id).first()
    if not item:
        return None
    item.file_path = path
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def create_comment(db: Session, user_id: int, item_id: int, content: str):
    comment = models.Comment(content=content, item_id=item_id, user_id=user_id)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def list_comments_for_item(db: Session, item_id: int):
    return db.query(models.Comment).filter(models.Comment.item_id == item_id).order_by(models.Comment.created_at.asc()).all()


def list_all_users(db: Session):
    return db.query(models.User).order_by(models.User.id.asc()).all()


def update_user_role(db: Session, user_id: int, role: str):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return None
    user.role = role
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
