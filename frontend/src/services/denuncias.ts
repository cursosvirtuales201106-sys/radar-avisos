const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type CrearDenunciaPayload = {
  aviso_id: string;
  motivo: string;
  comentario?: string;
};

export type AvisoDenunciado = {
  id: string;
  titulo?: string;
  descripcion?: string;
  telefono?: string;
  whatsapp?: string;
  zona?: string;
  distrito?: string;
  estado?: string;
  activo?: boolean;
  fecha_expiracion?: string;
  motivo_baja?: string;
};

export type Denuncia = {
  id: string;
  aviso_id: string;
  motivo: string;
  comentario?: string | null;
  estado: string;
  accion_admin?: string | null;
  revisada_at?: string | null;
  created_at: string;
  aviso?: AvisoDenunciado | null;
};

export async function crearDenuncia(payload: CrearDenunciaPayload) {
  const response = await fetch(`${API_URL}/api/denuncias/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.detail || "No se pudo enviar la denuncia");
  }

  return data;
}

export async function listarDenuncias(
  adminToken: string,
  estado: string = "pendiente"
): Promise<Denuncia[]> {
  const response = await fetch(
    `${API_URL}/api/denuncias/?estado=${encodeURIComponent(estado)}`,
    {
      headers: {
        "X-Admin-Token": adminToken,
      },
      cache: "no-store",
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.detail || "No se pudieron cargar las denuncias");
  }

  return data;
}

export async function marcarDenunciaRevisada(
  denunciaId: string,
  adminToken: string
) {
  const response = await fetch(
    `${API_URL}/api/denuncias/${denunciaId}/revisar`,
    {
      method: "PATCH",
      headers: {
        "X-Admin-Token": adminToken,
      },
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.detail || "No se pudo marcar como revisada");
  }

  return data;
}

export async function darBajaAvisoDesdeDenuncia(
  denunciaId: string,
  motivoBaja: string,
  adminToken: string
) {
  const response = await fetch(
    `${API_URL}/api/denuncias/${denunciaId}/dar-baja-aviso`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Token": adminToken,
      },
      body: JSON.stringify({
        motivo_baja: motivoBaja,
      }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.detail || "No se pudo dar de baja el aviso");
  }

  return data;
}