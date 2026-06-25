import hashlib
import re
from io import BytesIO

import pandas as pd

from app.database.supabase import supabase


def limpiar_texto(valor) -> str:
    if valor is None:
        return ""

    texto = str(valor).strip()

    if texto.lower() in ["nan", "none", "null"]:
        return ""

    return texto


def normalizar_slug_categoria(categoria: str) -> str:
    categoria = limpiar_texto(categoria).lower()

    reemplazos = {
        "empleo": "empleo",
        "empleos": "empleo",
        "trabajo": "empleo",
        "trabajos": "empleo",

        "servicio": "servicios",
        "servicios": "servicios",

        "alquiler": "alquileres",
        "alquileres": "alquileres",

        "venta": "ventas",
        "ventas": "ventas",

        "educacion": "educacion",
        "educación": "educacion",

        "transporte": "transporte",
        "mascota": "mascotas",
        "mascotas": "mascotas",
    }

    return reemplazos.get(categoria, "otros")


def extraer_primer_telefono(texto: str) -> str:
    texto = limpiar_texto(texto)

    numeros = re.findall(r"\d+", texto)
    unido = "".join(numeros)

    if unido.startswith("51") and len(unido) >= 11:
        unido = unido[2:]

    posibles = re.findall(r"9\d{8}", unido)

    if posibles:
        return posibles[0]

    return ""


def crear_titulo(descripcion: str) -> str:
    descripcion = limpiar_texto(descripcion)

    if not descripcion:
        return "Aviso sin título"

    titulo = descripcion[:80].strip()

    if len(descripcion) > 80:
        titulo += "..."

    return titulo


def generar_hash(categoria_slug: str, titulo: str, telefono: str, descripcion: str) -> str:
    base = f"{categoria_slug}|{telefono}|{titulo.lower()}|{descripcion.lower()[:150]}"

    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def obtener_mapa_categorias() -> dict:
    response = (
        supabase
        .table("categorias")
        .select("id, slug")
        .execute()
    )

    categorias = response.data or []

    return {
        categoria["slug"]: categoria["id"]
        for categoria in categorias
    }


def hash_ya_existe(hash_key: str) -> bool:
    response = (
        supabase
        .table("avisos")
        .select("id")
        .eq("hash_key", hash_key)
        .limit(1)
        .execute()
    )

    return bool(response.data)


def leer_csv(file_bytes: bytes):
    encodings = [
        "utf-8-sig",
        "utf-8",
        "cp1252",
        "latin-1"
    ]

    ultimo_error = None

    for encoding in encodings:
        try:
            return pd.read_csv(
                BytesIO(file_bytes),
                encoding=encoding,
                sep=None,
                engine="python"
            ).fillna("")

        except UnicodeDecodeError as error:
            ultimo_error = error

    raise ValueError(
        f"No se pudo leer el CSV con UTF-8, CP1252 ni Latin-1: {ultimo_error}"
    )


def importar_csv(file_bytes: bytes):
    df = leer_csv(file_bytes)

    df.columns = [
        columna.strip().lower()
        for columna in df.columns
    ]

    mapa_categorias = obtener_mapa_categorias()

    insertados = []
    omitidos = []

    for index, row in df.iterrows():
        categoria_original = limpiar_texto(row.get("categoria", "otros"))
        categoria_slug = normalizar_slug_categoria(categoria_original)
        categoria_id = mapa_categorias.get(categoria_slug)

        zona = limpiar_texto(
            row.get("zona", "")
            or row.get("mercado", "")
            or row.get("lugar", "")
            or row.get("fuente", "")
        )

        if not zona:
            zona = "No especificada"
        
        if not categoria_id:
            omitidos.append({
                "fila": index + 2,
                "motivo": f"No existe la categoría: {categoria_slug}"
            })
            continue

        descripcion = limpiar_texto(
            row.get("descripcion", "")
            or row.get("aviso", "")
        )

        titulo = limpiar_texto(
            row.get("titulo", "")
        )

        if not titulo:
            titulo = crear_titulo(descripcion)

        contacto_original = limpiar_texto(
            row.get("contacto", "")
            or row.get("telefono", "")
            or row.get("whatsapp", "")
        )

        telefono = extraer_primer_telefono(contacto_original)

        distrito = limpiar_texto(row.get("distrito", ""))

        if not distrito:
            distrito = "No especificado"

        if not descripcion:
            omitidos.append({
                "fila": index + 2,
                "motivo": "Descripción vacía"
            })
            continue

        if not telefono:
            omitidos.append({
                "fila": index + 2,
                "motivo": "Teléfono inválido o no encontrado"
            })
            continue

        hash_key = generar_hash(
            categoria_slug=categoria_slug,
            titulo=titulo,
            telefono=telefono,
            descripcion=descripcion
        )

        if hash_ya_existe(hash_key):
            omitidos.append({
                "fila": index + 2,
                "motivo": "Aviso duplicado"
            })
            continue

        aviso = {
            "titulo": titulo,
            "descripcion": descripcion,
            "categoria_id": categoria_id,
            "telefono": telefono,
            "whatsapp": telefono,
            "contacto_original": contacto_original,
            "distrito": distrito,
            "origen": "csv",
            "hash_key": hash_key,
            "zona": zona,
            "activo": True
        }

        response = (
            supabase
            .table("avisos")
            .insert(aviso)
            .execute()
        )

        if response.data:
            insertados.append(response.data[0])
        else:
            omitidos.append({
                "fila": index + 2,
                "motivo": "No se pudo insertar"
            })

    return {
        "total_filas": len(df),
        "insertados": len(insertados),
        "omitidos": len(omitidos),
        "detalle_omitidos": omitidos
    }