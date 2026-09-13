// ======================================================
// folioTableColumns.js
// Config kolom tabel folio (resize/drag-reorder/show-hide),
// mirip pola tableColumns.js punya reservation tapi versi
// ringkas -- cuma 5 kolom (qty/name/tax/price/end price).
//
// State DISIMPAN GLOBAL (localStorage), bukan per-container,
// karena ini satu "jenis" tabel yang sama dipakai di semua
// folio1/2/3/dst -- ganti kolom di satu folio otomatis kepake
// di semua folio yang lagi kebuka (folioRerenderAll).
// ======================================================

const FOLIO_COLUMNS = [
    { key: "quantity", label: "Qty", width: 46 },
    { key: "service_name", label: "Name Service", width: 150 },
    { key: "tax_rate", label: "Tax", width: 44 },
    { key: "unit_price", label: "Price", width: 78 },
    { key: "end_price", label: "End Price", width: 88 }
];

const FOLIO_COLUMN_MAP = Object.fromEntries(FOLIO_COLUMNS.map(c => [c.key, c]));

const FOLIO_TABLE_STATE_KEY = "hotel_pms_folio_table_state_v1";

function getFolioTableState() {

    const allKeys = FOLIO_COLUMNS.map(c => c.key);
    const raw = localStorage.getItem(FOLIO_TABLE_STATE_KEY);

    let state;

    if (!raw) {

        state = { visibleOrder: [...allKeys], widths: {} };

    } else {

        try {

            const parsed = JSON.parse(raw);
            const cleanOrder = (parsed.visibleOrder || []).filter(k => FOLIO_COLUMN_MAP[k]);

            state = {
                visibleOrder: cleanOrder.length > 0 ? cleanOrder : [...allKeys],
                widths: parsed.widths || {}
            };

        } catch (e) {

            state = { visibleOrder: [...allKeys], widths: {} };

        }

    }

    saveFolioTableState(state);
    return state;

}

function saveFolioTableState(state) {
    localStorage.setItem(FOLIO_TABLE_STATE_KEY, JSON.stringify(state));
}

// Re-render SEMUA folio yang lagi kebuka (folio1/2/3) supaya
// perubahan kolom (resize/reorder/show-hide) langsung kepake
// di semua tabel serentak.
function folioRerenderAll() {

    Object.values(FolioInstances).forEach(state => {
        if (state) FolioUI.render(state);
    });

}


// ======================================================
// Drag reorder kolom (drag label header)
// ======================================================

let folioDragKey = null;

function folioColDragStart(e, key) {

    folioDragKey = key;
    e.dataTransfer.effectAllowed = "move";

}

function folioColDragOver(e, key) {

    if (!folioDragKey || folioDragKey === key) return;

    e.preventDefault();

    const th = e.currentTarget;
    const rect = th.getBoundingClientRect();
    const before = e.clientX < rect.left + rect.width / 2;

    document.querySelectorAll(".folio-resizable-th").forEach(x =>
        x.classList.remove("folio-col-drop-before", "folio-col-drop-after"));

    th.classList.add(before ? "folio-col-drop-before" : "folio-col-drop-after");

}

function folioColDrop(e, key) {

    e.preventDefault();

    document.querySelectorAll(".folio-resizable-th").forEach(x =>
        x.classList.remove("folio-col-drop-before", "folio-col-drop-after"));

    if (!folioDragKey || folioDragKey === key) return;

    const th = e.currentTarget;
    const rect = th.getBoundingClientRect();
    const before = e.clientX < rect.left + rect.width / 2;

    const state = getFolioTableState();
    const arr = state.visibleOrder;

    const from = arr.indexOf(folioDragKey);
    if (from !== -1) arr.splice(from, 1);

    let to = arr.indexOf(key);

    if (to === -1) {
        arr.push(folioDragKey);
    } else {
        if (!before) to += 1;
        arr.splice(to, 0, folioDragKey);
    }

    saveFolioTableState(state);
    folioDragKey = null;

    folioRerenderAll();

}

function folioColDragEnd() {
    folioDragKey = null;
}


// ======================================================
// Resize kolom (Pointer Events)
// ======================================================

let folioResizeState = null;

function folioColResizeStart(e, key) {

    e.stopPropagation();
    e.preventDefault();

    const handle = e.currentTarget;
    const th = handle.closest("th");
    if (!th) return;

    folioResizeState = {
        key,
        handle,
        pointerId: e.pointerId,
        startX: e.clientX,
        startWidth: th.getBoundingClientRect().width
    };

    try { handle.setPointerCapture(e.pointerId); } catch (err) {}

    handle.addEventListener("pointermove", folioColResizeMove);
    handle.addEventListener("pointerup", folioColResizeEnd);
    handle.addEventListener("pointercancel", folioColResizeEnd);

    document.body.classList.add("col-resizing");

}

function folioColResizeMove(e) {

    if (!folioResizeState) return;

    const delta = e.clientX - folioResizeState.startX;
    const newWidth = Math.max(30, Math.round(folioResizeState.startWidth + delta));

    // live-update semua <col> dgn key ini, di SEMUA tabel folio yang kebuka
    document.querySelectorAll(`col[data-folio-col="${folioResizeState.key}"]`).forEach(col => {
        col.style.width = newWidth + "px";
    });

}

function folioColResizeEnd(e) {

    if (!folioResizeState) return;

    const { key, handle, pointerId, startX, startWidth } = folioResizeState;
    const delta = e.clientX - startX;
    const newWidth = Math.max(30, Math.round(startWidth + delta));

    const state = getFolioTableState();
    state.widths[key] = newWidth;
    saveFolioTableState(state);

    handle.removeEventListener("pointermove", folioColResizeMove);
    handle.removeEventListener("pointerup", folioColResizeEnd);
    handle.removeEventListener("pointercancel", folioColResizeEnd);
    try { handle.releasePointerCapture(pointerId); } catch (err) {}

    document.body.classList.remove("col-resizing");

    folioResizeState = null;
    folioRerenderAll();

}


// ======================================================
// Modify Table popup (show/hide + reorder kolom)
// Popup dibikin sekali via JS, ditempel ke <body> -- gak
// perlu nambah markup apa2 di html host page (reservation-
// detail, cashiering, guest, invoice, dst).
// ======================================================

let folioModifyDraft = null;
let folioModifyDragIdx = null;

function folioEnsureModifyPopup() {

    if (document.getElementById("folioModifyPopup")) return;

    const div = document.createElement("div");
    div.id = "folioModifyPopup";
    div.className = "folio-modify-popup";
    div.style.display = "none";

    div.innerHTML = `
        <div class="folio-modify-popup-inner">
            <div class="folio-modify-popup-header">
                <span>Modify Table</span>
                <button class="folio-icon-btn" onclick="folioCloseModifyPopup()">✕</button>
            </div>
            <ul id="folioModifyList" class="folio-modify-list"></ul>
            <div class="folio-modify-popup-footer">
                <button class="folio-btn folio-btn-plain" onclick="folioResetModifyPopup()">Reset</button>
                <button class="folio-btn folio-icon-confirm" onclick="folioApplyModifyPopup()">Apply</button>
            </div>
        </div>
    `;

    document.body.appendChild(div);

    // klik di luar box popup -> tutup
    div.addEventListener("click", (e) => {
        if (e.target === div) folioCloseModifyPopup();
    });

}

function folioOpenModifyPopup() {

    folioEnsureModifyPopup();

    const state = getFolioTableState();
    const hidden = FOLIO_COLUMNS.map(c => c.key).filter(k => !state.visibleOrder.includes(k));

    folioModifyDraft = [...state.visibleOrder, ...hidden].map(key => ({
        key,
        visible: state.visibleOrder.includes(key)
    }));

    folioRenderModifyList();
    document.getElementById("folioModifyPopup").style.display = "flex";

}

function folioCloseModifyPopup() {

    const popup = document.getElementById("folioModifyPopup");
    if (popup) popup.style.display = "none";

}

function folioRenderModifyList() {

    const ul = document.getElementById("folioModifyList");
    if (!ul) return;

    ul.innerHTML = folioModifyDraft.map((item, idx) => {

        const col = FOLIO_COLUMN_MAP[item.key];

        return `
            <li class="folio-modify-item" draggable="true" data-idx="${idx}"
                ondragstart="folioModifyDragStart(event, ${idx})"
                ondragover="folioModifyDragOver(event, ${idx})"
                ondrop="folioModifyDrop(event, ${idx})"
                ondragend="folioModifyDragEnd(event)">
                <span class="folio-modify-drag">⠿</span>
                <label>
                    <input type="checkbox" ${item.visible ? "checked" : ""} onchange="folioModifyToggle(${idx})">
                    ${col ? col.label : item.key}
                </label>
            </li>
        `;

    }).join("");

}

function folioModifyToggle(idx) {
    folioModifyDraft[idx].visible = !folioModifyDraft[idx].visible;
}

function folioModifyDragStart(e, idx) {
    folioModifyDragIdx = idx;
    e.currentTarget.classList.add("dragging");
}

function folioModifyDragOver(e) {
    e.preventDefault();
}

function folioModifyDrop(e, idx) {

    e.preventDefault();
    if (folioModifyDragIdx === null || folioModifyDragIdx === idx) return;

    const [moved] = folioModifyDraft.splice(folioModifyDragIdx, 1);
    folioModifyDraft.splice(idx, 0, moved);

    folioRenderModifyList();

}

function folioModifyDragEnd() {

    document.querySelectorAll(".folio-modify-item").forEach(li => li.classList.remove("dragging"));
    folioModifyDragIdx = null;

}

function folioApplyModifyPopup() {

    const state = getFolioTableState();
    state.visibleOrder = folioModifyDraft.filter(i => i.visible).map(i => i.key);

    if (state.visibleOrder.length === 0) {
        state.visibleOrder = [FOLIO_COLUMNS[0].key]; // minimal 1 kolom, jangan sampe tabel kosong total
    }

    saveFolioTableState(state);
    folioCloseModifyPopup();
    folioRerenderAll();

}

function folioResetModifyPopup() {

    saveFolioTableState({ visibleOrder: FOLIO_COLUMNS.map(c => c.key), widths: {} });
    folioCloseModifyPopup();
    folioRerenderAll();

}