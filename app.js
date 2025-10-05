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
