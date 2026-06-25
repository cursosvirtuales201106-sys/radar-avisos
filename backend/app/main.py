from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import avisos
from app.routers import categorias
from app.routers import importacion
from app.routers import planes
from app.routers import denuncias


app = FastAPI(
    title="Avisos API"
)



app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://TU-DOMINIO-VERCEL.vercel.app",
        "https://TU-DOMINIO.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    avisos.router,
    prefix="/api/avisos",
    tags=["Avisos"]
)


app.include_router(
    categorias.router,
    prefix="/api/categorias",
    tags=["Categorias"]
)


app.include_router(
    importacion.router,
    prefix="/api/importacion",
    tags=["Importación"]
)


app.include_router(
    planes.router,
    prefix="/api/planes",
    tags=["Planes"]
)


app.include_router(
    denuncias.router,
    prefix="/api/denuncias",
    tags=["Denuncias"]
)


@app.get("/")
def root():
    return {
        "status": "ok",
        "app": "Chamba Local API"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }