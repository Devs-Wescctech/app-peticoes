import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.petitions import router as petitions_router
from app.signatures import router as signatures_router
from app.uploads import upload_router  # <<-- usa uploads.py

root_path = os.getenv("API_ROOT_PATH", "")

app = FastAPI(
    title="Peticoes API",
    version="1.0.0",
    root_path=root_path,
)

# CORS básico (ajuste origens se quiser travar mais)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["health"])
def health():
    return {"ok": True, "service": "peticoes-api"}

# inclui routers das features
app.include_router(petitions_router)
app.include_router(signatures_router)
app.include_router(upload_router)
