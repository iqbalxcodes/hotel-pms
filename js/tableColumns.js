// ======================================================
// tableColumns.js
// State kolom tabel (visible/order/width), render header
// dinamis, resize kolom (Pointer Events, robust drag), drag&drop
// reorder kolom langsung di header, popup "Modify Table", dan
// running-text + edge-blur untuk label header yang kepanjangan.
// ======================================================

const TABLE_STATE_KEY = "hotel_pms_table_state_v1";
const TABLE_PRESETS_KEY = "hotel_pms_table_presets_v1";


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
// Value Formatting
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
// Header label: fade-right by default, hover -> slides to
// reveal the cut-off tail with fade on BOTH edges.
//
// Structure: .col-header-label-wrap (fixed-width viewport,
// overflow:hidden, carries the mask) > .col-header-label
// (inner, natural full width, gets translateX on hover).
// The wrap is what visually clips -- translating the inner
// span within it is what reveals the hidden tail; a label that
// clips itself and then moves wouldn't reveal anything new.
// ======================================================

function bindHeaderLabelMarquee(wrap){

    const inner = wrap.querySelector(".col-header-label");
    if(!inner) return;

    wrap.addEventListener("mouseenter", () => {

        const over = inner.scrollWidth - wrap.clientWidth;
        if(over <= 1) return;

        wrap.classList.remove("col-label-fade");
        wrap.classList.add("col-label-fade-both");

        inner.style.transitionDuration = Math.max(0.4, over / 40) + "s";
        inner.style.transform = `translateX(-${over}px)`;

    });

    wrap.addEventListener("mouseleave", () => {

        inner.style.transform = "translateX(0)";
        inner.style.transitionDuration = ".3s";

        setTimeout(() => applyHeaderLabelFade(wrap), 300);

    });

}

function applyHeaderLabelFade(wrap){

    if(!wrap.isConnected) return;

    const inner = wrap.querySelector(".col-header-label");
    if(!inner) return;

    const overflowing = inner.scrollWidth - wrap.clientWidth > 1;

    wrap.classList.toggle("col-label-fade", overflowing);
    wrap.classList.remove("col-label-fade-both");

}

function initHeaderLabelFades(headerRow){

    headerRow.querySelectorAll(".col-header-label-wrap").forEach(wrap => {
        bindHeaderLabelMarquee(wrap);
        applyHeaderLabelFade(wrap);
    });

}


// ======================================================
// Render Header + Colgroup
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

        // ---- label wrap (viewport, draggable, clickable to sort) ----
        const labelWrap = document.createElement("span");
        labelWrap.className = "col-header-label-wrap";
        labelWrap.draggable = true;

        const labelInner = document.createElement("span");
        labelInner.className = "col-header-label";
        labelInner.textContent = colDef.label;
        labelWrap.appendChild(labelInner);

        if(colDef.sortable !== false){

            labelWrap.classList.add("col-header-sortable");
            labelWrap.addEventListener("click", () => sortTable(key));

        }

        labelWrap.addEventListener("dragstart", (e) => {
            thDragKey = key;
            th.classList.add("col-dragging");
            e.dataTransfer.effectAllowed = "move";
        });

        labelWrap.addEventListener("dragend", () => {
            th.classList.remove("col-dragging");
            document.querySelectorAll(".resizable-th").forEach(x =>
                x.classList.remove("col-drop-before", "col-drop-after"));
            thDragKey = null;
        });

        th.appendChild(labelWrap);

        // Indikator arah sort -- sibling di luar label wrap, biar gak
        // ikut ke-translate pas marquee jalan.
        if(colDef.sortable !== false &&
           typeof activeSortColumn !== "undefined" &&
           activeSortColumn === key){

            const indicator = document.createElement("span");
            indicator.className = "col-sort-indicator";
            indicator.textContent = sortDirection[key] === "asc" ? " ▲" : " ▼";
            th.appendChild(indicator);

        }

        // ---- drop target: whole th ----
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

        // ---- resize handle: Pointer Events + capture, robust drag ----
        const handle = document.createElement("div");
        handle.className = "col-resize-handle";
        handle.draggable = false;

        let resizeStarted = false;

        handle.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            e.preventDefault();
            resizeStarted = true;
            startColumnResize(e, key);
        });

        // fallback mouse (kalau browser/device gak fire pointerdown dgn benar)
        handle.addEventListener("mousedown", (e) => {
            if (resizeStarted) { resizeStarted = false; return; }
            e.stopPropagation();
            e.preventDefault();
            startColumnResize({ clientX: e.clientX, currentTarget: handle, pointerId: -1 }, key);
        });

        th.appendChild(handle);

    });

    initHeaderLabelFades(headerRow);

}

// ------------------------------------------------------
// Drag&drop reorder
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
// Column Resize (Pointer Events -- setPointerCapture keeps the
// drag alive even if the pointer moves fast off the 6px handle,
// which is what made mousedown/mousemove flaky before)
// ======================================================

let resizeState = null;

function startColumnResize(e, key){

    const col = document.getElementById(`col-${key}`);
    if(!col) return;

    const handle = e.currentTarget;
    const usePointer = e.pointerId !== -1;

    if(usePointer){
        try { handle.setPointerCapture(e.pointerId); } catch(err) {}
    }

    resizeState = {
        key,
        pointerId: e.pointerId,
        handle,
        usePointer,
        startX: e.clientX,
        startWidth: col.getBoundingClientRect().width
    };

    document.body.classList.add("col-resizing");

    if(usePointer){
        handle.addEventListener("pointermove", handleColumnResizeMove);
        handle.addEventListener("pointerup", endColumnResize);
        handle.addEventListener("pointercancel", endColumnResize);
    } else {
        document.addEventListener("mousemove", handleColumnResizeMove);
        document.addEventListener("mouseup", endColumnResize);
    }

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

function endColumnResize(e){

    if(!resizeState) return;

    const col = document.getElementById(`col-${resizeState.key}`);

    if(col){
        const width = parseInt(col.style.width, 10);
        const state = getTableState();
        state.widths[resizeState.key] = width;
        saveTableState(state);
    }

    const { handle, pointerId, key, usePointer } = resizeState;

    if(usePointer){
        handle.removeEventListener("pointermove", handleColumnResizeMove);
        handle.removeEventListener("pointerup", endColumnResize);
        handle.removeEventListener("pointercancel", endColumnResize);
        try { handle.releasePointerCapture(pointerId); } catch(err) {}
    } else {
        document.removeEventListener("mousemove", handleColumnResizeMove);
        document.removeEventListener("mouseup", endColumnResize);
    }

    document.body.classList.remove("col-resizing");

    const wrap = document.querySelector(`.resizable-th[data-key="${key}"] .col-header-label-wrap`);
    if(wrap) applyHeaderLabelFade(wrap);

    if (typeof refreshCellFadeForColumn === "function") refreshCellFadeForColumn(key);

    resizeState = null;

}

// ======================================================
// Modify Table Popup — draft state (belum di-Apply)
// ======================================================

let draftShowing = [];
let draftHiding = [];

let dragSourceKey = null;
let dragSourceList = null;

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

    // Render header tabel reservation
    // HARUS dilakukan setelah DOM tersedia.
    renderTableHeader();

    // Setup drag & drop pada popup Modify Table
    setupListContainerDragDrop(
        document.getElementById("columnShowingList"),
        "showing"
    );

    setupListContainerDragDrop(
        document.getElementById("columnHidingList"),
        "hiding"
    );

});