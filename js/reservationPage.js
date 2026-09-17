// ======================================================
// reservationPage.js
// Field search sekarang pakai searchCardEngine.js
// (createSearchCard) -- generate/drag-reorder/show-hide/date-
// parser/magnifier semua di-handle engine. File ini cuma
// nyambungin: config field spesifik reservation + logic
// apply-search (activeSearchFields, refreshTable, chip).
// ======================================================

const RSV_FIELDS_KEY = "rsv_search_fields_config";

const RSV_SEARCH_EXCLUDE = [
    "nights", "billing_items", "id", "guest_id", "room_id",
    "created_at", "updated_at",
    "currency", "tax", "discount", "paid_amount", "room_rate",
    "payment_method", "pending_to_charge", "additional_guest",
    "notes", "secondary_guest_first_name", "secondary_guest_last_name",
    "bed_type", "salutation", "language", "cancel_policy",
    "travel_reason", "check_in_at", "check_out_at"
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

const RSV_MAGNIFIER_FIELDS = ["guest_name", "room_number", "room_type", "rate_name", "company", "travel_agent", "booker_name"];

const RSV_SEARCH_FIELDS_DEFAULT = (typeof RESERVATION_COLUMNS !== "undefined" ? RESERVATION_COLUMNS : [])
    .filter(c => !RSV_SEARCH_EXCLUDE.includes(c.key))
    .map(c => {
        if (c.key === "status") return { key: c.key, label: c.label, type: "select", options: RSV_STATUS_OPTIONS };
        if (c.type === "boolean") return { key: c.key, label: c.label, type: "select", options: RSV_YESNO_OPTIONS };
        if (c.type === "date" || c.type === "datetime") return { key: c.key, label: c.label, type: "date" };
        return { key: c.key, label: c.label, type: "text" };
    });

const rsvSearchCard = createSearchCard({
    storageKey: RSV_FIELDS_KEY,
    containerId: "rsvSearchFields",
    fields: RSV_SEARCH_FIELDS_DEFAULT,
    magnifierFields: RSV_MAGNIFIER_FIELDS
});

let rsvCustomizing = false;

function rsvResetFieldsToDefault() {
    rsvSearchCard.resetToDefault();
}

function rsvGatherSearchFields() {
    return rsvSearchCard.gatherValues();
}

function rsvFieldLabel(key) {
    return rsvSearchCard.fieldLabel(key);
}

function rsvFormatFieldValue(key, value) {
    return rsvSearchCard.formatValue(key, value);
}

function rsvApplySearch(fields) {
    activeSearchFields = fields;
    currentPage = 1;
    refreshTable();
    rsvRenderChip();
}

function rsvClearSearch() {
    activeSearchFields = {};
    rsvSearchCard.clearValues();
    currentPage = 1;
    refreshTable();
    rsvRenderChip();
}

function rsvRemoveSearchField(key) {
    delete activeSearchFields[key];

    const el = document.querySelector(`#rsvSearchFields [data-search-key="${key}"]`);
    if (el) el.value = "";

    currentPage = 1;
    refreshTable();
    rsvRenderChip();
}

function rsvEsc(s) {
    if (typeof escapeHtml === "function") return escapeHtml(s);
    const d = document.createElement("div");
    d.textContent = s ?? "";
    return d.innerHTML;
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
            <span>${rsvEsc(rsvFieldLabel(k))}: ${rsvEsc(rsvFormatFieldValue(k, activeSearchFields[k]))}</span>
            <button data-remove="${k}" title="Remove"><i data-lucide="x"></i></button>
        </span>
    `).join("");

    if (window.lucide) lucide.createIcons();

    wrap.querySelectorAll("[data-remove]").forEach(btn => {
        btn.onclick = () => rsvRemoveSearchField(btn.dataset.remove);
    });
}

// ------------------------------------------------------
// pms:customize-toggle -- dispatch dari pmsTopbar.js
// ------------------------------------------------------

document.addEventListener("pms:customize-toggle", (e) => {
    rsvCustomizing = e.detail.active;

    document.querySelector(".rsv-page")?.classList.toggle("rsv-page-customizing", rsvCustomizing);

    rsvSearchCard.setCustomizing(rsvCustomizing);

    if (typeof renderPaginationBar === "function") renderPaginationBar();
});

function rsvLoadLucide(cb) {
    if (window.lucide) { cb(); return; }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/lucide@latest";
    s.onload = cb;
    document.head.appendChild(s);
}

document.addEventListener("DOMContentLoaded", () => {

    rsvSearchCard.load();
    rsvSearchCard.render();

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

    document.getElementById("rsvSearchResetBtn")?.addEventListener("click", rsvResetFieldsToDefault);
    document.getElementById("rsvShowingResetBtn")?.addEventListener("click", rsvResetFieldsToDefault);
    document.getElementById("rsvSearchClearBtn")?.addEventListener("click", rsvClearSearch);

    const pagToggle = document.getElementById("rsvPaginationToggle");
    if (pagToggle) {
        pagToggle.checked = (typeof paginationEnabled !== "undefined") ? paginationEnabled : true;
        pagToggle.addEventListener("change", (e) => {
            if (typeof rsvSetPaginationEnabled === "function") {
                rsvSetPaginationEnabled(e.target.checked);
            }
        });
    }

    if (new URLSearchParams(location.search).get("bulk") === "true") {
        document.getElementById("addReservationPanel").style.display = "block";
    }

    rsvLoadLucide(() => lucide.createIcons());

});