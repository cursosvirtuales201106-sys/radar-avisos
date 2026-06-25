const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ListarAvisosParams = {
  page?: number;
  limit?: number;
  texto?: string;
  categoria_slug?: string;
  categoria_id?: string;
  zona?: string;
  orden?: "recientes" | "antiguos" | string;
};

export type CrearAvisoPayload = {
  titulo: string;
  descripcion: string;
  categoria_id: string;
  telefono: string;
  whatsapp: string;
  distrito: string;
  zona: string;
  origen: "manual";
  plan_id?: string;
  pago_estado?: string;
  pago_metodo?: string;
  pago_referencia?: string;
  nombre_contacto?: string;
  creado_por?: string;
};

export async function listarAvisos(params: ListarAvisosParams = {}) {
  const searchParams = new URLSearchParams();

  searchParams.set("page", String(params.page ?? 1));
  searchParams.set("limit", String(params.limit ?? 20));
  searchParams.set("orden", params.orden ?? "recientes");

  if (params.texto) {
    searchParams.set("texto", params.texto);
  }

  if (params.categoria_slug) {
    searchParams.set("categoria_slug", params.categoria_slug);
  }

  if (params.categoria_id) {
    searchParams.set("categoria_id", params.categoria_id);
  }

  if (params.zona) {
    searchParams.set("zona", params.zona);
  }

  const response = await fetch(
    `${API_URL}/api/avisos/?${searchParams.toString()}`,
    {
      cache: "no-store",
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const mensaje =
      data?.detail ||
      data?.message ||
      "No se pudieron cargar los avisos";

    throw new Error(mensaje);
  }

  return data;
}

export async function obtenerAviso(id: string) {
  const response = await fetch(`${API_URL}/api/avisos/${id}`, {
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const mensaje =
      data?.detail ||
      data?.message ||
      "No se pudo cargar el aviso";

    throw new Error(mensaje);
  }

  return data;
}

export async function listarZonas(): Promise<string[]> {
  const response = await fetch(`${API_URL}/api/avisos/zonas/listado`, {
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const mensaje =
      data?.detail ||
      data?.message ||
      "No se pudieron cargar las zonas";

    throw new Error(mensaje);
  }

  return data;
}

export async function crearAviso(
  payload: CrearAvisoPayload,
  adminToken: string
) {
  const response = await fetch(`${API_URL}/api/avisos/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": adminToken,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const mensaje =
      data?.detail ||
      data?.message ||
      "No se pudo crear el aviso";

    throw new Error(mensaje);
  }

  return data;
}
