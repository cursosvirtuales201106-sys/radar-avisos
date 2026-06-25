"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import {
  ImportacionResultado,
  importarAvisosCsv,
} from "@/services/importacion";

export default function ImportarCsvPage() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ImportacionResultado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [adminToken, setAdminToken] = useState("");


  function seleccionarArchivo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;

    setError("");
    setResultado(null);

    if (!file) {
      setArchivo(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setArchivo(null);
      setError("El archivo debe ser CSV.");
      return;
    }

    setArchivo(file);
  }

  async function importar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setResultado(null);

    if (!archivo) {
      setError("Selecciona un archivo CSV.");
      return;
    }

    try {
      setCargando(true);

      if (!adminToken.trim()) {
        setError("Ingresa la clave de administrador.");
        return;
    }

    const data = await importarAvisosCsv(
    archivo,
    adminToken.trim()
    );

      setResultado(data);
    } catch (error) {
      console.error("Error importando CSV:", error);

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("No se pudo importar el CSV.");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="app">
      <div className="container">
        <section className="hero">
          <div className="badge">Administración</div>

          <h1>Importar avisos por CSV</h1>

          <p>
            Sube un archivo CSV con avisos. Debe incluir columnas como categoría,
            aviso, contacto y zona. La zona se usará para el mensaje de WhatsApp.
          </p>
        </section>

        <section className="form-section">
          <form className="form-card" onSubmit={importar}>
            <div className="csv-help">
              <h2>Formato recomendado</h2>

              <pre>
{`categoria,aviso,contacto,zona,observaciones
empleo,Se necesita ayudante de cocina,963710266,Santa Isabel,
servicios,Electricista domiciliario,902799282,San Felipe,
alquileres,Alquilo mini departamento,980168122,Mercado Santa Isabel,`}
              </pre>
            </div>


            <label className="admin-token-field">
                Clave de administrador
                <input
                    type="password"
                    value={adminToken}
                    onChange={(e) => setAdminToken(e.target.value)}
                    placeholder="Ingresa la clave admin"
                />
            </label>


            <label className="upload-box">
              <span>Seleccionar archivo CSV</span>

              <input
                type="file"
                accept=".csv,text/csv"
                onChange={seleccionarArchivo}
              />

              <strong>
                {archivo ? archivo.name : "Ningún archivo seleccionado"}
              </strong>
            </label>

            {error && <div className="alert error">{error}</div>}

            <div className="form-actions">
              <a href="/" className="secondary-link">
                Volver al inicio
              </a>

              <button type="submit" disabled={cargando}>
                {cargando ? "Importando..." : "Importar CSV"}
              </button>
            </div>
          </form>

          {resultado && (
            <div className="import-result">
              <h2>Resultado de importación</h2>

              <div className="result-grid">
                <div>
                  <span>Total filas</span>
                  <strong>{resultado.total_filas}</strong>
                </div>

                <div>
                  <span>Insertados</span>
                  <strong>{resultado.insertados}</strong>
                </div>

                <div>
                  <span>Omitidos</span>
                  <strong>{resultado.omitidos}</strong>
                </div>
              </div>

              {resultado.detalle_omitidos?.length > 0 && (
                <div className="omitidos">
                  <h3>Detalle de omitidos</h3>

                  <div className="omitidos-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Fila</th>
                          <th>Motivo</th>
                        </tr>
                      </thead>

                      <tbody>
                        {resultado.detalle_omitidos.map((item, index) => (
                          <tr key={`omitido-${index}`}>
                            <td>{item.fila}</td>
                            <td>{item.motivo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="result-actions">
                <a href="/" className="publish-button">
                  Ver avisos importados
                </a>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}