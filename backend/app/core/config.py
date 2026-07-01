from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = (
        "postgresql+psycopg://proofvault:proofvault@localhost:5432/proofvault"
    )
    aws_region: str = "us-east-1"
    s3_bucket_name: str = "proofvault-dev-evidence"
    s3_endpoint_url: str | None = None
    presign_expiration_seconds: int = 900
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    contract_address: str = ""
    chain_id: int = 80002
    amoy_rpc_url: str = "https://polygon-amoy.g.alchemy.com/v2/your_key_here"
    frontend_url: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
