from app.database.supabase import supabase


def listar_planes():
    response = (
        supabase
        .table("planes")
        .select("id,nombre,slug,dias_publicacion,precio,activo,prioridad,es_destacado,etiqueta")
        .eq("activo", True)
        .order("prioridad", desc=False)
        .execute()
    )

    return response.data or []