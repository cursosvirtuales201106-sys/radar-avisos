const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ImportacionOmitida = {
  fila: number;
  motivo: string;
};

export type ImportacionResultado = {
  total_filas: number;
  insertados: number;
  omitidos: number;
  detalle_omitidos: ImportacionOmitida[];
};

export async function importarAvisosCsv(
  file: File,
  adminToken: string
): Promise<ImportacionResultado> {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/importacion/csv`, {
    method: "POST",
    headers: {
      "X-Admin-Token": adminToken,
    },
    body: formData,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const mensaje =
      data?.detail ||
      data?.message ||
      "No se pudo importar el CSV";

    throw new Error(mensaje);
  }

  return data;
}