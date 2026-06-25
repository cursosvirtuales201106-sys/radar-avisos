"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { crearAviso } from "@/services/avisos";
import { Categoria, listarCategorias } from "@/services/categorias";
import {
  darBajaAvisoDesdeDenuncia,
  Denuncia,
  listarDenuncias,
  marcarDenunciaRevisada,
} from "@/services/denuncias";
import {
  ImportacionResultado,
  importarAvisosCsv,
} from "@/services/importacion";
import { Plan, listarPlanes } from "@/services/planes";

type TabAdmin = "manual" | "csv" | "denuncias";

function limpiarTelefono(valor: string) {
  return valor.replace(/\D/g, "");
}

export default function AdminPage() {
  const [tab, setTab] = useState<TabAdmin>("manual");
  const [adminToken, setAdminToken] = useState("");

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  // Publicación manual
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [telefono, setTelefono] = useState("");
  const [zona, setZona] = useState("");
  const [distrito, setDistrito] = useState("No especificado");
  const [planId, setPlanId] = useState("");
  const [nombreContacto, setNombreContacto] = useState("");
  const [pagoMetodo, setPagoMetodo] = useState("yape");
  const [pagoReferencia, setPagoReferencia] = useState("");

  // CSV
  const [archivoCsv, setArchivoCsv] = useState<File | null>(null);
  const [resultadoCsv, setResultadoCsv] =
    useState<ImportacionResultado | null>(null);

  // Denuncias
  const [estadoDenuncia, setEstadoDenuncia] = useState("pendiente");
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [motivosBaja, setMotivosBaja] = useState<Record<string, string>>({});

  useEffect(() => {
    async function cargarDatosBase() {
      try {
        const [categoriasData, planesData] = await Promise.all([
          listarCategorias(),
          listarPlanes(),
        ]);

        setCategorias(categoriasData.filter((item) => item.activo !== false));
        setPlanes(planesData.filter((item) => item.activo !== false));
      } catch (error) {
        console.error("Error cargando datos base:", error);
      }
    }

    cargarDatosBase();
  }, []);

  function limpiarMensajes() {
    setMensaje("");
    setError("");
  }

  function validarToken() {
    if (!adminToken.trim()) {
      setError("Ingresa la clave de administrador.");
      return false;
    }

    return true;
  }

  async function publicarAviso(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    limpiarMensajes();

    if (!validarToken()) return;

    const telefonoLimpio = limpiarTelefono(telefono);

    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }

    if (!descripcion.trim()) {
      setError("La descripción es obligatoria.");
      return;
    }

    if (!categoriaId) {
      setError("Selecciona una categoría.");
      return;
    }

    if (
      !telefonoLimpio ||
      telefonoLimpio.length !== 9 ||
      !telefonoLimpio.startsWith("9")
    ) {
      setError(
        "Ingresa un celular peruano válido de 9 dígitos. Debe empezar con 9."
      );
      return;
    }

    if (!zona.trim()) {
      setError("La zona es obligatoria.");
      return;
    }

    if (!planId) {
      setError("Selecciona un plan.");
      return;
    }

    try {
      setCargando(true);

      await crearAviso(
        {
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          categoria_id: categoriaId,
          telefono: telefonoLimpio,
          whatsapp: telefonoLimpio,
          distrito: distrito.trim() || "No especificado",
          zona: zona.trim(),
          origen: "manual",
          plan_id: planId,
          pago_estado: "pagado",
          pago_metodo: pagoMetodo,
          pago_referencia: pagoReferencia.trim() || undefined,
          nombre_contacto: nombreContacto.trim() || undefined,
          creado_por: "admin",
        },
        adminToken.trim()
      );

      setMensaje("Aviso publicado correctamente.");

      setTitulo("");
      setDescripcion("");
      setCategoriaId("");
      setTelefono("");
      setZona("");
      setDistrito("No especificado");
      setPlanId("");
      setNombreContacto("");
      setPagoMetodo("yape");
      setPagoReferencia("");
    } catch (error) {
      console.error("Error publicando aviso:", error);

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("No se pudo publicar el aviso.");
      }
    } finally {
      setCargando(false);
    }
  }

  function seleccionarCsv(e: ChangeEvent<HTMLInputElement>) {
    limpiarMensajes();
    setResultadoCsv(null);

    const file = e.target.files?.[0] || null;

    if (!file) {
      setArchivoCsv(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setArchivoCsv(null);
      setError("El archivo debe ser CSV.");
      return;
    }

    setArchivoCsv(file);
  }

  async function importarCsv(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    limpiarMensajes();
    setResultadoCsv(null);

    if (!validarToken()) return;

    if (!archivoCsv) {
      setError("Selecciona un archivo CSV.");
      return;
    }

    try {
      setCargando(true);

      const data = await importarAvisosCsv(
        archivoCsv,
        adminToken.trim()
      );

      setResultadoCsv(data);
      setMensaje("CSV procesado correctamente.");
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

  async function cargarDenuncias(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    limpiarMensajes();

    if (!validarToken()) return;

    try {
      setCargando(true);

      const data = await listarDenuncias(
        adminToken.trim(),
        estadoDenuncia
      );

      setDenuncias(data);
      setMensaje("Denuncias cargadas correctamente.");
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

  async function revisarDenuncia(id: string) {
    limpiarMensajes();

    if (!validarToken()) return;

    try {
      setCargando(true);

      await marcarDenunciaRevisada(id, adminToken.trim());

      setMensaje("Denuncia marcada como revisada.");
      await cargarDenuncias();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("No se pudo marcar la denuncia como revisada.");
      }
    } finally {
      setCargando(false);
    }
  }

  async function darBajaDesdeDenuncia(id: string) {
    limpiarMensajes();

    if (!validarToken()) return;

    const motivo = motivosBaja[id]?.trim();

    if (!motivo) {
      setError("Escribe el motivo de baja.");
      return;
    }

    try {
      setCargando(true);

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
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="app">
      <div className="container">
        <section className="hero">
          <div className="badge">Panel administrativo</div>

          <h1>Administración</h1>

          <p>
            Gestiona carga manual, importación CSV y denuncias desde una sola pantalla.
          </p>
        </section>

        <section className="form-section">
          <div className="admin-panel">
            <div className="admin-token-bar">
              <label>
                Clave de administrador
                <input
                  type="password"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  placeholder="Clave admin"
                />
              </label>
            </div>

            <div className="admin-tabs">
              <button
                type="button"
                className={tab === "manual" ? "active" : ""}
                onClick={() => {
                  setTab("manual");
                  limpiarMensajes();
                }}
              >
                Publicar manual
              </button>

              <button
                type="button"
                className={tab === "csv" ? "active" : ""}
                onClick={() => {
                  setTab("csv");
                  limpiarMensajes();
                }}
              >
                Importar CSV
              </button>

              <button
                type="button"
                className={tab === "denuncias" ? "active" : ""}
                onClick={() => {
                  setTab("denuncias");
                  limpiarMensajes();
                }}
              >
                Denuncias
              </button>
            </div>

            {error && <div className="alert error">{error}</div>}
            {mensaje && <div className="alert success">{mensaje}</div>}

            {tab === "manual" && (
              <form className="form-card" onSubmit={publicarAviso}>
                <div className="form-grid">
                  <label>
                    Nombre del contacto
                    <input
                      type="text"
                      value={nombreContacto}
                      onChange={(e) => setNombreContacto(e.target.value)}
                      placeholder="Ejemplo: Juan Pérez"
                    />
                  </label>

                  <label>
                    Teléfono / WhatsApp
                    <input
                      type="text"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Ejemplo: 987654321"
                    />
                  </label>

                  <label>
                    Título del aviso
                    <input
                      type="text"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ejemplo: Se necesita ayudante de cocina"
                    />
                  </label>

                  <label>
                    Categoría
                    <select
                      value={categoriaId}
                      onChange={(e) => setCategoriaId(e.target.value)}
                    >
                      <option value="">Seleccionar categoría</option>

                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Zona
                    <input
                      type="text"
                      value={zona}
                      onChange={(e) => setZona(e.target.value)}
                      placeholder="Ejemplo: San Felipe, Santa Isabel"
                    />
                  </label>

                  <label>
                    Distrito
                    <input
                      type="text"
                      value={distrito}
                      onChange={(e) => setDistrito(e.target.value)}
                      placeholder="Ejemplo: Comas, Carabayllo"
                    />
                  </label>

                  <label>
                    Plan
                    <select
                      value={planId}
                      onChange={(e) => setPlanId(e.target.value)}
                    >
                      <option value="">Seleccionar plan</option>

                      {planes.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.nombre} — S/ {Number(plan.precio).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Método de pago
                    <select
                      value={pagoMetodo}
                      onChange={(e) => setPagoMetodo(e.target.value)}
                    >
                      <option value="yape">Yape</option>
                      <option value="plin">Plin</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="otro">Otro</option>
                    </select>
                  </label>

                  <label className="full">
                    Referencia de pago
                    <input
                      type="text"
                      value={pagoReferencia}
                      onChange={(e) => setPagoReferencia(e.target.value)}
                      placeholder="Código de operación o nota interna"
                    />
                  </label>

                  <label className="full">
                    Descripción
                    <textarea
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      rows={6}
                      placeholder="Contenido completo del aviso"
                    />
                  </label>
                </div>

                <div className="form-actions">
                  <a href="/" className="secondary-link">
                    Volver al inicio
                  </a>

                  <button type="submit" disabled={cargando}>
                    {cargando ? "Publicando..." : "Publicar aviso"}
                  </button>
                </div>
              </form>
            )}

            {tab === "csv" && (
              <form className="form-card" onSubmit={importarCsv}>
                <div className="csv-help">
                  <h2>Formato recomendado</h2>

                  <pre>
{`categoria,aviso,contacto,zona,observaciones
empleo,Se necesita ayudante de cocina,963710266,Santa Isabel,
servicios,Electricista domiciliario,902799282,San Felipe,
alquileres,Alquilo mini departamento,980168122,Mercado Santa Isabel,`}
                  </pre>
                </div>

                <label className="upload-box">
                  <span>Seleccionar archivo CSV</span>

                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={seleccionarCsv}
                  />

                  <strong>
                    {archivoCsv ? archivoCsv.name : "Ningún archivo seleccionado"}
                  </strong>
                </label>

                <div className="form-actions">
                  <a href="/" className="secondary-link">
                    Volver al inicio
                  </a>

                  <button type="submit" disabled={cargando}>
                    {cargando ? "Importando..." : "Importar CSV"}
                  </button>
                </div>

                {resultadoCsv && (
                  <div className="import-result">
                    <h2>Resultado de importación</h2>

                    <div className="result-grid">
                      <div>
                        <span>Total filas</span>
                        <strong>{resultadoCsv.total_filas}</strong>
                      </div>

                      <div>
                        <span>Insertados</span>
                        <strong>{resultadoCsv.insertados}</strong>
                      </div>

                      <div>
                        <span>Omitidos</span>
                        <strong>{resultadoCsv.omitidos}</strong>
                      </div>
                    </div>

                    {resultadoCsv.detalle_omitidos?.length > 0 && (
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
                              {resultadoCsv.detalle_omitidos.map((item, index) => (
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
                  </div>
                )}
              </form>
            )}

            {tab === "denuncias" && (
              <div className="form-card">
                <form onSubmit={cargarDenuncias}>
                  <div className="form-grid">
                    <label>
                      Estado
                      <select
                        value={estadoDenuncia}
                        onChange={(e) => setEstadoDenuncia(e.target.value)}
                      >
                        <option value="pendiente">Pendientes</option>
                        <option value="revisada">Revisadas</option>
                        <option value="resuelta">Resueltas</option>
                        <option value="todas">Todas</option>
                      </select>
                    </label>
                  </div>

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
                            <h3>
                              {denuncia.aviso?.titulo || "Aviso no encontrado"}
                            </h3>
                          </div>

                          <span className="admin-date">
                            {new Date(denuncia.created_at).toLocaleString()}
                          </span>
                        </div>

                        <div className="admin-info-grid">
                          <p>
                            <strong>Motivo:</strong>
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

                        <label className="baja-field">
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
                            placeholder="Ejemplo: Cliente pidió baja / Aviso falso"
                          />
                        </label>

                        <div className="admin-actions">
                          <button
                            type="button"
                            className="modal-secondary"
                            onClick={() => revisarDenuncia(denuncia.id)}
                          >
                            Marcar revisada
                          </button>

                          <button
                            type="button"
                            className="modal-primary"
                            onClick={() => darBajaDesdeDenuncia(denuncia.id)}
                          >
                            Dar de baja aviso
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}