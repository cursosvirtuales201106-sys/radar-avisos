from app.database.supabase import supabase
from app.utils.whatsapp import generar_link

import hashlib
import re
from datetime import datetime, timedelta


DIAS_PUBLICACION_DEFAULT = 30



def dar_baja_aviso(
    aviso_id: str,
    motivo_baja: str,
    bajado_por: str = "admin"
):
    if not motivo_baja:
        raise ValueError("El motivo de baja es obligatorio")

    response = (
        supabase
        .table("avisos")
        .update({
            "activo": False,
            "estado": "dado_de_baja",
            "motivo_baja": motivo_baja,
            "fecha_baja": datetime.utcnow().isoformat(),
            "bajado_por": bajado_por
        })
        .eq("id", aviso_id)
        .execute()
    )

    return response.data


def limpiar_texto(valor) -> str:
    if valor is None:
        return ""

    texto = str(valor).strip()

    if texto.lower() in ["nan", "none", "null"]:
        return ""

    return texto


def normalizar_telefono(telefono: str) -> str:
    solo_numeros = re.sub(r"\D", "", str(telefono))

    if solo_numeros.startswith("51") and len(solo_numeros) >= 11:
        solo_numeros = solo_numeros[2:]

    coincidencia = re.search(r"9\d{8}", solo_numeros)

    if coincidencia:
        return coincidencia.group(0)

    return solo_numeros


def obtener_mapa_categorias() -> dict:
    response = (
        supabase
        .table("categorias")
        .select("id,nombre,slug")
        .execute()
    )

    categorias = response.data or []

    return {
        categoria["id"]: categoria
        for categoria in categorias
    }


def obtener_categoria_id_por_slug(slug: str):
    response = (
        supabase
        .table("categorias")
        .select("id")
        .eq("slug", slug)
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    return response.data[0]["id"]


def categoria_existe(categoria_id: str) -> bool:
    response = (
        supabase
        .table("categorias")
        .select("id")
        .eq("id", categoria_id)
        .limit(1)
        .execute()
    )

    return bool(response.data)


def obtener_plan(plan_id: str | None):
    if not plan_id:
        return None

    response = (
        supabase
        .table("planes")
        .select("id,nombre,slug,dias_publicacion,precio,activo")
        .eq("id", plan_id)
        .eq("activo", True)
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    return response.data[0]


def preparar_aviso(aviso: dict | None, mapa_categorias: dict | None = None):
    if not aviso:
        return aviso

    titulo = aviso.get("titulo") or "Aviso"
    telefono = aviso.get("whatsapp") or aviso.get("telefono") or ""
    zona = aviso.get("zona") or aviso.get("distrito") or "la zona"

    aviso["whatsapp_url"] = generar_link(
        telefono=telefono,
        titulo=titulo,
        zona=zona
    )

    categoria_id = aviso.get("categoria_id")

    if mapa_categorias and categoria_id in mapa_categorias:
        categoria = mapa_categorias[categoria_id]

        aviso["categoria"] = categoria
        aviso["categoria_nombre"] = categoria.get("nombre")
        aviso["categoria_slug"] = categoria.get("slug")
    else:
        aviso["categoria"] = None
        aviso["categoria_nombre"] = None
        aviso["categoria_slug"] = None

    return aviso


def generar_hash_aviso(
    categoria_id: str,
    titulo: str,
    telefono: str,
    descripcion: str,
    zona: str
) -> str:
    base = (
        f"{categoria_id}|"
        f"{telefono}|"
        f"{titulo.lower().strip()}|"
        f"{descripcion.lower().strip()[:180]}|"
        f"{zona.lower().strip()}"
    )

    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def aviso_duplicado(hash_key: str) -> bool:
    response = (
        supabase
        .table("avisos")
        .select("id")
        .eq("hash_key", hash_key)
        .limit(1)
        .execute()
    )

    return bool(response.data)


def crear_aviso(data: dict):
    titulo = limpiar_texto(data.get("titulo"))
    descripcion = limpiar_texto(data.get("descripcion"))
    categoria_id = limpiar_texto(data.get("categoria_id"))
    telefono = normalizar_telefono(data.get("telefono", ""))
    zona = limpiar_texto(data.get("zona"))
    distrito = limpiar_texto(data.get("distrito")) or "No especificado"
    origen = limpiar_texto(data.get("origen")) or "manual"
    plan_id = limpiar_texto(data.get("plan_id")) or None
    pago_estado = limpiar_texto(data.get("pago_estado")) or "pagado"
    pago_metodo = limpiar_texto(data.get("pago_metodo")) or None
    pago_referencia = limpiar_texto(data.get("pago_referencia")) or None
    nombre_contacto = limpiar_texto(data.get("nombre_contacto")) or None
    creado_por = limpiar_texto(data.get("creado_por")) or "admin"

    if not titulo:
        raise ValueError("El título es obligatorio")

    if not descripcion:
        raise ValueError("La descripción es obligatoria")

    if not categoria_id:
        raise ValueError("La categoría es obligatoria")

    if not categoria_existe(categoria_id):
        raise ValueError("La categoría seleccionada no existe")

    if not telefono or len(telefono) != 9 or not telefono.startswith("9"):
        raise ValueError("El teléfono debe ser un celular peruano válido de 9 dígitos")

    if not zona:
        raise ValueError("La zona es obligatoria")

    plan = obtener_plan(plan_id)

    prioridad = int(plan.get("prioridad") or 0) if plan else 0
    destacado = bool(plan.get("es_destacado")) if plan else False
    etiqueta_plan = plan.get("etiqueta") if plan else "Básico"


    if plan_id and not plan:
        raise ValueError("El plan seleccionado no existe o está inactivo")

    dias_publicacion = (
        int(plan["dias_publicacion"])
        if plan
        else DIAS_PUBLICACION_DEFAULT
    )

    fecha_publicacion = datetime.utcnow()
    fecha_expiracion = fecha_publicacion + timedelta(days=dias_publicacion)

    hash_key = generar_hash_aviso(
        categoria_id=categoria_id,
        titulo=titulo,
        telefono=telefono,
        descripcion=descripcion,
        zona=zona
    )

    if aviso_duplicado(hash_key):
        raise ValueError("Este aviso ya existe o parece estar duplicado")

    aviso = {
        "titulo": titulo,
        "descripcion": descripcion,
        "categoria_id": categoria_id,
        "telefono": telefono,
        "whatsapp": telefono,
        "distrito": distrito,
        "zona": zona,
        "origen": origen,
        "hash_key": hash_key,
        "activo": True,
        "estado": "activo",
        "pago_estado": pago_estado,
        "pago_metodo": pago_metodo,
        "pago_referencia": pago_referencia,
        "fecha_publicacion": fecha_publicacion.isoformat(),
        "fecha_expiracion": fecha_expiracion.isoformat(),
        "nombre_contacto": nombre_contacto,
        "creado_por": creado_por,
        "prioridad": prioridad,
        "destacado": destacado,
        "etiqueta_plan": etiqueta_plan,
    }

    if plan_id:
        aviso["plan_id"] = plan_id

    response = (
        supabase
        .table("avisos")
        .insert(aviso)
        .execute()
    )

    mapa_categorias = obtener_mapa_categorias()

    return [
        preparar_aviso(item, mapa_categorias)
        for item in (response.data or [])
    ]


def listar_avisos(
    page: int = 1,
    limit: int = 20,
    texto: str | None = None,
    categoria_id: str | None = None,
    categoria_slug: str | None = None,
    zona: str | None = None,
    orden: str = "recientes"
):
    page = max(page, 1)
    limit = max(1, min(limit, 100))

    texto = limpiar_texto(texto)
    zona = limpiar_texto(zona)
    categoria_id = limpiar_texto(categoria_id)
    categoria_slug = limpiar_texto(categoria_slug)
    ahora = datetime.utcnow().isoformat()

    if categoria_slug and not categoria_id:
        categoria_id = obtener_categoria_id_por_slug(categoria_slug)

        if not categoria_id:
            return {
                "data": [],
                "meta": {
                    "page": page,
                    "limit": limit,
                    "total": 0,
                    "total_pages": 0
                }
            }

    def aplicar_filtros(query):
        query = query.eq("activo", True)
        query = query.eq("estado", "activo")
        query = query.gte("fecha_expiracion", ahora)

        if texto:
            texto_busqueda = texto.replace(",", " ").strip()

            query = query.or_(
                f"titulo.ilike.%{texto_busqueda}%,"
                f"descripcion.ilike.%{texto_busqueda}%,"
                f"telefono.ilike.%{texto_busqueda}%,"
                f"zona.ilike.%{texto_busqueda}%"
            )

        if categoria_id:
            query = query.eq("categoria_id", categoria_id)

        if zona:
            query = query.ilike("zona", f"%{zona}%")

        return query

    count_query = (
        supabase
        .table("avisos")
        .select("id", count="exact")
    )

    count_response = (
        aplicar_filtros(count_query)
        .range(0, 0)
        .execute()
    )

    total = count_response.count or 0

    desc = orden != "antiguos"

    inicio = (page - 1) * limit
    fin = inicio + limit - 1

    query = (
        supabase
        .table("avisos")
        .select("*")
    )

    response = (
        aplicar_filtros(query)
        .order("prioridad", desc=True)
        .order("fecha_publicacion", desc=desc)
        .order("created_at", desc=desc)
        .range(inicio, fin)
        .execute()
    )

    total_pages = (
        (total + limit - 1) // limit
        if total > 0
        else 0
    )

    mapa_categorias = obtener_mapa_categorias()

    return {
        "data": [
            preparar_aviso(aviso, mapa_categorias)
            for aviso in (response.data or [])
        ],
        "meta": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages
        }
    }


def obtener_aviso(id: str):
    ahora = datetime.utcnow().isoformat()

    response = (
        supabase
        .table("avisos")
        .select("*")
        .eq("id", id)
        .eq("activo", True)
        .eq("estado", "activo")
        .gte("fecha_expiracion", ahora)
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    mapa_categorias = obtener_mapa_categorias()

    return preparar_aviso(
        response.data[0],
        mapa_categorias
    )


def buscar_avisos(texto: str):
    return listar_avisos(
        page=1,
        limit=20,
        texto=texto,
        orden="recientes"
    )


def listar_zonas():
    ahora = datetime.utcnow().isoformat()

    response = (
        supabase
        .table("avisos")
        .select("zona")
        .eq("activo", True)
        .eq("estado", "activo")
        .gte("fecha_expiracion", ahora)
        .execute()
    )

    zonas = []

    for item in response.data or []:
        zona = limpiar_texto(item.get("zona"))

        if zona and zona not in zonas:
            zonas.append(zona)

    zonas.sort()

    return zonas
