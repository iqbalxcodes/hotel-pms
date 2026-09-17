// ======================================================
// searchCardEngine.js
// Engine UNIVERSAL card "Search" -- generate field, drag-
// reorder + show/hide (mode customize), field date (ketik
// bebas + parser fleksibel + tombol kalender native + badge
// hari), field "magnifier" (diperpendek + tombol kaca pembesar
// buat popup advanced-search, didaftarin belakangan lewat
// scRegisterAdvancedHandler).
//
// Pakai:
//   const card = createSearchCard({
//       storageKey: "rsv_search_fields_config", // localStorage key + registry id, WAJIB unik per halaman
//       containerId: "rsvSearchFields",
//       fields: [{key,label,type:"text"|"select"|"date",options}],
//       magnifierFields: ["guest_name", ...]
//   });
//   card.load(); card.render();
//   card.gatherValues() -> {key: value (date udah ke-parse)}
//   card.resetToDefault(); card.setCustomizing(bool); card.clearValues();
//   card.fieldLabel(key); card.formatValue(key, value);
// ======================================================

const scRegistry = {};
const SC_DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const scAdvancedHandlers = {}; // scAdvancedHandlers[storageKey][key] = fn

function scIcon(name) { return `<i data-lucide="${name}"></i>`; }

function scEsc(s) {
    if (typeof escapeHtml === "function") return escapeHtml(s);
    const d = document.createElement("div");
    d.textContent = s ?? "";
    return d.innerHTML;
}

function scDowText(value) {
    if (!value) return "-";
    const d = new Date(value + "T00:00:00");
    return isNaN(d) ? "-" : SC_DOW[d.getDay()];
}

// 160320 / 16.03.26 / 1603 (tahun ini) / 160326 / 16/03/2026
function scParseFlexibleDate(raw) {
    const s = (raw || "").trim();
    if (!s) return null;

    let d, m, y;

    if (s.includes("/") || s.includes(".")) {
        const parts = s.split(/[./]/).filter(Boolean);
        if (parts.length === 2) {
            [d, m] = parts;
            y = String(new Date().getFullYear());
        } else if (parts.length === 3) {
            [d, m, y] = parts;
        } else {
            return null;
        }
    } else {
        const digits = s.replace(/\D/g, "");
        if (digits.length === 4) { d = digits.slice(0, 2); m = digits.slice(2, 4); y = String(new Date().getFullYear()); }
        else if (digits.length === 6) { d = digits.slice(0, 2); m = digits.slice(2, 4); y = digits.slice(4, 6); }
        else if (digits.length === 8) { d = digits.slice(0, 2); m = digits.slice(2, 4); y = digits.slice(4, 8); }
        else return null;
    }

    if (!/^\d+$/.test(d) || !/^\d+$/.test(m) || !/^\d+$/.test(y)) return null;

    let yNum = parseInt(y, 10);
    if (y.length === 2) yNum = yNum < 50 ? 2000 + yNum : 1900 + yNum;
    else if (y.length !== 4) return null;

    const dNum = parseInt(d, 10);
    const mNum = parseInt(m, 10);
    if (mNum < 1 || mNum > 12) return null;
    const maxDay = new Date(yNum, mNum, 0).getDate();
    if (dNum < 1 || dNum > maxDay) return null;

    const pad = n => String(n).padStart(2, "0");
    return `${yNum}-${pad(mNum)}-${pad(dNum)}`;
}

function scRegisterAdvancedHandler(storageKey, key, fn) {
    if (!scAdvancedHandlers[storageKey]) scAdvancedHandlers[storageKey] = {};
    scAdvancedHandlers[storageKey][key] = fn;
}

function scOpenAdvancedSearch(storageKey, key) {
    const handler = scAdvancedHandlers[storageKey] && scAdvancedHandlers[storageKey][key];
    if (typeof handler === "function") {
        handler(key);
        return;
    }
    if (typeof showMessage === "function") {
        const card = scRegistry[storageKey];
        showMessage(`Advanced search for ${card ? card.fieldLabel(key) : key} is still in development`, "info");
    }
}


function createSearchCard({ storageKey, containerId, fields, columnSize = 4, magnifierFields = [] }) {

    const fieldMap = Object.fromEntries(fields.map(f => [f.key, f]));

    let order = [];
    let hidden = [];
    let customizing = false;
    let dragKey = null;

    function fieldDef(key) { return fieldMap[key]; }
    function fieldLabel(key) { const f = fieldMap[key]; return f ? f.label : key; }

    function load() {
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey));
            if (saved && Array.isArray(saved.order)) {
                order = saved.order.filter(k => fieldMap[k]);
                fields.forEach(f => { if (!order.includes(f.key)) order.push(f.key); });
                hidden = Array.isArray(saved.hidden) ? saved.hidden : [];
                return;
            }
        } catch (e) {}
        order = fields.map(f => f.key);
        hidden = [];
    }

    function save() {
        localStorage.setItem(storageKey, JSON.stringify({ order, hidden }));
    }

    function resetToDefault() {
        order = fields.map(f => f.key);
        hidden = [];
        save();
        render();
        if (typeof showMessage === "function") showMessage("Search fields reset ke default", "success");
    }

    function renderFieldCard(key, values) {
        const def = fieldMap[key];
        if (!def) return "";

        const savedValue = values[key] || "";
        const isHidden = hidden.includes(key);
        const isDate = def.type === "date";
        const isMagnifier = magnifierFields.includes(key);

        let inputHtml;

        if (def.type === "select") {
            inputHtml = `<select data-search-key="${key}">${def.options.map(o =>
                `<option value="${o.value}" ${o.value === savedValue ? "selected" : ""}>${o.label}</option>`
            ).join("")}</select>`;
        } else if (isDate) {
            inputHtml = `
                <div class="sce-field-input-row">
                    <input type="text" class="sce-input-shrink" data-search-key="${key}" value="${scEsc(savedValue)}" placeholder="dd/mm/yyyy" onblur="scNormalizeDateInput(this)">
                    <button type="button" class="sce-field-calendar-btn" onclick="scOpenNativePicker(this)" title="Pick date">${scIcon("calendar")}</button>
                    <input type="date" class="sce-native-date-hidden" tabindex="-1" onchange="scNativeDateChanged(this)">
                    <span class="sce-field-dow">${scDowText(savedValue)}</span>
                </div>
            `;
        } else if (isMagnifier) {
            inputHtml = `
                <div class="sce-field-input-row">
                    <input type="text" class="sce-input-shrink" data-search-key="${key}" value="${scEsc(savedValue)}">
                    <button type="button" class="sce-field-search-btn" onclick="scOpenAdvancedSearch('${storageKey}','${key}')" title="Advanced search">${scIcon("search")}</button>
                </div>
            `;
        } else {
            inputHtml = `<input type="${def.type}" data-search-key="${key}" value="${scEsc(savedValue)}">`;
        }

        const hideBtnClass = isHidden ? "sce-btn-show" : "sce-btn-hide";

        return `
            <div class="sce-field-card ${isHidden ? "sce-field-hidden" : ""}" data-key="${key}" draggable="${customizing}">
                ${customizing ? `<span class="sce-field-drag">${scIcon("grip-vertical")}</span>` : ""}
                <div class="sce-field">
                    <label>${scEsc(def.label)}</label>
                    ${inputHtml}
                </div>
                ${customizing ? `<button class="sce-field-hide-btn ${hideBtnClass}" data-hide="${key}" title="${isHidden ? "Show" : "Hide"}">${scIcon(isHidden ? "plus" : "minus")}</button>` : ""}
            </div>
        `;
    }

    function render() {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.classList.toggle("sce-customizing", customizing);

        const values = {};
        container.querySelectorAll("[data-search-key]").forEach(el => { values[el.dataset.searchKey] = el.value; });

        const visibleKeys = order.filter(key => !hidden.includes(key) || customizing);

        const columns = [];
        for (let i = 0; i < visibleKeys.length; i += columnSize) columns.push(visibleKeys.slice(i, i + columnSize));

        container.innerHTML = columns.map(colKeys => `
            <div class="sce-search-column">
                ${colKeys.map(key => renderFieldCard(key, values)).join("")}
            </div>
        `).join("");

        if (window.lucide) lucide.createIcons();
        if (customizing) bindCustomizeEvents(container);
    }

    function bindCustomizeEvents(container) {

        container.querySelectorAll("[data-hide]").forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const key = btn.dataset.hide;
                const idx = hidden.indexOf(key);
                if (idx === -1) hidden.push(key); else hidden.splice(idx, 1);
                render();
            };
        });

        container.querySelectorAll(".sce-field-card").forEach(card => {

            card.addEventListener("dragstart", () => {
                dragKey = card.dataset.key;
                card.classList.add("sce-dragging");
            });

            card.addEventListener("dragend", () => {
                card.classList.remove("sce-dragging");
                container.querySelectorAll(".sce-field-card").forEach(c => c.classList.remove("sce-drop-before", "sce-drop-after"));
                dragKey = null;
            });

            card.addEventListener("dragover", (e) => {
                if (!dragKey || dragKey === card.dataset.key) return;
                e.preventDefault();
                const rect = card.getBoundingClientRect();
                const before = e.clientX < rect.left + rect.width / 2;
                container.querySelectorAll(".sce-field-card").forEach(c => c.classList.remove("sce-drop-before", "sce-drop-after"));
                card.classList.add(before ? "sce-drop-before" : "sce-drop-after");
            });

            card.addEventListener("drop", (e) => {
                e.preventDefault();
                if (!dragKey || dragKey === card.dataset.key) return;
                const rect = card.getBoundingClientRect();
                const before = e.clientX < rect.left + rect.width / 2;
                const fromIdx = order.indexOf(dragKey);
                order.splice(fromIdx, 1);
                let toIdx = order.indexOf(card.dataset.key);
                if (!before) toIdx += 1;
                order.splice(toIdx, 0, dragKey);
                render();
            });
        });
    }

    function setCustomizing(active) {
        customizing = active;
        if (!customizing) save();
        render();
    }

    function gatherValues() {
        const container = document.getElementById(containerId);
        if (!container) return {};
        const out = {};
        container.querySelectorAll("[data-search-key]").forEach(el => {
            const v = el.value.trim();
            if (!v) return;
            const def = fieldMap[el.dataset.searchKey];
            out[el.dataset.searchKey] = (def && def.type === "date") ? (scParseFlexibleDate(v) || v) : v;
        });
        return out;
    }

    function clearValues() {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.querySelectorAll("[data-search-key]").forEach(el => { el.value = ""; });
        container.querySelectorAll(".sce-field-dow").forEach(el => { el.textContent = "-"; });
    }

    function formatValue(key, value) {
        const def = fieldMap[key];
        if (def && def.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [y, m, d] = value.split("-");
            return `${d}/${m}/${y}`;
        }
        return value;
    }

    const api = { storageKey, fieldDef, fieldLabel, load, save, render, resetToDefault, setCustomizing, gatherValues, clearValues, formatValue };
    scRegistry[storageKey] = api;
    return api;
}


// ---- helper inline dari input date (gak butuh tau storageKey,
// cuma manipulasi DOM lokal di row-nya) ----

function scNormalizeDateInput(input) {
    const row = input.closest(".sce-field-input-row");
    const dowEl = row?.querySelector(".sce-field-dow");

    if (!input.value.trim()) {
        if (dowEl) dowEl.textContent = "-";
        return;
    }

    const parsed = scParseFlexibleDate(input.value);
    if (!parsed) return;

    const [y, m, d] = parsed.split("-");
    input.value = `${d}/${m}/${y}`;
    if (dowEl) dowEl.textContent = scDowText(parsed);
}

function scOpenNativePicker(btn) {
    const row = btn.closest(".sce-field-input-row");
    const nativeInput = row?.querySelector(".sce-native-date-hidden");
    if (!nativeInput) return;
    if (typeof nativeInput.showPicker === "function") nativeInput.showPicker();
    else nativeInput.click();
}

function scNativeDateChanged(nativeInput) {
    const row = nativeInput.closest(".sce-field-input-row");
    const textInput = row?.querySelector(".sce-input-shrink");
    const dowEl = row?.querySelector(".sce-field-dow");
    if (!nativeInput.value) return;
    const [y, m, d] = nativeInput.value.split("-");
    if (textInput) textInput.value = `${d}/${m}/${y}`;
    if (dowEl) dowEl.textContent = scDowText(nativeInput.value);
}