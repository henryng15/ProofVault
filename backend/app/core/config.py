from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = (
        "postgresql+psycopg://proofvault:proofvault@localhost:5432/proofvault"
    )
    aws_region: str = "us-east-1"
    s3_bucket_name: str = "proofvault-dev-evidence"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
