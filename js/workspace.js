// ======================================================
// workspace.js — tab manager, iframe host per tab
// FIXED: Chrome-style drag + free-float ghost + tab persistence
// ======================================================

const Workspace = (function () {

    const MIN_W = 80, MAX_W = 220, NATURAL_PAD = 56;
    const WS_TABS_KEY = "ph_workspace_tabs";
    const WS_ACTIVE_KEY = "ph_workspace_active";
    let tabs = [];
    let activeId = null;

    function uid() { return "t" + Math.random().toString(36).slice(2, 9); }
    function esc(s) { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; }

    function measure(text) {
        measure._ctx = measure._ctx || document.createElement("canvas").getContext("2d");
        measure._ctx.font = "13px -apple-system, sans-serif";
        return measure._ctx.measureText(text).width;
    }

    // --------------------------------------------------
    // persistence helpers
    // --------------------------------------------------
    function saveTabs() {
        const data = tabs.map(t => ({ id: t.id, title: t.title, url: t.url, page: t.page }));
        localStorage.setItem(WS_TABS_KEY, JSON.stringify(data));
    }

    function loadTabs() {
        try {
            const saved = JSON.parse(localStorage.getItem(WS_TABS_KEY));
            if (Array.isArray(saved)) return saved;
        } catch (e) {}
        return [];
    }

    // --------------------------------------------------
    // open / activate / close
    // --------------------------------------------------

    const MAX_TABS = 20;

    function openTab({ title, url, page }) {
        if (tabs.length >= MAX_TABS) {
            const victim = tabs.find(t => t.id !== activeId);
            if (victim) closeTab(victim.id);
        }

        const id = uid();
        tabs.push({ id, title, url, page });
        saveTabs();

        const host = document.getElementById("wsContent");
        const frame = document.createElement("iframe");
        frame.className = "ws-frame";
        frame.src = url;
        frame.dataset.tabId = id;
        frame.addEventListener("load", () => {
            try {
                const t = tabs.find(x => x.id === id);
                const docTitle = frame.contentDocument && frame.contentDocument.title;
                if (t && docTitle) {
                    t.title = docTitle.replace(/^Hotel PMS\s*(—|-)?\s*/i, "") || t.title;
                    render();
                    saveTabs();
                }
            } catch (e) {}
        });
        host.appendChild(frame);
        activate(id);
    }

    function activate(id) {
        activeId = id;
        localStorage.setItem(WS_ACTIVE_KEY, id);
        document.querySelectorAll(".ws-frame").forEach(f => {
            f.style.display = f.dataset.tabId === id ? "block" : "none";
        });
        const t = tabs.find(x => x.id === id);
        if (t && window.sbSetActiveByPage) sbSetActiveByPage(t.page);
        render();
        scrollTabIntoView(id);
    }

    function closeTab(id) {
        const idx = tabs.findIndex(t => t.id === id);
        if (idx === -1) return;

        tabs.splice(idx, 1);
        document.querySelector(`.ws-frame[data-tab-id="${id}"]`)?.remove();

        if (activeId === id) {
            const next = tabs[idx] || tabs[idx - 1];
            if (next) activate(next.id); else { activeId = null; localStorage.removeItem(WS_ACTIVE_KEY); render(); }
        } else {
            render();
        }
        saveTabs();
    }

    function closeAll() {
        tabs.forEach(t => {
            document.querySelector(`.ws-frame[data-tab-id="${t.id}"]`)?.remove();
        });
        tabs = [];
        activeId = null;
        localStorage.removeItem(WS_TABS_KEY);
        localStorage.removeItem(WS_ACTIVE_KEY);
        closeKebab();
        render();
    }

    function scrollTabIntoView(id) {
        requestAnimationFrame(() => {
            const el = document.querySelector(`.ws-tab[data-id="${id}"]`);
            el?.scrollIntoView({ block: "nearest", inline: "nearest" });
        });
    }

    // --------------------------------------------------
    // width calc
    // --------------------------------------------------

    function computeWidths(containerWidth) {
        const n = tabs.length;
        if (n === 0) return [];
        if (n === 1) {
            return [Math.min(MAX_W, Math.max(MIN_W, measure(tabs[0].title) + NATURAL_PAD))];
        }
        const even = containerWidth / n;
        if (even >= MIN_W) return tabs.map(() => Math.min(even, MAX_W));
        return tabs.map(() => MIN_W);
    }

    // --------------------------------------------------
    // render
    // --------------------------------------------------

    function render() {
        const bar = document.getElementById("wsTabbar");
        const scrollEl = document.getElementById("wsTabScroll");
        if (!bar || !scrollEl) return;

        if (tabs.length === 0) { bar.style.display = "none"; return; }
        bar.style.display = "flex";

        const containerWidth = scrollEl.clientWidth || 600;
        const widths = computeWidths(containerWidth);

        scrollEl.innerHTML = tabs.map((t, i) => `
            <div class="ws-tab ${t.id === activeId ? "active" : ""}" data-id="${t.id}" style="width:${widths[i]}px">
                <span class="ws-tab-label">${esc(t.title)}</span>
                <button class="ws-tab-close" data-close="${t.id}" title="Close">✕</button>
            </div>
        `).join("");

        updateOverflowUI();
    }

    // ======== EVENT DELEGATION ========
    function initTabEventDelegation() {
        const scrollEl = document.getElementById("wsTabScroll");
        if (!scrollEl) return;

        scrollEl.replaceWith(scrollEl.cloneNode(true));
        const newScrollEl = document.getElementById("wsTabScroll");

        newScrollEl.addEventListener("click", e => {
            const closeBtn = e.target.closest(".ws-tab-close");
            if (closeBtn) {
                closeTab(closeBtn.dataset.close);
                return;
            }
            const tabEl = e.target.closest(".ws-tab");
            if (tabEl && tabEl.dataset.dragged !== "1") {
                activate(tabEl.dataset.id);
            }
        });

        newScrollEl.addEventListener("pointerdown", onTabPointerDown);
    }

    // ==========================================================
    // FREE-FLOAT GHOST DRAG (Chrome-style angle detection)
    // ==========================================================
    function onTabPointerDown(e) {
        const tabEl = e.target.closest(".ws-tab");
        if (!tabEl || e.target.closest(".ws-tab-close")) return;

        e.preventDefault();

        const scrollEl = document.getElementById("wsTabScroll");
        const tabbar = document.getElementById("wsTabbar");
        const startX = e.clientX, startY = e.clientY;
        const startScrollLeft = scrollEl.scrollLeft;
        let mode = null, edgeDir = 0, raf = null;

        const dragEl = tabEl;
        dragEl.classList.add("ws-dragging");
        dragEl.dataset.dragged = "1";

        // --- simpan posisi asli untuk snap-back ---
        const originalNextId = [...scrollEl.children].find(el => el === dragEl)?.nextElementSibling?.dataset?.id || null;

        // --- GHOST ---
        let ghost = null;
        let ghostOffsetX = 0, ghostOffsetY = 0;

        function createGhost() {
            const rect = dragEl.getBoundingClientRect();
            ghost = dragEl.cloneNode(true);
            ghost.classList.add("ws-ghost");
            ghost.style.position = "fixed";
            ghost.style.left = rect.left + "px";
            ghost.style.top = rect.top + "px";
            ghost.style.width = rect.width + "px";
            ghost.style.height = rect.height + "px";
            ghost.style.zIndex = "10000";
            ghost.style.pointerEvents = "none";
            document.body.appendChild(ghost);
            ghostOffsetX = startX - rect.left;
            ghostOffsetY = startY - rect.top;
        }

        function updateGhost(x, y) {
            if (!ghost) return;
            ghost.style.left = (x - ghostOffsetX) + "px";
            ghost.style.top = (y - ghostOffsetY) + "px";
        }

        function removeGhost() {
            if (ghost) { ghost.remove(); ghost = null; }
        }

        function detectMode(dx, dy) {
            const angle = Math.atan2(Math.abs(dy), Math.abs(dx)) * (180 / Math.PI);
            return angle < 25 ? "scroll" : "reorder";
        }

        function autoScroll() {
            if (edgeDir !== 0) scrollEl.scrollLeft += edgeDir * 14;
            raf = requestAnimationFrame(autoScroll);
        }
        autoScroll();

        function onMove(ev) {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;

            if (!mode) {
                if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
                    mode = detectMode(dx, dy);
                    if (mode === "reorder") {
                        dragEl.classList.add("ws-reordering");
                        createGhost();
                        dragEl.style.opacity = "0.25";
                    }
                }
            }

            if (mode === "scroll") {
                scrollEl.scrollLeft = startScrollLeft - dx;
            } else if (mode === "reorder") {
                updateGhost(ev.clientX, ev.clientY);

                const rect = scrollEl.getBoundingClientRect();
                edgeDir = ev.clientX > rect.right - 44 ? 1 : ev.clientX < rect.left + 44 ? -1 : 0;

                if (ghost) ghost.style.visibility = "hidden";
                const overEl = document.elementFromPoint(ev.clientX, rect.top + rect.height / 2)?.closest(".ws-tab");
                if (ghost) ghost.style.visibility = "visible";

                if (overEl && overEl !== dragEl) {
                    const r = overEl.getBoundingClientRect();
                    const before = ev.clientX < r.left + r.width / 2;
                    const insertTarget = before ? overEl : overEl.nextSibling;
                    if (dragEl.parentNode === overEl.parentNode) {
                        overEl.parentNode.insertBefore(dragEl, insertTarget);
                    }
                }
            }
        }

        function onUp(ev) {
            cancelAnimationFrame(raf);
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);

            dragEl.classList.remove("ws-dragging", "ws-reordering");
            dragEl.style.opacity = "";
            dragEl.dataset.dragged = "0";
            removeGhost();

            if (mode === "reorder") {
                const tabbarRect = tabbar.getBoundingClientRect();
                const inTabbar = ev.clientX >= tabbarRect.left - 20
                              && ev.clientX <= tabbarRect.right + 20
                              && ev.clientY >= tabbarRect.top - 40
                              && ev.clientY <= tabbarRect.bottom + 40;

                if (inTabbar) {
                    syncOrderFromDom();
                    saveTabs();
                } else {
                    // snap back
                    const scrollEl2 = document.getElementById("wsTabScroll");
                    const nextEl = originalNextId
                        ? scrollEl2.querySelector(`.ws-tab[data-id="${originalNextId}"]`)
                        : null;
                    scrollEl2.insertBefore(dragEl, nextEl);
                }
            }
            updateOverflowUI();
        }

        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }

    // --------------------------------------------------
    // init + restore
    // --------------------------------------------------
    function init() {
        if (Workspace._inited) return;
        Workspace._inited = true;

        // --- RESTORE TABS ---
        const saved = loadTabs();
        if (saved.length > 0) {
            const host = document.getElementById("wsContent");
            saved.forEach(t => {
                tabs.push({ id: t.id, title: t.title, url: t.url, page: t.page });
                const frame = document.createElement("iframe");
                frame.className = "ws-frame";
                frame.src = t.url;
                frame.dataset.tabId = t.id;
                frame.style.display = "none";
                frame.addEventListener("load", () => {
                    try {
                        const tab = tabs.find(x => x.id === t.id);
                        const docTitle = frame.contentDocument && frame.contentDocument.title;
                        if (tab && docTitle) {
                            tab.title = docTitle.replace(/^Hotel PMS\s*(—|-)?\s*/i, "") || tab.title;
                            render();
                            saveTabs();
                        }
                    } catch (e) {}
                });
                host.appendChild(frame);
            });
            const lastActive = localStorage.getItem(WS_ACTIVE_KEY);
            const toActivate = tabs.find(t => t.id === lastActive) || tabs[0];
            if (toActivate) activate(toActivate.id);
            else render();
        }

        document.getElementById("wsArrowLeft").onclick = () =>
            document.getElementById("wsTabScroll").scrollBy({ left: -150, behavior: "smooth" });
        document.getElementById("wsArrowRight").onclick = () =>
            document.getElementById("wsTabScroll").scrollBy({ left: 150, behavior: "smooth" });
        document.getElementById("wsKebab").onclick = openKebab;
        document.getElementById("wsTabScroll").addEventListener("scroll", updateOverflowUI);
        window.addEventListener("resize", render);

        initTabEventDelegation();
    }

    function syncOrderFromDom() {
        const ids = [...document.querySelectorAll("#wsTabScroll .ws-tab")].map(e => e.dataset.id);
        tabs = ids.map(id => tabs.find(t => t.id === id));
    }

    // --------------------------------------------------
    // overflow UI
    // --------------------------------------------------

    function updateOverflowUI() {
        const scrollEl = document.getElementById("wsTabScroll");
        const overflow = scrollEl.scrollWidth > scrollEl.clientWidth + 1;

        document.getElementById("wsArrowLeft").style.display = overflow ? "flex" : "none";
        document.getElementById("wsArrowRight").style.display = overflow ? "flex" : "none";

        const atEnd = scrollEl.scrollLeft + scrollEl.clientWidth >= scrollEl.scrollWidth - 2;
        document.getElementById("wsFadeRight").style.opacity = (overflow && !atEnd) ? "1" : "0";

        document.getElementById("wsKebab").classList.toggle("has-overflow", overflow);
    }

    function getHiddenTabs() {
        const scrollEl = document.getElementById("wsTabScroll");
        const scrollRect = scrollEl.getBoundingClientRect();
        const hidden = [];
        document.querySelectorAll(".ws-tab").forEach(el => {
            const r = el.getBoundingClientRect();
            const fullyVisible = r.left >= scrollRect.left - 0.5 && r.right <= scrollRect.right + 0.5;
            if (!fullyVisible) hidden.push(el.dataset.id);
        });
        return tabs.filter(t => hidden.includes(t.id));
    }

    function openKebab() {
        closeKebab();
        const hiddenTabs = getHiddenTabs();

        const pop = document.createElement("div");
        pop.id = "wsKebabPopup";
        pop.className = "ws-kebab-popup";
        pop.innerHTML = `
            <button class="ws-kebab-item ws-kebab-danger" id="wsCloseAllBtn">Close all tabs</button>
            ${hiddenTabs.length ? `<hr>${hiddenTabs.map(t => `<div class="ws-kebab-item ws-kebab-tab" data-id="${t.id}">${esc(t.title)}</div>`).join("")}` : ""}
        `;
        document.body.appendChild(pop);

        const btn = document.getElementById("wsKebab");
        const r = btn.getBoundingClientRect();
        pop.style.top = (r.bottom + 4) + "px";
        pop.style.right = (window.innerWidth - r.right) + "px";
        pop.style.maxHeight = "70vh";
        pop.style.overflowY = "auto";

        document.getElementById("wsCloseAllBtn").onclick = closeAll;
        pop.querySelectorAll(".ws-kebab-tab").forEach(row => {
            row.onclick = () => { activate(row.dataset.id); closeKebab(); };
        });

        setTimeout(() => document.addEventListener("click", onOutsideKebab), 0);
    }

    function onOutsideKebab(e) {
        const pop = document.getElementById("wsKebabPopup");
        if (pop && !pop.contains(e.target) && e.target.id !== "wsKebab") closeKebab();
    }

    function closeKebab() {
        document.getElementById("wsKebabPopup")?.remove();
        document.removeEventListener("click", onOutsideKebab);
    }

    return { init, openTab, activate, closeTab, closeAll };

})();

window.Workspace = Workspace;