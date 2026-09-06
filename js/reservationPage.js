// ======================================================
// reservationPage.js
// Wiring UI baru reservation.html: search form multi-field,
// chip hasil pencarian, load lucide buat icon statis/dinamis.
// Search state (activeSearchFields) & query logic ada di
// reservationFilter.js -- file ini cuma UI glue.
// ======================================================

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
    const el = document.querySelector(`#rsvSearchForm [data-search-key="${key}"]`);
    const label = el?.closest(".rsv-field")?.querySelector("label");
    return label ? label.textContent : key;
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

function rsvRenderChip() {
    const pills = document.getElementById("rsvShowingPills");
    const chip = document.getElementById("rsvSearchChip");
    if (!pills || !chip) return;

    const keys = Object.keys(activeSearchFields);

    if (keys.length === 0) {
        pills.style.display = "flex";
        chip.style.display = "none";
        return;
    }

    pills.style.display = "none";
    chip.style.display = "flex";

    const summary = keys.map(k => `${rsvFieldLabel(k)}: ${activeSearchFields[k]}`).join(" · ");

    chip.innerHTML = `
        <span>${escapeHtml(summary)}</span>
        <button id="rsvClearSearchBtn" title="Clear search"><i data-lucide="x"></i></button>
    `;

    if (window.lucide) lucide.createIcons();

    document.getElementById("rsvClearSearchBtn").onclick = rsvClearSearch;
}

document.addEventListener("DOMContentLoaded", () => {

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