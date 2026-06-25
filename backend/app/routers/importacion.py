from fastapi import APIRouter, File, Header, HTTPException, UploadFile

from app.core.config import ADMIN_IMPORT_TOKEN
from app.services.csv_service import importar_csv


router = APIRouter()


def validar_admin_token(x_admin_token: str | None):
    if not ADMIN_IMPORT_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="ADMIN_IMPORT_TOKEN no está configurado en el backend"
        )

    if not x_admin_token or x_admin_token != ADMIN_IMPORT_TOKEN:
        raise HTTPException(
            status_code=401,
            detail="No autorizado para importar CSV"
        )


@router.post("/csv")
async def importar_avisos_csv(
    file: UploadFile = File(...),
    x_admin_token: str | None = Header(default=None)
):
    validar_admin_token(x_admin_token)

    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="El archivo debe ser CSV"
        )

    contenido = await file.read()

    if not contenido:
        raise HTTPException(
            status_code=400,
            detail="El archivo está vacío"
        )

    try:
        resultado = importar_csv(contenido)
        return resultado

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error importando CSV: {str(error)}"
        )