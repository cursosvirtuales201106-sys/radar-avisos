"use client";

import { FormEvent, useEffect, useState } from "react";
import { listarAvisos, listarZonas } from "@/services/avisos";
import { crearDenuncia } from "@/services/denuncias";

type Categoria = {
  id?: string;
  nombre?: string;
  slug?: string;
};

type Aviso = {
  id?: number | string;
  titulo?: string;
  descripcion?: string;
  categoria?: Categoria | string | null;
  categoria_nombre?: string | null;
  categoria_slug?: string | null;
  tipo?: any;
  telefono?: string;
  whatsapp?: string;
  whatsapp_url?: string | null;
  ubicacion?: any;
  distrito?: any;
  zona?: string | null;
  prioridad?: number | null;
  destacado?: boolean | null;
  etiqueta_plan?: string | null;
};

type Meta = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

type Filtros = {
  texto: string;
  categoria_slug: string;
  zona: string;
};

const LIMITE_POR_PAGINA = 20;

const CATEGORIAS = [
  { label: "Todas", slug: "" },
  { label: "Empleo", slug: "empleo" },
  { label: "Servicios", slug: "servicios" },
  { label: "Alquileres", slug: "alquileres" },
  { label: "Ventas", slug: "ventas" },
  { label: "Educación", slug: "educacion" },
  { label: "Transporte", slug: "transporte" },
  { label: "Mascotas", slug: "mascotas" },
  { label: "Otros", slug: "otros" },
];
const HERO_IMAGE_URL = process.env.NEXT_PUBLIC_HERO_IMAGE_URL || "";


function obtenerTexto(valor: any, fallback = "No especificado") {
  if (valor === null || valor === undefined || valor === "") {
    return fallback;
  }

  if (typeof valor === "string" || typeof valor === "number") {
    return String(valor);
  }

  if (typeof valor === "object") {
    return (
      valor.nombre ||
      valor.name ||
      valor.titulo ||
      valor.title ||
      valor.descripcion ||
      valor.description ||
      fallback
    );
  }

  return fallback;
}

function limpiarTelefono(valor: string) {
  return valor.replace(/\D/g, "");
}

function crearWhatsappUrl(aviso: Aviso, titulo: string) {
  if (aviso.whatsapp_url) {
    return aviso.whatsapp_url;
  }

  const telefonoOriginal = aviso.whatsapp || aviso.telefono || "";
  const telefonoLimpio = limpiarTelefono(telefonoOriginal);

  if (!telefonoLimpio) {
    return null;
  }

  const telefonoWhatsapp = telefonoLimpio.startsWith("51")
    ? telefonoLimpio
    : `51${telefonoLimpio}`;

  const zonaAviso = obtenerTexto(aviso.zona, "la zona");

  const mensaje = encodeURIComponent(
    `Hola, vi su aviso '${titulo}' publicado en ${zonaAviso} y deseo más información.`
  );

  return `https://wa.me/${telefonoWhatsapp}?text=${mensaje}`;
}

function normalizarRespuestaAvisos(
  data: any,
  pagina: number
): { avisos: Aviso[]; meta: Meta } {
  const lista: Aviso[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.avisos)
    ? data.avisos
    : Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data?.data?.avisos)
    ? data.data.avisos
    : [];

  const metaApi = data?.meta;

  const meta: Meta = {
    page: Number(metaApi?.page || pagina),
    limit: Number(metaApi?.limit || LIMITE_POR_PAGINA),
    total: Number(metaApi?.total || lista.length),
    total_pages: Number(
      metaApi?.total_pages ||
        Math.max(1, Math.ceil(lista.length / LIMITE_POR_PAGINA))
    ),
  };

  return {
    avisos: lista,
    meta,
  };
}

export default function HomePage() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSlug, setCategoriaSlug] = useState("");
  const [zona, setZona] = useState("");
  const [zonas, setZonas] = useState<string[]>([]);
  const [filtros, setFiltros] = useState<Filtros>({
    texto: "",
    categoria_slug: "",
    zona: "",
  });
  const [page, setPage] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [avisoDenuncia, setAvisoDenuncia] = useState<Aviso | null>(null);
  const [motivoDenuncia, setMotivoDenuncia] = useState("");
  const [comentarioDenuncia, setComentarioDenuncia] = useState("");
  const [enviandoDenuncia, setEnviandoDenuncia] = useState(false);
  const [mensajeDenuncia, setMensajeDenuncia] = useState("");


  useEffect(() => {
    async function cargarZonas() {
      try {
        const data = await listarZonas();

        const zonasValidas = Array.isArray(data)
          ? data.filter((item) => item && String(item).trim())
          : [];

        setZonas(zonasValidas);
      } catch (error) {
        console.error("Error cargando zonas:", error);
        setZonas([]);
      }
    }

    cargarZonas();
  }, []);

  useEffect(() => {
    async function cargarAvisos() {
      try {
        setCargando(true);
        setError("");

        const data: any = await listarAvisos({
          page,
          limit: LIMITE_POR_PAGINA,
          texto: filtros.texto || undefined,
          categoria_slug: filtros.categoria_slug || undefined,
          zona: filtros.zona || undefined,
          orden: "recientes",
        });

        console.log("RESPUESTA API AVISOS:", data);

        const resultado = normalizarRespuestaAvisos(data, page);

        setAvisos(resultado.avisos);
        setMeta(resultado.meta);
      } catch (error) {
        console.error("Error cargando avisos:", error);
        setAvisos([]);
        setMeta(null);
        setError("No se pudieron cargar los avisos.");
      } finally {
        setCargando(false);
      }
    }

    cargarAvisos();
  }, [page, filtros]);

  function buscar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const nuevosFiltros: Filtros = {
      texto: busqueda.trim(),
      categoria_slug: categoriaSlug,
      zona,
    };

    setFiltros(nuevosFiltros);
    setPage(1);
  }

  function limpiarFiltros() {
    setBusqueda("");
    setCategoriaSlug("");
    setZona("");
    setFiltros({
      texto: "",
      categoria_slug: "",
      zona: "",
    });
    setPage(1);
  }

  const totalPaginas = meta?.total_pages || 1;
  const totalAvisos = meta?.total || avisos.length;


  function abrirDenuncia(aviso: Aviso) {
  setAvisoDenuncia(aviso);
  setMotivoDenuncia("");
  setComentarioDenuncia("");
  setMensajeDenuncia("");
}

function cerrarDenuncia() {
  setAvisoDenuncia(null);
  setMotivoDenuncia("");
  setComentarioDenuncia("");
  setMensajeDenuncia("");
}

async function enviarDenuncia() {
  if (!avisoDenuncia?.id) {
    setMensajeDenuncia("No se pudo identificar el aviso.");
    return;
  }

  if (!motivoDenuncia) {
    setMensajeDenuncia("Selecciona un motivo.");
    return;
  }

  try {
    setEnviandoDenuncia(true);
    setMensajeDenuncia("");

    await crearDenuncia({
      aviso_id: String(avisoDenuncia.id),
      motivo: motivoDenuncia,
      comentario: comentarioDenuncia.trim() || undefined,
    });

    setMensajeDenuncia("Denuncia enviada correctamente. La revisaremos pronto.");

    setTimeout(() => {
      cerrarDenuncia();
    }, 1200);
  } catch (error) {
    console.error("Error enviando denuncia:", error);

    if (error instanceof Error) {
      setMensajeDenuncia(error.message);
    } else {
      setMensajeDenuncia("No se pudo enviar la denuncia.");
    }
  } finally {
    setEnviandoDenuncia(false);
  }
}

  return (
    <main className="app">
      <div className="container">
        <section
            className="hero"
            style={
              HERO_IMAGE_URL
                ? {
                    backgroundImage: `
                      linear-gradient(
                        90deg,
                        rgba(15, 23, 42, 0.38),
                        rgba(30, 64, 175, 0.48)
                      ),
                      url(${HERO_IMAGE_URL})
                    `,
                  }
                : undefined
            }
          >
          <div className="badge">Avisos locales</div>

          <div className="hero-top">
            <div>
              <h1>Chamba Local</h1>

              <p>
                Encuentra empleos, servicios, alquileres y oportunidades publicadas
                en tu zona.
              </p>
            </div>

            <div className="hero-actions">
              <a className="publish-button" href="/publicar">
                Publicar mi aviso
              </a>
            </div>
          </div>
          <form className="search-card" onSubmit={buscar}>
            <input
              type="text"
              placeholder="Buscar: cocina, soldador, alquiler..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            <select
              value={categoriaSlug}
              onChange={(e) => setCategoriaSlug(e.target.value)}
            >
              {CATEGORIAS.map((item) => (
                <option key={`categoria-${item.slug || "todas"}`} value={item.slug}>
                  {item.label}
                </option>
              ))}
            </select>

            <select value={zona} onChange={(e) => setZona(e.target.value)}>
              <option value="">Todas las zonas</option>

              {zonas.map((item) => (
                <option key={`zona-${item}`} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button type="submit">Buscar</button>
          </form>
        </section>

        <section className="publication-notice" aria-label="Información para publicar avisos">
          <div>
            <span className="notice-kicker">¿Tienes algo que anunciar?</span>
            <h2>Publica alquileres, trabajos, servicios, ventas y mucho más.</h2>
            <p>
              Elige un plan, realiza el pago previo por Yape y envía tu comprobante
              por WhatsApp. Revisaremos la información antes de publicar tu aviso.
            </p>
          </div>

          <a className="notice-button" href="/publicar">
            Ver planes y publicar
          </a>
        </section>

        <section>
          <div className="section-header">
            <h2>Últimos avisos</h2>
            <p className="count">
              {cargando
                ? "Cargando avisos..."
                : `Mostrando ${avisos.length} de ${totalAvisos} avisos`}
            </p>
          </div>

          {error && <div className="empty">{error}</div>}

          {!cargando && !error && avisos.length === 0 ? (
            <div className="empty">
              No se encontraron avisos con esos filtros.
            </div>
          ) : (
            <div className="grid">
              {avisos.map((aviso, index) => {
                const titulo = obtenerTexto(aviso.titulo, "Aviso sin título");
                const descripcion = obtenerTexto(
                  aviso.descripcion,
                  "Sin descripción disponible."
                );
                const categoriaAviso =
                  aviso.categoria_nombre ||
                  obtenerTexto(aviso.categoria || aviso.tipo);
                const ubicacion = obtenerTexto(
                  aviso.zona || aviso.ubicacion || aviso.distrito
                );

                const telefonoOriginal = aviso.whatsapp || aviso.telefono || "";
                const whatsappUrl = crearWhatsappUrl(aviso, titulo);

                return (
                  <article
                    className={`aviso-card ${aviso.destacado ? "aviso-destacado" : ""} ${
                      aviso.prioridad === 2 ? "aviso-premium" : ""
                  }`}
                    key={`aviso-${aviso.id || index}`}
                  >
                    <div className="aviso-meta">
                    <span className="tag">{categoriaAviso}</span>
                    <span className="tag gray">{ubicacion}</span>

                    {aviso.destacado && (
                      <span className={`tag destacado-${aviso.prioridad || 1}`}>
                        {aviso.etiqueta_plan || "Destacado"}
                      </span>
                    )}
                  </div>

                    <h3>{titulo}</h3>

                    <p>{descripcion}</p>

                    <div className="aviso-footer">
                      <span className="phone">
                        {telefonoOriginal ? telefonoOriginal : "Sin teléfono"}
                      </span>

                      {whatsappUrl && (
                        <a
                          className="whatsapp"
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      )}



                      <button
                        type="button"
                        className="report-button"
                        onClick={() => abrirDenuncia(aviso)}
                      >
                        Denunciar
                    </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {meta && totalPaginas > 1 && (
            <div
              className="pagination"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "12px",
                padding: "32px 0 48px",
              }}
            >
              <button
                type="button"
                disabled={page <= 1 || cargando}
                onClick={() => setPage((actual) => Math.max(1, actual - 1))}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1px solid #d8dee9",
                  background: page <= 1 || cargando ? "#eef2f7" : "#ffffff",
                  cursor: page <= 1 || cargando ? "not-allowed" : "pointer",
                  fontWeight: 700,
                }}
              >
                Anterior
              </button>

              <span
                style={{
                  fontWeight: 700,
                  color: "#475569",
                }}
              >
                Página {meta.page} de {totalPaginas}
              </span>

              <button
                type="button"
                disabled={page >= totalPaginas || cargando}
                onClick={() => setPage((actual) => actual + 1)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1px solid #d8dee9",
                  background:
                    page >= totalPaginas || cargando ? "#eef2f7" : "#ffffff",
                  cursor:
                    page >= totalPaginas || cargando ? "not-allowed" : "pointer",
                  fontWeight: 700,
                }}
              >
                Siguiente
              </button>
            </div>
          )}

          {(filtros.texto || filtros.categoria_slug || filtros.zona) && (
            <div style={{ textAlign: "center", paddingBottom: "40px" }}>
              <button
                type="button"
                onClick={limpiarFiltros}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#2563eb",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </section>
      </div>

      {avisoDenuncia && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Denunciar aviso</h2>

            <p className="modal-description">
              Aviso: <strong>{obtenerTexto(avisoDenuncia.titulo, "Aviso")}</strong>
            </p>

            <label>
              Motivo
              <select
                value={motivoDenuncia}
                onChange={(e) => setMotivoDenuncia(e.target.value)}
              >
                <option value="">Seleccionar motivo</option>
                <option value="Ya no está disponible">Ya no está disponible</option>
                <option value="Teléfono incorrecto">Teléfono incorrecto</option>
                <option value="Aviso falso">Aviso falso</option>
                <option value="Contenido ofensivo">Contenido ofensivo</option>
                <option value="Duplicado">Duplicado</option>
                <option value="Estafa o sospechoso">Estafa o sospechoso</option>
                <option value="Otro">Otro</option>
              </select>
            </label>

            <label>
              Comentario opcional
              <textarea
                value={comentarioDenuncia}
                onChange={(e) => setComentarioDenuncia(e.target.value)}
                placeholder="Agrega más detalles si deseas."
                rows={4}
              />
            </label>

            {mensajeDenuncia && (
              <div className="modal-message">
                {mensajeDenuncia}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="modal-secondary"
                onClick={cerrarDenuncia}
                disabled={enviandoDenuncia}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="modal-primary"
                onClick={enviarDenuncia}
                disabled={enviandoDenuncia}
              >
                {enviandoDenuncia ? "Enviando..." : "Enviar denuncia"}
              </button>
            </div>
          </div>
        </div>
      )}    



    </main>
  );
}
