import math
import re
import unicodedata

from app.database.supabase import supabase


CAMPOS_PLAN = (
    "id,nombre,slug,dias_publicacion,precio,activo,prioridad,es_destacado,etiqueta"
)


def limpiar_texto(valor) -> str:
    if valor is None:
        return ""

    return str(valor).strip()


def normalizar_slug(valor: str) -> str:
    texto = unicodedata.normalize("NFKD", limpiar_texto(valor))
    texto = "".join(caracter for caracter in texto if not unicodedata.combining(caracter))
    texto = texto.lower()
    texto = re.sub(r"[^a-z0-9]+", "-", texto)
    return texto.strip("-")


def convertir_entero(valor, campo: str, minimo: int = 0) -> int:
    try:
        numero = int(valor)
    except (TypeError, ValueError):
        raise ValueError(f"{campo} debe ser un número entero válido")

    if numero < minimo:
        raise ValueError(f"{campo} debe ser mayor o igual a {minimo}")

    return numero


def convertir_decimal(valor, campo: str, minimo: float = 0) -> float:
    try:
        numero = float(valor)
    except (TypeError, ValueError):
        raise ValueError(f"{campo} debe ser un número válido")

    if not math.isfinite(numero) or numero < minimo:
        raise ValueError(f"{campo} debe ser mayor o igual a {minimo}")

    return round(numero, 2)


def listar_planes(solo_activos: bool = True):
    consulta = supabase.table("planes").select(CAMPOS_PLAN)

    if solo_activos:
        consulta = consulta.eq("activo", True)

    response = (
        consulta
        .order("prioridad", desc=False)
        .order("precio", desc=False)
        .execute()
    )

    return response.data or []


def obtener_plan_por_id(plan_id: str):
    response = (
        supabase
        .table("planes")
        .select(CAMPOS_PLAN)
        .eq("id", plan_id)
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    return response.data[0]


def slug_disponible(slug: str, excluir_id: str | None = None) -> bool:
    consulta = (
        supabase
        .table("planes")
        .select("id")
        .eq("slug", slug)
        .limit(2)
    )

    response = consulta.execute()
    encontrados = response.data or []

    if not encontrados:
        return True

    if excluir_id and all(str(item.get("id")) == str(excluir_id) for item in encontrados):
        return True

    return False


def preparar_datos_plan(data: dict, plan_actual: dict | None = None) -> dict:
    es_nuevo = plan_actual is None
    resultado: dict = {}

    if es_nuevo or "nombre" in data:
        nombre = limpiar_texto(data.get("nombre"))
        if not nombre:
            raise ValueError("El nombre del plan es obligatorio")
        resultado["nombre"] = nombre

    if es_nuevo or "slug" in data or ("nombre" in data and not limpiar_texto(data.get("slug"))):
        base_slug = limpiar_texto(data.get("slug")) or resultado.get("nombre") or plan_actual.get("nombre", "")
        slug = normalizar_slug(base_slug)
        if not slug:
            raise ValueError("El slug del plan es obligatorio")
        resultado["slug"] = slug

    if es_nuevo or "dias_publicacion" in data:
        dias = convertir_entero(data.get("dias_publicacion"), "Los días de publicación", 1)
        if dias > 365:
            raise ValueError("Los días de publicación no pueden superar 365")
        resultado["dias_publicacion"] = dias

    if es_nuevo or "precio" in data:
        resultado["precio"] = convertir_decimal(data.get("precio"), "El precio", 0)

    if es_nuevo or "activo" in data:
        valor_activo = data.get("activo")
        if valor_activo is None:
            valor_activo = True if es_nuevo else plan_actual.get("activo", True)
        resultado["activo"] = bool(valor_activo)

    if es_nuevo or "prioridad" in data:
        valor_prioridad = data.get("prioridad")
        if valor_prioridad is None:
            valor_prioridad = 0 if es_nuevo else plan_actual.get("prioridad", 0)
        resultado["prioridad"] = convertir_entero(valor_prioridad, "La prioridad", 0)

    if es_nuevo or "es_destacado" in data:
        valor_destacado = data.get("es_destacado")
        if valor_destacado is None:
            valor_destacado = False if es_nuevo else plan_actual.get("es_destacado", False)
        resultado["es_destacado"] = bool(valor_destacado)

    if es_nuevo or "etiqueta" in data:
        etiqueta = limpiar_texto(data.get("etiqueta"))
        resultado["etiqueta"] = etiqueta or None

    slug_final = resultado.get("slug") or (plan_actual or {}).get("slug")
    if not slug_final:
        raise ValueError("El slug del plan es obligatorio")

    if not slug_disponible(slug_final, excluir_id=(plan_actual or {}).get("id")):
        raise ValueError("Ya existe otro plan con ese slug")

    return resultado


def crear_plan(data: dict):
    plan = preparar_datos_plan(data)

    response = (
        supabase
        .table("planes")
        .insert(plan)
        .execute()
    )

    if not response.data:
        raise ValueError("No se pudo crear el plan")

    return response.data[0]


def actualizar_plan(plan_id: str, data: dict):
    plan_actual = obtener_plan_por_id(plan_id)

    if not plan_actual:
        raise ValueError("El plan no existe")

    cambios = preparar_datos_plan(data, plan_actual)

    if not cambios:
        return plan_actual

    response = (
        supabase
        .table("planes")
        .update(cambios)
        .eq("id", plan_id)
        .execute()
    )

    if not response.data:
        raise ValueError("No se pudo actualizar el plan")

    return response.data[0]
