// ======================================================
// pageHeader.js
// Order: hamburger | avatar | logo | search | [add | notif | messages]
// 3 item terakhir dikunci di grup kanan (.ph-right-group,
// margin-left:auto). Drag reorder cuma sesama grup.
// + workspace tab bar (#wsTabbar) di bawahnya.
// Skip total kalau di dalam iframe (shell yang render chrome).
// ======================================================

const PH_ORDER_KEY = "ph_header_order";
const PH_SEARCH_WIDTH_KEY = "ph_search_width";
const PH_DEFAULT_ORDER = ["hamburger", "avatar", "logo", "search", "add", "notification", "messages"];
const PH_RIGHT_KEYS = ["add", "notification", "messages"];

function phStorageKey(base) {
    return base;
}

const PH_ITEMS = {
    hamburger: {
        width: "34px",
        html: `<button class="ph-icon-btn ph-hamburger-btn" title="Menu" onclick="phToggleNav()"><i data-lucide="menu"></i></button>`
    },
    avatar: {
        width: "34px",
        html: `<button class="ph-icon-btn ph-avatar-btn" title="Account" onclick="phAvatarClick()"><i data-lucide="circle-user"></i></button>`
    },
    logo: {
        width: "100px 130px",
        html: `<a href="index.html" class="ph-logo"><img src="iqbalpms.png" alt="Hotel PMS"></a>`
    },
    search: {
        width: "flex",
        html: `
            <div class="ph-search" id="phSearchBox">
                <i data-lucide="search"></i>
                <input id="phSearchInput" type="text" placeholder="Search..." oninput="phSearch(this.value)">
                <div class="ph-search-resize-handle" id="phSearchResizeHandle" title="Drag to resize"></div>
            </div>
            <button class="ph-icon-btn ph-mobile-search-btn" id="phMobileSearchBtn" title="Search" onclick="phToggleMobileSearch(true)"><i data-lucide="search"></i></button>
        `
    },
    add: {
        width: "34px",
        html: `<button class="ph-icon-btn" title="Add" onclick="phAction('add')"><i data-lucide="plus"></i></button>`
    },
    notification: {
        width: "34px",
        html: `<button class="ph-icon-btn" title="Notifications" onclick="phAction('notification')"><i data-lucide="bell"></i></button>`
    },
    messages: {
        width: "34px",
        html: `<button class="ph-icon-btn ph-messages-btn" title="Messages" onclick="rsCycleMode()"><i data-lucide="message-square"></i></button>`
    }
};

function phLoadOrder() {
    try {
        const saved = JSON.parse(localStorage.getItem(PH_ORDER_KEY));
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
        :root { --ph-header-height: 48px; }

        #pageHeaderBar { flex: none; }

        .ph-header {
            position: relative;
            height: var(--ph-header-height);
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 0 8px;
            margin: 0;
            border-bottom: 1px solid #ddd;
            background: #fff;
            box-sizing: border-box;
        }

        .ph-item { flex: none; display: flex; align-items: center; height: 100%; margin: 0; cursor: grab; }
        .ph-item[data-key="search"] { flex: 1 1 auto; min-width: 0; cursor: default; gap: 6px; }
        .ph-item.ph-dragging { opacity: 0.4; }
        .ph-item.ph-drop-before { border-left: 2px solid #1565c0; }
        .ph-item.ph-drop-after { border-right: 2px solid #1565c0; }

        .ph-right-group {
            flex: none;
            display: flex;
            align-items: center;
            height: 100%;
            margin-left: auto;
            gap: 0;
        }

        .ph-icon-btn {
            width: 36px; height: 36px;
            display: flex; align-items: center; justify-content: center;
            border: none; background: none; border-radius: 6px; cursor: pointer;
            color: #333; margin: 0; padding: 0;
        }
        .ph-icon-btn:hover { background: #f0f0f0; }

        .ph-logo {
            display: flex; align-items: center; gap: 6px;
            text-decoration: none; color: #222; font-weight: 700; font-size: 14px;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .ph-search {
            position: relative;
            width: 100%; height: 32px;
            display: flex; align-items: center; gap: 6px;
            background: #f2f3f5; border-radius: 8px; padding: 0 8px;
            color: #777; box-sizing: border-box;
        }
        .ph-search input {
            border: none; background: none; outline: none;
            font: inherit; width: 100%; color: #222;
        }
        .ph-search svg { flex: none; width: 15px; height: 15px; }
        .ph-icon-btn svg { width: 19px; height: 19px; }
        .ph-logo img { height: 24px; width: auto; object-fit: contain; }

        .ph-search-resize-handle {
            position: absolute; top: 0; right: 0; bottom: 0; width: 6px;
            cursor: ew-resize;
        }
        .ph-search-resize-handle:hover { background: rgba(0,0,0,.12); }

        .ph-mobile-search-btn { display: none; }

        .ph-mobile-search-overlay {
            position: absolute;
            inset: 0;
            background: #fff;
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 0 8px;
            z-index: 20;
        }
        .ph-mobile-search-overlay .ph-search { flex: 1 1 auto; }

        /* DESKTOP: search bisa di-resize manual, TANPA batas atas */
        @media (min-width: 1025px) {
            .ph-item[data-key="search"].ph-search-custom-width {
                flex: 0 0 var(--ph-search-width) !important;
                width: var(--ph-search-width);
            }
        }

        /* TABLET: search diperpendek default, bukan disembunyikan */
        @media (max-width: 1024px) and (min-width: 701px) {
            .ph-item[data-key="search"] { flex: 0 1 260px; }
        }

        /* MOBILE: avatar+logo tetap tampil, search jadi icon kaca pembesar */
        @media (max-width: 700px) {
            .ph-item[data-key="search"] {
                flex: 1 1 auto;
                justify-content: flex-end;
            }
            #phSearchBox { display: none; }
            .ph-search-resize-handle { display: none; }
            .ph-mobile-search-btn { display: flex; }
        }
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

function phRenderItem(key) {
    const def = PH_ITEMS[key];
    if (!def) return "";
    const widthStyle = def.width === "flex"
        ? ""
        : def.width.includes(" ")
            ? `style="min-width:${def.width.split(" ")[0]};max-width:${def.width.split(" ")[1]};flex:1 1 ${def.width.split(" ")[0]};"`
            : `style="width:${def.width};flex:0 0 ${def.width};"`;

    return `<div class="ph-item" data-key="${key}" draggable="true" ${widthStyle}>${def.html}</div>`;
}

function phRender() {
    const bar = document.getElementById("pageHeaderBar");
    if (!bar) return;

    const order = phLoadOrder();
    const leftOrder = order.filter(k => !PH_RIGHT_KEYS.includes(k));
    const rightOrder = order.filter(k => PH_RIGHT_KEYS.includes(k));

    const leftHtml = leftOrder.map(phRenderItem).join("");
    const rightHtml = rightOrder.map(phRenderItem).join("");

    bar.innerHTML = `
        <div class="ph-header" id="phHeaderRow">
            ${leftHtml}
            <div class="ph-right-group" id="phRightGroup">${rightHtml}</div>
        </div>
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
    phBindSearchResize();

    if (window.Workspace) Workspace.init();
}

function phBindDrag() {
    const row = document.getElementById("phHeaderRow");
    if (!row) return;

    let draggedEl = null;
    const sameGroup = (a, b) => PH_RIGHT_KEYS.includes(a) === PH_RIGHT_KEYS.includes(b);

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
            draggedEl = null;
        });

        item.addEventListener("dragover", (e) => {
            if (!draggedEl || item === draggedEl) return;
            if (!sameGroup(draggedEl.dataset.key, item.dataset.key)) return;
            e.preventDefault();

            const rect = item.getBoundingClientRect();
            const before = e.clientX < rect.left + rect.width / 2;

            row.querySelectorAll(".ph-item").forEach(el =>
                el.classList.remove("ph-drop-before", "ph-drop-after"));
            item.classList.add(before ? "ph-drop-before" : "ph-drop-after");
        });

        item.addEventListener("drop", (e) => {
            e.preventDefault();
            if (!draggedEl || item === draggedEl) return;
            if (!sameGroup(draggedEl.dataset.key, item.dataset.key)) return;

            const rect = item.getBoundingClientRect();
            const before = e.clientX < rect.left + rect.width / 2;

            item.parentNode.insertBefore(draggedEl, before ? item : item.nextSibling);
        });
    });
}

function phBindSearchResize() {

    const handle = document.getElementById("phSearchResizeHandle");
    const item = document.querySelector('.ph-item[data-key="search"]');
    if (!handle || !item) return;

    const saved = Number(localStorage.getItem(phStorageKey(PH_SEARCH_WIDTH_KEY)));

    if (saved && window.innerWidth > 1024) {
        item.style.setProperty("--ph-search-width", saved + "px");
        item.classList.add("ph-search-custom-width");
    }

    handle.addEventListener("mousedown", (e) => {

        if (window.innerWidth <= 1024) return;

        e.preventDefault();
        e.stopPropagation();

        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;inset:0;z-index:9999;cursor:ew-resize;";
        document.body.appendChild(overlay);

        const startX = e.clientX;
        const startWidth = item.getBoundingClientRect().width;

        function onMove(ev) {
            // TIDAK ADA batas atas (dulu ada Math.min(800, ...))
            const newWidth = Math.max(160, startWidth + (ev.clientX - startX));
            item.style.setProperty("--ph-search-width", newWidth + "px");
            item.classList.add("ph-search-custom-width");
        }

        function onUp() {
            overlay.remove();
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);

            const finalWidth = parseInt(item.style.getPropertyValue("--ph-search-width"), 10)
                || Math.round(item.getBoundingClientRect().width);

            localStorage.setItem(phStorageKey(PH_SEARCH_WIDTH_KEY), String(finalWidth));
        }

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);

    });

}

function phToggleMobileSearch(show) {
    const headerRow = document.getElementById("phHeaderRow");
    if (!headerRow) return;

    let overlay = document.getElementById("phMobileSearchOverlay");

    if (show) {

        if (overlay) return;

        overlay = document.createElement("div");
        overlay.id = "phMobileSearchOverlay";
        overlay.className = "ph-mobile-search-overlay";
        overlay.innerHTML = `
            <button class="ph-icon-btn" id="phMobileSearchClose"><i data-lucide="arrow-left"></i></button>
            <div class="ph-search"><i data-lucide="search"></i><input id="phMobileSearchInput" type="text" placeholder="Search..." oninput="phSearch(this.value)"></div>
        `;

        headerRow.appendChild(overlay);

        if (window.lucide) lucide.createIcons();

        document.getElementById("phMobileSearchClose").onclick = () => phToggleMobileSearch(false);
        document.getElementById("phMobileSearchInput").focus();

    } else {

        overlay?.remove();

    }

}

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