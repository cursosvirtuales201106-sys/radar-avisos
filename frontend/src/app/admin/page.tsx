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
import {
  actualizarPlan,
  crearPlan,
  Plan,
  PlanPayload,
  listarPlanes,
  listarPlanesAdmin,
} from "@/services/planes";

type TabAdmin = "manual" | "csv" | "denuncias" | "planes";

type PlanFormulario = {
  nombre: string;
  slug: string;
  dias_publicacion: string;
  precio: string;
  activo: boolean;
  prioridad: string;
  es_destacado: boolean;
  etiqueta: string;
};

function crearFormularioPlan(plan?: Plan): PlanFormulario {
  return {
    nombre: plan?.nombre || "",
    slug: plan?.slug || "",
    dias_publicacion: String(plan?.dias_publicacion ?? 10),
    precio: String(plan?.precio ?? 0),
    activo: plan?.activo !== false,
    prioridad: String(plan?.prioridad ?? 0),
    es_destacado: Boolean(plan?.es_destacado),
    etiqueta: plan?.etiqueta || "",
  };
}

function obtenerPayloadPlan(formulario: PlanFormulario): PlanPayload {
  const dias = Number(formulario.dias_publicacion);
  const precio = Number(formulario.precio);
  const prioridad = Number(formulario.prioridad);

  if (!formulario.nombre.trim()) {
    throw new Error("El nombre del plan es obligatorio.");
  }

  if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
    throw new Error("Los días de publicación deben estar entre 1 y 365.");
  }

  if (!Number.isFinite(precio) || precio < 0) {
    throw new Error("Ingresa un precio válido.");
  }

  if (!Number.isInteger(prioridad) || prioridad < 0) {
    throw new Error("La prioridad debe ser un número entero igual o mayor a 0.");
  }

  return {
    nombre: formulario.nombre.trim(),
    slug: formulario.slug.trim(),
    dias_publicacion: dias,
    precio,
    activo: formulario.activo,
    prioridad,
    es_destacado: formulario.es_destacado,
    etiqueta: formulario.etiqueta.trim() || null,
  };
}

function limpiarTelefono(valor: string) {
  return valor.replace(/\D/g, "");
}

export default function AdminPage() {
  const [tab, setTab] = useState<TabAdmin>("manual");
  const [adminToken, setAdminToken] = useState("");

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [planesAdmin, setPlanesAdmin] = useState<Plan[]>([]);
  const [edicionPlanes, setEdicionPlanes] = useState<Record<string, PlanFormulario>>({});
  const [nuevoPlan, setNuevoPlan] = useState<PlanFormulario>(crearFormularioPlan());

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

  async function refrescarPlanesPublicos() {
    const data = await listarPlanes();
    setPlanes(data.filter((item) => item.activo !== false));
  }

  async function cargarPlanesAdministrables() {
    if (!validarToken()) return;

    try {
      setCargando(true);
      const data = await listarPlanesAdmin(adminToken.trim());
      setPlanesAdmin(data);
      setEdicionPlanes(
        data.reduce<Record<string, PlanFormulario>>((acumulado, plan) => {
          acumulado[plan.id] = crearFormularioPlan(plan);
          return acumulado;
        }, {})
      );
    } catch (error) {
      console.error("Error cargando planes:", error);
      setError(error instanceof Error ? error.message : "No se pudieron cargar los planes.");
    } finally {
      setCargando(false);
    }
  }

  function actualizarCampoPlan(
    planId: string,
    campo: keyof PlanFormulario,
    valor: string | boolean
  ) {
    setEdicionPlanes((actual) => ({
      ...actual,
      [planId]: {
        ...(actual[planId] || crearFormularioPlan()),
        [campo]: valor,
      },
    }));
  }

  function actualizarCampoNuevoPlan(
    campo: keyof PlanFormulario,
    valor: string | boolean
  ) {
    setNuevoPlan((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardarPlan(planId: string) {
    limpiarMensajes();

    if (!validarToken()) return;

    const formulario = edicionPlanes[planId];

    if (!formulario) {
      setError("No se encontró la información del plan.");
      return;
    }

    try {
      const payload = obtenerPayloadPlan(formulario);
      setCargando(true);

      await actualizarPlan(planId, payload, adminToken.trim());
      await Promise.all([cargarPlanesAdministrables(), refrescarPlanesPublicos()]);
      setMensaje("Plan actualizado correctamente.");
    } catch (error) {
      console.error("Error actualizando plan:", error);
      setError(error instanceof Error ? error.message : "No se pudo actualizar el plan.");
    } finally {
      setCargando(false);
    }
  }

  async function registrarNuevoPlan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    limpiarMensajes();

    if (!validarToken()) return;

    try {
      const payload = obtenerPayloadPlan(nuevoPlan);
      setCargando(true);

      await crearPlan(payload, adminToken.trim());
      setNuevoPlan(crearFormularioPlan());
      await Promise.all([cargarPlanesAdministrables(), refrescarPlanesPublicos()]);
      setMensaje("Plan creado correctamente.");
    } catch (error) {
      console.error("Error creando plan:", error);
      setError(error instanceof Error ? error.message : "No se pudo crear el plan.");
    } finally {
      setCargando(false);
    }
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

              <button
                type="button"
                className={tab === "planes" ? "active" : ""}
                onClick={() => {
                  setTab("planes");
                  limpiarMensajes();
                  void cargarPlanesAdministrables();
                }}
              >
                Planes y pagos
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

            {tab === "planes" && (
              <section className="plans-admin-section">
                <div className="plans-admin-heading">
                  <div>
                    <span className="notice-kicker">Configuración comercial</span>
                    <h2>Planes de publicación</h2>
                    <p>
                      Edita los precios, días de vigencia, prioridad y visibilidad de los
                      planes que se muestran al público.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="refresh-plans-button"
                    onClick={() => void cargarPlanesAdministrables()}
                    disabled={cargando}
                  >
                    {cargando ? "Actualizando..." : "Actualizar lista"}
                  </button>
                </div>

                <form className="plan-new-card" onSubmit={registrarNuevoPlan}>
                  <div className="form-card-title">
                    <div>
                      <span className="notice-kicker">Nuevo plan</span>
                      <h3>Crear un plan de publicación</h3>
                    </div>
                  </div>

                  <div className="plan-admin-grid">
                    <label>
                      Nombre
                      <input
                        type="text"
                        value={nuevoPlan.nombre}
                        onChange={(e) => actualizarCampoNuevoPlan("nombre", e.target.value)}
                        placeholder="Ejemplo: Premium 30 días"
                      />
                    </label>
                    <label>
                      Slug
                      <input
                        type="text"
                        value={nuevoPlan.slug}
                        onChange={(e) => actualizarCampoNuevoPlan("slug", e.target.value)}
                        placeholder="premium-30-dias"
                      />
                    </label>
                    <label>
                      Días de publicación
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={nuevoPlan.dias_publicacion}
                        onChange={(e) => actualizarCampoNuevoPlan("dias_publicacion", e.target.value)}
                      />
                    </label>
                    <label>
                      Precio (S/)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={nuevoPlan.precio}
                        onChange={(e) => actualizarCampoNuevoPlan("precio", e.target.value)}
                      />
                    </label>
                    <label>
                      Prioridad
                      <input
                        type="number"
                        min="0"
                        value={nuevoPlan.prioridad}
                        onChange={(e) => actualizarCampoNuevoPlan("prioridad", e.target.value)}
                      />
                    </label>
                    <label>
                      Etiqueta opcional
                      <input
                        type="text"
                        value={nuevoPlan.etiqueta}
                        onChange={(e) => actualizarCampoNuevoPlan("etiqueta", e.target.value)}
                        placeholder="Ejemplo: Más elegido"
                      />
                    </label>
                  </div>

                  <div className="plan-admin-checks">
                    <label>
                      <input
                        type="checkbox"
                        checked={nuevoPlan.activo}
                        onChange={(e) => actualizarCampoNuevoPlan("activo", e.target.checked)}
                      />
                      Plan activo y visible al público
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={nuevoPlan.es_destacado}
                        onChange={(e) => actualizarCampoNuevoPlan("es_destacado", e.target.checked)}
                      />
                      Marcar como destacado
                    </label>
                  </div>

                  <div className="plan-admin-actions">
                    <button type="submit" disabled={cargando}>
                      {cargando ? "Guardando..." : "Crear plan"}
                    </button>
                  </div>
                </form>

                <div className="plans-admin-list">
                  {planesAdmin.length === 0 ? (
                    <div className="empty">
                      Ingresa tu clave y pulsa «Actualizar lista» para administrar los planes.
                    </div>
                  ) : (
                    planesAdmin.map((plan) => {
                      const formulario = edicionPlanes[plan.id] || crearFormularioPlan(plan);

                      return (
                        <article className="plan-admin-card" key={plan.id}>
                          <div className="plan-admin-card-header">
                            <div>
                              <span className={`tag ${formulario.activo ? "" : "gray"}`}>
                                {formulario.activo ? "Activo" : "Oculto"}
                              </span>
                              <h3>{plan.nombre}</h3>
                            </div>
                            <button
                              type="button"
                              className="save-plan-button"
                              onClick={() => void guardarPlan(plan.id)}
                              disabled={cargando}
                            >
                              Guardar cambios
                            </button>
                          </div>

                          <div className="plan-admin-grid">
                            <label>
                              Nombre
                              <input
                                type="text"
                                value={formulario.nombre}
                                onChange={(e) => actualizarCampoPlan(plan.id, "nombre", e.target.value)}
                              />
                            </label>
                            <label>
                              Slug
                              <input
                                type="text"
                                value={formulario.slug}
                                onChange={(e) => actualizarCampoPlan(plan.id, "slug", e.target.value)}
                              />
                            </label>
                            <label>
                              Días de publicación
                              <input
                                type="number"
                                min="1"
                                max="365"
                                value={formulario.dias_publicacion}
                                onChange={(e) => actualizarCampoPlan(plan.id, "dias_publicacion", e.target.value)}
                              />
                            </label>
                            <label>
                              Precio (S/)
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formulario.precio}
                                onChange={(e) => actualizarCampoPlan(plan.id, "precio", e.target.value)}
                              />
                            </label>
                            <label>
                              Prioridad
                              <input
                                type="number"
                                min="0"
                                value={formulario.prioridad}
                                onChange={(e) => actualizarCampoPlan(plan.id, "prioridad", e.target.value)}
                              />
                            </label>
                            <label>
                              Etiqueta opcional
                              <input
                                type="text"
                                value={formulario.etiqueta}
                                onChange={(e) => actualizarCampoPlan(plan.id, "etiqueta", e.target.value)}
                                placeholder="Ejemplo: Más elegido"
                              />
                            </label>
                          </div>

                          <div className="plan-admin-checks">
                            <label>
                              <input
                                type="checkbox"
                                checked={formulario.activo}
                                onChange={(e) => actualizarCampoPlan(plan.id, "activo", e.target.checked)}
                              />
                              Plan activo y visible al público
                            </label>
                            <label>
                              <input
                                type="checkbox"
                                checked={formulario.es_destacado}
                                onChange={(e) => actualizarCampoPlan(plan.id, "es_destacado", e.target.checked)}
                              />
                              Marcar como destacado
                            </label>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}