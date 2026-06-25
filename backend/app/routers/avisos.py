from app.schemas.aviso import AvisoCreate
from fastapi import APIRouter, Header, HTTPException, Query
from app.core.config import ADMIN_IMPORT_TOKEN
from pydantic import BaseModel


from app.services.aviso_service import (
    crear_aviso,
    listar_avisos,
    obtener_aviso,
    buscar_avisos,
    listar_zonas,
    dar_baja_aviso
)


class BajaAvisoRequest(BaseModel):
    motivo_baja: str


router = APIRouter()


@router.post("/")
def nuevo_aviso(
    aviso: AvisoCreate,
    x_admin_token: str | None = Header(default=None)
):
    validar_admin_token(x_admin_token)

    try:
        return crear_aviso(
            aviso.model_dump()
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


@router.get("/")
def obtener_todos(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    texto: str | None = None,
    categoria_id: str | None = None,
    categoria_slug: str | None = None,
    zona: str | None = None,
    orden: str = "recientes"
):
    try:
        return listar_avisos(
            page=page,
            limit=limit,
            texto=texto,
            categoria_id=categoria_id,
            categoria_slug=categoria_slug,
            zona=zona,
            orden=orden
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


@router.get("/buscar")
def buscar(
    texto: str
):
    try:
        return buscar_avisos(texto)

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )



@router.get("/zonas/listado")
def obtener_zonas():
    try:
        return listar_zonas()

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )
    



@router.patch("/{id}/dar-baja")
def baja_aviso(
    id: str,
    data: BajaAvisoRequest,
    x_admin_token: str | None = Header(default=None)
):
    validar_admin_token(x_admin_token)

    try:
        return dar_baja_aviso(
            aviso_id=id,
            motivo_baja=data.motivo_baja,
            bajado_por="admin"
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )
    





@router.get("/{id}")
def detalle(
    id: str
):
    try:
        aviso = obtener_aviso(id)

        if not aviso:
            raise HTTPException(
                status_code=404,
                detail="Aviso no encontrado"
            )

        return aviso

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )
    


def validar_admin_token(x_admin_token: str | None):
    if not ADMIN_IMPORT_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="ADMIN_IMPORT_TOKEN no está configurado en el backend"
        )

    if not x_admin_token or x_admin_token != ADMIN_IMPORT_TOKEN:
        raise HTTPException(
            status_code=401,
            detail="No autorizado"
        )