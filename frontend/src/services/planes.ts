const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Plan = {
  id: string;
  nombre: string;
  slug: string;
  dias_publicacion: number;
  precio: number;
  activo?: boolean;
  prioridad?: number;
  es_destacado?: boolean;
  etiqueta?: string | null;
};

export type PlanPayload = {
  nombre?: string;
  slug?: string;
  dias_publicacion?: number;
  precio?: number;
  activo?: boolean;
  prioridad?: number;
  es_destacado?: boolean;
  etiqueta?: string | null;
};

async function leerRespuesta(response: Response, mensajePorDefecto: string) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const mensaje = data?.detail || data?.message || mensajePorDefecto;
    throw new Error(mensaje);
  }

  return data;
}

export async function listarPlanes(): Promise<Plan[]> {
  const response = await fetch(`${API_URL}/api/planes/`, {
    cache: "no-store",
  });

  return leerRespuesta(response, "No se pudieron cargar los planes");
}

export async function listarPlanesAdmin(adminToken: string): Promise<Plan[]> {
  const response = await fetch(`${API_URL}/api/planes/admin/todos`, {
    cache: "no-store",
    headers: {
      "X-Admin-Token": adminToken,
    },
  });

  return leerRespuesta(response, "No se pudieron cargar los planes");
}

export async function crearPlan(payload: PlanPayload, adminToken: string): Promise<Plan> {
  const response = await fetch(`${API_URL}/api/planes/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": adminToken,
    },
    body: JSON.stringify(payload),
  });

  return leerRespuesta(response, "No se pudo crear el plan");
}

export async function actualizarPlan(
  id: string,
  payload: PlanPayload,
  adminToken: string
): Promise<Plan> {
  const response = await fetch(`${API_URL}/api/planes/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": adminToken,
    },
    body: JSON.stringify(payload),
  });

  return leerRespuesta(response, "No se pudo actualizar el plan");
}
