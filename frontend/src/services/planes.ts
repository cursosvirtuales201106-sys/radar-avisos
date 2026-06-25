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
  etiqueta?: string;
};

export async function listarPlanes(): Promise<Plan[]> {
  const response = await fetch(`${API_URL}/api/planes/`, {
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const mensaje =
      data?.detail ||
      data?.message ||
      "No se pudieron cargar los planes";

    throw new Error(mensaje);
  }

  return data;
}
