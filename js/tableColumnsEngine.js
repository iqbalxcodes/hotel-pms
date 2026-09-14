// ======================================================
// tableColumnsEngine.js
// Engine UNIVERSAL: visible/order/width kolom (per
// localStorage key) + resize (pointer) + drag-reorder
// header + SATU popup "Modify Table" dipakai bareng semua
// tabel (reservation/folio/guest/dll).
//
// Pakai:
//   const myTable = createColumnTable({
//       storageKey: "unique_key_v1",   // dobel fungsi: localStorage key & ID registry
//       columns: [{ key, label, width }, ...],
//       onChange: () => { /* rerender tabelmu di sini */ }
//   });
//
// Lalu di render header:
//   <colgroup>${ctRenderColgroup(myTable.storageKey)}</colgroup>
//   <tr>${state.visibleOrder.map(k => ctRenderColHeader(myTable.storageKey, k)).join("")}</tr>
//
// Modify Table button:
//   onclick="ctOpenModifyPopup('unique_key_v1')"
// ======================================================

const ctRegistry = {};

function createColumnTable({ storageKey, columns, onChange }) {

    const columnMap = Object.fromEntries(columns.map(c => [c.key, c]));
    const allKeys = columns.map(c => c.key);

    function getState() {

        const raw = localStorage.getItem(storageKey);
        let state;

        if (!raw) {

            state = { visibleOrder: [...allKeys], widths: {} };

        } else {

            try {

                const parsed = JSON.parse(raw);
                const cleanOrder = (parsed.visibleOrder || []).filter(k => columnMap[k]);

                state = {
                    visibleOrder: cleanOrder.length > 0 ? cleanOrder : [...allKeys],
                    widths: parsed.widths || {}
                };

            } catch (e) {

                state = { visibleOrder: [...allKeys], widths: {} };

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

        saveState({ visibleOrder: [...allKeys], widths: {} });
        notify();

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

// opts: { onLabelClick: "jsExprString", indicatorHtml: "<span>▲</span>" }
function ctRenderColHeader(tableId, key, opts = {}) {

    const table = ctRegistry[tableId];
    const col = table ? table.columnMap[key] : null;
    if (!col) return "";

    const clickAttr = opts.onLabelClick ? `onclick="${opts.onLabelClick}"` : "";

    return `
        <th class="ct-th" data-key="${key}"
            ondragover="ctColDragOver(event, '${tableId}', '${key}')"
            ondrop="ctColDrop(event, '${tableId}', '${key}')">
            <span class="ct-col-label" draggable="true" ${clickAttr}
                ondragstart="ctColDragStart('${tableId}', '${key}')"
                ondragend="ctColDragEnd(event)">${col.label}${opts.indicatorHtml || ""}</span>
            <div class="ct-col-resize-handle" onpointerdown="ctColResizeStart(event, '${tableId}', '${key}')"></div>
        </th>
    `;

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
// <col data-ct-col="key" data-ct-table="tableId"> yang match
// (buat kasus banyak instance tabel sama kebuka bareng,
// mis. folio1/2/3).
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
// Modify Table popup — SATU DOM dipakai bareng semua tabel,
// dibind ke tableId yang lagi aktif pas dibuka.
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