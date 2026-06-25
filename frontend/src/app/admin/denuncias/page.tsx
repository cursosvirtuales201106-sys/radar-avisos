"use client";

import { FormEvent, useState } from "react";
import {
  darBajaAvisoDesdeDenuncia,
  Denuncia,
  listarDenuncias,
  marcarDenunciaRevisada,
} from "@/services/denuncias";

export default function AdminDenunciasPage() {
  const [adminToken, setAdminToken] = useState("");
  const [estado, setEstado] = useState("pendiente");
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [motivosBaja, setMotivosBaja] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarDenuncias(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();

    setError("");
    setMensaje("");

    if (!adminToken.trim()) {
      setError("Ingresa la clave de administrador.");
      return;
    }

    try {
      setCargando(true);

      const data = await listarDenuncias(adminToken.trim(), estado);

      setDenuncias(data);
    } catch (error) {
      console.error("Error cargando denuncias:", error);

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("No se pudieron cargar las denuncias.");
      }
    } finally {
      setCargando(false);
    }
  }

  async function revisar(id: string) {
    try {
      setError("");
      setMensaje("");

      await marcarDenunciaRevisada(id, adminToken.trim());

      setMensaje("Denuncia marcada como revisada.");
      await cargarDenuncias();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("No se pudo marcar como revisada.");
      }
    }
  }

  async function darBaja(id: string) {
    const motivo = motivosBaja[id]?.trim();

    if (!motivo) {
      setError("Escribe el motivo de baja antes de continuar.");
      return;
    }

    try {
      setError("");
      setMensaje("");

      await darBajaAvisoDesdeDenuncia(
        id,
        motivo,
        adminToken.trim()
      );

      setMensaje("Aviso dado de baja correctamente.");
      await cargarDenuncias();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("No se pudo dar de baja el aviso.");
      }
    }
  }

  return (
    <main className="app">
      <div className="container">
        <section className="hero">
          <div className="badge">Administración</div>

          <h1>Denuncias de avisos</h1>

          <p>
            Revisa reportes de usuarios, marca denuncias como revisadas o da de baja
            avisos problemáticos.
          </p>
        </section>

        <section className="form-section">
          <form className="form-card" onSubmit={cargarDenuncias}>
            <div className="form-grid">
              <label>
                Clave de administrador
                <input
                  type="password"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  placeholder="Clave admin"
                />
              </label>

              <label>
                Estado
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                >
                  <option value="pendiente">Pendientes</option>
                  <option value="revisada">Revisadas</option>
                  <option value="resuelta">Resueltas</option>
                  <option value="todas">Todas</option>
                </select>
              </label>
            </div>

            {error && <div className="alert error">{error}</div>}
            {mensaje && <div className="alert success">{mensaje}</div>}

            <div className="form-actions">
              <a href="/" className="secondary-link">
                Volver al inicio
              </a>

              <button type="submit" disabled={cargando}>
                {cargando ? "Cargando..." : "Cargar denuncias"}
              </button>
            </div>
          </form>

          <div className="admin-list">
            {denuncias.length === 0 ? (
              <div className="empty">
                No hay denuncias cargadas.
              </div>
            ) : (
              denuncias.map((denuncia) => (
                <article className="admin-card" key={denuncia.id}>
                  <div className="admin-card-header">
                    <div>
                      <span className="tag">{denuncia.estado}</span>
                      <h3>{denuncia.aviso?.titulo || "Aviso no encontrado"}</h3>
                    </div>

                    <span className="admin-date">
                      {new Date(denuncia.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="admin-info-grid">
                    <p>
                      <strong>Motivo denuncia:</strong>
                      <br />
                      {denuncia.motivo}
                    </p>

                    <p>
                      <strong>Comentario:</strong>
                      <br />
                      {denuncia.comentario || "Sin comentario"}
                    </p>

                    <p>
                      <strong>Teléfono:</strong>
                      <br />
                      {denuncia.aviso?.telefono || "Sin teléfono"}
                    </p>

                    <p>
                      <strong>Zona:</strong>
                      <br />
                      {denuncia.aviso?.zona || "Sin zona"}
                    </p>

                    <p>
                      <strong>Estado aviso:</strong>
                      <br />
                      {denuncia.aviso?.estado || "Sin estado"}
                    </p>
                  </div>

                  <label className="full baja-field">
                    Motivo de baja
                    <input
                      type="text"
                      value={motivosBaja[denuncia.id] || ""}
                      onChange={(e) =>
                        setMotivosBaja((actual) => ({
                          ...actual,
                          [denuncia.id]: e.target.value,
                        }))
                      }
                      placeholder="Ejemplo: Cliente pidió baja / Aviso falso / Teléfono incorrecto"
                    />
                  </label>

                  <div className="admin-actions">
                    <button
                      type="button"
                      className="modal-secondary"
                      onClick={() => revisar(denuncia.id)}
                    >
                      Marcar revisada
                    </button>

                    <button
                      type="button"
                      className="modal-primary"
                      onClick={() => darBaja(denuncia.id)}
                    >
                      Dar de baja aviso
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}