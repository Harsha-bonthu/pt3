import os
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Query, Path, status, UploadFile, File
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional

from . import database, models, schemas, crud, auth

load_dotenv()

app = FastAPI(title="PT-3 Fullstack Demo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

database.init_db()

app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "..", "frontend")), name="static")
# Serve uploaded files
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/", response_class=HTMLResponse)
def index():
    path = os.path.join(os.path.dirname(__file__), "..", "frontend", "index.html")
    with open(path, "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())


@app.post("/api/register", response_model=schemas.UserOut)
def register(user_in: schemas.UserCreate, db: Session = Depends(auth.get_db)):
    existing = crud.get_user_by_username(db, user_in.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    user = crud.create_user(db, user_in.username, user_in.password)
    return user


@app.post("/api/login")
def login(user_in: schemas.UserCreate, db: Session = Depends(auth.get_db)):
    user = crud.authenticate_user(db, user_in.username, user_in.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token = auth.create_access_token({"sub": user.username})
    refresh_token = auth.create_refresh_token({"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}


@app.get("/api/items", response_model=list[schemas.ItemOut])
def list_items(q: Optional[str] = Query(None, description="search query for title"), limit: int = Query(100, ge=1, le=1000), offset: int = Query(0, ge=0), current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(auth.get_db)):
    items = crud.list_items_for_user(db, current_user.id)
    if q:
        items = [it for it in items if q.lower() in (it.title or "").lower()]
    return items[offset: offset + limit]


@app.post("/api/items", response_model=schemas.ItemOut)
def add_item(item: schemas.ItemCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(auth.get_db)):
    it = crud.create_item_for_user(db, current_user.id, item.title, item.category, item.description)
    # attach file_url if present
    file_url = None
    if it.file_path:
        file_url = f"/uploads/{os.path.basename(it.file_path)}"
    return {**schemas.ItemOut.from_orm(it).dict(), "file_url": file_url}


@app.put("/api/items/{item_id}", response_model=schemas.ItemOut)
def update_item(item_id: int = Path(..., ge=1), item: schemas.ItemCreate = None, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(auth.get_db)):
    updated = crud.update_item(db, item_id, current_user.id, title=item.title if item else None, category=item.category if item else None, description=item.description if item else None)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    file_url = f"/uploads/{os.path.basename(updated.file_path)}" if updated.file_path else None
    return {**schemas.ItemOut.from_orm(updated).dict(), "file_url": file_url}


@app.delete("/api/items/{item_id}")
def delete_item(item_id: int = Path(..., ge=1), current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(auth.get_db)):
    ok = crud.delete_item(db, item_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return {"ok": True}



@app.post("/api/items/{item_id}/upload-multipart", response_model=schemas.ItemOut)
async def upload_multipart(item_id: int, file: UploadFile = File(...), current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(auth.get_db)):
    # save file to uploads dir
    filename = f"{item_id}_{int(__import__('time').time())}_{file.filename}"
    dest = os.path.join(UPLOAD_DIR, filename)
    import aiofiles
    async with aiofiles.open(dest, 'wb') as out:
        content = await file.read()
        await out.write(content)
    updated = crud.set_item_file_path(db, item_id, current_user.id, dest)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    file_url = f"/uploads/{os.path.basename(dest)}"
    return {**schemas.ItemOut.from_orm(updated).dict(), "file_url": file_url}


@app.post("/api/items/{item_id}/comments", response_model=schemas.CommentOut)
def add_comment(item_id: int, payload: schemas.CommentCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(auth.get_db)):
    # ensure item exists
    it = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not it:
        raise HTTPException(status_code=404, detail="Item not found")
    c = crud.create_comment(db, current_user.id, item_id, payload.content)
    return c


@app.get("/api/items/{item_id}/comments", response_model=list[schemas.CommentOut])
def list_comments(item_id: int, db: Session = Depends(auth.get_db)):
    return crud.list_comments_for_item(db, item_id)


@app.get("/api/admin/users", response_model=list[schemas.UserOut])
def admin_list_users(admin_user: models.User = Depends(auth.require_role('admin')), db: Session = Depends(auth.get_db)):
    return crud.list_all_users(db)


@app.put("/api/admin/users/{user_id}", response_model=schemas.UserOut)
def admin_update_user(user_id: int, payload: schemas.UserUpdate, admin_user: models.User = Depends(auth.require_role('admin')), db: Session = Depends(auth.get_db)):
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    updated = user
    if payload.role:
        updated = crud.update_user_role(db, user_id, payload.role)
    if payload.username:
        updated.username = payload.username
        db.add(updated)
        db.commit()
        db.refresh(updated)
    # record audit
    try:
        crud.create_audit(db, actor=admin_user.username, action='update_user', target=str(user_id), detail=f'role={payload.role}')
    except Exception:
        pass
    return updated


@app.get("/api/admin/audit")
def admin_list_audit(q: Optional[str] = Query(None), limit: int = Query(50, ge=1, le=500), offset: int = Query(0, ge=0), admin_user: models.User = Depends(auth.require_role('admin')), db: Session = Depends(auth.get_db)):
    result = crud.list_audits(db, q=q, limit=limit, offset=offset)
    # convert ORM objects to dicts via schemas
    items = [schemas.AuditOut.from_orm(a).dict() for a in result['items']]
    return {"items": items, "total": result['total']}


@app.get("/api/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@app.post("/api/refresh")
def refresh_token(refresh: dict):
    token = refresh.get("refresh_token")
    if not token:
        raise HTTPException(status_code=400, detail="Missing refresh_token")
    try:
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        new_access = auth.create_access_token({"sub": username})
        return {"access_token": new_access, "token_type": "bearer"}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@app.get("/api/stats")
def stats(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(auth.get_db)):
    return crud.stats_items_by_category(db, current_user.id)
