// ======================================================
// rsidebar.js — right sidebar: messaging / operational channels
// FRONT-END ONLY. rsChannels = mock data, ganti nanti ke hasil
// fetch dari backend (Supabase dll) pas backend digarap.
// ======================================================

const RS_KEY_MODE = "ph_rsidebar_mode";
const RS_KEY_WIDTH = "ph_rsidebar_width";
const RS_KEY_ORDER = "ph_rsidebar_order";

let rsMode = "hidden";       // hidden | full | icon
let rsWidth = 320;
let rsFilter = "all";        // all | unread
let rsSearchTerm = "";
let rsCurrentView = { mode: "list" }; // { mode:'list' } atau { mode:'detail', channelId }

// ------------------------------------------------------
// MOCK DATA — nanti tinggal diganti fetch backend
// ------------------------------------------------------

const rsChannels = [
    {
        id: "ch-m421", dept: "Maintenance", icon: "wrench", color: "#c62828", urgent: true,
        title: "Water leak — Room 421", contextLabel: "Room 421", contextUrl: "room.html",
        lastAuthor: "FO", lastText: "Guest reports water leak in bathroom.", lastTime: "1m", unread: true,
        messages: [
            { author: "FO", time: "09:12", text: "Guest reports water leak in bathroom." },
            { author: "Maintenance", time: "09:15", text: "Technician on the way." }
        ]
    },
    {
        id: "ch-fo312", dept: "Front Office", icon: "concierge-bell", color: "#1565c0", urgent: false,
        title: "Guest request — Room 312", contextLabel: "Room 312", contextUrl: "room.html",
        lastAuthor: "FO", lastText: "Guest requested extra pillows.", lastTime: "12m", unread: true,
        messages: [
            { author: "FO", time: "13:50", text: "Guest requested extra pillows." },
            { author: "HK", time: "13:55", text: "On it." }
        ]
    },
    {
        id: "ch-hk205", dept: "Housekeeping", icon: "spray-can", color: "#2e7d32", urgent: false,
        title: "Room 205 is ready", contextLabel: "Room 205", contextUrl: "room.html",
        lastAuthor: "Maria", lastText: "Room cleaned and inspected.", lastTime: "3m", unread: false,
        messages: [
            { author: "FO", time: "14:02", text: "Guest requested late checkout." },
            { author: "Maria", time: "14:18", text: "Room cleaned." },
            { author: "You", time: "14:20", text: "Thanks.", self: true }
        ]
    },
    {
        id: "ch-m421b", dept: "Maintenance", icon: "wrench", color: "#e65100", urgent: false,
        title: "AC issue — Room 421", contextLabel: "Room 421", contextUrl: "room.html",
        lastAuthor: "Maintenance", lastText: "Issue resolved.", lastTime: "40m", unread: false,
        messages: [
            { author: "FO", time: "09:12", text: "Guest reports AC not working." },
            { author: "Maintenance", time: "09:25", text: "Technician assigned." },
            { author: "Maintenance", time: "10:02", text: "Issue resolved." }
        ]
    },
    {
        id: "ch-lf118", dept: "Lost & Found", icon: "package-search", color: "#6a1b9a", urgent: false,
        title: "Phone found — Room 118", contextLabel: "Room 118", contextUrl: "room.html",
        lastAuthor: "HK", lastText: "Phone found under the bed, stored at front desk.", lastTime: "1h", unread: false,
        messages: [
            { author: "HK", time: "08:40", text: "Phone found under the bed, stored at front desk." }
        ]
    }
];

// ------------------------------------------------------
// helpers
// ------------------------------------------------------

function rsEsc(s) { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; }
function rsIconSvg(name) { return `<i data-lucide="${name}"></i>`; }
function rsRenderIcons() { if (window.lucide) window.lucide.createIcons({ nameAttr: "data-lucide" }); }

function rsGetMount() {
    let mount = document.getElementById("rsMount");
    if (!mount) {
        mount = document.createElement("div");
        mount.id = "rsMount";
        document.body.appendChild(mount);
    }
    return mount;
}

function rsToast(text) {
    const t = document.createElement("div");
    t.textContent = text;
    t.style.cssText = "position:absolute;left:50%;bottom:56px;transform:translateX(-50%);background:#333;color:#fff;padding:6px 14px;border-radius:16px;font-size:12px;z-index:60;opacity:0;transition:opacity .2s;white-space:nowrap;";
    document.getElementById("rsPanel")?.appendChild(t);
    requestAnimationFrame(() => t.style.opacity = "1");
    setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 200); }, 1800);
}

// ------------------------------------------------------
// persistence
// ------------------------------------------------------

function rsLoad() {
    rsMode = localStorage.getItem(RS_KEY_MODE) || "hidden";
    rsWidth = Number(localStorage.getItem(RS_KEY_WIDTH)) || 320;
    try {
        const order = JSON.parse(localStorage.getItem(RS_KEY_ORDER));
        if (Array.isArray(order)) {
            rsChannels.sort((a, b) => {
                const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
                return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
            });
        }
    } catch (e) {}
}
function rsSaveMode() { localStorage.setItem(RS_KEY_MODE, rsMode); }
function rsSaveWidth() { localStorage.setItem(RS_KEY_WIDTH, String(rsWidth)); }
function rsSaveOrder() { localStorage.setItem(RS_KEY_ORDER, JSON.stringify(rsChannels.map(c => c.id))); }

// ------------------------------------------------------
// filter
// ------------------------------------------------------

function rsFilterChannels() {
    return rsChannels.filter(ch => {
        if (rsFilter === "unread" && !ch.unread) return false;
        if (rsSearchTerm) {
            const q = rsSearchTerm.toLowerCase();
            if (!ch.title.toLowerCase().includes(q) && !ch.dept.toLowerCase().includes(q)) return false;
        }
        return true;
    });
}

// ------------------------------------------------------
// render — full rebuild pattern (sama kayak sidebar.js kiri)
// ------------------------------------------------------

function rsRenderPanel() {
    const mount = rsGetMount();
    const modeClass = rsMode === "full" ? "rs-mode-full" : rsMode === "icon" ? "rs-mode-icon" : "rs-mode-hidden";
    const widthStyle = rsMode === "full" ? `style="--rs-width:${rsWidth}px"` : "";

    let bodyHtml;
    if (rsMode === "icon") {
        bodyHtml = rsIconModeHtml();
    } else if (rsCurrentView.mode === "detail") {
        bodyHtml = rsDetailHtml(rsCurrentView.channelId);
    } else {
        bodyHtml = rsListHtml();
    }

    mount.innerHTML = `
        <div class="rs-panel ${modeClass}" id="rsPanel" ${widthStyle}>
            <div class="rs-resize-handle" id="rsResizeHandle"></div>
            ${bodyHtml}
        </div>
    `;

    rsRenderIcons();
    rsBindResize();

    if (rsMode === "icon") rsBindIconEvents();
    else if (rsCurrentView.mode === "detail") rsBindDetailEvents();
    else rsBindListEvents();

    rsApplyContentPush();
}

function rsListHtml() {
    return `
        <div class="rs-panel-head">
            <div class="rs-panel-title">Messages</div>
            <div class="rs-search">
                ${rsIconSvg("search")}
                <input id="rsSearchInput" type="text" placeholder="Search..." value="${rsEsc(rsSearchTerm)}">
            </div>
            <div class="rs-filter-tabs">
                <button class="rs-filter-tab ${rsFilter === "all" ? "active" : ""}" data-filter="all">All</button>
                <button class="rs-filter-tab ${rsFilter === "unread" ? "active" : ""}" data-filter="unread">Unread</button>
            </div>
        </div>
        <div class="rs-list" id="rsList">${rsChannelCardsHtml()}</div>
        <div class="rs-new-btn-wrap">
            <button class="rs-new-btn" id="rsNewBtn">+ New message</button>
        </div>
    `;
}

function rsChannelCardsHtml() {
    const filtered = rsFilterChannels();
    if (filtered.length === 0) return `<div class="rs-empty-note">No messages</div>`;
    return filtered.map(ch => `
        <div class="rs-card" draggable="true" data-id="${ch.id}">
            <span class="rs-drag-handle">${rsIconSvg("grip-vertical")}</span>
            <div class="rs-card-icon" style="background:${ch.color}">
                ${rsIconSvg(ch.icon)}
                ${ch.urgent ? '<span class="rs-urgent-dot"></span>' : ""}
            </div>
            <div class="rs-card-body">
                <div class="rs-card-top">
                    <span class="rs-card-dept">${rsEsc(ch.dept)}</span>
                    <span class="rs-card-time">${rsEsc(ch.lastTime)}</span>
                </div>
                <div class="rs-card-title">${rsEsc(ch.title)}</div>
                <div class="rs-card-preview">${rsEsc(ch.lastAuthor)}: ${rsEsc(ch.lastText)}</div>
            </div>
            ${ch.unread ? '<span class="rs-unread-dot"></span>' : ""}
        </div>
    `).join("");
}

function rsIconModeHtml() {
    const itemsHtml = rsChannels.map(ch => `
        <div class="rs-icon-item" style="background:${ch.color}" data-id="${ch.id}" title="${rsEsc(ch.title)}">
            ${rsIconSvg(ch.icon)}
            ${ch.urgent ? '<span class="rs-urgent-dot"></span>' : ""}
        </div>
    `).join("");
    return `
        <div class="rs-list" id="rsList">${itemsHtml}</div>
        <div class="rs-new-btn-wrap">
            <button class="rs-new-btn" id="rsNewBtn" title="New message">+</button>
        </div>
    `;
}

function rsDetailHtml(channelId) {
    const ch = rsChannels.find(c => c.id === channelId);
    if (!ch) return rsListHtml();

    const msgsHtml = ch.messages.map(m => `
        <div class="rs-msg ${m.self ? "self" : ""}">
            <div class="rs-msg-meta"><span>${rsEsc(m.author)}</span><span>${rsEsc(m.time)}</span></div>
            <div class="rs-msg-bubble">${rsEsc(m.text)}</div>
        </div>
    `).join("");

    return `
        <div class="rs-chat-head">
            <button class="rs-back-btn" id="rsBackBtn">${rsIconSvg("arrow-left")}</button>
            <div>
                <div class="rs-chat-title">${rsEsc(ch.title)}</div>
                <div class="rs-chat-context">${rsEsc(ch.dept)}${ch.contextLabel ? " · " + rsEsc(ch.contextLabel) : ""}</div>
            </div>
        </div>
        <div class="rs-chat-body" id="rsChatBody">
            ${ch.contextLabel ? `
                <div class="rs-context-card">
                    <span>${rsIconSvg(ch.icon)} ${rsEsc(ch.contextLabel)}</span>
                    <button id="rsOpenContextBtn">Open</button>
                </div>
            ` : ""}
            ${msgsHtml}
        </div>
        <div class="rs-chat-input-row">
            <input type="text" id="rsChatInput" placeholder="Type a message...">
            <button class="rs-chat-send-btn" id="rsSendBtn">${rsIconSvg("send")}</button>
        </div>
    `;
}

// ------------------------------------------------------
// bind — list view
// ------------------------------------------------------

function rsBindListEvents() {
    document.getElementById("rsSearchInput")?.addEventListener("input", (e) => {
        rsSearchTerm = e.target.value;
        rsRenderListOnly();
    });
    document.querySelectorAll(".rs-filter-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            rsFilter = btn.dataset.filter;
            rsRenderPanel();
        });
    });
    document.getElementById("rsNewBtn")?.addEventListener("click", () => rsToast("New message — coming soon"));
    rsBindCardClicks();
    rsBindCardDrag();
}

// partial re-render (biar input search gak kehilangan fokus tiap ketik)
function rsRenderListOnly() {
    const listEl = document.getElementById("rsList");
    if (!listEl) return;
    listEl.innerHTML = rsChannelCardsHtml();
    rsRenderIcons();
    rsBindCardClicks();
    rsBindCardDrag();
}

function rsBindCardClicks() {
    document.querySelectorAll(".rs-card").forEach(el => {
        el.addEventListener("click", () => {
            if (el.dataset.dragged === "1") { el.dataset.dragged = "0"; return; }
            const ch = rsChannels.find(c => c.id === el.dataset.id);
            if (!ch) return;
            ch.unread = false;
            rsCurrentView = { mode: "detail", channelId: ch.id };
            rsRenderPanel();
        });
    });
}

function rsBindCardDrag() {
    let draggedEl = null;
    document.querySelectorAll(".rs-card").forEach(el => {
        el.addEventListener("dragstart", () => {
            draggedEl = el;
            el.classList.add("rs-dragging");
            el.dataset.dragged = "1";
        });
        el.addEventListener("dragend", () => {
            el.classList.remove("rs-dragging");
            document.querySelectorAll(".rs-card").forEach(x => x.classList.remove("rs-drop-before", "rs-drop-after"));
            rsSyncOrderFromDom();
        });
        el.addEventListener("dragover", (e) => {
            e.preventDefault();
            if (!draggedEl || draggedEl === el) return;
            const rect = el.getBoundingClientRect();
            const before = e.clientY < rect.top + rect.height / 2;
            document.querySelectorAll(".rs-card").forEach(x => x.classList.remove("rs-drop-before", "rs-drop-after"));
            el.classList.add(before ? "rs-drop-before" : "rs-drop-after");
        });
        el.addEventListener("drop", (e) => {
            e.preventDefault();
            if (!draggedEl || draggedEl === el) return;
            const rect = el.getBoundingClientRect();
            const before = e.clientY < rect.top + rect.height / 2;
            el.parentNode.insertBefore(draggedEl, before ? el : el.nextSibling);
        });
    });
}

function rsSyncOrderFromDom() {
    const ids = [...document.querySelectorAll("#rsList .rs-card")].map(el => el.dataset.id);
    rsChannels.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    rsSaveOrder();
}

// ------------------------------------------------------
// bind — icon mode (hover preview + click force full)
// ------------------------------------------------------

function rsBindIconEvents() {
    document.getElementById("rsNewBtn")?.addEventListener("click", () => rsToast("New message — coming soon"));
    document.querySelectorAll(".rs-icon-item").forEach(el => {
        const ch = rsChannels.find(c => c.id === el.dataset.id);
        if (!ch) return;
        el.addEventListener("mouseenter", () => rsShowHoverPopup(el, ch));
        el.addEventListener("mouseleave", rsHideHoverPopup);
        el.addEventListener("click", () => {
            rsHideHoverPopup();
            ch.unread = false;
            rsMode = "full"; rsSaveMode();
            rsCurrentView = { mode: "detail", channelId: ch.id };
            rsRenderPanel();
            if (window.phUpdateMessagesIcon) phUpdateMessagesIcon(rsMode);
        });
    });
}

function rsShowHoverPopup(anchor, channel) {
    rsHideHoverPopup();
    const rect = anchor.getBoundingClientRect();
    const pop = document.createElement("div");
    pop.id = "rsHoverPopup";
    pop.className = "rs-hover-popup";
    pop.innerHTML = `
        <div class="rs-hover-popup-title">${rsEsc(channel.title)}</div>
        <div class="rs-hover-popup-text">${rsEsc(channel.lastAuthor)}: ${rsEsc(channel.lastText)}</div>
        <div class="rs-hover-popup-time">${rsEsc(channel.lastTime)}</div>
    `;
    document.body.appendChild(pop);
    pop.style.top = Math.max(8, Math.min(rect.top, window.innerHeight - 110)) + "px";
    pop.style.right = (window.innerWidth - rect.left + 8) + "px";
}
function rsHideHoverPopup() { document.getElementById("rsHoverPopup")?.remove(); }

// ------------------------------------------------------
// bind — detail / chat view
// ------------------------------------------------------

function rsBindDetailEvents() {
    document.getElementById("rsBackBtn")?.addEventListener("click", () => {
        rsCurrentView = { mode: "list" };
        rsRenderPanel();
    });

    document.getElementById("rsOpenContextBtn")?.addEventListener("click", () => {
        const ch = rsChannels.find(c => c.id === rsCurrentView.channelId);
        if (ch && window.Workspace) {
            Workspace.openTab({ title: ch.contextLabel, url: ch.contextUrl || "room.html", page: "nav-rooms" });
        }
    });

    const sendMsg = () => {
        const input = document.getElementById("rsChatInput");
        const text = input.value.trim();
        if (!text) return;
        const ch = rsChannels.find(c => c.id === rsCurrentView.channelId);
        if (!ch) return;
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        ch.messages.push({ author: "You", time, text, self: true });
        ch.lastAuthor = "You"; ch.lastText = text; ch.lastTime = "now";
        input.value = "";
        rsRenderPanel();
    };

    document.getElementById("rsSendBtn")?.addEventListener("click", sendMsg);
    document.getElementById("rsChatInput")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendMsg();
    });

    const body = document.getElementById("rsChatBody");
    if (body) body.scrollTop = body.scrollHeight;
}

// ------------------------------------------------------
// resize (drag dari sisi kiri panel)
// ------------------------------------------------------

function rsBindResize() {
    const handle = document.getElementById("rsResizeHandle");
    const panel = document.getElementById("rsPanel");
    if (!handle || !panel || rsMode !== "full") return;

    handle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        panel.classList.add("rs-resizing");

        const overlay = document.createElement("div");
        overlay.id = "rsResizeOverlay";
        overlay.style.cssText = "position:fixed;inset:0;z-index:9999;cursor:ew-resize;";
        document.body.appendChild(overlay);

        const startX = e.clientX;
        const startWidth = rsWidth;

        const onMove = (ev) => {
            const w = Math.min(440, Math.max(240, startWidth - (ev.clientX - startX)));
            rsWidth = w;
            panel.style.setProperty("--rs-width", w + "px");
            rsApplyContentPush();
        };
        const onUp = () => {
            panel.classList.remove("rs-resizing");
            rsSaveWidth();
            overlay.remove();
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    });
}

// ------------------------------------------------------
// push content (mirror sidebar kiri, pakai marginRight)
// ------------------------------------------------------

function rsApplyContentPush() {
    const content = document.getElementById("wsContent");
    const tabbar = document.getElementById("wsTabbar");

    let margin = "";
    if (rsMode === "icon") margin = "64px";
    else if (rsMode === "full") margin = rsWidth + "px";

    if (content) content.style.marginRight = margin;
    if (tabbar) tabbar.style.marginRight = margin;
}

// ------------------------------------------------------
// cycle (dipanggil dari tombol header): hidden -> full -> icon -> hidden
// ------------------------------------------------------

function rsCycleMode() {
    rsHideHoverPopup();
    if (rsMode === "hidden") rsMode = "full";
    else if (rsMode === "full") rsMode = "icon";
    else { rsMode = "hidden"; rsCurrentView = { mode: "list" }; }

    rsSaveMode();
    rsRenderPanel();
    if (window.phUpdateMessagesIcon) phUpdateMessagesIcon(rsMode);
}
window.rsCycleMode = rsCycleMode;

// ------------------------------------------------------
// init
// ------------------------------------------------------

function initRightSidebar() {
    if (window.self !== window.top) return; // di dalam iframe, shell yang render

    rsLoad();
    rsRenderPanel();
    if (window.phUpdateMessagesIcon) phUpdateMessagesIcon(rsMode);

    window.addEventListener("resize", rsApplyContentPush);
}
window.initRightSidebar = initRightSidebar;