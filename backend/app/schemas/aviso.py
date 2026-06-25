from pydantic import BaseModel, Field, field_validator


class AvisoCreate(BaseModel):
    titulo: str = Field(..., min_length=5, max_length=180)
    descripcion: str = Field(..., min_length=10)
    categoria_id: str
    telefono: str = Field(..., min_length=9, max_length=20)
    whatsapp: str | None = None

    distrito: str = "No especificado"
    zona: str = Field(..., min_length=2, max_length=150)
    origen: str = "manual"

    plan_id: str | None = None
    pago_estado: str | None = "pagado"
    pago_metodo: str | None = None
    pago_referencia: str | None = None
    nombre_contacto: str | None = None
    creado_por: str = "admin"

    @field_validator("titulo", "descripcion", "categoria_id", "telefono", "zona")
    @classmethod
    def limpiar_obligatorios(cls, valor: str):
        if not valor or not str(valor).strip():
            raise ValueError("Campo obligatorio vacío")

        return str(valor).strip()

    @field_validator(
        "whatsapp",
        "distrito",
        "origen",
        "plan_id",
        "pago_estado",
        "pago_metodo",
        "pago_referencia",
        "nombre_contacto",
        "creado_por",
        mode="before"
    )
    @classmethod
    def limpiar_opcionales(cls, valor):
        if valor is None:
            return valor

        texto = str(valor).strip()

        if not texto:
            return None

        return texto
