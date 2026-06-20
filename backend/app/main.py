from fastapi import FastAPI

from app.api.routes.proofs import router as proofs_router

app = FastAPI(title="ProofVault API")
app.include_router(proofs_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "proofvault-api"}
