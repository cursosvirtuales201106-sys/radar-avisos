"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { crearAviso } from "@/services/avisos";
import { Categoria, listarCategorias } from "@/services/categorias";
import { Plan, listarPlanes } from "@/services/planes";

function limpiarTelefono(valor: string) {
  return valor.replace(/\D/g, "");
}

export default function PublicarAvisoPage() {
  const router = useRouter();

  const [adminToken, setAdminToken] = useState("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);

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

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarDatos() {
      try {
        const [categoriasData, planesData] = await Promise.all([
          listarCategorias(),
          listarPlanes(),
        ]);

        setCategorias(categoriasData.filter((item) => item.activo !== false));
        setPlanes(planesData.filter((item) => item.activo !== false));
      } catch (error) {
        console.error("Error cargando datos:", error);
        setCategorias([]);
        setPlanes([]);
      }
    }

    cargarDatos();
  }, []);

  async function publicar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMensaje("");
    setError("");

    const telefonoLimpio = limpiarTelefono(telefono);

    if (!adminToken.trim()) {
      setError("Ingresa la clave de administrador.");
      return;
    }

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

    if (!telefonoLimpio || telefonoLimpio.length !== 9 || !telefonoLimpio.startsWith("9")) {
      setError("Ingresa un celular peruano válido de 9 dígitos. Debe empezar con 9.");
      return;
    }

    if (!zona.trim() || zona.trim().length < 2) {
      setError("La zona es obligatoria. Ejemplo: Santa Isabel, San Felipe, Tungasuca.");
      return;
    }

    if (!planId) {
      setError("Selecciona un plan de publicación.");
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

      setTimeout(() => {
        router.push("/");
      }, 1000);
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

  return (
    <main className="app">
      <div className="container">
        <section className="hero">
          <div className="badge">Administración</div>

          <h1>Publicar aviso</h1>

          <p>
            Publicación manual administrada. Primero verifica el pago por Yape,
            Plin u otro medio; luego selecciona el plan para calcular la vigencia.
          </p>
        </section>

        <section className="form-section">
          <form className="form-card" onSubmit={publicar}>
            <div className="form-grid">
              <label className="full">
                Clave de administrador
                <input
                  type="password"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  placeholder="Clave admin"
                />
              </label>

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
                Zona del aviso
                <input
                  type="text"
                  value={zona}
                  onChange={(e) => setZona(e.target.value)}
                  placeholder="Ejemplo: Santa Isabel, San Felipe, Tungasuca"
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

              <label>
                Plan de publicación
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
                  placeholder="Código de operación, número de comprobante o nota interna"
                />
              </label>

              <label className="full">
                Descripción
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Escribe el contenido completo del aviso."
                  rows={6}
                />
              </label>
            </div>

            {error && <div className="alert error">{error}</div>}
            {mensaje && <div className="alert success">{mensaje}</div>}

            <div className="form-actions">
              <a href="/" className="secondary-link">
                Volver al inicio
              </a>

              <button type="submit" disabled={cargando}>
                {cargando ? "Publicando..." : "Publicar aviso"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
