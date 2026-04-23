(function () {
  const vscode = acquireVsCodeApi();
  /** @type {Array<{id:string,description:string,start:string,end:string|null,durationMs:number,running:boolean}>} */
  let allRows = [];

  /** @param {string|number} isoOrMs ISO string or epoch ms (local calendar date) */
  function localYMD(isoOrMs) {
    const d =
      typeof isoOrMs === "number" ? new Date(isoOrMs) : new Date(isoOrMs);
    if (isNaN(d.getTime())) {
      return "";
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function parseLocalDateTime(val) {
    if (!val || !String(val).trim()) {
      return NaN;
    }
    const t = new Date(val).getTime();
    return t;
  }

  function startMs(row) {
    return new Date(row.start).getTime();
  }

  function endMs(row, includeRunning) {
    if (row.end) {
      return new Date(row.end).getTime();
    }
    if (includeRunning) {
      return Date.now();
    }
    return NaN;
  }

  function formatWhen(iso) {
    if (!iso) {
      return "—";
    }
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  function formatDur(ms) {
    const sec = Math.round(ms / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return h + "h " + m + "m";
    }
    if (m > 0) {
      return m + "m " + s + "s";
    }
    return s + "s";
  }

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value : "";
  }

  function num(id) {
    const v = val(id);
    if (v === "") {
      return NaN;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }

  function checked(id) {
    const el = document.getElementById(id);
    return el && el.checked;
  }

  function toggleGroups(prefix, mode) {
    const day = document.getElementById(prefix + "DayRow");
    const range = document.getElementById(prefix + "RangeRow");
    const between = document.getElementById(prefix + "BetweenRow");
    if (day) {
      day.classList.toggle("hidden", mode !== "day");
    }
    if (range) {
      range.classList.toggle("hidden", mode !== "dayRange");
    }
    if (between) {
      between.classList.toggle("hidden", mode !== "between");
    }
  }

  function matchesTimeFilter(mode, dayVal, dayFrom, dayTo, dtFrom, dtTo, ms) {
    if (mode === "any") {
      return true;
    }
    if (!Number.isFinite(ms)) {
      return false;
    }
    if (mode === "day") {
      if (!dayVal) {
        return true;
      }
      return localYMD(ms) === dayVal;
    }
    if (mode === "dayRange") {
      if (!dayFrom || !dayTo) {
        return true;
      }
      const ymd = localYMD(ms);
      return ymd >= dayFrom && ymd <= dayTo;
    }
    if (mode === "between") {
      const a = parseLocalDateTime(dtFrom);
      const b = parseLocalDateTime(dtTo);
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        return true;
      }
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      return ms >= lo && ms <= hi;
    }
    return true;
  }

  function filterRow(row) {
    const descQ = val("fDesc").trim().toLowerCase();
    if (descQ && !row.description.toLowerCase().includes(descQ)) {
      return false;
    }

    const dMin = num("fDurMin");
    const dMax = num("fDurMax");
    const sec = row.durationMs / 1000;
    if (Number.isFinite(dMin) && sec < dMin) {
      return false;
    }
    if (Number.isFinite(dMax) && sec > dMax) {
      return false;
    }

    const sm = startMs(row);
    const startMode = val("fStartMode");
    if (
      !matchesTimeFilter(
        startMode,
        val("fStartDay"),
        val("fStartDayFrom"),
        val("fStartDayTo"),
        val("fStartDtFrom"),
        val("fStartDtTo"),
        sm,
      )
    ) {
      return false;
    }

    const endInclude = checked("fEndIncludeRunning");
    const em = endMs(row, endInclude);
    const endMode = val("fEndMode");
    if (endMode !== "any" && row.running && !endInclude) {
      return false;
    }
    if (
      !matchesTimeFilter(
        endMode,
        val("fEndDay"),
        val("fEndDayFrom"),
        val("fEndDayTo"),
        val("fEndDtFrom"),
        val("fEndDtTo"),
        em,
      )
    ) {
      return false;
    }

    return true;
  }

  function getVisibleRows() {
    return allRows.filter(filterRow);
  }

  function render() {
    const tbody = document.getElementById("tbody");
    const meta = document.getElementById("meta");
    if (!tbody) {
      return;
    }
    const visible = getVisibleRows();
    let sum = 0;
    const frag = document.createDocumentFragment();
    for (const row of visible) {
      sum += row.durationMs;
      const tr = document.createElement("tr");
      const c0 = document.createElement("td");
      c0.textContent = formatWhen(row.start);
      const c1 = document.createElement("td");
      c1.textContent = row.running ? "… running" : formatWhen(row.end);
      const c2 = document.createElement("td");
      c2.textContent = formatDur(row.durationMs) + (row.running ? " *" : "");
      const c3 = document.createElement("td");
      c3.className = "desc-cell";
      c3.textContent = row.description;
      tr.appendChild(c0);
      tr.appendChild(c1);
      tr.appendChild(c2);
      tr.appendChild(c3);
      frag.appendChild(tr);
    }
    tbody.replaceChildren(frag);
    if (meta) {
      meta.textContent =
        visible.length +
        " segment(s) · filtered total " +
        formatDur(sum) +
        (visible.some(function (r) {
          return r.running;
        })
          ? " (* running duration is live)"
          : "");
    }
  }

  function wire() {
    const ids = [
      "fDesc",
      "fDurMin",
      "fDurMax",
      "fStartMode",
      "fStartDay",
      "fStartDayFrom",
      "fStartDayTo",
      "fStartDtFrom",
      "fStartDtTo",
      "fEndMode",
      "fEndDay",
      "fEndDayFrom",
      "fEndDayTo",
      "fEndDtFrom",
      "fEndDtTo",
      "fEndIncludeRunning",
    ];
    ids.forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) {
        return;
      }
      el.addEventListener("input", render);
      el.addEventListener("change", render);
    });

    const sm = document.getElementById("fStartMode");
    if (sm) {
      sm.addEventListener("change", function () {
        toggleGroups("fStart", sm.value);
        render();
      });
      toggleGroups("fStart", sm.value);
    }
    const em = document.getElementById("fEndMode");
    if (em) {
      em.addEventListener("change", function () {
        toggleGroups("fEnd", em.value);
        render();
      });
      toggleGroups("fEnd", em.value);
    }

    const btnExport = document.getElementById("btnExport");
    if (btnExport) {
      btnExport.addEventListener("click", function () {
        const rows = getVisibleRows();
        vscode.postMessage({ type: "exportCsv", rows: rows });
      });
    }
  }

  window.addEventListener("message", function (event) {
    const msg = event.data;
    if (msg && msg.type === "update" && msg.payload && Array.isArray(msg.payload.rows)) {
      allRows = msg.payload.rows;
      render();
    }
  });

  wire();
  render();
})();

