from fastapi import FastAPI

app = FastAPI(title="ProofVault API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "proofvault-api"}
