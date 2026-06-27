import boto3
from botocore.client import BaseClient

from app.core.config import settings


class StorageService:
    def __init__(self) -> None:
        self._client: BaseClient | None = None

    @property
    def client(self) -> BaseClient:
        if self._client is None:
            self._client = boto3.client(
                "s3",
                region_name=settings.aws_region,
                endpoint_url=settings.s3_endpoint_url,
            )
        return self._client

    def create_upload_url(self, object_key: str, mime_type: str) -> str:
        return self.client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.s3_bucket_name,
                "Key": object_key,
                "ContentType": mime_type,
            },
            ExpiresIn=settings.presign_expiration_seconds,
        )


storage_service = StorageService()
