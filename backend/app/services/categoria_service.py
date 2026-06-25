from app.database.supabase import supabase


def listar_categorias():

    response = (
        supabase
        .table("categorias")
        .select("*")
        .order("nombre")
        .execute()
    )

    return response.data


def crear_categoria(data):

    response = (
        supabase
        .table("categorias")
        .insert(data)
        .execute()
    )

    return response.data