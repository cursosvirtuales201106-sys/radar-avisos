const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Categoria = {
  id: string;
  nombre: string;
  slug: string;
  activo?: boolean;
};

export async function listarCategorias(): Promise<Categoria[]> {
  const response = await fetch(`${API_URL}/api/categorias/`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No se pudieron cargar las categorías");
  }

  return response.json();
}