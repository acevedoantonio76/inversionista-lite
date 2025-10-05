// Carga y lista inversionistas con filtro simple
const $q = document.getElementById("q");
const $list = document.getElementById("list");

async function loadInvestors() {
  try {
    const res = await fetch("./data/investors.json", { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo leer data/investors.json");
    const data = await res.json();
    render(data);
    $q.addEventListener("input", () => render(data, $q.value.trim()));
  } catch (e) {
    $list.innerHTML = `<div class="card"><h3>Error</h3><p class="meta">${e.message}</p>
      <p class="meta">Revisa que el archivo <code>data/investors.json</code> existe en el repo.</p></div>`;
  }
}

function render(items, term = "") {
  const t = term.toLowerCase();
  const filtered = items.filter(it => {
    const blob = `${it.name} ${it.style} ${it.strategy}`.toLowerCase();
    return blob.includes(t);
  });
  $list.innerHTML = filtered.map(toCard).join("") || `<div class="card">
    <h3>Sin resultados</h3><p class="meta">Prueba con otro término.</p></div>`;
}

function toCard(it) {
  return `
  <article class="card">
    <h3>${it.name}</h3>
    <div class="badges">
      <span class="badge">Estilo: ${it.style}</span>
      <span class="badge">Horizonte: ${it.horizon}</span>
      <span class="badge">Riesgo: ${it.risk}/5</span>
    </div>
    <p class="meta">Estrategia: ${it.strategy}</p>
  </article>`;
}

loadInvestors();
// --- Estado y utilidades ---
const $q = document.getElementById("q");
const $sort = document.getElementById("sort");
const $list = document.getElementById("list");
const $export = document.getElementById("exportCsv");
const $install = document.getElementById("installBtn");

const LS_FAVS = "inv-favs";
let all = [];        // todos los inversionistas
let view = [];       // resultado filtrado/ordenado actual
let favs = new Set(JSON.parse(localStorage.getItem(LS_FAVS) || "[]"));
let deferredPrompt = null;

// --- Carga de datos ---
init();

async function init() {
  attachInstall();
  attachUI();
  await loadData();
  applyAndRender();
}

async function loadData() {
  const res = await fetch("./data/investors.json", { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo leer data/investors.json");
  all = await res.json();
}

// --- Filtros y orden ---
function applyAndRender() {
  const term = ($q.value || "").trim().toLowerCase();
  const sorted = sortItems(
    all.filter(it => `${it.name} ${it.style} ${it.strategy}`.toLowerCase().includes(term))
  );
  view = sorted;
  render(view);
}

function sortItems(items) {
  const v = $sort.value;
  const by = (key, dir = 1) => (a, b) => (a[key] > b[key] ? dir : a[key] < b[key] ? -dir : 0);
  if (v === "name-asc") return items.slice().sort(by("name", 1));
  if (v === "risk-desc") return items.slice().sort(by("risk", -1));
  if (v === "risk-asc") return items.slice().sort(by("risk", 1));
  return items;
}

// --- Render de tarjetas ---
function render(items) {
  if (!items.length) {
    $list.innerHTML = `<div class="empty">Sin resultados. Prueba otro término.</div>`;
    return;
  }
  $list.innerHTML = items.map(toCard).join("");
  // enlazar acciones de cada tarjeta
  $list.querySelectorAll("[data-action='fav']").forEach(btn=>{
    btn.addEventListener("click", () => toggleFav(btn.dataset.name));
  });
  $list.querySelectorAll("[data-action='details']").forEach(btn=>{
    btn.addEventListener("click", () => toggleDetails(btn.dataset.name));
  });
}

function toCard(it) {
  const isFav = favs.has(it.name);
  return `
  <article class="card" id="card-${cssId(it.name)}">
    <h3>
      ${it.name}
      <button class="icon-btn ${isFav ? "fav": ""}" data-action="fav" data-name="${esc(it.name)}">
        ★
      </button>
    </h3>
    <div class="badges">
      <span class="badge">Estilo: ${esc(it.style)}</span>
      <span class="badge">Horizonte: ${esc(it.horizon)}</span>
      <span class="badge">Riesgo: ${esc(it.risk)}/5</span>
    </div>
    <p class="meta">Estrategia: ${esc(it.strategy)}</p>
    <div class="actions">
      <button class="icon-btn" data-action="details" data-name="${esc(it.name)}">Detalles</button>
    </div>
    <div class="meta" id="details-${cssId(it.name)}" style="display:none; margin-top:6px;">
      ${it.notes ? esc(it.notes) : "—"}
    </div>
  </article>`;
}

function toggleFav(name) {
  if (favs.has(name)) favs.delete(name); else favs.add(name);
  localStorage.setItem(LS_FAVS, JSON.stringify(Array.from(favs)));
  applyAndRender();
}

function toggleDetails(name) {
  const id = `details-${cssId(name)}`;
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = el.style.display === "none" ? "block" : "none";
}

// --- Exportar CSV del listado actual ---
$export.addEventListener("click", () => {
  if (!view.length) return alert("No hay datos para exportar.");
  const headers = ["name","style","horizon","strategy","risk"];
  const lines = [headers.join(",")].concat(
    view.map(it => headers.map(h => csvCell(it[h])).join(","))
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href:url, download:"investors.csv" });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

// --- Interacción básica ---
function attachUI() {
  $q.addEventListener("input", applyAndRender);
  $sort.addEventListener("change", applyAndRender);
}

// --- PWA: botón de instalar ---
function attachInstall() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $install.disabled = false;
  });

  $install.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    } else {
      // iPhone no dispara beforeinstallprompt
      alert("En iPhone: abre en Safari → Compartir → Añadir a pantalla de inicio.");
    }
  });
}

// --- Helpers ---
function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
}
function cssId(s){ return s.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9\-]/g,""); }
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
