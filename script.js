const workspace = document.getElementById('workspace');
const svg = document.getElementById('connections');
let selectedDevice = null;
let deviceCounter = 0;
const devices = {};
const connections = [];

// DRAG & DROP y lógica de interacción
document.querySelectorAll('.device').forEach(device => {
  device.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('type', e.target.dataset.type);
    e.dataTransfer.setData('imgSrc', e.target.src);
  });
});

workspace.addEventListener('dragover', (e) => {
  e.preventDefault();
});

workspace.addEventListener('drop', (e) => {
  e.preventDefault();
  const type = e.dataTransfer.getData('type');
  const src = e.dataTransfer.getData('imgSrc');

  const DEVICE_OFFSET = 32;

  const TIPOS_VALIDOS = ["Teclado", "Mouse", "USB", "Bocina", "Monitor", "Impresora", "Computadora"];
  if (!TIPOS_VALIDOS.includes(type)) {
    alert("Tipo de dispositivo inválido.");
    return;
  }
  const img = document.createElement('img');
  img.src = src;
  img.className = 'placed-device';
  const rect = workspace.getBoundingClientRect();
  img.style.left = `${e.clientX - rect.left - DEVICE_OFFSET}px`;
  img.style.top = `${e.clientY - rect.top - DEVICE_OFFSET}px`;
  img.style.position = 'absolute';
  img.dataset.id = `dispositivo-${deviceCounter}`;
  img.title = type;

  workspace.appendChild(img);

  let nuevo;
  switch (type) {
    case "Teclado": nuevo = new Teclado(img.dataset.id, img); break;
    case "Mouse": nuevo = new Mouse(img.dataset.id, img); break;
    case "USB": nuevo = new USB(img.dataset.id, img); break;
    case "Bocina": nuevo = new Bocina(img.dataset.id, img); break;
    case "Monitor": nuevo = new Monitor(img.dataset.id, img); break;
    case "Impresora": nuevo = new Impresora(img.dataset.id, img); break;
    case "Computadora": nuevo = new Computadora(img.dataset.id, img); break;
    default: return;
  }

  devices[img.dataset.id] = nuevo;
  

  img.addEventListener('click', () => {
    if (!selectedDevice) {
      selectedDevice = nuevo;
      img.style.border = '2px solid blue';
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
      selectedDevice.elemento.style.border = 'none';
      selectedDevice = null;
    } else {
      selectedDevice.elemento.style.border = 'none';
      selectedDevice = null;
    }
  });

  // Lógica de doble clic
if (nuevo instanceof Teclado) {
  img.addEventListener('dblclick', () => {
    const texto = prompt("Escribe algo en el teclado:");
    if (texto !== null) {
      nuevo.escribir(texto);
      nuevo.conectadoA.forEach(d => {
        if (d instanceof Computadora) {
          d.buffer = texto;
          d.conectadoA.forEach(salida => {
            if (salida instanceof Monitor) {
              salida.agregarOperacion(`Mostrar en pantalla: "${texto}"`);
            } else if (salida instanceof Impresora) {
              salida.agregarOperacion(`Imprimir: "${texto}"`);
            }
          });
        }
      });
    }  // ← esta llave faltaba
  });
}


  if (nuevo instanceof Computadora || nuevo instanceof Monitor) {
    img.addEventListener('dblclick', () => {
      const compu = nuevo instanceof Computadora ? nuevo : nuevo.conectadoA.find(d => d instanceof Computadora);
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
      "Teclado": ["Computadora"],
      "Mouse": ["Computadora"],
      "USB": ["Computadora"],
      "Bocina": ["Computadora"],
      "Monitor": ["Computadora"],
      "Impresora": ["Computadora"],
      "Computadora": ["Teclado", "Mouse", "USB", "Bocina", "Monitor", "Impresora"]
    };
    return conexionesValidas[this.constructor.name].includes(otroDispositivo.constructor.name);
  }
  constructor(id, tipo, elemento) {
    this.id = id;
    this.tipo = tipo;
    this.elemento = elemento;
    this.nombre = `${this.constructor.name} ${id.split('-')[1]}`;
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
    // Actualizar panel principal si existe
    const panelGlobal = document.getElementById("info-panel");
    if (panelGlobal && this.panelUI === panelGlobal) {
        panelGlobal.innerHTML = this.obtenerInfoInteractiva();
    }
    
    // Actualizar panel del modal si está activo
    if (this.panelUI && this.panelUI.style.display === "block") {
        this.panelUI.innerHTML = this.obtenerInfoInteractiva();
    }
    
    // Restaurar textarea en teclados
    if (this instanceof Teclado) {
        const textarea = this.panelUI?.querySelector('textarea');
        if (textarea) {
            textarea.oninput = () => handleTecladoInput(this.id, textarea.value);
        }
    }
}  
  

  obtenerInfoInteractiva() {
    return `
      <strong>${this.nombre}</strong><br>
      Tipo: ${this.tipo}<br>
      ID: ${this.id}<br>
      Voltaje: ${this.voltaje.toFixed(2)} V<br>
      Ancho de banda: ${this.anchoBanda.toFixed(2)} Mbps<br>
      <div style="margin-top:10px; padding:10px; border:1px solid #ccc; text-align:left;"><strong>Cola de operaciones E/S:</strong><ul>${this.colaOperaciones.map(op => `<li>${op}</li>`).join("")}</ul></div>
    `;
  }

  
agregarOperacion(operacion) {
    this.colaOperaciones.push(operacion);
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
            this.procesarCola();
        }, 2000);  // Simula 2 segundos por operación
    }
}


  reposo() {
    this.voltaje = this.voltajeReposo();
    this.anchoBanda = this.anchoBandaReposo();
    this.actualizarUI();
    this.elemento.classList.remove('active');
  }

  voltajeReposo() { return 0.1; }
  anchoBandaReposo() { return 0.1; }
}

class Teclado extends Dispositivo {
  constructor(id, elemento) {
    super(id, "Entrada", elemento);
  }

  obtenerInfoInteractiva() {
    return super.obtenerInfoInteractiva() + `
      <textarea rows='2' placeholder='Escribe algo...' oninput='handleTecladoInput("${this.id}", this.value)'></textarea>
    `;
  }

  voltajeReposo() { return 0.05; }
  anchoBandaReposo() { return 0.01; }

  escribir(texto) {
    this.voltaje = 0.5;
    this.anchoBanda = 0.5;
    this.actualizarUI();
    this.elemento.classList.add('active');
    clearTimeout(this.timerReposo);
    this.timerReposo = setTimeout(() => this.reposo(), 1500);
  }
}

class Mouse extends Dispositivo {
  constructor(id, elemento) {
    super(id, "Entrada", elemento);
  }

  obtenerInfoInteractiva() {
    return super.obtenerInfoInteractiva() + `
      <div style='margin-top:10px;'>
        <button onclick='handleMouseClick("${this.id}", "izquierdo")'>Click Izquierdo</button>
        <button onclick='handleMouseClick("${this.id}", "derecho")'>Click Derecho</button>
      </div>
    `;
  }

  voltajeReposo() { return 0.07; }
  anchoBandaReposo() { return 0.02; }

  click(tipo) {
    this.voltaje = 0.4;
    this.anchoBanda = 0.4;
    this.actualizarUI();
    this.elemento.classList.add('active');
    clearTimeout(this.timerReposo);
    this.timerReposo = setTimeout(() => this.reposo(), 1000);
  }
}

class USB extends Dispositivo {
  constructor(id, elemento) {
    super(id, "Entrada", elemento);
    this.enUso = false; // Initialize the 'enUso' property
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
    // Check if the USB is in use
    if (this.enUso) {
      alert("No se puede expulsar el USB. Asegúrate de cerrar todos los archivos abiertos antes de intentar expulsar.");
      return; // Exit the method if it is in use
    }

    // Logic to eject the USB
    console.log("USB expulsado correctamente.");
    this.actualizarUI();
  }

  obtenerInfoInteractiva() {
    return super.obtenerInfoInteractiva() + `
      <button onclick='handleUSBRead("${this.id}")'>Leer USB</button>
      <button onclick='devices["${this.id}"].abrirArchivo()'>Abrir Archivo</button>
      <button onclick='devices["${this.id}"].cerrarArchivo()'>Cerrar Archivo</button>
      <button onclick='devices["${this.id}"].expulsar()'>Expulsar USB</button>
    `;
  }
}

class Bocina extends Dispositivo {
  constructor(id, elemento) {
    super(id, "Salida", elemento);
  }

  obtenerInfoInteractiva() {
    return super.obtenerInfoInteractiva() + `
      <div style='margin-top:10px;'>
        Volumen: <input type='range' min='0' max='100' value='50' onchange='handleVolumen("${this.id}", this.value)'>
      </div>
    `;
  }

  voltajeReposo() { return 0.1; }
  anchoBandaReposo() { return 0.1; }

  ajustarVolumen(valor) {
    const v = parseInt(valor);
    this.voltaje = 0.1 + (v / 100) * 1.4;
    this.anchoBanda = 0.1 + (v / 100) * 1.9;
    this.actualizarUI();
    this.elemento.classList.add('active');
    clearTimeout(this.timerReposo);
    this.timerReposo = setTimeout(() => this.reposo(), 2000);
  }
}

class Monitor extends Dispositivo {
  constructor(id, elemento) {
    super(id, "Salida", elemento);
  }
  voltajeReposo() { return 1.0; }
  anchoBandaReposo() { return 1.0; }
}

class Impresora extends Dispositivo {
  constructor(id, elemento) {
    super(id, "Salida", elemento);
  }
  voltajeReposo() { return 0.5; }
  anchoBandaReposo() { return 0.8; }
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

    let listaHTML = dispositivos.map((d, i) =>
      `<li class="tab-item" data-id="${d.id}">${d.nombre}</li>`
    ).join("");

    const panelInfo = dispositivos.map(d => `
      <div id="info-panel-${d.id}" class="info-panel" style="display:none; padding: 10px;"></div>
    `).join("");
    

    modalBody.innerHTML = `
      <div style="display:flex">
        <ul class="tab-list" style="width: 40%; text-align:left; border-right: 1px solid #ccc; padding-right: 10px;">
          ${listaHTML}
        </ul>
        <div style="width: 60%; padding-left: 10px;">
          ${panelInfo}
        </div>
      </div>
    `;

    document.querySelectorAll(".tab-item").forEach(item => {
  // En el event listener de los tabs del modal:
item.addEventListener("click", () => {
  const id = item.dataset.id;
  const dispositivo = dispositivos.find(d => d.id === id);
  
  if (dispositivo) {
      document.querySelectorAll(".info-panel").forEach(p => p.style.display = "none");
      const panelEspecifico = document.getElementById(`info-panel-${dispositivo.id}`);
      panelEspecifico.style.display = "block";
      
      // ✅ Mantener referencia al panel y método original
      dispositivo.panelUI = panelEspecifico;
      const originalUpdate = dispositivo.actualizarUI.bind(dispositivo);
      
      // ✅ Actualizar ambos paneles (global y modal)
      dispositivo.actualizarUI = function() {
          originalUpdate();
          if (panelEspecifico && panelEspecifico.style.display === "block") {
              panelEspecifico.innerHTML = this.obtenerInfoInteractiva();
          }
      };
      
      dispositivo.actualizarUI(); // Actualización inicial
  }
});
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

    // Siempre actualiza el panel si no tiene uno, o si el actual no está en el DOM
    if (!dispositivo.panelUI || !document.body.contains(dispositivo.panelUI)) {
      const panelGlobal = document.getElementById("info-panel");
      if (panelGlobal) {
        panelGlobal.innerHTML = dispositivo.obtenerInfoInteractiva();
        dispositivo.panelUI = panelGlobal;
      }
    }

    // ✅ Siempre actualiza visualmente el panel actual
    dispositivo.actualizarUI();
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


