// ======================================================
// pmsTopbar.js
// Layout: < | > | refresh | path(plain text, non-interaktif,
// no scroll)  ...ruang kosong tengah...  | help | customize
// help+customize NEMPEL pojok kanan sticky. Tanpa dropdown.
// Mount: <div id="pmsTopbar" data-page="reservation" data-title="Optional"></div>
// ======================================================

const PMS_PAGE_LABELS = {
    "room-rack":   "Room Rack",
    "reservation": "Reservation",
    "room":        "Room Management",
    "guest":       "Guest"
};

function pmsLoadLucide(cb) {
    if (window.lucide) { cb(); return; }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/lucide@latest";
    s.onload = cb;
    document.head.appendChild(s);
}

function pmsIcon(name) { return `<i data-lucide="${name}"></i>`; }

function pmsRender() {
    const mount = document.getElementById("pmsTopbar");
    if (!mount) return;

    const page = mount.dataset.page || "reservation";
    const pathLabel = PMS_PAGE_LABELS[page] || page;
    const title = mount.dataset.title || pathLabel;

    mount.innerHTML = `
        <div class="pms-topbar-row">
            <button class="pms-icon-btn" id="pmsBack" title="Back">${pmsIcon("chevron-left")}</button>
            <button class="pms-icon-btn" id="pmsForward" title="Forward">${pmsIcon("chevron-right")}</button>
            <button class="pms-icon-btn" id="pmsRefresh" title="Refresh">${pmsIcon("refresh-cw")}</button>
            <div class="pms-path">/${pathLabel}</div>
            <div class="pms-topbar-right">
                <button class="pms-icon-btn" id="pmsHelp" title="Help">${pmsIcon("circle-help")}</button>
                <button class="pms-icon-btn" id="pmsCustomize" title="Customize">${pmsIcon("layout-panel-left")}</button>
            </div>
        </div>
        <hr class="pms-divider">
        <div class="pms-title-row"><h3 class="pms-title">${title}</h3></div>
    `;

    pmsLoadLucide(() => lucide.createIcons());

    document.getElementById("pmsBack").onclick = () => history.back();
    document.getElementById("pmsForward").onclick = () => history.forward();
    document.getElementById("pmsRefresh").onclick = () => location.reload();
    document.getElementById("pmsHelp").onclick = () => {
        if (typeof showDevMessage === "function") showDevMessage("Help");
    };
    document.getElementById("pmsCustomize").onclick = () => {
        if (typeof showDevMessage === "function") showDevMessage("Customize");
    };
}

function initPmsTopbar() {
    pmsRender();
}

document.addEventListener("DOMContentLoaded", initPmsTopbar);