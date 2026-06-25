from pydantic import BaseModel


class CategoriaCreate(BaseModel):

    nombre: str

    slug: str