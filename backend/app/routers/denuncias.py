from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from app.core.config import ADMIN_IMPORT_TOKEN
from app.services.denuncia_service import (
    crear_denuncia,
    dar_baja_aviso_por_denuncia,
    listar_denuncias,
    marcar_denuncia_revisada,
)


router = APIRouter()


class DenunciaCreate(BaseModel):
    aviso_id: str
    motivo: str
    comentario: str | None = None


class BajaAvisoDenunciaRequest(BaseModel):
    motivo_baja: str


def validar_admin_token(x_admin_token: str | None):
    if not ADMIN_IMPORT_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="ADMIN_IMPORT_TOKEN no está configurado"
        )

    if not x_admin_token or x_admin_token != ADMIN_IMPORT_TOKEN:
        raise HTTPException(
            status_code=401,
            detail="No autorizado"
        )


@router.post("/")
def denunciar_aviso(denuncia: DenunciaCreate):
    try:
        return crear_denuncia(denuncia.model_dump())

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@router.get("/")
def obtener_denuncias(
    estado: str | None = Query(default="pendiente"),
    x_admin_token: str | None = Header(default=None)
):
    validar_admin_token(x_admin_token)

    try:
        return listar_denuncias(estado)

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@router.patch("/{id}/revisar")
def revisar_denuncia(
    id: str,
    x_admin_token: str | None = Header(default=None)
):
    validar_admin_token(x_admin_token)

    try:
        return marcar_denuncia_revisada(id)

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@router.patch("/{id}/dar-baja-aviso")
def baja_aviso_denunciado(
    id: str,
    data: BajaAvisoDenunciaRequest,
    x_admin_token: str | None = Header(default=None)
):
    validar_admin_token(x_admin_token)

    try:
        return dar_baja_aviso_por_denuncia(
            denuncia_id=id,
            motivo_baja=data.motivo_baja,
            bajado_por="admin"
        )

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))