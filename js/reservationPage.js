// ======================================================
// reservationPage.js
// Search fields generate dinamis dari RESERVATION_COLUMNS
// (tableConfig.js). Grouped ke kolom <div> max 4/kolom,
// overflow-x scroll kalau kepanjangan.
//
// BARU:
// - Reset button (Search card & Showing card) -- keliatan
//   cuma pas mode customize, klik = balikin urutan/hidden
//   field pencarian ke default.
// - Toggle class .rsv-page-customizing di .rsv-page pas
//   customize mode nyala/mati -- dipakai CSS buat nampilin
//   reset button, page-pill, checkbox Pagination di footer.
// - Checkbox Pagination (footer, mode customize) -- wiring ke
//   rsvSetPaginationEnabled() di reservation.js.
// ======================================================

const RSV_FIELDS_KEY = "rsv_search_fields_config";
const RSV_COLUMN_SIZE = 4;

// kolom yang gak masuk akal buat search manual (computed/internal)
const RSV_SEARCH_EXCLUDE = [
    "nights", "billing_items", "id", "guest_id", "room_id",
    "created_at", "updated_at"
];

const RSV_STATUS_OPTIONS = [
    { value: "", label: "Any" },
    { value: "TENTATIVE", label: "Tentative" },
    { value: "CONFIRMED", label: "Confirmed" },
    { value: "CHECKED_IN", label: "Checked In" },
    { value: "CHECKED_OUT", label: "Checked Out" },
    { value: "CANCELLED", label: "Cancelled" },
    { value: "NO_SHOW", label: "No Show" }
];

const RSV_YESNO_OPTIONS = [
    { value: "", label: "Any" },
    { value: "true", label: "Yes" },
    { value: "false", label: "No" }
];

// generate dari tableConfig.js (harus sudah ke-load duluan di HTML)
const RSV_SEARCH_FIELDS_DEFAULT = (typeof RESERVATION_COLUMNS !== "undefined" ? RESERVATION_COLUMNS : [])
    .filter(c => !RSV_SEARCH_EXCLUDE.includes(c.key))
    .map(c => {
        if(c.key === "status") return { key: c.key, label: c.label, type: "select", options: RSV_STATUS_OPTIONS };
        if(c.type === "boolean") return { key: c.key, label: c.label, type: "select", options: RSV_YESNO_OPTIONS };
        if(c.type === "date" || c.type === "datetime") return { key: c.key, label: c.label, type: "date" };
        return { key: c.key, label: c.label, type: "text" };
    });

let rsvFieldsOrder = [];
let rsvFieldsHidden = [];
let rsvCustomizing = false;
let rsvDragKey = null;

function rsvFieldDef(key) {
    return RSV_SEARCH_FIELDS_DEFAULT.find(f => f.key === key);
}

function rsvLoadFieldConfig() {
    try {
        const saved = JSON.parse(localStorage.getItem(RSV_FIELDS_KEY));
        if (saved && Array.isArray(saved.order)) {
            rsvFieldsOrder = saved.order.filter(k => rsvFieldDef(k));
            RSV_SEARCH_FIELDS_DEFAULT.forEach(f => {
                if (!rsvFieldsOrder.includes(f.key)) rsvFieldsOrder.push(f.key);
            });
            rsvFieldsHidden = Array.isArray(saved.hidden) ? saved.hidden : [];
            return;
        }
    } catch (e) {}
    rsvFieldsOrder = RSV_SEARCH_FIELDS_DEFAULT.map(f => f.key);
    rsvFieldsHidden = [];
}

function rsvSaveFieldConfig() {
    localStorage.setItem(RSV_FIELDS_KEY, JSON.stringify({ order: rsvFieldsOrder, hidden: rsvFieldsHidden }));
}

// ------------------------------------------------------
// Reset ke default -- dipakai tombol reset di Search DAN
// Showing (dua-duanya reset hal yang sama: konfigurasi field
// pencarian, satu-satunya "customizable state" yang ada
// sekarang).
// ------------------------------------------------------

function rsvResetFieldsToDefault(){
    rsvFieldsOrder = RSV_SEARCH_FIELDS_DEFAULT.map(f => f.key);
    rsvFieldsHidden = [];
    rsvSaveFieldConfig();
    rsvRenderFields();
    showMessage && showMessage("Search fields reset ke default", "success");
}

function rsvIcon(name) { return `<i data-lucide="${name}"></i>`; }

function rsvEsc(s) {
    if (typeof escapeHtml === "function") return escapeHtml(s);
    const d = document.createElement("div");
    d.textContent = s ?? "";
    return d.innerHTML;
}

function rsvRenderFieldCard(key, values) {
    const def = rsvFieldDef(key);
    if (!def) return "";

    const savedValue = values[key] || "";
    const isMultiCapable = def.type === "text";

    let inputHtml;
    if (def.type === "select") {
        inputHtml = `<select data-search-key="${def.key}">${def.options.map(o =>
            `<option value="${o.value}" ${o.value === savedValue ? "selected" : ""}>${o.label}</option>`
        ).join("")}</select>`;
    } else {
        const langAttr = def.type === "date" ? `lang="en-GB"` : "";
        inputHtml = `<input type="${def.type}" data-search-key="${def.key}" value="${rsvEsc(savedValue)}" ${langAttr}>`;
    }

    const hideBtnClass = hidden ? "rsv-btn-show" : "rsv-btn-hide";

    return `
        <div class="rsv-field-card ${hidden ? "rsv-field-hidden" : ""}" data-key="${def.key}" draggable="${rsvCustomizing}">
            ${rsvCustomizing ? `<span class="rsv-field-drag">${rsvIcon("grip-vertical")}</span>` : ""}
            <div class="rsv-field">
                <label>${rsvEsc(def.label)}</label>
                ${inputHtml}
            </div>
            ${rsvCustomizing ? `<button class="rsv-field-hide-btn ${hideBtnClass}" data-hide="${def.key}" title="${hidden ? "Show" : "Hide"}">${rsvIcon(hidden ? "plus" : "minus")}</button>` : ""}
        </div>
    `;
}

function rsvRenderFields() {
    const container = document.getElementById("rsvSearchFields");
    if (!container) return;

    container.classList.toggle("rsv-customizing", rsvCustomizing);

    const values = {};
    container.querySelectorAll("[data-search-key]").forEach(el => {
        values[el.dataset.searchKey] = el.value;
    });

    const visibleKeys = rsvFieldsOrder.filter(key => {
        const hidden = rsvFieldsHidden.includes(key);
        return !hidden || rsvCustomizing;
    });

    const columns = [];
    for (let i = 0; i < visibleKeys.length; i += RSV_COLUMN_SIZE) {
        columns.push(visibleKeys.slice(i, i + RSV_COLUMN_SIZE));
    }

    container.innerHTML = columns.map(colKeys => `
        <div class="rsv-search-column">
            ${colKeys.map(key => rsvRenderFieldCard(key, values)).join("")}
        </div>
    `).join("");

    if (window.lucide) lucide.createIcons();

    if (rsvCustomizing) rsvBindCustomizeEvents(container);
}

function rsvBindCustomizeEvents(container) {

    container.querySelectorAll("[data-hide]").forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const key = btn.dataset.hide;
            const idx = rsvFieldsHidden.indexOf(key);
            if (idx === -1) rsvFieldsHidden.push(key);
            else rsvFieldsHidden.splice(idx, 1);
            rsvRenderFields();
        };
    });

    container.querySelectorAll(".rsv-field-card").forEach(card => {

        card.addEventListener("dragstart", () => {
            rsvDragKey = card.dataset.key;
            card.classList.add("rsv-dragging");
        });

        card.addEventListener("dragend", () => {
            card.classList.remove("rsv-dragging");
            container.querySelectorAll(".rsv-field-card").forEach(c =>
                c.classList.remove("rsv-drop-before", "rsv-drop-after"));
            rsvDragKey = null;
        });

        card.addEventListener("dragover", (e) => {
            if (!rsvDragKey || rsvDragKey === card.dataset.key) return;
            e.preventDefault();
            const rect = card.getBoundingClientRect();
            const before = e.clientX < rect.left + rect.width / 2;
            container.querySelectorAll(".rsv-field-card").forEach(c =>
                c.classList.remove("rsv-drop-before", "rsv-drop-after"));
            card.classList.add(before ? "rsv-drop-before" : "rsv-drop-after");
        });

        card.addEventListener("drop", (e) => {
            e.preventDefault();
            if (!rsvDragKey || rsvDragKey === card.dataset.key) return;

            const rect = card.getBoundingClientRect();
            const before = e.clientX < rect.left + rect.width / 2;

            const fromIdx = rsvFieldsOrder.indexOf(rsvDragKey);
            rsvFieldsOrder.splice(fromIdx, 1);

            let toIdx = rsvFieldsOrder.indexOf(card.dataset.key);
            if (!before) toIdx += 1;

            rsvFieldsOrder.splice(toIdx, 0, rsvDragKey);

            rsvRenderFields();
        });
    });
}

// ------------------------------------------------------
// pms:customize-toggle -- dispatch dari pmsTopbar.js. Sekarang
// juga toggle class .rsv-page-customizing (dipakai CSS buat
// nampilin reset button / page-pill / checkbox pagination),
// dan minta renderPaginationBar() re-render footer sesuai mode.
// ------------------------------------------------------

document.addEventListener("pms:customize-toggle", (e) => {
    rsvCustomizing = e.detail.active;
    if (!rsvCustomizing) rsvSaveFieldConfig();

    document.querySelector(".rsv-page")?.classList.toggle("rsv-page-customizing", rsvCustomizing);

    rsvRenderFields();

    if (typeof renderPaginationBar === "function") renderPaginationBar();
});

function rsvLoadLucide(cb) {
    if (window.lucide) { cb(); return; }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/lucide@latest";
    s.onload = cb;
    document.head.appendChild(s);
}

function rsvGatherSearchFields() {
    const fields = {};
    document.querySelectorAll('#rsvSearchForm [data-search-key]').forEach(el => {
        const v = el.value.trim();
        if (v) fields[el.dataset.searchKey] = v;
    });
    return fields;
}

function rsvFieldLabel(key) {
    const def = rsvFieldDef(key);
    return def ? def.label : key;
}

function rsvApplySearch(fields) {
    activeSearchFields = fields;
    currentPage = 1;
    refreshTable();
    rsvRenderChip();
}

function rsvClearSearch() {
    activeSearchFields = {};
    document.querySelectorAll('#rsvSearchForm [data-search-key]').forEach(el => { el.value = ""; });
    currentPage = 1;
    refreshTable();
    rsvRenderChip();
}

function rsvRemoveSearchField(key) {
    delete activeSearchFields[key];

    const el = document.querySelector(`#rsvSearchForm [data-search-key="${key}"]`);
    if (el) el.value = "";

    currentPage = 1;
    refreshTable();
    rsvRenderChip();
}

function rsvRenderChip() {
    const pills = document.getElementById("rsvShowingPills");
    const wrap = document.getElementById("rsvSearchChips");
    if (!pills || !wrap) return;

    const keys = Object.keys(activeSearchFields || {});

    if (keys.length === 0) {
        pills.style.display = "flex";
        wrap.style.display = "none";
        wrap.innerHTML = "";
        return;
    }

    pills.style.display = "none";
    wrap.style.display = "flex";

    wrap.innerHTML = keys.map(k => `
        <span class="rsv-search-chip" data-key="${k}">
            <span>${rsvEsc(rsvFieldLabel(k))}: ${rsvEsc(activeSearchFields[k])}</span>
            <button data-remove="${k}" title="Remove"><i data-lucide="x"></i></button>
        </span>
    `).join("");

    if (window.lucide) lucide.createIcons();

    wrap.querySelectorAll("[data-remove]").forEach(btn => {
        btn.onclick = () => rsvRemoveSearchField(btn.dataset.remove);
    });
}

document.addEventListener("DOMContentLoaded", () => {

    rsvLoadFieldConfig();
    rsvRenderFields();

    const form = document.getElementById("rsvSearchForm");

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const fields = rsvGatherSearchFields();

            if (Object.keys(fields).length === 0) {
                showMessage("Isi minimal satu field pencarian", "error");
                return;
            }

            rsvApplySearch(fields);
        });
    }

    // ---- reset buttons (Search card + Showing card) ----
    document.getElementById("rsvSearchResetBtn")?.addEventListener("click", rsvResetFieldsToDefault);
    document.getElementById("rsvShowingResetBtn")?.addEventListener("click", rsvResetFieldsToDefault);

    // ---- checkbox Pagination (footer, mode customize) ----
    const pagToggle = document.getElementById("rsvPaginationToggle");
    if (pagToggle) {
        pagToggle.checked = (typeof paginationEnabled !== "undefined") ? paginationEnabled : true;
        pagToggle.addEventListener("change", (e) => {
            if (typeof rsvSetPaginationEnabled === "function") {
                rsvSetPaginationEnabled(e.target.checked);
            }
        });
    }

    rsvLoadLucide(() => lucide.createIcons());

});