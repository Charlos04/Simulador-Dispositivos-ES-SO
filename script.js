const workspace = document.getElementById("workspace");
const svg = document.getElementById("connections");
let selectedDevice = null;
let deviceCounter = 0;
const devices = {};
const connections = [];
const interrupcionesSO = [];


const deviceNameCounters = {
  Teclado: 0,
  Mouse: 0,
  USB: 0,
  Bocina: 0,
  Monitor: 0,
  Impresora: 0,
  Computadora: 0,
};

// DRAG & DROP y lógica de interacción
document.querySelectorAll(".device").forEach((device) => {
  device.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("type", e.target.dataset.type);
    e.dataTransfer.setData("imgSrc", e.target.src);
  });
});

workspace.addEventListener("dragover", (e) => {
  e.preventDefault();
});

workspace.addEventListener("drop", (e) => {
  e.preventDefault();
  const type = e.dataTransfer.getData("type");
  const src = e.dataTransfer.getData("imgSrc");

  const DEVICE_OFFSET = 32;

  const TIPOS_VALIDOS = [
    "Teclado",
    "Mouse",
    "USB",
    "Bocina",
    "Monitor",
    "Impresora",
    "Computadora",
  ];
  if (!TIPOS_VALIDOS.includes(type)) {
    alert("Tipo de dispositivo inválido.");
    return;
  }
  const img = document.createElement("img");
  img.src = src;
  img.className = "placed-device";
  const rect = workspace.getBoundingClientRect();
  img.style.left = `${e.clientX - rect.left - DEVICE_OFFSET}px`;
  img.style.top = `${e.clientY - rect.top - DEVICE_OFFSET}px`;
  img.style.position = "absolute";
  img.dataset.id = `dispositivo-${deviceCounter}`;
  img.title = type;

  workspace.appendChild(img);

  let nuevo;
  switch (type) {
    case "Teclado":
      nuevo = new Teclado(img.dataset.id, img);
      break;
    case "Mouse":
      nuevo = new Mouse(img.dataset.id, img);
      break;
    case "USB":
      nuevo = new USB(img.dataset.id, img);
      break;
    case "Bocina":
      nuevo = new Bocina(img.dataset.id, img);
      break;
    case "Monitor":
      nuevo = new Monitor(img.dataset.id, img);
      break;
    case "Impresora":
      nuevo = new Impresora(img.dataset.id, img);
      break;
    case "Computadora":
      nuevo = new Computadora(img.dataset.id, img);
      break;
    default:
      return;
  }

  const nombreDispositivo = type.toLowerCase() + deviceNameCounters[type]++;
  nuevo.nombre = nombreDispositivo;

  devices[img.dataset.id] = nuevo;

  img.addEventListener("click", () => {
    if (!selectedDevice) {
      selectedDevice = nuevo;
      img.style.border = "2px solid blue";
    } else if (selectedDevice !== nuevo) {
      if (!selectedDevice.puedeConectarA(nuevo)) {
        alert("Estos dispositivos no se pueden conectar.");
      } else if (!selectedDevice.conectadoA.includes(nuevo)) {
        drawLine(selectedDevice.elemento, nuevo.elemento);
        selectedDevice.conectarA(nuevo);
        nuevo.conectarA(selectedDevice);
      } else {
        alert("Estos dispositivos ya están conectados.");
      }
      selectedDevice.elemento.style.border = "none";
      selectedDevice = null;
    } else {
      selectedDevice.elemento.style.border = "none";
      selectedDevice = null;
    }
  });

  // Lógica de doble clic
  if (nuevo instanceof Teclado) {
    img.addEventListener("dblclick", () => {
      const texto = prompt("Escribe algo en el teclado:");
      if (texto !== null) {
        nuevo.escribir(texto);
        nuevo.conectadoA.forEach((d) => {
          if (d instanceof Computadora) {
            d.buffer = texto;
            d.conectadoA.forEach((salida) => {
              if (salida instanceof Monitor) {
                salida.agregarOperacion(`Mostrar en pantalla: "${texto}"`);
              } else if (salida instanceof Impresora) {
                salida.agregarOperacion(`Imprimir: "${texto}"`);
              }
            });
          }
        });
      } // ← esta llave faltaba
    });
  }

  if (nuevo instanceof Computadora || nuevo instanceof Monitor) {
    img.addEventListener("dblclick", () => {
      const compu =
        nuevo instanceof Computadora
          ? nuevo
          : nuevo.conectadoA.find((d) => d instanceof Computadora);
      if (compu) {
        compu.mostrarInfoConexiones();
      } else {
        alert("Este dispositivo no está conectado a una computadora.");
      }
    });
  }

  deviceCounter++;
});

function drawLine(fromEl, toEl) {
  const rect1 = fromEl.getBoundingClientRect();
  const rect2 = toEl.getBoundingClientRect();
  const wsRect = workspace.getBoundingClientRect();

  const x1 = rect1.left + rect1.width / 2 - wsRect.left;
  const y1 = rect1.top + rect1.height / 2 - wsRect.top;
  const x2 = rect2.left + rect2.width / 2 - wsRect.left;
  const y2 = rect2.top + rect2.height / 2 - wsRect.top;

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("stroke", "black");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("style", "animation: linePulse 1s ease;");

  connections.push({ from: fromEl.dataset.id, to: toEl.dataset.id, line });
  svg.appendChild(line);
}

class Dispositivo {
  puedeConectarA(otroDispositivo) {
    const conexionesValidas = {
      Teclado: ["Computadora"],
      Mouse: ["Computadora"],
      USB: ["Computadora"],
      Bocina: ["Computadora"],
      Monitor: ["Computadora"],
      Impresora: ["Computadora"],
      Computadora: [
        "Teclado",
        "Mouse",
        "USB",
        "Bocina",
        "Monitor",
        "Impresora",
      ],
    };
    return conexionesValidas[this.constructor.name].includes(
      otroDispositivo.constructor.name
    );
  }
  constructor(id, tipo, elemento) {
    this.id = id;
    this.tipo = tipo;
    this.elemento = elemento;
    //this.nombre = `${this.constructor.name} ${id.split('-')[1]}`;
    this.conectadoA = [];
    this.voltaje = 0;
    this.anchoBanda = 0;
    this.timerReposo = null;
    this.inicializarConsumo();
    this.panelUI = null;
    this.colaOperaciones = [];
    this.procesando = false;
  }

  inicializarConsumo() {
    this.voltaje = this.voltajeReposo();
    this.anchoBanda = this.anchoBandaReposo();
  }

  conectarA(objetivo) {
    if (!this.conectadoA.includes(objetivo)) {
      this.conectadoA.push(objetivo);
    }
  }

  actualizarUI() {
    const panelGlobal = document.getElementById("info-panel");
    if (panelGlobal && this.panelUI === panelGlobal) {
      panelGlobal.innerHTML = this.obtenerInfoInteractiva();
    }
    
  
    if (this.panelUI && this.panelUI.style.display === "block") {
      this.panelUI.innerHTML = this.obtenerInfoInteractiva();
    }
  
    if (this instanceof Teclado) {
      const textarea = this.panelUI?.querySelector("textarea");
      if (textarea) {
        textarea.oninput = () => handleTecladoInput(this.id, textarea.value);
      }
    }

    if (this instanceof USB) {
      const btn = document.getElementById(`btn-leer-${this.id}`);
      if (btn) {
        this.botonLeer = btn;
        if (this.enUso) {
          this.botonLeer.disabled = true;
          if (typeof this.tiempoLecturaRestante === "number" && this.tiempoLecturaRestante > 0) {
            this.botonLeer.textContent = `Leyendo (${this.tiempoLecturaRestante}s)`;
          }
        } else {
          this.botonLeer.disabled = false;
          this.botonLeer.textContent = "Leer USB";
        }
      }
    }
    
    
    
  }

  actualizarValoresSimples() {
    if (this.panelUI && this.panelUI.style.display === "block") {
      const volt = this.panelUI.querySelector(".valor-voltaje");
      const banda = this.panelUI.querySelector(".valor-banda");
      if (volt) volt.textContent = this.voltaje.toFixed(2);
      if (banda) banda.textContent = this.anchoBanda.toFixed(2);
    }
  }
  
  

  obtenerInfoInteractiva() {
    return `
      <strong>${this.nombre}</strong><br>
      Tipo: ${this.tipo}<br>
      ID: ${this.id}<br>
      Voltaje: <span class="valor-voltaje">${this.voltaje.toFixed(2)}</span> V<br>
      Ancho de banda: <span class="valor-banda">${this.anchoBanda.toFixed(2)}</span> Mbps<br>
      <div style="margin-top:10px; padding:10px; border:1px solid #ccc; text-align:left;">
  <ul style="list-style-type: none; padding-left: 10px;">
    ${this.colaOperaciones.map((op, index) => {
      if (index === 0) {
        return `<li>▶ <strong>Actual:</strong> ${op}</li>`;
      } else {
        return `<li>⏳ En espera: ${op}</li>`;
      }
    }).join("")}
  </ul>
</div>
    `;
  }

  agregarOperacion(operacion) {
    this.colaOperaciones.push(operacion);
    // Mostrar UI siempre si se acaba de agregar una operación
    this.actualizarUI();
   
    if (!this.procesando) {
      this.procesarCola();
    }
  }

  procesarCola() {
    if (this.colaOperaciones.length > 0) {
      this.procesando = true;
      const operacionActual = this.colaOperaciones.shift();
  
      this.actualizarUI();
  
      setTimeout(() => {
        this.procesando = false;
        this.actualizarUI(); // Muestra que se completó
        this.procesarCola();
        this.tiempoLecturaRestante = 0; // Reinicia el tiempo de lectura
      }, 2000);
      
    }
  }
  

  reposo() {
    this.voltaje = this.voltajeReposo();
    this.anchoBanda = this.anchoBandaReposo();
    this.actualizarUI();
    this.elemento.classList.remove("active");
    this.elemento.style.filter = "";
  }
  

  voltajeReposo() {
    return 0.1;
  }
  anchoBandaReposo() {
    return 0.1;
  }

  actualizarValoresSimples() {
  if (this.panelUI && this.panelUI.style.display === "block") {
    const volt = this.panelUI.querySelector(".valor-voltaje");
    const banda = this.panelUI.querySelector(".valor-banda");
    if (volt) volt.textContent = this.voltaje.toFixed(2);
    if (banda) banda.textContent = this.anchoBanda.toFixed(2);
  }
}

}

class Teclado extends Dispositivo {
  constructor(id, elemento) {
    super(id, "Entrada", elemento);
    this.textoActual = "";

  }

  obtenerInfoInteractiva() {
    return (
      super.obtenerInfoInteractiva() +
      `
      <textarea id="textarea-${this.id}" rows="2" placeholder="Escribe algo...">${this.textoActual}</textarea>
    `
    );
  }
  

  voltajeReposo() {
    return 0.05;
  }
  anchoBandaReposo() {
    return 0.01;
  }

  escribir(texto) {
    this.textoActual = texto;
    this.voltaje = 0.5;
    this.anchoBanda = 0.2 + Math.min(texto.length * 0.01, 1.5);
  
    const intensidad = Math.min(this.voltaje / 1.5, 1);
    this.elemento.style.filter = `drop-shadow(0 0 ${5 + intensidad * 15}px #00f) brightness(${1 + intensidad * 0.5})`;
    this.elemento.style.transition = "filter 0.3s ease";
    this.elemento.classList.add("active");
  
    clearTimeout(this.timerReposo);
    this.timerReposo = setTimeout(() => this.reposo(), 2000);
  
    this.actualizarValoresSimples();
  
    // 👉 Agregar interrupción simulada
    interrupcionesSO.push({
      id: Date.now(),
      dispositivo: this.nombre,
      tipo: "Entrada de texto",
      prioridad: 3,
      estado: "Pendiente"
    });
  }
  
  
  
  
  
  
}

class Mouse extends Dispositivo {
  constructor(id, elemento) {
    super(id, "Entrada", elemento);
  }

  obtenerInfoInteractiva() {
    return (
      super.obtenerInfoInteractiva() +
      `
      <div style='margin-top:10px;'>
        <button onclick='handleMouseClick("${this.id}", "izquierdo")'>Click Izquierdo</button>
        <button onclick='handleMouseClick("${this.id}", "derecho")'>Click Derecho</button>
      </div>
    `
    );
  }

  voltajeReposo() {
    return 0.07;
  }
  anchoBandaReposo() {
    return 0.02;
  }

  click(tipo) {
    this.voltaje = 0.4;
    this.anchoBanda = 0.4;
    this.actualizarUI();
    this.elemento.classList.add("active");
    clearTimeout(this.timerReposo);
    this.timerReposo = setTimeout(() => this.reposo(), 1000);
  }
}

class USB extends Dispositivo {
  constructor(id, elemento) {
    super(id, "Entrada", elemento);
    this.enUso = false; // Initialize the 'enUso' property
    this.intervaloLectura = null;
    this.botonLeer = null;
  }

  leer() {
    if (this.enUso) {
      this.agregarOperacion("❌ El USB ya está en uso.");
      return;
    }
  
    this.enUso = true;
    this.tiempoLecturaRestante = 10; // inicia contador
    this.agregarOperacion("🔄 Leyendo datos desde el USB...");
  
    this.voltaje = 0.3;
    this.anchoBanda = 0.5;
    this.actualizarUI();
    this.elemento.classList.add("active");
  
    this.intervaloLectura = setInterval(() => {
      this.tiempoLecturaRestante--;
      this.actualizarUI(); // Esto actualiza el texto del botón
    }, 1000);
  
    setTimeout(() => {
      clearInterval(this.intervaloLectura);
      this.intervaloLectura = null;
      this.enUso = false;
      this.tiempoLecturaRestante = 0; // permite que el botón muestre "Leyendo (0s)" antes de reiniciarse
  
      this.agregarOperacion("✅ Lectura completada.");
      this.reposo();
      this.actualizarUI();
    }, 10000);

    if (this.botonLeer) {
      this.botonLeer.disabled = false;
      this.botonLeer.textContent = "Leer USB";
    }
    
  }
  
  

  abrirArchivo() {
    this.enUso = true;
    console.log("Archivo abierto. USB ahora está en uso.");
  }

  cerrarArchivo() {
    this.enUso = false; // Mark the USB as not in use when closing the file
    console.log("Archivo cerrado. USB ya no está en uso.");
  }

  expulsar() {
    if (this.enUso) {
      alert("❌ USB en uso, espere a que se termine de leer.");
      this.agregarOperacion("❌ No se puede expulsar: USB en uso.");
      return; // ⛔ No actualices la UI ni toques el botón
    }
  
    this.agregarOperacion("✅ USB expulsado correctamente.");
    this.voltaje = 0.1;
    this.anchoBanda = 0.1;
    this.actualizarUI(); // ✅ Solo si no está en uso
  }
  
  

  obtenerInfoInteractiva() {
    return (
      super.obtenerInfoInteractiva() +
      `
      <button id='btn-leer-${this.id}'>Leer USB</button>
      <button id='btn-expulsar-${this.id}'>Expulsar USB</button>
    `
    );
  }
}

class Bocina extends Dispositivo {
  constructor(id, elemento) {
    super(id, "Salida", elemento);
  }

  obtenerInfoInteractiva() {
    return (
      super.obtenerInfoInteractiva() +
      `
      <div style='margin-top:10px;'>
        Volumen: <input type='range' min='0' max='100' value='50' onchange='handleVolumen("${this.id}", this.value)'>
      </div>
    `
    );
  }

  voltajeReposo() {
    return 0.1;
  }
  anchoBandaReposo() {
    return 0.1;
  }

  ajustarVolumen(valor) {
    const v = parseInt(valor);
    this.voltaje = 0.1 + (v / 100) * 1.4;
    this.anchoBanda = 0.1 + (v / 100) * 1.9;
    this.actualizarUI();
    this.elemento.classList.add("active");
    clearTimeout(this.timerReposo);
    this.timerReposo = setTimeout(() => this.reposo(), 2000);
  }
}

class Monitor extends Dispositivo {
  constructor(id, elemento) {
    super(id, "Salida", elemento);
  }
  voltajeReposo() {
    return 1.0;
  }
  anchoBandaReposo() {
    return 1.0;
  }
}

class Impresora extends Dispositivo {
  constructor(id, elemento) {
    super(id, "Salida", elemento);
  }
  voltajeReposo() {
    return 0.5;
  }
  anchoBandaReposo() {
    return 0.8;
  }
}

class Computadora extends Dispositivo {
  constructor(id, elemento) {
    super(id, "Procesador", elemento);
  }

  mostrarInfoConexiones() {
    const modal = document.getElementById("modal-monitor");
    const modalBody = document.getElementById("modal-body");
    const closeButton = document.querySelector(".close-button");

    const dispositivos = this.conectadoA;

    let listaHTML = dispositivos
      .map((d, i) => `<li class="tab-item" data-id="${d.id}">${d.nombre}</li>`)
      .join("");

    const panelInfo = dispositivos
      .map(
        (d) => `
        <div id="info-panel-${d.id}" class="info-panel" style="display:none; padding: 10px;"></div>
    `
      )
      .join("");

      modalBody.innerHTML = `
  <div style="margin-bottom:10px;">
    <button id="btn-ver-tabla">Ver tabla de manejadores</button>
    <button id="btn-ver-interrupciones">Ver tabla de interrupciones</button>
  </div>
  <div id="vista-tabs">
    <div style="display:flex">
      <ul class="tab-list" style="width: 40%; text-align:left; border-right: 1px solid #ccc; padding-right: 10px;">
        ${listaHTML}
      </ul>
      <div style="width: 60%; padding-left: 10px;">
        ${panelInfo}
      </div>
    </div>
  </div>
  <div id="vista-tabla" style="display: none;"></div>
  <div id="vista-interrupciones" style="display: none;"></div>
`;

    

    document.querySelectorAll(".tab-item").forEach((item) => {
      item.addEventListener("click", () => {
        const id = item.dataset.id;
        const dispositivo = dispositivos.find((d) => d.id === id);

        if (dispositivo) {
          document
            .querySelectorAll(".info-panel")
            .forEach((p) => (p.style.display = "none"));
          const panelEspecifico = document.getElementById(
            `info-panel-${dispositivo.id}`
          );
          panelEspecifico.style.display = "block";

          // Maintain reference to the panel and original method
          dispositivo.panelUI = panelEspecifico;
          const originalUpdate = dispositivo.actualizarUI.bind(dispositivo);

          // Update both global and modal panels
          dispositivo.actualizarUI = function () {
            originalUpdate();
            if (panelEspecifico && panelEspecifico.style.display === "block") {
              panelEspecifico.innerHTML = this.obtenerInfoInteractiva();
              if (this instanceof Teclado) {
                const textarea = panelEspecifico.querySelector("textarea");
                if (textarea) {
                  textarea.addEventListener("input", () => handleTecladoInput(this.id, textarea.value));
                }
              }
              
          
              // Re-vincular botones si es USB
              if (this instanceof USB) {
                const leerBtn = document.getElementById(`btn-leer-${this.id}`);
                const expulsarBtn = document.getElementById(`btn-expulsar-${this.id}`);
          
                if (leerBtn) leerBtn.addEventListener("click", () => this.leer());
                if (expulsarBtn) expulsarBtn.addEventListener("click", () => this.expulsar());
              }
            }
          };
          

          dispositivo.actualizarUI(); // Initial update
          // Vincula eventos si es un USB
          if (dispositivo instanceof USB) {
            const leerBtn = document.getElementById(`btn-leer-${dispositivo.id}`);
            const expulsarBtn = document.getElementById(`btn-expulsar-${dispositivo.id}`);
          
            if (leerBtn) leerBtn.addEventListener("click", () => dispositivo.leer());
            if (expulsarBtn) expulsarBtn.addEventListener("click", () => dispositivo.expulsar());
          }
          
          
          
        }
      });
    });

    document.getElementById("btn-ver-tabla").addEventListener("click", () => {
      const vistaTabs = document.getElementById("vista-tabs");
      const vistaTabla = document.getElementById("vista-tabla");
      const vistaInterruptores = document.getElementById("vista-interrupciones");
    
      vistaTabs.style.display = "none";
      vistaTabla.style.display = "block";
      vistaInterruptores.style.display = "none";
    
      // 🧩 FALTABA ESTA LÍNEA
      vistaTabla.innerHTML = generarTablaManejadoresHTML();
    
      setTimeout(() => {
        const btnRegresar = document.getElementById("btn-regresar-tabs");
        if (btnRegresar) {
          btnRegresar.addEventListener("click", () => {
            vistaTabla.style.display = "none";
            vistaTabs.style.display = "block";
          });
        }
      }, 0);
    });
    
    

    document.getElementById("btn-ver-interrupciones").addEventListener("click", () => {
      const vistaTabs = document.getElementById("vista-tabs");
      const vistaInterruptores = document.getElementById("vista-interrupciones");
      const vistaTabla = document.getElementById("vista-tabla");
    
      vistaTabs.style.display = "none";
      vistaInterruptores.style.display = "block";
      vistaTabla.style.display = "none";
    
      // 🧩 FALTABA ESTA LÍNEA
      vistaInterruptores.innerHTML = generarTablaInterruptoresHTML();
    
      setTimeout(() => {
        const btnRegresar = document.getElementById("btn-regresar-tabs-interruptores");
        if (btnRegresar) {
          btnRegresar.addEventListener("click", () => {
            vistaInterruptores.style.display = "none";
            vistaTabs.style.display = "block";
          });
        }
      }, 0);
    });
    
    

    modal.classList.remove("hidden");
    closeButton.onclick = () => modal.classList.add("hidden");
    window.onclick = (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    };
  }
}
// Funciones para interacción
function handleTecladoInput(id, value) {
  const dispositivo = devices[id];
  if (dispositivo instanceof Teclado) {
    dispositivo.escribir(value);
    // No actualizamos toda la UI porque ya se está escribiendo en el campo
  }
}


function handleMouseClick(id, tipo) {
  const dispositivo = devices[id];
  if (dispositivo instanceof Mouse) {
    dispositivo.click(tipo);
  }
}

function handleUSBRead(id) {
  const dispositivo = devices[id];
  if (dispositivo instanceof USB) {
    dispositivo.leer();
  }
}

function handleVolumen(id, valor) {
  const dispositivo = devices[id];
  if (dispositivo instanceof Bocina) {
    dispositivo.ajustarVolumen(valor);
  }
}

function mostrarTablaManejadores() {
  const modal = document.getElementById("modal-monitor");
  const modalBody = document.getElementById("modal-body");
  const closeButton = document.querySelector(".close-button");

  // Generar tabla HTML
  let tablaHTML = `
    <h2>Tabla de Manejadores de Dispositivos</h2>
    <table style="width:100%; border-collapse: collapse;" border="1">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Tipo</th>
          <th>Conectado a</th>
        </tr>
      </thead>
      <tbody>
  `;

  Object.values(devices).forEach((d) => {
    const conectados =
      d.conectadoA.map((c) => c.nombre).join(", ") || "Ninguno";
    tablaHTML += `
      <tr>
        <td>${d.id}</td>
        <td>${d.nombre}</td>
        <td>${d.tipo}</td>
        <td>${conectados}</td>
      </tr>
    `;
  });

  tablaHTML += `
      </tbody>
    </table>
  `;

  modalBody.innerHTML = tablaHTML;

  modal.classList.remove("hidden");

  closeButton.onclick = () => modal.classList.add("hidden");
  window.onclick = (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  };
}

function generarTablaManejadoresHTML() {
  let tablaHTML = `
    <h2>Tabla de Manejadores de Dispositivos</h2>
    <button id="btn-regresar-tabs">Regresar a pestañas</button>
    <table style="width:100%; border-collapse: collapse;" border="1">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Tipo</th>
          <th>Conectado a</th>
        </tr>
      </thead>
      <tbody>
  `;

  Object.values(devices).forEach((d) => {
    const conectados =
      d.conectadoA.map((c) => c.nombre).join(", ") || "Ninguno";
    tablaHTML += `
      <tr>
        <td>${d.id}</td>
        <td>${d.nombre}</td>
        <td>${d.tipo}</td>
        <td>${conectados}</td>
      </tr>
    `;
  });

  tablaHTML += `
      </tbody>
    </table>
  `;
  return tablaHTML;
}
function regresarAVistaTabs() {
  document.getElementById("vista-tabla").style.display = "none";
  document.getElementById("vista-tabs").style.display = "block";
}

function generarTablaInterruptoresHTML() {
  return `
    <h2>Tabla de Interrupciones del SO</h2>
    <button id="btn-regresar-tabs-interruptores">Regresar a pestañas</button>
    <div style="max-height: 300px; overflow-y: auto; margin-top: 10px; border: 1px solid #ccc;">
      <table style="width:100%; border-collapse: collapse;" border="1">
        <thead style="position: sticky; top: 0; background-color: #f0f0f0;">
          <tr>
            <th>Nº</th>
            <th>Dispositivo</th>
            <th>Tipo de interrupción</th>
            <th>Prioridad</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${interrupcionesSO.map((intr, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${intr.dispositivo}</td>
              <td>${intr.tipo}</td>
              <td>${intr.prioridad}</td>
              <td>${intr.estado}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

setInterval(() => {
  const pendiente = interrupcionesSO.find(i => i.estado === "Pendiente");
  if (pendiente) {
    pendiente.estado = "Atendida";
  }
}, 3000); // cada 3 segundos atiende una


