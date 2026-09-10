// ======================================================
// pmsTopbar.js
// Layout: < | > | refresh | path(plain text)  ...tengah kosong...
// | help | customize
// Klik customize -> masuk mode edit di halaman (dispatch event
// "pms:customize-toggle"), icon berubah jadi Save. Klik lagi
// (jadi Save) -> keluar mode edit + apply perubahan.
// Mount: <div id="pmsTopbar" data-page="reservation" data-title="Optional" data-hide-title="true"></div>
//
// BARU: pmsSetSubPath(label) -- dipanggil dari halaman detail
// (reservationDetail.js dll) buat nambah segmen kedua di path,
// mis. "/Reservation" -> "/Reservation/Reservation HT123".
// ======================================================

const PMS_PAGE_LABELS = {
    "room-rack":   "Room Rack",
    "reservation": "Reservation",
    "room":        "Room Management",
    "guest":       "Guest"
};

let pmsCustomizeActive = false;
let pmsSubPathLabel = null;

function pmsLoadLucide(cb) {
    if (window.lucide) { cb(); return; }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/lucide@latest";
    s.onload = cb;
    document.head.appendChild(s);
}

function pmsIcon(name) { return `<i data-lucide="${name}"></i>`; }

function pmsGetPathLabel() {
    const mount = document.getElementById("pmsTopbar");
    const page = mount ? (mount.dataset.page || "reservation") : "reservation";
    return PMS_PAGE_LABELS[page] || page;
}

function pmsBuildPathText() {
    const base = pmsGetPathLabel();
    return `/${base}${pmsSubPathLabel ? "/" + pmsSubPathLabel : ""}`;
}

function pmsRender() {
    const mount = document.getElementById("pmsTopbar");
    if (!mount) return;

    const hideTitle = mount.dataset.hideTitle === "true";
    const title = mount.dataset.title || pmsGetPathLabel();

    mount.innerHTML = `
        <div class="pms-topbar-row">
            <button class="pms-icon-btn" id="pmsBack" title="Back">${pmsIcon("chevron-left")}</button>
            <button class="pms-icon-btn" id="pmsForward" title="Forward">${pmsIcon("chevron-right")}</button>
            <button class="pms-icon-btn" id="pmsRefresh" title="Refresh">${pmsIcon("refresh-cw")}</button>
            <div class="pms-path">${pmsBuildPathText()}</div>
            <div class="pms-topbar-right">
                <button class="pms-icon-btn" id="pmsHelp" title="Help">${pmsIcon("circle-help")}</button>
                <button class="pms-icon-btn" id="pmsCustomize" title="Customize">${pmsIcon("layout-panel-left")}</button>
            </div>
        </div>
        <hr class="pms-divider">
        ${hideTitle ? "" : `<div class="pms-title-row"><h3 class="pms-title">${title}</h3></div>`}
    `;

    pmsLoadLucide(() => lucide.createIcons());
    pmsUpdateCustomizeButton();

    document.getElementById("pmsBack").onclick = () => history.back();
    document.getElementById("pmsForward").onclick = () => history.forward();
    document.getElementById("pmsRefresh").onclick = () => location.reload();
    document.getElementById("pmsHelp").onclick = () => {
        if (typeof showDevMessage === "function") showDevMessage("Help");
    };
    document.getElementById("pmsCustomize").onclick = () => {
        pmsCustomizeActive = !pmsCustomizeActive;
        pmsUpdateCustomizeButton();
        document.dispatchEvent(new CustomEvent("pms:customize-toggle", { detail: { active: pmsCustomizeActive } }));
    };
}

function pmsUpdateCustomizeButton() {
    const btn = document.getElementById("pmsCustomize");
    if (!btn) return;
    btn.innerHTML = pmsIcon(pmsCustomizeActive ? "save" : "layout-panel-left");
    btn.title = pmsCustomizeActive ? "Save changes" : "Customize";
    btn.classList.toggle("pms-customize-active", pmsCustomizeActive);
    if (window.lucide) lucide.createIcons();
}

// ------------------------------------------------------
// Segmen kedua di path, mis. dipanggil dari reservationDetail.js:
// pmsSetSubPath("Reservation HT1234567890")
// -> path jadi "/Reservation/Reservation HT1234567890"
// Panggil dengan null/"" buat balikin ke path 1 level lagi.
// ------------------------------------------------------

function pmsSetSubPath(label) {
    pmsSubPathLabel = label || null;
    const el = document.querySelector("#pmsTopbar .pms-path");
    if (el) el.textContent = pmsBuildPathText();
}
window.pmsSetSubPath = pmsSetSubPath;

function initPmsTopbar() {
    pmsRender();
}

document.addEventListener("DOMContentLoaded", initPmsTopbar);