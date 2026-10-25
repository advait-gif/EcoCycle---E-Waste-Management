"""
File upload endpoint: returns a local file path (dev).
In production, swap for S3/R2 pre-signed URLs.
"""
import os, uuid, shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from app.api.deps import get_current_user
from app.models.models import User
from app.core.config import settings

router = APIRouter(tags=["Uploads"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@router.post("/uploads/file")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, {"code": "INVALID_TYPE", "message": f"File type {file.content_type} is not allowed."})

    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(413, {"code": "FILE_TOO_LARGE", "message": f"File exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit."})

    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "file").suffix
    filename = f"{uuid.uuid4()}{ext}"
    dest = upload_dir / filename
    with open(dest, "wb") as f:
        f.write(contents)

    return {"ok": True, "file_key": str(dest), "url": f"/uploads/{filename}"}
