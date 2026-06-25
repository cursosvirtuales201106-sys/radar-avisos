export type Categoria = {
  id: string;
  nombre: string;
  slug: string;
};

export type Aviso = {
  id: string;
  titulo: string;
  descripcion: string;
  contenido?: string;
  url?: string;
  fecha?: string;
  telefono: string;
  whatsapp: string;
  distrito: string;
  origen: string;
  created_at: string;
  updated_at?: string;
  categoria: Categoria | null;
  categoria_nombre: string | null;
  categoria_slug: string | null;
  whatsapp_url: string | null;
  [key: string]: unknown;
};

export type AvisosMeta = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  totalPages?: number;
  [key: string]: unknown;
};

export type AvisosResponse = {
  data: Aviso[];
  meta: AvisosMeta;
};