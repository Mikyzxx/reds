"""Almacenamiento de archivos subidos (avatares y adjuntos del chat).

Dos backends intercambiables vía `STORAGE_BACKEND`:

- `local` (default): archivos en `backend/uploads/`, servidos con FileResponse.
  No requiere nada externo; es el modo de desarrollo.
- `s3`: bucket privado de S3 (o compatible: R2, MinIO vía `S3_ENDPOINT_URL`).
  El backend nunca sirve los bytes: responde 307 a una URL presignada GET, así
  las URLs guardadas en BD (`/api/avatars/…`, `/api/files/…`) no cambian y el
  modelo de seguridad se mantiene (uuid no adivinable, bucket sin acceso
  público).

Las "áreas" (avatars/chat) se mapean a subcarpetas en local y a prefijos de
key en S3, con el mismo filename en ambos.
"""

from pathlib import Path
from typing import Protocol
from urllib.parse import quote

from fastapi import HTTPException
from fastapi.responses import FileResponse, RedirectResponse, Response

from .config import (
    AVATAR_DIR,
    AWS_REGION,
    CHAT_DIR,
    S3_BUCKET,
    S3_ENDPOINT_URL,
    S3_PRESIGN_EXPIRES,
    STORAGE_BACKEND,
)

_AREA_DIRS: dict[str, Path] = {"avatars": AVATAR_DIR, "chat": CHAT_DIR}


def _content_disposition(disposition: str, download_name: str | None) -> str:
    if not download_name:
        return disposition
    # RFC 5987: nombre unicode en filename*; fallback ASCII en filename para
    # clientes viejos. El sanitizado previo ya quitó comillas y `;`.
    ascii_name = download_name.encode("ascii", "replace").decode("ascii")
    return (
        f"{disposition}; filename=\"{ascii_name}\"; "
        f"filename*=UTF-8''{quote(download_name)}"
    )


class Storage(Protocol):
    def save(self, area: str, filename: str, data: bytes, content_type: str) -> None: ...

    def delete(self, area: str, filename: str) -> None: ...

    def exists(self, area: str, filename: str) -> bool: ...

    def response(
        self,
        area: str,
        filename: str,
        *,
        download_name: str | None = None,
        disposition: str = "inline",
    ) -> Response: ...


class LocalStorage:
    def save(self, area: str, filename: str, data: bytes, content_type: str) -> None:
        directory = _AREA_DIRS[area]
        directory.mkdir(parents=True, exist_ok=True)
        (directory / filename).write_bytes(data)

    def delete(self, area: str, filename: str) -> None:
        (_AREA_DIRS[area] / filename).unlink(missing_ok=True)

    def exists(self, area: str, filename: str) -> bool:
        return (_AREA_DIRS[area] / filename).is_file()

    def response(
        self,
        area: str,
        filename: str,
        *,
        download_name: str | None = None,
        disposition: str = "inline",
    ) -> Response:
        return FileResponse(
            _AREA_DIRS[area] / filename,
            filename=download_name if disposition == "attachment" else None,
            content_disposition_type=disposition,
        )


class S3Storage:
    def __init__(self) -> None:
        if not S3_BUCKET:
            raise RuntimeError("STORAGE_BACKEND=s3 requiere S3_BUCKET en el entorno")
        import boto3
        from botocore.config import Config

        # MinIO/R2 no siempre soportan virtual-host style sin DNS comodín
        cfg = Config(s3={"addressing_style": "path"}) if S3_ENDPOINT_URL else None
        self._client = boto3.client(
            "s3",
            region_name=AWS_REGION,
            endpoint_url=S3_ENDPOINT_URL,
            config=cfg,
        )

    @staticmethod
    def _key(area: str, filename: str) -> str:
        return f"{area}/{filename}"

    def save(self, area: str, filename: str, data: bytes, content_type: str) -> None:
        from botocore.exceptions import ClientError

        try:
            self._client.put_object(
                Bucket=S3_BUCKET,
                Key=self._key(area, filename),
                Body=data,
                ContentType=content_type,
            )
        except ClientError:
            # Sin detalles AWS hacia el cliente
            raise HTTPException(status_code=503, detail="Almacenamiento no disponible")

    def delete(self, area: str, filename: str) -> None:
        from botocore.exceptions import ClientError

        try:
            self._client.delete_object(Bucket=S3_BUCKET, Key=self._key(area, filename))
        except ClientError:
            pass  # borrado best-effort (mismo espíritu que unlink(missing_ok=True))

    def exists(self, area: str, filename: str) -> bool:
        from botocore.exceptions import ClientError

        try:
            self._client.head_object(Bucket=S3_BUCKET, Key=self._key(area, filename))
            return True
        except ClientError:
            return False

    def response(
        self,
        area: str,
        filename: str,
        *,
        download_name: str | None = None,
        disposition: str = "inline",
    ) -> Response:
        url = self._client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": S3_BUCKET,
                "Key": self._key(area, filename),
                "ResponseContentDisposition": _content_disposition(
                    disposition, download_name
                ),
            },
            ExpiresIn=S3_PRESIGN_EXPIRES,
        )
        # 307 (nunca 301/308: la firma expira). max-age corto para que las
        # <img> no re-pidan en cada render pero la URL cacheada no sobreviva
        # a su firma.
        max_age = min(300, S3_PRESIGN_EXPIRES // 2)
        return RedirectResponse(
            url,
            status_code=307,
            headers={"Cache-Control": f"private, max-age={max_age}"},
        )


storage: Storage = S3Storage() if STORAGE_BACKEND == "s3" else LocalStorage()
