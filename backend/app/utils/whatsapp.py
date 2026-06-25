import re
from urllib.parse import quote


def normalizar_telefono_peru(telefono: str) -> str | None:
    if not telefono:
        return None

    solo_numeros = re.sub(r"\D", "", str(telefono))

    if solo_numeros.startswith("51") and len(solo_numeros) == 11:
        return solo_numeros

    if len(solo_numeros) == 9 and solo_numeros.startswith("9"):
        return f"51{solo_numeros}"

    coincidencia = re.search(r"9\d{8}", solo_numeros)

    if coincidencia:
        return f"51{coincidencia.group(0)}"

    return None


def generar_link(
    telefono: str,
    titulo: str,
    zona: str = "la zona"
) -> str | None:
    telefono_normalizado = normalizar_telefono_peru(telefono)

    if not telefono_normalizado:
        return None

    zona_limpia = zona.strip() if zona else "la zona"

    mensaje = (
        f"Hola, vi su aviso '{titulo}' "
        f"publicado en {zona_limpia} y deseo más información."
    )

    return (
        f"https://wa.me/{telefono_normalizado}"
        f"?text={quote(mensaje)}"
    )