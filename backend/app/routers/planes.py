from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.core.config import ADMIN_IMPORT_TOKEN
from app.services.plan_service import (
    actualizar_plan,
    crear_plan,
    listar_planes,
)


router = APIRouter()


class PlanPayload(BaseModel):
    nombre: str | None = Field(default=None, max_length=120)
    slug: str | None = Field(default=None, max_length=120)
    dias_publicacion: int | None = Field(default=None, ge=1, le=365)
    precio: float | None = Field(default=None, ge=0)
    activo: bool | None = None
    prioridad: int | None = Field(default=None, ge=0)
    es_destacado: bool | None = None
    etiqueta: str | None = Field(default=None, max_length=80)


@router.get("/")
def obtener_planes():
    try:
        return listar_planes(solo_activos=True)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@router.get("/admin/todos")
def obtener_todos_los_planes(
    x_admin_token: str | None = Header(default=None)
):
    validar_admin_token(x_admin_token)

    try:
        return listar_planes(solo_activos=False)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@router.post("/")
def nuevo_plan(
    data: PlanPayload,
    x_admin_token: str | None = Header(default=None)
):
    validar_admin_token(x_admin_token)

    try:
        return crear_plan(data.model_dump())
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@router.patch("/{plan_id}")
def editar_plan(
    plan_id: str,
    data: PlanPayload,
    x_admin_token: str | None = Header(default=None)
):
    validar_admin_token(x_admin_token)

    try:
        return actualizar_plan(plan_id, data.model_dump(exclude_unset=True))
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


def validar_admin_token(x_admin_token: str | None):
    if not ADMIN_IMPORT_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="ADMIN_IMPORT_TOKEN no está configurado en el backend"
        )

    if not x_admin_token or x_admin_token != ADMIN_IMPORT_TOKEN:
        raise HTTPException(status_code=401, detail="No autorizado")
