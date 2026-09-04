// ======================================================
// pageHeader.js
// Order: hamburger | avatar | logo | search | add | notif | messages
// + workspace tab bar (#wsTabbar) di bawahnya.
// Skip total kalau di dalam iframe (shell yang render chrome).
// ======================================================

const PH_ORDER_KEY = "ph_header_order";
const PH_DEFAULT_ORDER = ["hamburger", "avatar", "logo", "search", "add", "notification", "messages"];

const PH_ITEMS = {
    hamburger: {
        width: "56px",
        html: `<button class="ph-icon-btn ph-hamburger-btn" title="Menu" onclick="phToggleNav()"><i data-lucide="menu"></i></button>`
    },
    avatar: {
        width: "44px",
        html: `<button class="ph-icon-btn ph-avatar-btn" title="Account" onclick="phAvatarClick()"><i data-lucide="circle-user"></i></button>`
    },
    logo: {
        width: "140px 160px",
        html: `<a href="index.html" class="ph-logo"><img src="iqbalpms.png" alt="Hotel PMS"></a>`
    },
    search: {
        width: "flex",
        html: `<div class="ph-search"><i data-lucide="search"></i><input id="phSearchInput" type="text" placeholder="Search..." oninput="phSearch(this.value)"></div>`
    },
    add: {
        width: "44px",
        html: `<button class="ph-icon-btn" title="Add" onclick="phAction('add')"><i data-lucide="plus"></i></button>`
    },
    notification: {
        width: "44px",
        html: `<button class="ph-icon-btn" title="Notifications" onclick="phAction('notification')"><i data-lucide="bell"></i></button>`
    },
    messages: {
        width: "44px",
        html: `<button class="ph-icon-btn ph-messages-btn" title="Messages" onclick="rsCycleMode()"><i data-lucide="message-square"></i></button>`
    }
};

function phLoadOrder() {
    try {
        const saved = JSON.parse(localStorage.getItem(PH_ORDER_KEY));
        // validasi: panjang cocok DAN semua key masih dikenal (auto-heal kalau ada key lama yg dihapus, mis "more")
        if (Array.isArray(saved) && saved.length === PH_DEFAULT_ORDER.length && saved.every(k => PH_ITEMS[k])) {
            return saved;
        }
    } catch (e) {}
    return [...PH_DEFAULT_ORDER];
}

function phSaveOrder(order) {
    localStorage.setItem(PH_ORDER_KEY, JSON.stringify(order));
}

function phInjectStyle() {
    if (document.getElementById("phStyle")) return;

    const style = document.createElement("style");
    style.id = "phStyle";
    style.textContent = `
        :root { --ph-header-height: 64px; }
        #pageHeaderBar { flex: none; }
        .ph-header {
            height: var(--ph-header-height, 64px);
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 12px;
            border-bottom: 1px solid #ddd;
            background: #fff;
            box-sizing: border-box;
        }
        .ph-item { flex: none; display: flex; align-items: center; height: 100%; cursor: grab; }
        .ph-item[data-key="search"] { flex: 1 1 auto; min-width: 0; cursor: default; }
        .ph-item.ph-dragging { opacity: 0.4; }
        .ph-item.ph-drop-before { border-left: 2px solid #1565c0; }
        .ph-item.ph-drop-after { border-right: 2px solid #1565c0; }

        .ph-icon-btn {
            width: 44px; height: 44px;
            display: flex; align-items: center; justify-content: center;
            border: none; background: none; border-radius: 8px; cursor: pointer;
            color: #333;
        }
        .ph-icon-btn:hover { background: #f0f0f0; }
        .ph-hamburger-btn { width: 56px; }

        .ph-logo {
            display: flex; align-items: center; gap: 6px;
            text-decoration: none; color: #222; font-weight: 700; font-size: 15px;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .ph-search {
            width: 100%; height: 40px;
            display: flex; align-items: center; gap: 8px;
            background: #f2f3f5; border-radius: 8px; padding: 0 10px;
            color: #777;
        }
        .ph-search input {
            border: none; background: none; outline: none;
            font: inherit; width: 100%; color: #222;
        }
        .ph-search svg { flex: none; width: 16px; height: 16px; }
        .ph-icon-btn svg { width: 20px; height: 20px; }
        .ph-logo img { height: 36px; width: auto; object-fit: contain; }
    `;
    document.head.appendChild(style);
}

function phLoadLucide(cb) {
    if (window.lucide) { cb(); return; }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/lucide@latest";
    s.onload = cb;
    document.head.appendChild(s);
}

function phRender() {
    const bar = document.getElementById("pageHeaderBar");
    if (!bar) return;

    const order = phLoadOrder();

    const itemsHtml = order.map(key => {
        const def = PH_ITEMS[key];
        if (!def) return "";
        const widthStyle = def.width === "flex"
            ? ""
            : def.width.includes(" ")
                ? `style="min-width:${def.width.split(" ")[0]};max-width:${def.width.split(" ")[1]};flex:1 1 ${def.width.split(" ")[0]};"`
                : `style="width:${def.width};flex:0 0 ${def.width};"`;

        return `<div class="ph-item" data-key="${key}" draggable="true" ${widthStyle}>${def.html}</div>`;
    }).join("");

    bar.innerHTML = `
        <div class="ph-header" id="phHeaderRow">${itemsHtml}</div>
        <div class="ws-tabbar" id="wsTabbar">
            <button class="ws-tab-arrow" id="wsArrowLeft">‹</button>
            <div class="ws-tab-scroll-wrap">
                <div class="ws-tab-scroll" id="wsTabScroll"></div>
                <div class="ws-tab-fade-right" id="wsFadeRight"></div>
            </div>
            <button class="ws-tab-arrow" id="wsArrowRight">›</button>
            <button class="ws-kebab" id="wsKebab">⋮</button>
        </div>
    `;

    phLoadLucide(() => lucide.createIcons());
    phBindDrag();

    if (window.Workspace) Workspace.init();
}

function phBindDrag() {
    const row = document.getElementById("phHeaderRow");
    if (!row) return;

    let draggedEl = null;

    row.querySelectorAll(".ph-item").forEach(item => {
        item.addEventListener("dragstart", () => {
            draggedEl = item;
            item.classList.add("ph-dragging");
        });

        item.addEventListener("dragend", () => {
            item.classList.remove("ph-dragging");
            row.querySelectorAll(".ph-item").forEach(el =>
                el.classList.remove("ph-drop-before", "ph-drop-after"));

            const newOrder = [...row.querySelectorAll(".ph-item")].map(el => el.dataset.key);
            phSaveOrder(newOrder);
        });

        item.addEventListener("dragover", (e) => {
            e.preventDefault();
            if (item === draggedEl) return;

            const rect = item.getBoundingClientRect();
            const before = e.clientX < rect.left + rect.width / 2;

            row.querySelectorAll(".ph-item").forEach(el =>
                el.classList.remove("ph-drop-before", "ph-drop-after"));
            item.classList.add(before ? "ph-drop-before" : "ph-drop-after");
        });

        item.addEventListener("drop", (e) => {
            e.preventDefault();
            if (item === draggedEl) return;

            const rect = item.getBoundingClientRect();
            const before = e.clientX < rect.left + rect.width / 2;

            row.insertBefore(draggedEl, before ? item : item.nextSibling);
        });
    });
}

// ------------------------------------------------------
// icon messages update (dipanggil rsidebar.js pas mode berubah)
// ------------------------------------------------------

function phUpdateMessagesIcon(rsMode) {
    const btn = document.querySelector(".ph-messages-btn");
    if (!btn) return;
    const iconName = rsMode === "full" ? "message-square-dashed"
        : rsMode === "icon" ? "message-square-x"
        : "message-square";
    btn.innerHTML = `<i data-lucide="${iconName}"></i>`;
    if (window.lucide) lucide.createIcons();
}
window.phUpdateMessagesIcon = phUpdateMessagesIcon;

// ------------------------------------------------------
// Action hooks
// ------------------------------------------------------

function phToggleNav() {
    document.body.classList.toggle("ph-nav-open");
    document.dispatchEvent(new CustomEvent("ph:toggle-nav"));
}

function phAvatarClick() {
    document.dispatchEvent(new CustomEvent("ph:avatar-click"));
}

function phSearch(value) {
    document.dispatchEvent(new CustomEvent("ph:search", { detail: { value } }));
}

function phAction(name) {
    document.dispatchEvent(new CustomEvent("ph:action", { detail: { name } }));
    if (typeof showDevMessage === "function") {
        showDevMessage(name[0].toUpperCase() + name.slice(1));
    }
}

function isInIframe() { return window.self !== window.top; }

function initPageHeader() {
    if (isInIframe()) return;

    if (!window.Workspace) {
        const here = location.pathname.split("/").pop() || "";
        if (here && here !== "index.html") {
            if (sessionStorage.getItem("ph_bounced")) {
                console.warn("Bounce guard: already redirected once.");
                return;
            }
            sessionStorage.setItem("ph_bounced", "1");
            location.replace("index.html?open=" + encodeURIComponent(here + location.search));
            return;
        }
    }

    phInjectStyle();
    phRender();
}