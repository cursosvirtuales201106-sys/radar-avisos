"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Categoria, listarCategorias } from "@/services/categorias";
import { Plan, listarPlanes } from "@/services/planes";

const WHATSAPP_NUMBER = "51997051720";
const YAPE_NUMBER = "997051720";
const YAPE_NAME = "Nelson Barrera";

function limpiarTelefono(valor: string) {
  return valor.replace(/\D/g, "");
}

function formatPrice(valor: number | string | undefined) {
  const precio = Number(valor || 0);
  return `S/ ${precio.toFixed(2)}`;
}

export default function PublicarAvisoPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [telefono, setTelefono] = useState("");
  const [zona, setZona] = useState("");
  const [distrito, setDistrito] = useState("");
  const [planId, setPlanId] = useState("");
  const [nombreContacto, setNombreContacto] = useState("");
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarDatos() {
      try {
        setCargandoDatos(true);
        setError("");

        const [categoriasData, planesData] = await Promise.all([
          listarCategorias(),
          listarPlanes(),
        ]);

        setCategorias(categoriasData.filter((item) => item.activo !== false));
        setPlanes(planesData.filter((item) => item.activo !== false));
      } catch (error) {
        console.error("Error cargando datos de publicación:", error);
        setError(
          "No se pudieron cargar los planes o categorías. Intenta nuevamente en unos minutos."
        );
      } finally {
        setCargandoDatos(false);
      }
    }

    cargarDatos();
  }, []);

  const planSeleccionado = useMemo(
    () => planes.find((plan) => plan.id === planId) || null,
    [planId, planes]
  );

  function abrirWhatsapp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const telefonoLimpio = limpiarTelefono(telefono);
    const categoria = categorias.find((item) => item.id === categoriaId);

    if (!planSeleccionado) {
      setError("Selecciona un plan de publicación.");
      return;
    }

    if (!nombreContacto.trim()) {
      setError("Escribe tu nombre o el nombre del contacto.");
      return;
    }

    if (!titulo.trim()) {
      setError("Escribe el título del aviso.");
      return;
    }

    if (!descripcion.trim()) {
      setError("Escribe una breve descripción del aviso.");
      return;
    }

    if (!categoria) {
      setError("Selecciona una categoría.");
      return;
    }

    if (!telefonoLimpio || telefonoLimpio.length !== 9 || !telefonoLimpio.startsWith("9")) {
      setError("Ingresa un celular peruano válido de 9 dígitos.");
      return;
    }

    if (!zona.trim()) {
      setError("Indica la zona donde se publicará el aviso.");
      return;
    }

    const mensaje = [
      "Hola, deseo publicar un aviso en Chamba Local.",
      "",
      `Plan solicitado: ${planSeleccionado.nombre} (${planSeleccionado.dias_publicacion} días) - ${formatPrice(planSeleccionado.precio)}`,
      `Nombre: ${nombreContacto.trim()}`,
      `Teléfono / WhatsApp: ${telefonoLimpio}`,
      `Categoría: ${categoria.nombre}`,
      `Título: ${titulo.trim()}`,
      `Descripción: ${descripcion.trim()}`,
      `Zona: ${zona.trim()}`,
      `Distrito: ${distrito.trim() || "No especificado"}`,
      "",
      `Realicé el pago por Yape a ${YAPE_NAME} (${YAPE_NUMBER}) y adjuntaré mi comprobante para la verificación.`,
    ].join("\n");

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <main className="app">
      <div className="container">
        <section className="hero publicar-hero">
          <div className="badge">Publicación de avisos</div>
          <h1>Haz visible tu aviso en Chamba Local</h1>
          <p>
            Publica ofertas de trabajo, alquileres, servicios, ventas y otros avisos
            locales. El pago es previo por Yape y la publicación se realiza luego de
            verificar tu comprobante.
          </p>
        </section>

        <section className="publication-steps" aria-label="Pasos para publicar">
          <article>
            <span>1</span>
            <div>
              <strong>Elige tu plan</strong>
              <p>Selecciona la duración que mejor se adapte a tu anuncio.</p>
            </div>
          </article>
          <article>
            <span>2</span>
            <div>
              <strong>Realiza el pago por Yape</strong>
              <p>Yapea al número indicado y conserva tu comprobante.</p>
            </div>
          </article>
          <article>
            <span>3</span>
            <div>
              <strong>Envía los datos por WhatsApp</strong>
              <p>Adjunta tu comprobante para que revisemos y publiquemos el aviso.</p>
            </div>
          </article>
        </section>

        <section className="publicar-layout">
          <div className="publicar-main">
            <div className="section-header publicar-heading">
              <div>
                <span className="notice-kicker">Planes disponibles</span>
                <h2>Selecciona cómo deseas publicar</h2>
              </div>
              {cargandoDatos && <p className="count">Cargando planes...</p>}
            </div>

            {error && <div className="alert error">{error}</div>}

            {!cargandoDatos && !error && planes.length === 0 && (
              <div className="empty">No hay planes disponibles en este momento.</div>
            )}

            <div className="plan-public-grid">
              {planes.map((plan) => {
                const seleccionado = plan.id === planId;

                return (
                  <button
                    type="button"
                    className={`plan-public-card ${seleccionado ? "selected" : ""} ${
                      plan.es_destacado ? "featured" : ""
                    }`}
                    key={plan.id}
                    onClick={() => {
                      setPlanId(plan.id);
                      setError("");
                    }}
                    aria-pressed={seleccionado}
                  >
                    {plan.etiqueta && <span className="plan-label">{plan.etiqueta}</span>}
                    <h3>{plan.nombre}</h3>
                    <strong className="plan-price">{formatPrice(plan.precio)}</strong>
                    <span className="plan-duration">
                      {plan.dias_publicacion} días de publicación
                    </span>
                    <span className="plan-select-text">
                      {seleccionado ? "Plan seleccionado" : "Seleccionar plan"}
                    </span>
                  </button>
                );
              })}
            </div>

            <form className="form-card publicar-form" onSubmit={abrirWhatsapp}>
              <div className="form-card-title">
                <div>
                  <span className="notice-kicker">Datos del aviso</span>
                  <h2>Completa tu solicitud</h2>
                </div>
                {planSeleccionado && (
                  <span className="selected-plan-chip">
                    {planSeleccionado.nombre} · {formatPrice(planSeleccionado.precio)}
                  </span>
                )}
              </div>

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
                    type="tel"
                    inputMode="numeric"
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
                    disabled={cargandoDatos}
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
                  Zona del aviso
                  <input
                    type="text"
                    value={zona}
                    onChange={(e) => setZona(e.target.value)}
                    placeholder="Ejemplo: Santa Isabel, San Felipe"
                  />
                </label>

                <label>
                  Distrito
                  <input
                    type="text"
                    value={distrito}
                    onChange={(e) => setDistrito(e.target.value)}
                    placeholder="Ejemplo: Carabayllo, Comas"
                  />
                </label>

                <label className="full">
                  Descripción del aviso
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Escribe los detalles principales: horario, requisitos, precio, características u otra información importante."
                    rows={6}
                  />
                </label>
              </div>

              <div className="form-actions publicar-actions">
                <a href="/" className="secondary-link">
                  Volver al inicio
                </a>
                <button type="submit" disabled={cargandoDatos || planes.length === 0}>
                  Enviar datos y comprobante por WhatsApp
                </button>
              </div>
            </form>
          </div>

          <aside className="payment-sidebar">
            <div className="payment-card">
              <span className="payment-step">Pago previo</span>
              <h2>Realiza el pago por Yape</h2>
              <p>
                Envía el importe del plan seleccionado al siguiente número antes de
                solicitar la publicación.
              </p>

              <div className="payment-person">
                <span>Yape</span>
                <strong>{YAPE_NUMBER}</strong>
                <small>A nombre de {YAPE_NAME}</small>
              </div>

              {planSeleccionado ? (
                <div className="payment-total">
                  <span>Total a pagar</span>
                  <strong>{formatPrice(planSeleccionado.precio)}</strong>
                  <small>{planSeleccionado.nombre}</small>
                </div>
              ) : (
                <div className="payment-total muted">
                  <span>Selecciona un plan</span>
                  <small>El importe aparecerá aquí.</small>
                </div>
              )}

              <p className="payment-note">
                Luego envía el comprobante por WhatsApp junto con los datos de tu
                aviso. No se publica ningún anuncio sin la verificación previa.
              </p>
            </div>

            <div className="contact-qr-card">
              <img
                src="/images/contacto-whatsapp.jpg"
                alt="Código QR para contactar por WhatsApp"
              />
              <div>
                <strong>¿Prefieres escanear?</strong>
                <p>Usa este código QR para abrir el chat de WhatsApp.</p>
              </div>
              <a
                className="whatsapp-contact-button"
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noreferrer"
              >
                Escribir por WhatsApp
              </a>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
