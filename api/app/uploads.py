import os
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime

upload_router = APIRouter(prefix="/upload", tags=["upload"])

BASE_DIR = Path("/var/www/html/peticoes/uploads")

@upload_router.post("")
async def upload_file(file: UploadFile = File(...)):
    # Valida extensão básica
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido")

    # Gera caminho /YYYY/MM/DD/
    today = datetime.utcnow()
    dest_dir = BASE_DIR / today.strftime("%Y") / today.strftime("%m") / today.strftime("%d")
    dest_dir.mkdir(parents=True, exist_ok=True)

    # Nome único
    safe_name = file.filename.replace("/", "_").replace("\\", "_")
    ts = int(today.timestamp())
    dest_path = dest_dir / f"{ts}_{safe_name}"

    with open(dest_path, "wb") as f:
        f.write(await file.read())

    # URL pública (via Nginx alias /peticoes/uploads/)
    rel = dest_path.relative_to(BASE_DIR)
    file_url = f"/peticoes/uploads/{rel.as_posix()}"

    return JSONResponse({
        "file_url": file_url,
        "filename": dest_path.name,
        "size": dest_path.stat().st_size
    })
