from datetime import datetime

from app.database.supabase import supabase


def crear_denuncia(data: dict):
    aviso_id = data.get("aviso_id")
    motivo = data.get("motivo")
    comentario = data.get("comentario")

    if not aviso_id:
        raise ValueError("El aviso es obligatorio")

    if not motivo:
        raise ValueError("El motivo es obligatorio")

    response = (
        supabase
        .table("denuncias_avisos")
        .insert({
            "aviso_id": aviso_id,
            "motivo": motivo,
            "comentario": comentario,
            "estado": "pendiente"
        })
        .execute()
    )

    return response.data


def listar_denuncias(estado: str | None = None):
    query = (
        supabase
        .table("denuncias_avisos")
        .select("*")
    )

    if estado and estado != "todas":
        query = query.eq("estado", estado)

    response = (
        query
        .order("created_at", desc=True)
        .execute()
    )

    denuncias = response.data or []

    aviso_ids = list({
        denuncia.get("aviso_id")
        for denuncia in denuncias
        if denuncia.get("aviso_id")
    })

    mapa_avisos = {}

    if aviso_ids:
        avisos_response = (
            supabase
            .table("avisos")
            .select(
                "id,titulo,descripcion,telefono,whatsapp,zona,distrito,estado,activo,fecha_expiracion,motivo_baja"
            )
            .in_("id", aviso_ids)
            .execute()
        )

        for aviso in avisos_response.data or []:
            mapa_avisos[aviso["id"]] = aviso

    for denuncia in denuncias:
        denuncia["aviso"] = mapa_avisos.get(denuncia.get("aviso_id"))

    return denuncias


def marcar_denuncia_revisada(denuncia_id: str):
    response = (
        supabase
        .table("denuncias_avisos")
        .update({
            "estado": "revisada",
            "accion_admin": "marcada_como_revisada",
            "revisada_at": datetime.utcnow().isoformat()
        })
        .eq("id", denuncia_id)
        .execute()
    )

    return response.data


def dar_baja_aviso_por_denuncia(
    denuncia_id: str,
    motivo_baja: str,
    bajado_por: str = "admin"
):
    if not motivo_baja:
        raise ValueError("El motivo de baja es obligatorio")

    denuncia_response = (
        supabase
        .table("denuncias_avisos")
        .select("*")
        .eq("id", denuncia_id)
        .limit(1)
        .execute()
    )

    if not denuncia_response.data:
        raise ValueError("La denuncia no existe")

    denuncia = denuncia_response.data[0]
    aviso_id = denuncia.get("aviso_id")

    if not aviso_id:
        raise ValueError("La denuncia no tiene aviso asociado")

    baja_response = (
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

    (
        supabase
        .table("denuncias_avisos")
        .update({
            "estado": "resuelta",
            "accion_admin": "aviso_dado_de_baja",
            "revisada_at": datetime.utcnow().isoformat()
        })
        .eq("id", denuncia_id)
        .execute()
    )

    return baja_response.data