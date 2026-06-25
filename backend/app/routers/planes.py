from fastapi import APIRouter, HTTPException

from app.services.plan_service import listar_planes


router = APIRouter()


@router.get("/")
def obtener_planes():
    try:
        return listar_planes()

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )
