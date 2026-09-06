// ======================================================
// pmsTopbar.js
// Universal topbar: < | > | refresh | breadcrumb | ? | customize
// + divider + title. Dipasang lewat satu mount div:
//   <div id="pmsTopbar" data-page="reservation" data-title="Optional Override"></div>
// data-page: id nav aktif (lihat PMS_NAV_DEFAULT)
// data-title: override judul, default pakai label nav
// Icons: lucide.dev. Tidak sentuh pageHeader.js/sidebar.js.
// ======================================================

const PMS_TOPBAR_NAV_KEY = "pms_topbar_nav";

const PMS_NAV_DEFAULT = [
    { id: "room-rack",   label: "Room Rack",       href: "room-rack.html" },
    { id: "reservation", label: "Reservation",     href: "reservation.html" },
    { id: "room",        label: "Room Management", href: "room.html" },
    { id: "guest",       label: "Guest",           href: "guest.html" }
];

let pmsNav = [];
let pmsCustomizing = false;
let pmsDropdownOpen = false;

function pmsLoadNav() {
    try {
        const saved = JSON.parse(localStorage.getItem(PMS_TOPBAR_NAV_KEY));
        pmsNav = Array.isArray(saved) ? saved : JSON.parse(JSON.stringify(PMS_NAV_DEFAULT));
    } catch (e) {
        pmsNav = JSON.parse(JSON.stringify(PMS_NAV_DEFAULT));
    }
}
function pmsSaveNav() { localStorage.setItem(PMS_TOPBAR_NAV_KEY, JSON.stringify(pmsNav)); }

function pmsLoadLucide(cb) {
    if (window.lucide) { cb(); return; }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/lucide@latest";
    s.onload = cb;
    document.head.appendChild(s);
}

function pmsInjectStyle() {
    if (document.getElementById("pmsTopbarStyle")) return;
    const style = document.createElement("style");
    style.id = "pmsTopbarStyle";
    style.textContent = `
        .pms-topbar-row { display:flex; align-items:center; gap:4px; padding:6px 16px; flex:none; }
        .pms-icon-btn { width:28px; height:28px; display:flex; align-items:center; justify-content:center;
            border:none; background:none; border-radius:4px; cursor:pointer; color:#555; flex:none; }
        .pms-icon-btn:hover { background:#f0f0f0; }
        .pms-icon-btn svg { width:16px; height:16px; }
        .pms-breadcrumb { position:relative; display:flex; align-items:center; margin-left:4px; }
        .pms-breadcrumb-btn { border:none; background:none; cursor:pointer; font-size:13px; color:#444;
            padding:4px 6px; border-radius:4px; display:flex; align-items:center; gap:4px; }
        .pms-breadcrumb-btn:hover { background:#f0f0f0; }
        .pms-divider { border:none; border-top:1px solid #ddd; margin:0 16px; flex:none; }
        .pms-title-row { padding:10px 16px 4px; flex:none; }
        .pms-title { margin:0; }

        .pms-dropdown { position:absolute; top:100%; left:0; margin-top:4px; z-index:60;
            background:#fff; border:1px solid #ccc; border-radius:8px;
            box-shadow:0 6px 20px rgba(0,0,0,.15); min-width:200px; padding:4px; }
        .pms-dropdown-item { display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:5px;
            font-size:13px; color:#333; text-decoration:none; cursor:pointer; }
        .pms-dropdown-item:hover { background:#f2f3f5; }
        .pms-dropdown-item.pms-active { background:#e3f2fd; color:#1565c0; font-weight:600; }
        .pms-dropdown-item.pms-hidden-el { opacity:.4; }
        .pms-customizing .pms-dropdown-item { border:1px dashed rgba(0,0,0,.15); cursor:default; }
        .pms-drag-handle { cursor:grab; color:#bbb; display:flex; flex:none; }
        .pms-drag-handle svg { width:13px; height:13px; }
        .pms-dropdown-item.pms-dragging { opacity:.4; }
        .pms-dropdown-item.pms-drop-before { border-top:2px solid #1565c0; }
        .pms-dropdown-item.pms-drop-after { border-bottom:2px solid #1565c0; }
        .pms-hide-btn { margin-left:auto; border:none; background:none; cursor:pointer; color:#888;
            display:flex; flex:none; }
        .pms-hide-btn svg { width:12px; height:12px; }
        .pms-dropdown-footer { border-top:1px solid #eee; margin-top:4px; padding-top:4px; text-align:right; }
        .pms-dropdown-footer button { border:1px solid #1565c0; background:#1565c0; color:#fff;
            border-radius:5px; font-size:12px; padding:4px 10px; cursor:pointer; }
    `;
    document.head.appendChild(style);
}

function pmsIcon(name) { return `<i data-lucide="${name}"></i>`; }

function pmsActivePage(mount) {
    return mount.dataset.page || "reservation";
}

function pmsActiveEntry(mount) {
    return pmsNav.find(n => n.id === pmsActivePage(mount)) || pmsNav[0];
}

function pmsRender() {
    const mount = document.getElementById("pmsTopbar");
    if (!mount) return;

    const title = mount.dataset.title || pmsActiveEntry(mount)?.label || document.title;

    mount.innerHTML = `
        <div class="pms-topbar-row">
            <button class="pms-icon-btn" id="pmsBack" title="Back">${pmsIcon("chevron-left")}</button>
            <button class="pms-icon-btn" id="pmsForward" title="Forward">${pmsIcon("chevron-right")}</button>
            <button class="pms-icon-btn" id="pmsRefresh" title="Refresh">${pmsIcon("refresh-cw")}</button>
            <div class="pms-breadcrumb" id="pmsBreadcrumb"></div>
            <button class="pms-icon-btn" id="pmsHelp" title="Help">${pmsIcon("circle-help")}</button>
            <button class="pms-icon-btn" id="pmsCustomize" title="Customize navigation">${pmsIcon("layout-panel-left")}</button>
        </div>
        <hr class="pms-divider">
        <div class="pms-title-row"><h3 class="pms-title">${title}</h3></div>
    `;

    pmsRenderBreadcrumb(mount);
    pmsLoadLucide(() => lucide.createIcons());

    document.getElementById("pmsBack").onclick = () => history.back();
    document.getElementById("pmsForward").onclick = () => history.forward();
    document.getElementById("pmsRefresh").onclick = () => location.reload();
    document.getElementById("pmsHelp").onclick = () => {
        if (typeof showDevMessage === "function") showDevMessage("Help");
    };
    document.getElementById("pmsCustomize").onclick = () => {
        pmsCustomizing = true;
        pmsDropdownOpen = true;
        pmsRenderBreadcrumb(mount);
    };
}

function pmsRenderBreadcrumb(mount) {
    const el = document.getElementById("pmsBreadcrumb");
    if (!el) return;

    const current = pmsActiveEntry(mount);

    el.innerHTML = `
        <button class="pms-breadcrumb-btn" id="pmsBreadcrumbBtn">
            /${current ? current.label : "Reservation"} ${pmsIcon("chevron-down")}
        </button>
    `;
    if (window.lucide) lucide.createIcons();

    document.getElementById("pmsBreadcrumbBtn").onclick = (e) => {
        e.stopPropagation();
        pmsDropdownOpen = !pmsDropdownOpen;
        pmsRenderDropdown(mount);
    };

    if (pmsDropdownOpen) pmsRenderDropdown(mount);
}

function pmsRenderDropdown(mount) {
    document.getElementById("pmsDropdown")?.remove();
    if (!pmsDropdownOpen) return;

    const currentId = pmsActivePage(mount);
    const dd = document.createElement("div");
    dd.id = "pmsDropdown";
    dd.className = "pms-dropdown" + (pmsCustomizing ? " pms-customizing" : "");

    const itemsHtml = pmsNav.map(item => {
        if (item.hidden && !pmsCustomizing) return "";
        const active = item.id === currentId;
        return `
            <a class="pms-dropdown-item ${active ? "pms-active" : ""} ${item.hidden ? "pms-hidden-el" : ""}"
               data-id="${item.id}" target="_self"
               href="${pmsCustomizing ? "javascript:void(0)" : item.href}">
                ${pmsCustomizing ? `<span class="pms-drag-handle" draggable="true">${pmsIcon("grip-vertical")}</span>` : ""}
                <span>${item.label}</span>
                ${pmsCustomizing ? `<button class="pms-hide-btn" data-hide="${item.id}">${pmsIcon(item.hidden ? "plus" : "minus")}</button>` : ""}
            </a>
        `;
    }).join("");

    dd.innerHTML = itemsHtml + (pmsCustomizing ? `<div class="pms-dropdown-footer"><button id="pmsApplyNav">Apply</button></div>` : "");
    document.getElementById("pmsBreadcrumb").appendChild(dd);
    if (window.lucide) lucide.createIcons();

    if (pmsCustomizing) {
        dd.querySelectorAll("[data-hide]").forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                const item = pmsNav.find(n => n.id === btn.dataset.hide);
                if (item) item.hidden = !item.hidden;
                pmsSaveNav();
                pmsRenderDropdown(mount);
            };
        });
        pmsBindDragDrop(dd);
        document.getElementById("pmsApplyNav").onclick = (e) => {
            e.stopPropagation();
            pmsCustomizing = false;
            pmsDropdownOpen = false;
            pmsRenderBreadcrumb(mount);
        };
    } else {
        dd.querySelectorAll(".pms-dropdown-item").forEach(a => {
            a.addEventListener("click", () => { pmsDropdownOpen = false; });
        });
    }
}

function pmsBindDragDrop(dd) {
    let draggedEl = null;
    dd.querySelectorAll(".pms-dropdown-item").forEach(item => {
        const handle = item.querySelector(".pms-drag-handle");
        if (!handle) return;
        handle.addEventListener("dragstart", () => { draggedEl = item; item.classList.add("pms-dragging"); });
        item.addEventListener("dragend", () => {
            item.classList.remove("pms-dragging");
            dd.querySelectorAll(".pms-dropdown-item").forEach(x => x.classList.remove("pms-drop-before", "pms-drop-after"));
            const newOrder = [...dd.querySelectorAll(".pms-dropdown-item")].map(x => x.dataset.id);
            pmsNav.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
            pmsSaveNav();
        });
        item.addEventListener("dragover", (e) => {
            e.preventDefault();
            if (item === draggedEl) return;
            const rect = item.getBoundingClientRect();
            const before = e.clientY < rect.top + rect.height / 2;
            dd.querySelectorAll(".pms-dropdown-item").forEach(x => x.classList.remove("pms-drop-before", "pms-drop-after"));
            item.classList.add(before ? "pms-drop-before" : "pms-drop-after");
        });
        item.addEventListener("drop", (e) => {
            e.preventDefault();
            if (item === draggedEl) return;
            const rect = item.getBoundingClientRect();
            const before = e.clientY < rect.top + rect.height / 2;
            dd.insertBefore(draggedEl, before ? item : item.nextSibling);
        });
    });
}

document.addEventListener("click", (e) => {
    if (pmsCustomizing) return;
    const breadcrumb = document.getElementById("pmsBreadcrumb");
    if (breadcrumb && !breadcrumb.contains(e.target)) {
        pmsDropdownOpen = false;
        document.getElementById("pmsDropdown")?.remove();
    }
});

function initPmsTopbar() {
    pmsInjectStyle();
    pmsLoadNav();
    pmsRender();
}

document.addEventListener("DOMContentLoaded", initPmsTopbar);