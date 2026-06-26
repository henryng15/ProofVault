from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.files import router as files_router
from app.api.routes.proofs import router as proofs_router
from app.api.routes.verification import router as verification_router
from app.core.config import settings

app = FastAPI(title="ProofVault API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(files_router)
app.include_router(proofs_router)
app.include_router(verification_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "proofvault-api"}
