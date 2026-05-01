(function () {
  const vscode = acquireVsCodeApi();
  /** @type {Array<{id:string,description:string,start:string,end:string|null,durationMs:number,alignedStart:string|null,alignedEnd:string|null,alignedDurationMs:number|null,running:boolean}>} */
  let allRows = [];

  /** @type {string|null} */
  let editingId = null;
  /** @type {{description:string,startLocal:string,endLocal:string}|null} */
  let editingDraft = null;

  /** @param {string} iso */
  function isoToDatetimeLocal(iso) {
    if (!iso) {
      return "";
    }
    const d = new Date(iso);
    if (isNaN(d.getTime())) {
      return "";
    }
    const pad = function (n) {
      return String(n).padStart(2, "0");
    };
    return (
      d.getFullYear() +
      "-" +
      pad(d.getMonth() + 1) +
      "-" +
      pad(d.getDate()) +
      "T" +
      pad(d.getHours()) +
      ":" +
      pad(d.getMinutes())
    );
  }

  /** @param {string} localVal */
  function datetimeLocalToIso(localVal) {
    if (!localVal || !String(localVal).trim()) {
      return null;
    }
    const t = new Date(localVal).getTime();
    if (!Number.isFinite(t)) {
      return null;
    }
    return new Date(t).toISOString();
  }

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

  /**
   * @param {{running:boolean}} row
   * @param {{description:string,startLocal:string,endLocal:string}} draft
   */
  function draftDurationMs(row, draft) {
    const s = parseLocalDateTime(draft.startLocal);
    if (!Number.isFinite(s)) {
      return null;
    }
    if (row.running) {
      return Math.max(0, Date.now() - s);
    }
    const e = parseLocalDateTime(draft.endLocal);
    if (!Number.isFinite(e)) {
      return null;
    }
    return Math.max(0, e - s);
  }

  function showEditError(text) {
    const el = document.getElementById("editError");
    if (!el) {
      return;
    }
    if (text) {
      el.textContent = text;
      el.classList.remove("hidden");
    } else {
      el.textContent = "";
      el.classList.add("hidden");
    }
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
    let durForFilter = row.durationMs;
    if (editingId === row.id && editingDraft) {
      const d = draftDurationMs(row, editingDraft);
      if (d !== null) {
        durForFilter = d;
      }
    }
    const sec = durForFilter / 1000;
    if (Number.isFinite(dMin) && sec < dMin) {
      return false;
    }
    if (Number.isFinite(dMax) && sec > dMax) {
      return false;
    }

    const sm =
      editingId === row.id && editingDraft
        ? parseLocalDateTime(editingDraft.startLocal)
        : startMs(row);
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
    let em = endMs(row, endInclude);
    if (editingId === row.id && editingDraft && !row.running) {
      const parsed = parseLocalDateTime(editingDraft.endLocal);
      if (Number.isFinite(parsed)) {
        em = parsed;
      }
    }
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

  function beginEdit(row) {
    showEditError("");
    editingId = row.id;
    editingDraft = {
      description: row.description,
      startLocal: isoToDatetimeLocal(row.start),
      endLocal: row.running ? "" : isoToDatetimeLocal(row.end || ""),
    };
    vscode.postMessage({ type: "summaryEditBegin" });
    render();
  }

  function cancelEdit() {
    editingId = null;
    editingDraft = null;
    showEditError("");
    vscode.postMessage({ type: "summaryEditEnd" });
    render();
  }

  function refreshMetaBar() {
    const meta = document.getElementById("meta");
    if (!meta) {
      return;
    }
    const visible = getVisibleRows();
    let sum = 0;
    let alignedSum = 0;
    for (const row of visible) {
      let dur = row.durationMs;
      if (editingId === row.id && editingDraft) {
        const d = draftDurationMs(row, editingDraft);
        if (d !== null) {
          dur = d;
        }
      }
      sum += dur;
      if (!row.running && row.alignedDurationMs != null) {
        alignedSum += row.alignedDurationMs;
      }
    }
    let txt =
      visible.length +
      " segment(s) · filtered total " +
      formatDur(sum) +
      (visible.some(function (r) {
        return r.running;
      })
        ? " (* running duration is live)"
        : "");
    if (alignedSum > 0) {
      txt += " · aligned total " + formatDur(alignedSum);
    }
    meta.textContent = txt;
  }

  /**
   * @param {{id:string,running:boolean}} row
   */
  function patchEditingDuration(row) {
    const tbody = document.getElementById("tbody");
    if (!tbody || !editingDraft) {
      return;
    }
    const tr = tbody.querySelector('tr[data-editing-id="' + row.id + '"]');
    if (!tr) {
      return;
    }
    const durTd = tr.querySelector(".js-draft-duration");
    if (durTd && editingDraft) {
      const d = draftDurationMs(row, editingDraft);
      durTd.textContent =
        (d !== null ? formatDur(d) : "—") + (row.running ? " *" : "");
    }
    refreshMetaBar();
  }

  function saveEdit(row) {
    if (!editingDraft) {
      return;
    }
    showEditError("");
    const desc = editingDraft.description.trim();
    if (!desc) {
      showEditError("Description cannot be empty.");
      return;
    }
    const startIso = datetimeLocalToIso(editingDraft.startLocal);
    if (!startIso) {
      showEditError("Enter a valid start date and time.");
      return;
    }
    /** @type {{type:string,entryId:string,description:string,startIso:string,endIso?:string|null}} */
    const msg = {
      type: "updateSegment",
      entryId: row.id,
      description: desc,
      startIso: startIso,
    };
    if (!row.running) {
      const endIso = datetimeLocalToIso(editingDraft.endLocal);
      if (!endIso) {
        showEditError("Enter a valid end date and time.");
        return;
      }
      msg.endIso = endIso;
    }
    vscode.postMessage(msg);
  }

  function render() {
    const tbody = document.getElementById("tbody");
    const meta = document.getElementById("meta");
    if (!tbody) {
      return;
    }
    const visible = getVisibleRows();
    let alignedSum = 0;
    const frag = document.createDocumentFragment();
    for (const row of visible) {
      if (!row.running && row.alignedDurationMs != null) {
        alignedSum += row.alignedDurationMs;
      }
      const tr = document.createElement("tr");
      const isEditing = editingId === row.id;

      if (!isEditing) {
        const c0 = document.createElement("td");
        c0.textContent = formatWhen(row.start);
        const c1 = document.createElement("td");
        c1.textContent = row.running ? "… running" : formatWhen(row.end);
        const c2 = document.createElement("td");
        c2.textContent = formatDur(row.durationMs) + (row.running ? " *" : "");
        const hasAligned =
          row.alignedStart &&
          row.alignedEnd &&
          row.alignedDurationMs != null &&
          !row.running;
        const cAlStart = document.createElement("td");
        cAlStart.textContent = hasAligned ? formatWhen(row.alignedStart) : "—";
        const cAlEnd = document.createElement("td");
        cAlEnd.textContent = hasAligned ? formatWhen(row.alignedEnd) : "—";
        const cAlDur = document.createElement("td");
        cAlDur.textContent = hasAligned ? formatDur(row.alignedDurationMs) : "—";
        const c3 = document.createElement("td");
        c3.className = "desc-cell";
        c3.textContent = row.description;
        const cAct = document.createElement("td");
        cAct.className = "actions";
        const btnEdit = document.createElement("button");
        btnEdit.type = "button";
        btnEdit.textContent = "Edit";
        btnEdit.addEventListener("click", function () {
          beginEdit(row);
        });
        cAct.appendChild(btnEdit);
        tr.appendChild(c0);
        tr.appendChild(c1);
        tr.appendChild(c2);
        tr.appendChild(cAlStart);
        tr.appendChild(cAlEnd);
        tr.appendChild(cAlDur);
        tr.appendChild(c3);
        tr.appendChild(cAct);
      } else if (editingDraft) {
        const dDur = draftDurationMs(row, editingDraft);
        tr.dataset.editingId = row.id;

        const c0 = document.createElement("td");
        const inStart = document.createElement("input");
        inStart.type = "datetime-local";
        inStart.className = "cell-input";
        inStart.value = editingDraft.startLocal;
        inStart.addEventListener("input", function () {
          editingDraft.startLocal = inStart.value;
          patchEditingDuration(row);
        });
        inStart.addEventListener("change", function () {
          render();
        });
        c0.appendChild(inStart);

        const c1 = document.createElement("td");
        if (row.running) {
          c1.textContent = "… running";
        } else {
          const inEnd = document.createElement("input");
          inEnd.type = "datetime-local";
          inEnd.className = "cell-input";
          inEnd.value = editingDraft.endLocal;
          inEnd.addEventListener("input", function () {
            editingDraft.endLocal = inEnd.value;
            patchEditingDuration(row);
          });
          inEnd.addEventListener("change", function () {
            render();
          });
          c1.appendChild(inEnd);
        }

        const c2 = document.createElement("td");
        c2.className = "js-draft-duration";
        c2.textContent =
          (dDur !== null ? formatDur(dDur) : "—") + (row.running ? " *" : "");

        const cAlStart = document.createElement("td");
        cAlStart.textContent = "—";
        cAlStart.title = "Aligned values update after you save.";
        const cAlEnd = document.createElement("td");
        cAlEnd.textContent = "—";
        cAlEnd.title = "Aligned values update after you save.";
        const cAlDur = document.createElement("td");
        cAlDur.textContent = "—";
        cAlDur.title = "Aligned values update after you save.";

        const c3 = document.createElement("td");
        const inDesc = document.createElement("input");
        inDesc.type = "text";
        inDesc.className = "cell-input cell-input-grow";
        inDesc.value = editingDraft.description;
        inDesc.addEventListener("input", function () {
          editingDraft.description = inDesc.value;
        });
        c3.appendChild(inDesc);

        const cAct = document.createElement("td");
        cAct.className = "actions actions-stack";
        const btnSave = document.createElement("button");
        btnSave.type = "button";
        btnSave.textContent = "Save";
        btnSave.addEventListener("click", function () {
          saveEdit(row);
        });
        const btnCancel = document.createElement("button");
        btnCancel.type = "button";
        btnCancel.textContent = "Cancel";
        btnCancel.addEventListener("click", function () {
          cancelEdit();
        });
        cAct.appendChild(btnSave);
        cAct.appendChild(btnCancel);

        tr.appendChild(c0);
        tr.appendChild(c1);
        tr.appendChild(c2);
        tr.appendChild(cAlStart);
        tr.appendChild(cAlEnd);
        tr.appendChild(cAlDur);
        tr.appendChild(c3);
        tr.appendChild(cAct);
      }

      frag.appendChild(tr);
    }
    tbody.replaceChildren(frag);
    if (meta) {
      let sum = 0;
      for (const row of visible) {
        let dur = row.durationMs;
        if (editingId === row.id && editingDraft) {
          const d = draftDurationMs(row, editingDraft);
          if (d !== null) {
            dur = d;
          }
        }
        sum += dur;
      }
      let txt =
        visible.length +
        " segment(s) · filtered total " +
        formatDur(sum) +
        (visible.some(function (r) {
          return r.running;
        })
          ? " (* running duration is live)"
          : "");
      if (alignedSum > 0) {
        txt += " · aligned total " + formatDur(alignedSum);
      }
      meta.textContent = txt;
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
    if (msg && msg.type === "updateSegmentResult") {
      if (msg.ok) {
        editingId = null;
        editingDraft = null;
        showEditError("");
        vscode.postMessage({ type: "summaryEditEnd" });
      } else {
        showEditError(msg.reason || "Could not save changes.");
      }
      render();
      return;
    }
    if (msg && msg.type === "update" && msg.payload && Array.isArray(msg.payload.rows)) {
      allRows = msg.payload.rows;
      render();
    }
  });

  wire();
  render();
})();
