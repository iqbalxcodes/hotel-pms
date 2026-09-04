// ======================================================
// tableColumns.js
// State kolom tabel (visible/order/width), render header
// dinamis, resize kolom, drag&drop reorder kolom langsung
// di header, dan popup "Modify Table" (preset A-Z, drag &
// drop, click-to-move).
// ======================================================

const TABLE_STATE_KEY = "hotel_pms_table_state_v1";
const TABLE_PRESETS_KEY = "hotel_pms_table_presets_v1";
// NOTE: belum ada login system -> preset masih global (localStorage browser),
// nanti gampang dikaitkan ke user_id saat login system sudah ada.


// ======================================================
// State: current visible columns / order / widths
// ======================================================

function getTableState(){

    const raw = localStorage.getItem(TABLE_STATE_KEY);

    if(!raw){

        return {
            visibleOrder: [...DEFAULT_VISIBLE_COLUMNS],
            widths: {}
        };

    }

    try {

        const parsed = JSON.parse(raw);

        return {
            visibleOrder:
                Array.isArray(parsed.visibleOrder) && parsed.visibleOrder.length > 0
                ? parsed.visibleOrder
                : [...DEFAULT_VISIBLE_COLUMNS],
            widths: parsed.widths || {}
        };

    } catch(e){

        return {
            visibleOrder: [...DEFAULT_VISIBLE_COLUMNS],
            widths: {}
        };

    }

}

function saveTableState(state){

    localStorage.setItem(TABLE_STATE_KEY, JSON.stringify(state));

}


// ======================================================
// Presets storage
// ======================================================

function getPresets(){

    const raw = localStorage.getItem(TABLE_PRESETS_KEY);

    if(!raw) return {};

    try {
        return JSON.parse(raw);
    } catch(e){
        return {};
    }

}

function savePresets(presets){

    localStorage.setItem(TABLE_PRESETS_KEY, JSON.stringify(presets));

}


// ======================================================
// Value Formatting (dipakai oleh reservation.js saat render)
// ======================================================

function calcNightsSimple(arrival, departure){

    if(!arrival || !departure) return "";

    const a = new Date(arrival);
    const d = new Date(departure);

    const diff = Math.round((d - a) / (1000 * 60 * 60 * 24));

    return diff > 0 ? diff : "";

}

function formatDateDisplaySimple(value){

    const d = new Date(value);

    if(isNaN(d)) return value;

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;

}

function formatDateTimeDisplaySimple(value){

    const d = new Date(value);

    if(isNaN(d)) return value;

    const datePart = formatDateDisplaySimple(value);
    const hour = String(d.getHours()).padStart(2, "0");
    const minute = String(d.getMinutes()).padStart(2, "0");

    return `${datePart} ${hour}:${minute}`;

}

function escapeHtmlSimple(str){

    const div = document.createElement("div");
    div.textContent = str;

    return div.innerHTML;

}

function formatColumnValue(key, res){

    const colDef = COLUMN_MAP[key];
    if(!colDef) return "";

    if(key === "nights"){
        return calcNightsSimple(res.arrival_date, res.departure_date);
    }

    const value = res[key];

    if(value === null || value === undefined || value === ""){
        return "";
    }

    switch(colDef.type){

        case "boolean":
            return value ? "Yes" : "No";

        case "date":
            return formatDateDisplaySimple(value);

        case "datetime":
            return formatDateTimeDisplaySimple(value);

        case "money":
            return Number(value).toLocaleString("de-DE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

        default:
            return escapeHtmlSimple(String(value));

    }

}


// ======================================================
// Render Header + Colgroup (dipanggil saat load & saat
// Apply di popup Modify Table, atau saat drag reorder)
//
// - Simbol "↕" statis DIBUANG dari label -- fungsinya
//   (klik = sort) tetap jalan lewat listener di labelSpan.
// - Kolom yang lagi aktif di-sort dapet indikator ▲/▼ kecil,
//   kolom lain polos (gak ada clutter simbol).
// - labelSpan sekarang draggable=true -> bisa di-drag buat
//   reorder kolom langsung di header (gak perlu buka popup
//   Modify Table lagi).
// ======================================================

let thDragKey = null;

function renderTableHeader(){

    const state = getTableState();

    const colgroup = document.getElementById("reservationColgroup");
    const headerRow = document.getElementById("reservationHeaderRow");

    if(!colgroup || !headerRow) return;

    colgroup.innerHTML = "";
    headerRow.innerHTML = "";

    // Kolom checkbox: fixed, tidak resizable/draggable, tidak masuk config
    const checkboxCol = document.createElement("col");
    checkboxCol.style.width = "36px";
    colgroup.appendChild(checkboxCol);

    const checkboxTh = document.createElement("th");
    checkboxTh.innerHTML = `<input type="checkbox" id="selectAll" onchange="toggleAllCheckbox(this)">`;
    headerRow.appendChild(checkboxTh);

    state.visibleOrder.forEach(key => {

        const colDef = COLUMN_MAP[key];
        if(!colDef) return;

        const width = state.widths[key] || DEFAULT_COLUMN_WIDTH;

        const col = document.createElement("col");
        col.id = `col-${key}`;
        col.style.width = width + "px";
        colgroup.appendChild(col);

        const th = document.createElement("th");
        th.className = "resizable-th";
        th.dataset.key = key;

        const labelSpan = document.createElement("span");
        labelSpan.className = "col-header-label";
        labelSpan.textContent = colDef.label;
        labelSpan.draggable = true;

        if(colDef.sortable !== false){

            labelSpan.classList.add("col-header-sortable");
            labelSpan.addEventListener("click", () => sortTable(key));

            // Indikator arah sort -- CUMA muncul di kolom yang lagi aktif
            if(typeof activeSortColumn !== "undefined" && activeSortColumn === key){

                const indicator = document.createElement("span");
                indicator.className = "col-sort-indicator";
                indicator.textContent = sortDirection[key] === "asc" ? " ▲" : " ▼";
                labelSpan.appendChild(indicator);

            }

        }

        // ---- drag source: mulai drag dari label (bukan whole th),
        // biar gak bentrok sama resize handle ----
        labelSpan.addEventListener("dragstart", (e) => {
            thDragKey = key;
            th.classList.add("col-dragging");
            e.dataTransfer.effectAllowed = "move";
        });

        labelSpan.addEventListener("dragend", () => {
            th.classList.remove("col-dragging");
            document.querySelectorAll(".resizable-th").forEach(x =>
                x.classList.remove("col-drop-before", "col-drop-after"));
            thDragKey = null;
        });

        th.appendChild(labelSpan);

        // ---- drop target: whole th, biar area drop lega ----
        th.addEventListener("dragover", (e) => {

            if(!thDragKey || thDragKey === key) return;

            e.preventDefault();

            const rect = th.getBoundingClientRect();
            const before = e.clientX < rect.left + rect.width / 2;

            document.querySelectorAll(".resizable-th").forEach(x =>
                x.classList.remove("col-drop-before", "col-drop-after"));
            th.classList.add(before ? "col-drop-before" : "col-drop-after");

        });

        th.addEventListener("drop", (e) => {

            e.preventDefault();

            if(!thDragKey || thDragKey === key) return;

            const rect = th.getBoundingClientRect();
            const before = e.clientX < rect.left + rect.width / 2;

            reorderColumn(thDragKey, key, before);

        });

        const handle = document.createElement("div");
        handle.className = "col-resize-handle";
        handle.draggable = false;
        handle.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            startColumnResize(e, key);
        });
        th.appendChild(handle);

        headerRow.appendChild(th);

    });

}

// ------------------------------------------------------
// Drag&drop reorder: pindahin draggedKey ke sebelum/sesudah
// targetKey di visibleOrder, simpan, render ulang.
// ------------------------------------------------------

function reorderColumn(draggedKey, targetKey, before){

    const state = getTableState();
    const arr = state.visibleOrder;

    const from = arr.indexOf(draggedKey);
    if(from === -1) return;

    arr.splice(from, 1);

    let to = arr.indexOf(targetKey);

    if(to === -1){

        arr.push(draggedKey);

    } else {

        if(!before) to += 1;
        arr.splice(to, 0, draggedKey);

    }

    saveTableState(state);

    renderTableHeader();

    if(typeof refreshTable === "function"){
        refreshTable();
    }

}


// ======================================================
// Column Resize (drag di header, body ikut via colgroup)
// ======================================================

let resizeState = null;

function startColumnResize(e, key){

    e.preventDefault();
    e.stopPropagation();

    const col = document.getElementById(`col-${key}`);
    if(!col) return;

    resizeState = {
        key,
        startX: e.clientX,
        startWidth: col.getBoundingClientRect().width
    };

    document.addEventListener("mousemove", handleColumnResizeMove);
    document.addEventListener("mouseup", endColumnResize);

}

function handleColumnResizeMove(e){

    if(!resizeState) return;

    const delta = e.clientX - resizeState.startX;
    const newWidth = Math.max(60, Math.round(resizeState.startWidth + delta));

    const col = document.getElementById(`col-${resizeState.key}`);
    if(col){
        col.style.width = newWidth + "px";
    }

}

function endColumnResize(){

    if(!resizeState) return;

    const col = document.getElementById(`col-${resizeState.key}`);

    if(col){

        const width = parseInt(col.style.width, 10);

        const state = getTableState();
        state.widths[resizeState.key] = width;
        saveTableState(state);

    }

    resizeState = null;

    document.removeEventListener("mousemove", handleColumnResizeMove);
    document.removeEventListener("mouseup", endColumnResize);

}


// ======================================================
// Modify Table Popup — draft state (belum di-Apply)
// ======================================================

let draftShowing = [];
let draftHiding = [];

let dragSourceKey = null;
let dragSourceList = null; // "showing" | "hiding"

function toggleModifyMode(){

    const popup = document.getElementById("modifyTablePopup");
    if(!popup) return;

    if(popup.style.display === "block"){
        closeModifyPopup();
    } else {
        openModifyPopup();
    }

}

function openModifyPopup(){

    const state = getTableState();

    draftShowing = [...state.visibleOrder];

    draftHiding = RESERVATION_COLUMNS
        .map(c => c.key)
        .filter(k => !draftShowing.includes(k));

    // Sesuai spec: list ditampilkan urut A-Z saat popup dibuka.
    // Setelah itu urutan berubah mengikuti drag/klik user, tidak
    // di-resort ulang otomatis.
    draftShowing.sort((a, b) => COLUMN_MAP[a].label.localeCompare(COLUMN_MAP[b].label));
    draftHiding.sort((a, b) => COLUMN_MAP[a].label.localeCompare(COLUMN_MAP[b].label));

    const titleInput = document.getElementById("presetTitleInput");
    if(titleInput) titleInput.value = "";

    populatePresetDropdown();
    renderColumnLists();

    document.getElementById("modifyTablePopup").style.display = "block";

}

function closeModifyPopup(){

    const popup = document.getElementById("modifyTablePopup");
    if(popup) popup.style.display = "none";

}

function renderColumnLists(){

    const showingUl = document.getElementById("columnShowingList");
    const hidingUl = document.getElementById("columnHidingList");

    if(!showingUl || !hidingUl) return;

    showingUl.innerHTML = "";
    hidingUl.innerHTML = "";

    draftShowing.forEach(key => showingUl.appendChild(buildColumnListItem(key, "showing")));
    draftHiding.forEach(key => hidingUl.appendChild(buildColumnListItem(key, "hiding")));

}

function getListArray(listName){
    return listName === "showing" ? draftShowing : draftHiding;
}

function buildColumnListItem(key, listName){

    const colDef = COLUMN_MAP[key];

    const li = document.createElement("li");
    li.className = "column-list-item";
    li.draggable = true;
    li.dataset.key = key;
    li.dataset.list = listName;
    li.innerText = colDef ? colDef.label : key;

    // Klik = pindah otomatis ke list satunya (masuk di posisi paling akhir)
    li.addEventListener("click", () => {
        moveColumnBetweenLists(key, listName);
    });

    li.addEventListener("dragstart", (e) => {
        dragSourceKey = key;
        dragSourceList = listName;
        e.dataTransfer.effectAllowed = "move";
        li.classList.add("dragging");
    });

    li.addEventListener("dragend", () => {
        li.classList.remove("dragging");
        dragSourceKey = null;
        dragSourceList = null;
    });

    li.addEventListener("dragover", (e) => {

        e.preventDefault();

        const rect = li.getBoundingClientRect();
        const isAfter = (e.clientY - rect.top) > rect.height / 2;

        li.classList.toggle("drop-before", !isAfter);
        li.classList.toggle("drop-after", isAfter);

    });

    li.addEventListener("dragleave", () => {
        li.classList.remove("drop-before", "drop-after");
    });

    li.addEventListener("drop", (e) => {

        e.preventDefault();
        e.stopPropagation();

        li.classList.remove("drop-before", "drop-after");

        if(dragSourceKey === null) return;

        const rect = li.getBoundingClientRect();
        const isAfter = (e.clientY - rect.top) > rect.height / 2;

        moveColumnToPosition(dragSourceKey, dragSourceList, listName, key, isAfter);

    });

    return li;

}

function moveColumnBetweenLists(key, currentList){

    const targetList = currentList === "showing" ? "hiding" : "showing";

    const sourceArr = getListArray(currentList);
    const targetArr = getListArray(targetList);

    const idx = sourceArr.indexOf(key);
    if(idx === -1) return;

    sourceArr.splice(idx, 1);
    targetArr.push(key);

    renderColumnLists();

}

function moveColumnToPosition(key, sourceList, targetList, targetKey, insertAfter){

    const sourceArr = getListArray(sourceList);
    const targetArr = getListArray(targetList);

    const sourceIdx = sourceArr.indexOf(key);
    if(sourceIdx === -1) return;

    sourceArr.splice(sourceIdx, 1);

    let targetIdx = targetArr.indexOf(targetKey);

    if(targetIdx === -1){

        targetArr.push(key);

    } else {

        if(insertAfter) targetIdx += 1;

        targetArr.splice(targetIdx, 0, key);

    }

    renderColumnLists();

}

function setupListContainerDragDrop(ulElement, listName){

    if(!ulElement) return;

    ulElement.addEventListener("dragover", (e) => {
        e.preventDefault();
    });

    ulElement.addEventListener("drop", (e) => {

        e.preventDefault();

        // kalau drop kena li, li sendiri yang handle (event sudah di-stopPropagation)
        if(e.target !== ulElement) return;

        if(dragSourceKey === null) return;

        const sourceArr = getListArray(dragSourceList);
        const targetArr = getListArray(listName);

        const idx = sourceArr.indexOf(dragSourceKey);
        if(idx === -1) return;

        sourceArr.splice(idx, 1);
        targetArr.push(dragSourceKey);

        renderColumnLists();

    });

}


// ======================================================
// Apply / Save / Delete Preset
// ======================================================

function applyColumnChanges(){

    const state = getTableState();

    state.visibleOrder = [...draftShowing];

    saveTableState(state);

    closeModifyPopup();

    renderTableHeader();
    refreshTable();

}

function savePresetFromInput(){

    const nameRaw = document.getElementById("presetTitleInput").value.trim();

    if(!nameRaw){
        showMessage("Nama preset tidak boleh kosong", "error");
        return;
    }

    const presets = getPresets();

    // Nama diawali "-" -> hapus preset itu
    if(nameRaw.startsWith("-")){

        const nameToDelete = nameRaw.slice(1).trim();

        if(presets[nameToDelete]){

            delete presets[nameToDelete];
            savePresets(presets);

            showMessage(`Preset "${nameToDelete}" dihapus`, "success");
            populatePresetDropdown();

        } else {

            showMessage(`Preset "${nameToDelete}" tidak ditemukan`, "error");

        }

        return;

    }

    const isReplace = !!presets[nameRaw];

    presets[nameRaw] = {
        visibleOrder: [...draftShowing],
        widths: { ...getTableState().widths }
    };

    savePresets(presets);

    showMessage(
        isReplace ? `Preset "${nameRaw}" diperbarui` : `Preset "${nameRaw}" disimpan`,
        "success"
    );

    populatePresetDropdown();

}

function populatePresetDropdown(){

    const select = document.getElementById("presetSelect");
    if(!select) return;

    const presets = getPresets();

    select.innerHTML = `<option value="">-- Select Preset --</option>`;

    Object.keys(presets).sort().forEach(name => {

        const opt = document.createElement("option");
        opt.value = name;
        opt.innerText = name;

        select.appendChild(opt);

    });

}

function loadSelectedPreset(name){

    if(!name) return;

    const presets = getPresets();
    const preset = presets[name];

    if(!preset) return;

    draftShowing = [...preset.visibleOrder];

    draftHiding = RESERVATION_COLUMNS
        .map(c => c.key)
        .filter(k => !draftShowing.includes(k))
        .sort((a, b) => COLUMN_MAP[a].label.localeCompare(COLUMN_MAP[b].label));

    renderColumnLists();

}


// ======================================================
// Init
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    setupListContainerDragDrop(document.getElementById("columnShowingList"), "showing");
    setupListContainerDragDrop(document.getElementById("columnHidingList"), "hiding");

});