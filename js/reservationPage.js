// ======================================================
// reservationPage.js
// Search fields sekarang dirender dinamis dari config (order +
// hidden), disimpan di localStorage. Mode "customize" dipicu dari
// tombol customize di pmsTopbar (event "pms:customize-toggle") --
// pas aktif: tiap field card dapet border putus-putus + tombol
// minus (hide) / plus (show), dan bisa di-drag&drop reorder.
// Search state (activeSearchFields) & query logic ada di
// reservationFilter.js -- file ini cuma UI glue.
// ======================================================

const RSV_FIELDS_KEY = "rsv_search_fields_config";

const RSV_SEARCH_FIELDS_DEFAULT = [
    { key: "confirmation_no", label: "Confirmation No", type: "text" },
    { key: "guest_name", label: "Guest Name", type: "text" },
    { key: "status", label: "Status", type: "select", options: [
        { value: "", label: "Any" },
        { value: "PENDING", label: "Pending" },
        { value: "CONFIRMED", label: "Confirmed" },
        { value: "CHECKED_IN", label: "Checked In" },
        { value: "CHECKED_OUT", label: "Checked Out" },
        { value: "CANCELLED", label: "Cancelled" },
        { value: "NO_SHOW", label: "No Show" }
    ]},
    { key: "booker_name", label: "Booker Name", type: "text" },
    { key: "room_number", label: "Room", type: "text" },
    { key: "arrival_date", label: "Arrival Date", type: "date" },
    { key: "departure_date", label: "Departure Date", type: "date" },
    { key: "travel_agent", label: "Travel Agent", type: "text" },
    { key: "room_type", label: "Room Type", type: "text" },
    { key: "company", label: "Company", type: "text" },
    { key: "rate_name", label: "Rate Name", type: "text" },
    { key: "booking_channel", label: "Booking Channel", type: "text" }
];

let rsvFieldsOrder = [];
let rsvFieldsHidden = [];
let rsvCustomizing = false;
let rsvDragKey = null;

// ------------------------------------------------------
// config persistence
// ------------------------------------------------------

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
// render
// ------------------------------------------------------

function rsvIcon(name) { return `<i data-lucide="${name}"></i>`; }

function rsvEsc(s) {
    if (typeof escapeHtml === "function") return escapeHtml(s);
    const d = document.createElement("div");
    d.textContent = s ?? "";
    return d.innerHTML;
}

function rsvRenderFields() {
    const container = document.getElementById("rsvSearchFields");
    if (!container) return;

    container.classList.toggle("rsv-customizing", rsvCustomizing);

    // simpan value yang lagi diketik user biar gak ilang pas re-render
    const values = {};
    container.querySelectorAll("[data-search-key]").forEach(el => {
        values[el.dataset.searchKey] = el.value;
    });

    container.innerHTML = rsvFieldsOrder.map(key => {
        const def = rsvFieldDef(key);
        if (!def) return "";

        const hidden = rsvFieldsHidden.includes(key);
        if (hidden && !rsvCustomizing) return "";

        const savedValue = values[key] || "";

        let inputHtml;
        if (def.type === "select") {
            inputHtml = `<select data-search-key="${def.key}">${def.options.map(o =>
                `<option value="${o.value}" ${o.value === savedValue ? "selected" : ""}>${o.label}</option>`
            ).join("")}</select>`;
        } else {
            inputHtml = `<input type="${def.type}" data-search-key="${def.key}" value="${rsvEsc(savedValue)}">`;
        }

        return `
            <div class="rsv-field-card ${hidden ? "rsv-field-hidden" : ""}" data-key="${def.key}" draggable="${rsvCustomizing}">
                ${rsvCustomizing ? `<span class="rsv-field-drag">${rsvIcon("grip-vertical")}</span>` : ""}
                <div class="rsv-field">
                    <label>${rsvEsc(def.label)}</label>
                    ${inputHtml}
                </div>
                ${rsvCustomizing ? `<button class="rsv-field-hide-btn" data-hide="${def.key}" title="${hidden ? "Show" : "Hide"}">${rsvIcon(hidden ? "plus" : "minus")}</button>` : ""}
            </div>
        `;
    }).join("");

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
// customize toggle (dari tombol pmsTopbar)
// ------------------------------------------------------

document.addEventListener("pms:customize-toggle", (e) => {
    rsvCustomizing = e.detail.active;
    if (!rsvCustomizing) rsvSaveFieldConfig();
    rsvRenderFields();
});

// ------------------------------------------------------
// search: gather / apply / clear / chips (logic lama, sekarang
// baca dari field yang dirender dinamis di atas)
// ------------------------------------------------------

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

// ------------------------------------------------------
// init
// ------------------------------------------------------

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

    rsvLoadLucide(() => lucide.createIcons());

});