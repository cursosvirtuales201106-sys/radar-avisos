from fastapi import APIRouter

from app.schemas.categoria import CategoriaCreate

from app.services.categoria_service import (
    listar_categorias,
    crear_categoria
)

router = APIRouter()


@router.get("/")
def obtener_categorias():

    return listar_categorias()


@router.post("/")
def nueva_categoria(
    categoria: CategoriaCreate
):

    return crear_categoria(
        categoria.model_dump()
    )