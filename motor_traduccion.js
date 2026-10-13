
/* WAJUME — Motor inicial bidireccional */
(function () {
  "use strict";

  function normalizar(texto) {
    return String(texto || "")
      .trim()
      .toLocaleLowerCase("es")
      .replace(/[.!?;,]+$/g, "")
      .replace(/\s+/g, " ");
  }

  function separarCSV(linea) {
    const campos = [];
    let campo = "";
    let comillas = false;

    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];

      if (c === '"') {
        if (comillas && linea[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          comillas = !comillas;
        }
      } else if (c === "," && !comillas) {
        campos.push(campo.trim());
        campo = "";
      } else {
        campo += c;
      }
    }

    campos.push(campo.trim());
    return campos;
  }

  async function cargarCSV(archivo) {
    const respuesta = await fetch(archivo);
    if (!respuesta.ok) {
      throw new Error("No se pudo cargar " + archivo);
    }

    const texto = (await respuesta.text()).replace(/^\uFEFF/, "");
    const lineas = texto.split(/\r?\n/).filter(l => l.trim());

    if (lineas.length < 2) {
      throw new Error("El archivo está vacío: " + archivo);
    }

    const encabezados = separarCSV(lineas[0]).map(normalizar);
    const colW = encabezados.indexOf("wamonae");
    const colE = encabezados.indexOf("espanol");

    if (colW < 0 || colE < 0) {
      throw new Error(
        "Se esperaban las columnas wamonae y espanol en " + archivo
      );
    }

    return lineas.slice(1).map(linea => {
      const c = separarCSV(linea);
      return {
        wamonae: (c[colW] || "").trim(),
        espanol: (c[colE] || "").trim()
      };
    }).filter(f => f.wamonae && f.espanol);
  }

  function buscarCoincidencias(registros, texto, direccion) {
    const clave = normalizar(texto);
    const resultado = [];

    for (const fila of registros) {
      const origen = direccion === "wamonae-espanol"
        ? fila.wamonae
        : fila.espanol;

      const destino = direccion === "wamonae-espanol"
        ? fila.espanol
        : fila.wamonae;

      if (normalizar(origen) === clave &&
          !resultado.includes(destino)) {
        resultado.push(destino);
      }
    }

    return resultado;
  }

  async function iniciar() {
    const [vocabulario, frases] = await Promise.all([
      cargarCSV("vocabulario_muestra_verificada.csv"),
      cargarCSV("frases_muestra.csv")
    ]);

    window.WajumeMotor = {
      listo: true,

      traducir(texto, direccion) {
        const sentido = direccion || "wamonae-espanol";

        if (
          sentido !== "wamonae-espanol" &&
          sentido !== "espanol-wamonae"
        ) {
          return {
            traducciones: [],
            estado: "direccion no válida"
          };
        }

        const resultadosFrases = buscarCoincidencias(
          frases, texto, sentido
        );

        const resultadosPalabras = buscarCoincidencias(
          vocabulario, texto, sentido
        );

        const resultados = resultadosFrases.length
          ? resultadosFrases
          : resultadosPalabras;

        return {
          traducciones: resultados,
          estado: resultados.length
            ? "coincidencia exacta"
            : "sin coincidencia verificada"
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
