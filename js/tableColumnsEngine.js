// ======================================================
// tableColumnsEngine.js
// Engine UNIVERSAL: visible/order/width kolom + SORT state +
// PRESET (save/load/delete, per tableId) + resize (pointer) +
// drag-reorder header + SATU popup "Modify Table" dipakai
// bareng semua tabel (reservation/folio/guest/logs/dll).
//
// Pakai:
//   const myTable = createColumnTable({
//       storageKey: "unique_key_v1",
//       columns: [{ key, label, width, sortable }, ...],
//       onChange: () => { /* rerender + refetch tabelmu */ }
//   });
//
// Header + colgroup:
//   <colgroup>${ctRenderColgroup(myTable.storageKey)}</colgroup>
//   <tr>${state.visibleOrder.map(k => ctRenderColHeader(myTable.storageKey, k)).join("")}</tr>
//
// Sort (dipanggil otomatis dari klik label header -- lihat
// ctRenderColHeader -- gak perlu bikin sortTable() sendiri):
//   const sort = myTable.getSort(); // { key, direction } | null
//   query.order(sort.key, { ascending: sort.direction === "asc" })
//
// Modify Table + Preset button:
//   onclick="ctOpenModifyPopup('unique_key_v1')"
// ======================================================

const ctRegistry = {};

function createColumnTable({ storageKey, columns, onChange }) {

    const columnMap = Object.fromEntries(columns.map(c => [c.key, c]));
    const allKeys = columns.map(c => c.key);
    const presetsKey = storageKey + "_presets";

    // ------------------------------------------------------
    // Column visibility/order/width state
    // ------------------------------------------------------

    function getState() {

        const raw = localStorage.getItem(storageKey);
        let state;

        if (!raw) {

            state = { visibleOrder: [...allKeys], widths: {}, sort: null };

        } else {

            try {

                const parsed = JSON.parse(raw);
                const cleanOrder = (parsed.visibleOrder || []).filter(k => columnMap[k]);

                state = {
                    visibleOrder: cleanOrder.length > 0 ? cleanOrder : [...allKeys],
                    widths: parsed.widths || {},
                    sort: parsed.sort && columnMap[parsed.sort.key] ? parsed.sort : null
                };

            } catch (e) {

                state = { visibleOrder: [...allKeys], widths: {}, sort: null };

            }

        }

        saveState(state);
        return state;

    }

    function saveState(state) {
        localStorage.setItem(storageKey, JSON.stringify(state));
    }

    function notify() {
        if (typeof onChange === "function") onChange();
    }

    function reorderColumn(draggedKey, targetKey, before) {

        const state = getState();
        const arr = state.visibleOrder;

        const from = arr.indexOf(draggedKey);
        if (from === -1) return;
        arr.splice(from, 1);

        let to = arr.indexOf(targetKey);

        if (to === -1) {
            arr.push(draggedKey);
        } else {
            if (!before) to += 1;
            arr.splice(to, 0, draggedKey);
        }

        saveState(state);
        notify();

    }

    function setWidth(key, width) {

        const state = getState();
        state.widths[key] = width;
        saveState(state);

    }

    function setVisibleOrder(order) {

        const state = getState();
        state.visibleOrder = order.length > 0 ? order : [allKeys[0]];
        saveState(state);
        notify();

    }

    function resetColumns() {

        const state = getState();
        saveState({ visibleOrder: [...allKeys], widths: {}, sort: state.sort });
        notify();

    }

    // ------------------------------------------------------
    // Sort state -- klik label header toggle: none -> asc ->
    // desc -> none. Cuma kolom dgn sortable !== false yg bisa.
    // ------------------------------------------------------

    function getSort() {
        return getState().sort;
    }

    function toggleSort(key) {

        const col = columnMap[key];
        if (!col || col.sortable === false) return;

        const state = getState();
        const current = state.sort;

        if (!current || current.key !== key) {
            state.sort = { key, direction: "asc" };
        } else if (current.direction === "asc") {
            state.sort = { key, direction: "desc" };
        } else {
            state.sort = null;
        }

        saveState(state);
        notify();

    }

    // ------------------------------------------------------
    // Presets -- named snapshot of visibleOrder+widths (BUKAN
    // sort, sort itu working-state harian bukan bagian layout).
    // Disimpan terpisah per tableId biar preset reservation gak
    // ketuker sama preset guest/logs.
    // ------------------------------------------------------

    function getPresets() {

        const raw = localStorage.getItem(presetsKey);
        if (!raw) return {};

        try { return JSON.parse(raw); }
        catch (e) { return {}; }

    }

    function savePresets(presets) {
        localStorage.setItem(presetsKey, JSON.stringify(presets));
    }

    function savePreset(name) {

        if (!name || !name.trim()) return false;

        const state = getState();
        const presets = getPresets();

        presets[name.trim()] = {
            visibleOrder: [...state.visibleOrder],
            widths: { ...state.widths }
        };

        savePresets(presets);
        return true;

    }

    function loadPreset(name) {

        const presets = getPresets();
        const preset = presets[name];
        if (!preset) return false;

        const state = getState();
        state.visibleOrder = preset.visibleOrder.filter(k => columnMap[k]);
        state.widths = { ...preset.widths };

        saveState(state);
        notify();
        return true;

    }

    function deletePreset(name) {

        const presets = getPresets();
        if (!presets[name]) return false;

        delete presets[name];
        savePresets(presets);
        return true;

    }

    function listPresetNames() {
        return Object.keys(getPresets()).sort();
    }

    const api = {
        storageKey,
        columns,
        columnMap,
        allKeys,
        getState,
        saveState,
        reorderColumn,
        setWidth,
        setVisibleOrder,
        resetColumns,
        getSort,
        toggleSort,
        savePreset,
        loadPreset,
        deletePreset,
        listPresetNames,
        notify
    };

    ctRegistry[storageKey] = api;
    return api;

}


// ======================================================
// Render helper generic buat <colgroup> dan <th>
// ======================================================

function ctRenderColgroup(tableId, extraColsHtml = "") {

    const table = ctRegistry[tableId];
    if (!table) return extraColsHtml;

    const state = table.getState();

    const cols = state.visibleOrder.map(key => {
        const w = state.widths[key] || (table.columnMap[key] ? table.columnMap[key].width : 100);
        return `<col data-ct-col="${key}" data-ct-table="${tableId}" style="width:${w}px">`;
    }).join("");

    return extraColsHtml + cols;

}

// opts: { onLabelClick: "jsExprString" } -- kalau dikasih, DIPAKAI
// gantiin sort bawaan engine (buat page yg mau kontrol sort sendiri,
// mis. reservation.js yg query-nya lebih kompleks). Kalau gak dikasih,
// klik label = toggle sort bawaan engine (getSort()/toggleSort()).
function ctRenderColHeader(tableId, key, opts = {}) {

    const table = ctRegistry[tableId];
    const col = table ? table.columnMap[key] : null;
    if (!col) return "";

    const sortable = col.sortable !== false;
    const clickAttr = opts.onLabelClick
        ? `onclick="${opts.onLabelClick}"`
        : (sortable ? `onclick="ctToggleSort('${tableId}', '${key}')"` : "");

    let indicator = "";

    if (sortable && !opts.onLabelClick) {
        const sort = table.getSort();
        if (sort && sort.key === key) {
            indicator = sort.direction === "asc" ? ` <span class="ct-sort-indicator">▲</span>` : ` <span class="ct-sort-indicator">▼</span>`;
        }
    } else if (opts.indicatorHtml) {
        indicator = opts.indicatorHtml;
    }

    return `
        <th class="ct-th" data-key="${key}"
            ondragover="ctColDragOver(event, '${tableId}', '${key}')"
            ondrop="ctColDrop(event, '${tableId}', '${key}')">
            <span class="ct-col-label ${sortable ? "ct-col-sortable" : ""}" draggable="true" ${clickAttr}
                ondragstart="ctColDragStart('${tableId}', '${key}')"
                ondragend="ctColDragEnd(event)">${col.label}${indicator}</span>
            <div class="ct-col-resize-handle" onpointerdown="ctColResizeStart(event, '${tableId}', '${key}')"></div>
        </th>
    `;

}

function ctToggleSort(tableId, key) {
    const table = ctRegistry[tableId];
    if (table) table.toggleSort(key);
}


// ======================================================
// Drag-reorder header
// ======================================================

let ctDragKey = null;
let ctDragTableId = null;

function ctColDragStart(tableId, key) {
    ctDragKey = key;
    ctDragTableId = tableId;
}

function ctColDragOver(e, tableId, key) {

    if (!ctDragKey || ctDragTableId !== tableId || ctDragKey === key) return;

    e.preventDefault();

    const th = e.currentTarget;
    const rect = th.getBoundingClientRect();
    const before = e.clientX < rect.left + rect.width / 2;

    document.querySelectorAll(".ct-th").forEach(x =>
        x.classList.remove("ct-col-drop-before", "ct-col-drop-after"));

    th.classList.add(before ? "ct-col-drop-before" : "ct-col-drop-after");

}

function ctColDrop(e, tableId, key) {

    e.preventDefault();

    document.querySelectorAll(".ct-th").forEach(x =>
        x.classList.remove("ct-col-drop-before", "ct-col-drop-after"));

    if (!ctDragKey || ctDragTableId !== tableId || ctDragKey === key) return;

    const th = e.currentTarget;
    const rect = th.getBoundingClientRect();
    const before = e.clientX < rect.left + rect.width / 2;

    const table = ctRegistry[tableId];
    if (table) table.reorderColumn(ctDragKey, key, before);

    ctDragKey = null;
    ctDragTableId = null;

}

function ctColDragEnd() {
    ctDragKey = null;
    ctDragTableId = null;
}


// ======================================================
// Resize kolom (Pointer Events) -- live-update semua
// <col data-ct-col="key" data-ct-table="tableId"> yang match.
// ======================================================

let ctResizeState = null;

function ctColResizeStart(e, tableId, key) {

    e.stopPropagation();
    e.preventDefault();

    const handle = e.currentTarget;
    const th = handle.closest("th");
    if (!th) return;

    ctResizeState = {
        tableId,
        key,
        handle,
        pointerId: e.pointerId,
        startX: e.clientX,
        startWidth: th.getBoundingClientRect().width
    };

    try { handle.setPointerCapture(e.pointerId); } catch (err) {}

    handle.addEventListener("pointermove", ctColResizeMove);
    handle.addEventListener("pointerup", ctColResizeEnd);
    handle.addEventListener("pointercancel", ctColResizeEnd);

    document.body.classList.add("col-resizing");

}

function ctColResizeMove(e) {

    if (!ctResizeState) return;

    const delta = e.clientX - ctResizeState.startX;
    const newWidth = Math.max(30, Math.round(ctResizeState.startWidth + delta));

    document.querySelectorAll(
        `col[data-ct-col="${ctResizeState.key}"][data-ct-table="${ctResizeState.tableId}"]`
    ).forEach(col => { col.style.width = newWidth + "px"; });

}

function ctColResizeEnd(e) {

    if (!ctResizeState) return;

    const { tableId, key, handle, pointerId, startX, startWidth } = ctResizeState;
    const delta = e.clientX - startX;
    const newWidth = Math.max(30, Math.round(startWidth + delta));

    const table = ctRegistry[tableId];
    if (table) table.setWidth(key, newWidth);

    handle.removeEventListener("pointermove", ctColResizeMove);
    handle.removeEventListener("pointerup", ctColResizeEnd);
    handle.removeEventListener("pointercancel", ctColResizeEnd);
    try { handle.releasePointerCapture(pointerId); } catch (err) {}

    document.body.classList.remove("col-resizing");

    ctResizeState = null;
    if (table) table.notify();

}


// ======================================================
// Modify Table popup — SATU DOM dipakai bareng semua tabel.
// Sekarang + PRESET (save/load/delete) di footer.
// ======================================================

let ctModifyTableId = null;
let ctModifyDraft = null;
let ctModifyDragIdx = null;

function ctEnsurePopup() {

    if (document.getElementById("ctModifyPopup")) return;

    const div = document.createElement("div");
    div.id = "ctModifyPopup";
    div.className = "ct-modify-popup";
    div.style.display = "none";

    div.innerHTML = `
        <div class="ct-modify-popup-inner">
            <div class="ct-modify-popup-header">
                <span>Modify Table</span>
                <button class="ct-icon-btn" onclick="ctCloseModifyPopup()">✕</button>
            </div>

            <div class="ct-preset-row">
                <select id="ctPresetSelect"></select>
                <button class="ct-btn ct-btn-plain" onclick="ctLoadSelectedPreset()">Load</button>
                <button class="ct-btn ct-btn-plain" onclick="ctDeleteSelectedPreset()">Delete</button>
            </div>
            <div class="ct-preset-row">
                <input type="text" id="ctPresetNameInput" placeholder="Preset name...">
                <button class="ct-btn ct-btn-plain" onclick="ctSaveCurrentAsPreset()">Save as preset</button>
            </div>

            <ul id="ctModifyList" class="ct-modify-list"></ul>
            <div class="ct-modify-popup-footer">
                <button class="ct-btn ct-btn-plain" onclick="ctResetModifyPopup()">Reset</button>
                <button class="ct-btn ct-btn-confirm" onclick="ctApplyModifyPopup()">Apply</button>
            </div>
        </div>
    `;

    document.body.appendChild(div);

    div.addEventListener("click", (e) => {
        if (e.target === div) ctCloseModifyPopup();
    });

}

function ctRenderPresetDropdown() {

    const table = ctRegistry[ctModifyTableId];
    const select = document.getElementById("ctPresetSelect");
    if (!table || !select) return;

    const names = table.listPresetNames();

    select.innerHTML = `<option value="">-- Select Preset --</option>` +
        names.map(n => `<option value="${n}">${n}</option>`).join("");

}

function ctLoadSelectedPreset() {

    const table = ctRegistry[ctModifyTableId];
    const select = document.getElementById("ctPresetSelect");
    if (!table || !select || !select.value) return;

    table.loadPreset(select.value);
    ctCloseModifyPopup();

}

function ctDeleteSelectedPreset() {

    const table = ctRegistry[ctModifyTableId];
    const select = document.getElementById("ctPresetSelect");
    if (!table || !select || !select.value) return;

    table.deletePreset(select.value);
    ctRenderPresetDropdown();

}

function ctSaveCurrentAsPreset() {

    const table = ctRegistry[ctModifyTableId];
    const input = document.getElementById("ctPresetNameInput");
    if (!table || !input) return;

    const order = ctModifyDraft.filter(i => i.visible).map(i => i.key);

    // simpan draft yg lagi diedit di popup (belum Apply), biar preset
    // konsisten sama apa yg diliat user
    const tempState = table.getState();
    const restoreWidths = { ...tempState.widths };
    table.saveState({ ...tempState, visibleOrder: order });

    const ok = table.savePreset(input.value);

    table.saveState({ ...tempState, widths: restoreWidths });

    if (ok) {
        input.value = "";
        ctRenderPresetDropdown();
    }

}

function ctOpenModifyPopup(tableId) {

    const table = ctRegistry[tableId];
    if (!table) return;

    ctEnsurePopup();
    ctModifyTableId = tableId;

    const state = table.getState();
    const hidden = table.allKeys.filter(k => !state.visibleOrder.includes(k));

    ctModifyDraft = [...state.visibleOrder, ...hidden].map(key => ({
        key,
        visible: state.visibleOrder.includes(key)
    }));

    ctRenderModifyList();
    ctRenderPresetDropdown();

    const nameInput = document.getElementById("ctPresetNameInput");
    if (nameInput) nameInput.value = "";

    document.getElementById("ctModifyPopup").style.display = "flex";

}

function ctCloseModifyPopup() {

    const popup = document.getElementById("ctModifyPopup");
    if (popup) popup.style.display = "none";
    ctModifyTableId = null;

}

function ctRenderModifyList() {

    const ul = document.getElementById("ctModifyList");
    const table = ctRegistry[ctModifyTableId];
    if (!ul || !table) return;

    ul.innerHTML = ctModifyDraft.map((item, idx) => {

        const col = table.columnMap[item.key];

        return `
            <li class="ct-modify-item" draggable="true" data-idx="${idx}"
                ondragstart="ctModifyDragStart(event, ${idx})"
                ondragover="ctModifyDragOver(event, ${idx})"
                ondrop="ctModifyDrop(event, ${idx})"
                ondragend="ctModifyDragEnd(event)">
                <span class="ct-modify-drag">⠿</span>
                <label>
                    <input type="checkbox" ${item.visible ? "checked" : ""} onchange="ctModifyToggle(${idx})">
                    ${col ? col.label : item.key}
                </label>
            </li>
        `;

    }).join("");

}

function ctModifyToggle(idx) {
    ctModifyDraft[idx].visible = !ctModifyDraft[idx].visible;
}

function ctModifyDragStart(e, idx) {
    ctModifyDragIdx = idx;
    e.currentTarget.classList.add("dragging");
}

function ctModifyDragOver(e) {
    e.preventDefault();
}

function ctModifyDrop(e, idx) {

    e.preventDefault();
    if (ctModifyDragIdx === null || ctModifyDragIdx === idx) return;

    const [moved] = ctModifyDraft.splice(ctModifyDragIdx, 1);
    ctModifyDraft.splice(idx, 0, moved);

    ctRenderModifyList();

}

function ctModifyDragEnd() {

    document.querySelectorAll(".ct-modify-item").forEach(li => li.classList.remove("dragging"));
    ctModifyDragIdx = null;

}

function ctApplyModifyPopup() {

    const table = ctRegistry[ctModifyTableId];
    if (!table) return;

    const order = ctModifyDraft.filter(i => i.visible).map(i => i.key);
    table.setVisibleOrder(order);

    ctCloseModifyPopup();

}

function ctResetModifyPopup() {

    const table = ctRegistry[ctModifyTableId];
    if (!table) return;

    table.resetColumns();
    ctCloseModifyPopup();

}