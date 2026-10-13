
/*
 * WAJUME - Motor inicial de traducción
 * Busca coincidencias documentadas en los CSV.
 * No inventa traducciones de palabras desconocidas.
 */

(function () {
  "use strict";

  function normalizar(texto) {
    return String(texto || "")
      .trim()
      .toLocaleLowerCase("es")
      .replace(/[.!?;,]+$/g, "")
      .replace(/\s+/g, " ");
  }

  async function cargarCSV(archivo) {
    const respuesta = await fetch(archivo);
    if (!respuesta.ok) {
      throw new Error("No se pudo cargar " + archivo);
    }

    const texto = await respuesta.text();
    const lineas = texto.replace(/^\uFEFF/, "").split(/\r?\n/);
    return lineas.filter(linea => linea.trim() !== "");
  }

  function separarCSV(linea) {
    const resultado = [];
    let campo = "";
    let comillas = false;

    for (let i = 0; i < linea.length; i++) {
      const caracter = linea[i];

      if (caracter === '"') {
        if (comillas && linea[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          comillas = !comillas;
        }
      } else if (caracter === "," && !comillas) {
        resultado.push(campo.trim());
        campo = "";
      } else {
        campo += caracter;
      }
    }

    resultado.push(campo.trim());
    return resultado;
  }

  function crearIndice(lineas) {
    if (!lineas.length) return new Map();

    const encabezados = separarCSV(lineas[0]).map(normalizar);
    const columnas = [
      ["wamonae", "cuiba", "palabra", "entrada", "wamonae/pi", "forma"],
      ["espanol", "español", "significado", "traduccion", "traducción", "definicion", "definición"]
    ];

    function buscarColumna(opciones, alternativa) {
      for (const opcion of opciones) {
        const indice = encabezados.indexOf(normalizar(opcion));
        if (indice >= 0) return indice;
      }
      return alternativa;
    }

    const colOrigen = buscarColumna(columnas[0], 0);
    const colDestino = buscarColumna(columnas[1], 1);
    const indice = new Map();

    for (const linea of lineas.slice(1)) {
      const campos = separarCSV(linea);
      const origen = (campos[colOrigen] || "").trim();
      const destino = (campos[colDestino] || "").trim();

      if (origen && destino) {
        indice.set(normalizar(origen), destino);
      }
    }

    return indice;
  }

  async function iniciar() {
    const [vocabulario, frases] = await Promise.all([
      cargarCSV("vocabulario_muestra_verificada.csv"),
      cargarCSV("frases_muestra.csv")
    ]);

    const palabras = crearIndice(vocabulario);
    const oraciones = crearIndice(frases);

    window.WajumeMotor = {
      listo: true,

      traducir(texto) {
        const clave = normalizar(texto);

        if (oraciones.has(clave)) {
          return {
            traduccion: oraciones.get(clave),
            estado: "coincidencia exacta"
          };
        }

        if (palabras.has(clave)) {
          return {
            traduccion: palabras.get(clave),
            estado: "coincidencia exacta"
          };
        }

        return {
          traduccion: "",
          estado: "sin coincidencia verificada"
        };
      }
    };
  }

  iniciar().catch(error => {
    window.WajumeMotor = {
      listo: false,
      error: error.message
    };
    console.error("Wajume:", error);
  });
})();
