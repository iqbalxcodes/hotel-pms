// ======================================================
// folioUI.js
// Rendering murni untuk modul Folio. Semua id DOM lokal
// (fa_*, fp_*, folioServiceInput, dst) sekarang di-prefix
// pakai containerId (lewat FolioUI.fid) supaya folio1/2/3
// yang kebuka bareng gak saling rebutan elemen yang sama.
// ======================================================

function escapeHtmlSimple(str) {

    const div = document.createElement("div");
    div.textContent = str ?? "";

    return div.innerHTML;

}

const FolioUI = {

    // id lokal unik per container, mis: fid("folioMount2","fa_name") -> "folioMount2_fa_name"
    fid(containerId, name) {
        return `${containerId}_${name}`;
    },

    render(state) {

        const container = document.getElementById(state.containerId);
        if (!container) return;

        let bodyHtml;

        if (state.mode === "history") {
            bodyHtml = this.renderHistory(state);
        } else if (state.mode === "payment") {
            bodyHtml = this.renderPaymentView(state);
        } else {
            bodyHtml = this.renderBody(state);
        }

        container.innerHTML = `
            <div class="folio-card">
                ${this.renderHeader(state)}
                ${bodyHtml}
            </div>
        `;

    },

    // --------------------------------------------------
    // Header
    // --------------------------------------------------

    renderHeader(state) {

        const c = state.containerId;
        const isPayment = state.mode === "payment";
        const isEdit = state.mode === "edit";
        const isHistory = state.mode === "history";
        const isClosed = !!(state.folio && state.folio.is_closed);

        if (isPayment) {

            return `
                <div class="folio-header">
                    <div class="folio-header-left">
                        <span class="folio-title">Take Payment</span>
                    </div>
                    <button class="folio-icon-btn" title="Cancel" onclick="folioCancelPayment('${c}')">✕</button>
                </div>
            `;

        }

        const label = state.folio
            ? (state.folio.name || `Folio ${state.folio.folio_number}`)
            : "Folio";

        let editControls;

        if (isEdit) {

            editControls = `
                <button class="folio-icon-btn folio-icon-confirm auth-required require-auth" title="Save" onclick="folioSaveEdit('${c}')">✓</button>
                <button class="folio-icon-btn" title="Cancel" onclick="folioCancelEdit('${c}')">✕</button>
            `;

        } else {

            editControls = `
                ${!isClosed ? `<button class="folio-icon-btn auth-required require-auth" title="Edit Folio" onclick="folioEnterEdit('${c}')">✎</button>` : ""}
                <button class="folio-icon-btn ${isHistory ? "folio-icon-active" : ""}" title="Folio Activity" onclick="folioToggleHistory('${c}')">◷</button>
            `;

        }

        return `
            <div class="folio-header">
                <div class="folio-header-left">
                    <span class="folio-title">${escapeHtmlSimple(label)}</span>
                    ${isClosed ? `<span class="folio-closed-badge" title="Folio settled">🔒 Closed</span>` : ""}
                    ${editControls}
                </div>
                ${state.backAction ? `<button class="folio-icon-btn" title="Back" onclick="${state.backAction}">←</button>` : ""}
            </div>
        `;

    },

    // --------------------------------------------------
    // Body
    // --------------------------------------------------

    renderBody(state) {

        const editable = state.mode === "edit";
        const isClosed = !!(state.folio && state.folio.is_closed);

        return `
            ${this.renderAddressCard(state)}
            ${this.renderItemsTable(state, editable)}
            ${!isClosed ? this.renderAddServiceRow(state) : ""}
            ${this.renderFooter(state)}
        `;

    },

    // --------------------------------------------------
    // Invoice Address Card
    // --------------------------------------------------

    renderAddressCard(state) {

        const c = state.containerId;
        const editable = state.mode === "edit";
        const a = state.address || {};

        if (!editable) {

            return `
                <div class="folio-address-card">
                    <div class="folio-address-title">${escapeHtmlSimple(a.guest_or_company || "Guest")}</div>
                    <div class="folio-address-row">
                        <span>${a.customer_id ? "ID: " + escapeHtmlSimple(String(a.customer_id)) : ""}</span>
                        <span class="folio-address-name">${escapeHtmlSimple(a.name || "-")}</span>
                    </div>
                    ${a.additional_data ? `<div class="folio-address-row">${escapeHtmlSimple(a.additional_data)}</div>` : ""}
                    <div class="folio-address-row">${escapeHtmlSimple(a.street || "-")}</div>
                    <div class="folio-address-row">
                        <span>${escapeHtmlSimple(a.postcode || "")}</span>
                        <span>${escapeHtmlSimple(a.city || "")}</span>
                    </div>
                    <div class="folio-address-row">
                        <span>${escapeHtmlSimple(a.region || "")}</span>
                        <span>${escapeHtmlSimple(a.country || "")}</span>
                    </div>
                </div>
            `;

        }

        const typeOptions = ["Guest", "Company", "Agency", "Mr", "Mrs"]
            .map(opt => `<option value="${opt}" ${a.guest_or_company === opt ? "selected" : ""}>${opt}</option>`)
            .join("");

        return `
            <div class="folio-address-card folio-address-edit" id="${this.fid(c, "folioAddressEdit")}">
                <div class="folio-field-row">
                    <select id="${this.fid(c, "fa_guest_or_company")}">${typeOptions}</select>
                    <input id="${this.fid(c, "fa_customer_id")}" type="number" placeholder="ID" value="${a.customer_id ?? ""}"
                        onkeydown="if(event.key==='Enter'){event.preventDefault(); folioLookupCustomer('${c}');}">
                </div>
                <div class="folio-field-row">
                    <input id="${this.fid(c, "fa_name")}" type="text" placeholder="Name" value="${escapeHtmlSimple(a.name || "")}">
                </div>
                <div class="folio-field-row">
                    <input id="${this.fid(c, "fa_additional_data")}" type="text" placeholder="Add. Data (optional)" value="${escapeHtmlSimple(a.additional_data || "")}">
                </div>
                <div class="folio-field-row">
                    <input id="${this.fid(c, "fa_street")}" type="text" placeholder="Street w number" value="${escapeHtmlSimple(a.street || "")}">
                </div>
                <div class="folio-field-row">
                    <input id="${this.fid(c, "fa_postcode")}" type="text" placeholder="Postcode" value="${escapeHtmlSimple(a.postcode || "")}">
                    <input id="${this.fid(c, "fa_city")}" type="text" placeholder="City" value="${escapeHtmlSimple(a.city || "")}">
                </div>
                <div class="folio-field-row">
                    <input id="${this.fid(c, "fa_region")}" type="text" placeholder="Region (optional)" value="${escapeHtmlSimple(a.region || "")}">
                    <input id="${this.fid(c, "fa_country")}" type="text" placeholder="Country" value="${escapeHtmlSimple(a.country || "")}">
                </div>
            </div>
        `;

    },

    // --------------------------------------------------
    // Items Table
    // --------------------------------------------------

    renderItemsTable(state, editable) {

        const isClosed = !!(state.folio && state.folio.is_closed);

        const rows = state.items
            .map(item => this.renderItemRow(state, item, editable, state.selectedIds.has(item.id), isClosed))
            .join("");

        return `
            <div class="folio-table-scroll">
                <table class="folio-table">
                    <colgroup>
                        <col style="width:26px">
                        <col style="width:42px">
                        <col style="width:130px">
                        <col style="width:44px">
                        <col style="width:78px">
                        <col style="width:88px">
                    </colgroup>
                    <thead>
                        <tr>
                            <th></th>
                            <th>Qty</th>
                            <th>Name Service</th>
                            <th>Tax</th>
                            <th>Price</th>
                            <th>End Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || `<tr><td colspan="6" class="folio-empty">No items</td></tr>`}
                    </tbody>
                </table>
            </div>
        `;

    },

    renderItemRow(state, item, editable, selected, isClosed) {

        const c = state.containerId;
        const endPrice = FolioService.calcEndPrice(item);

        if (!editable) {

            return `
                <tr>
                    <td><input type="checkbox" ${selected ? "checked" : ""} ${isClosed ? "disabled" : ""} onchange="folioToggleSelect('${c}', ${item.id})"></td>
                    <td>${item.quantity}</td>
                    <td>${escapeHtmlSimple(item.service_name)}</td>
                    <td>${item.tax_rate}%</td>
                    <td>${folioFormatCurrency(item.unit_price)}</td>
                    <td>${folioFormatCurrency(endPrice)}</td>
                </tr>
            `;

        }

        return `
            <tr data-item-id="${item.id}" class="folio-edit-row">
                <td><input type="checkbox" ${selected ? "checked" : ""} onchange="folioToggleSelect('${c}', ${item.id})"></td>
                <td><input type="number" step="0.01" class="folio-inline-input fi-qty" value="${item.quantity}"></td>
                <td><input type="text" class="folio-inline-input fi-name" value="${escapeHtmlSimple(item.service_name)}"></td>
                <td><input type="number" step="0.01" class="folio-inline-input fi-tax" value="${item.tax_rate}"></td>
                <td><input type="number" step="0.01" class="folio-inline-input fi-price" value="${item.unit_price}"></td>
                <td class="folio-end-price-cell">${folioFormatCurrency(endPrice)}</td>
            </tr>
        `;

    },

    // Scoped ke card folio yang bersangkutan (fix: dulu query global
    // document.querySelectorAll(".folio-edit-row") -> ikut narik row
    // dari folio lain kalau lagi edit bareng-bareng)
    collectEditDraft(containerId) {

        const container = document.getElementById(containerId);

        const address = {
            guest_or_company: document.getElementById(this.fid(containerId, "fa_guest_or_company"))?.value || "Guest",
            customer_id: document.getElementById(this.fid(containerId, "fa_customer_id"))?.value || null,
            name: document.getElementById(this.fid(containerId, "fa_name"))?.value || "",
            additional_data: document.getElementById(this.fid(containerId, "fa_additional_data"))?.value || null,
            street: document.getElementById(this.fid(containerId, "fa_street"))?.value || null,
            postcode: document.getElementById(this.fid(containerId, "fa_postcode"))?.value || null,
            city: document.getElementById(this.fid(containerId, "fa_city"))?.value || null,
            region: document.getElementById(this.fid(containerId, "fa_region"))?.value || null,
            country: document.getElementById(this.fid(containerId, "fa_country"))?.value || null
        };

        const items = [...container.querySelectorAll(".folio-edit-row")].map(row => {

            const id = Number(row.dataset.itemId);

            return {
                id,
                quantity: Number(row.querySelector(".fi-qty").value),
                service_name: row.querySelector(".fi-name").value,
                tax_rate: Number(row.querySelector(".fi-tax").value),
                unit_price: Number(row.querySelector(".fi-price").value)
            };

        });

        return { address, items };

    },

    // --------------------------------------------------
    // Add service row
    // --------------------------------------------------

    renderAddServiceRow(state) {

        const c = state.containerId;

        return `
            <div class="folio-add-service-row">
                <div class="folio-service-autocomplete">
                    <input
                        id="${this.fid(c, "folioServiceInput")}"
                        type="text"
                        class="require-auth"
                        placeholder="Code / service name (e.g. R for Room)"
                        onkeyup="folioServiceInputKeyup('${c}', this)">
                    <div id="${this.fid(c, "folioServiceSuggestions")}" class="folio-suggestions"></div>
                </div>
                <button class="folio-btn auth-required require-auth" onclick="folioApplyNewService('${c}')">Apply</button>
            </div>
        `;

    },

    renderServiceSuggestions(containerId, results) {

        const box = document.getElementById(this.fid(containerId, "folioServiceSuggestions"));
        if (!box) return;

        if (!results.length) {

            box.innerHTML = "";
            box.style.display = "none";
            return;

        }

        box.style.display = "block";

        box.innerHTML = results.map(s => `
            <div class="folio-suggestion-item" onclick="folioSelectServiceSuggestion('${containerId}', '${s.code}')">
                ${escapeHtmlSimple(s.name)} <span class="folio-suggestion-code">${s.code}</span>
            </div>
        `).join("");

    },

    // --------------------------------------------------
    // Footer
    // --------------------------------------------------

    renderFooter(state) {

        const isClosed = !!(state.folio && state.folio.is_closed);

        if (state.mode === "edit") {
            return "";
        }

        if (isClosed) {

            return this.renderClosedFooter(state);

        }

        const selectedCount = state.selectedIds.size;

        if (selectedCount === 0) {

            return this.renderNormalFooter(state);

        }

        if (state.toolbarAction === "move") {

            return this.renderMoveToolbar(state, selectedCount);

        }

        if (state.toolbarAction === "split") {

            return this.renderSplitToolbar(state, selectedCount);

        }

        if (state.toolbarAction === "discount") {

            return this.renderDiscountToolbar(state, selectedCount);

        }

        return this.renderSelectionToolbar(state, selectedCount);

    },

    renderClosedFooter(state) {

        const invoiceNo = state.folio.invoice_number || "-";

        return `
            <div class="folio-footer">
                <div class="folio-balance folio-balance-settled">
                    Invoice ${escapeHtmlSimple(invoiceNo)} <span class="folio-balance-status">Settled</span>
                </div>
            </div>
        `;

    },

    renderNormalFooter(state) {

        const c = state.containerId;
        const balance = FolioService.calcBalance(state.items, state.payments);

        let statusLabel = "Settled";
        let statusClass = "folio-balance-settled";

        if (balance < 0) {

            statusLabel = "Outstanding";
            statusClass = "folio-balance-outstanding";

        } else if (balance > 0) {

            statusLabel = "Credit";
            statusClass = "folio-balance-credit";

        }

        return `
            <div class="folio-footer">
                <button class="folio-btn auth-required require-auth" onclick="folioOpenPaymentView('${c}')">Take Payment</button>
                <div class="folio-balance ${statusClass}">
                    Balance: ${folioFormatCurrency(balance)} <span class="folio-balance-status">${statusLabel}</span>
                </div>
            </div>
        `;

    },

    renderSelectionToolbar(state, count) {

        const c = state.containerId;

        return `
            <div class="folio-footer folio-footer-selection">
                <span class="folio-selection-count">${count} selected</span>
                <button class="folio-btn auth-required require-auth" onclick="folioConfirmDelete('${c}')">Delete</button>
                <button class="folio-btn auth-required require-auth" onclick="folioShowAction('${c}', 'move')">Move</button>
                <button class="folio-btn auth-required require-auth" onclick="folioShowAction('${c}', 'split')">Split</button>
                <button class="folio-btn auth-required require-auth" onclick="folioShowAction('${c}', 'discount')">Apply Discount</button>
                <button class="folio-btn folio-btn-plain" onclick="folioClearSelection('${c}')">Cancel</button>
            </div>
        `;

    },

    renderMoveToolbar(state, count) {

        const c = state.containerId;
        const folioOptions = this.buildFolioNumberOptions();

        return `
            <div class="folio-footer folio-footer-action">
                <span class="folio-selection-count">${count} selected — Move</span>
                <input id="${this.fid(c, "folioMoveReservation")}" type="text" placeholder="Reservation (blank = current)"
                    class="folio-inline-input">
                <select id="${this.fid(c, "folioMoveFolioSelect")}" class="folio-inline-input">${folioOptions}</select>
                <button class="folio-btn auth.required require-auth" onclick="folioSubmitMove('${c}')">Apply</button>
                <button class="folio-btn folio-btn-plain" onclick="folioCancelAction('${c}')">Cancel</button>
            </div>
        `;

    },

    renderSplitToolbar(state, count) {

        const c = state.containerId;
        const folioOptions = this.buildFolioNumberOptions();

        return `
            <div class="folio-footer folio-footer-action">
                <span class="folio-selection-count">${count} selected — Split</span>
                <select id="${this.fid(c, "folioSplitBasisType")}" class="folio-inline-input">
                    <option value="percentage">Percentage</option>
                    <option value="price">Price</option>
                </select>
                <input id="${this.fid(c, "folioSplitBasisValue")}" type="number" step="0.01" placeholder="Value" class="folio-inline-input">
                <span class="folio-footer-label">to</span>
                <input id="${this.fid(c, "folioSplitReservation")}" type="text" placeholder="Reservation (blank = current)" class="folio-inline-input">
                <select id="${this.fid(c, "folioSplitFolioSelect")}" class="folio-inline-input">${folioOptions}</select>
                <button class="folio-btn auth-required require-auth" onclick="folioSubmitSplit('${c}')">Apply</button>
                <button class="folio-btn folio-btn-plain" onclick="folioCancelAction('${c}')">Cancel</button>
            </div>
        `;

    },

    renderDiscountToolbar(state, count) {

        const c = state.containerId;

        return `
            <div class="folio-footer folio-footer-action">
                <span class="folio-selection-count">${count} selected — Discount</span>
                <select id="${this.fid(c, "folioDiscountBasisType")}" class="folio-inline-input">
                    <option value="percentage">Percentage</option>
                    <option value="price">Price</option>
                </select>
                <input id="${this.fid(c, "folioDiscountBasisValue")}" type="number" step="0.01" placeholder="Value" class="folio-inline-input">
                <button class="folio-btn auth-required require-auth" onclick="folioSubmitDiscount('${c}')">Apply</button>
                <button class="folio-btn folio-btn-plain" onclick="folioCancelAction('${c}')">Cancel</button>
            </div>
        `;

    },

    buildFolioNumberOptions() {

        return [1, 2, 3].map(n => `<option value="${n}">Folio ${n}</option>`).join("");

    },

    // --------------------------------------------------
    // Payment View
    // (catatan "API under development" DIHAPUS dari sini,
    // sekarang dipasang permanen di status bar bawah halaman)
    // --------------------------------------------------

    renderPaymentView(state) {

        const c = state.containerId;
        const draft = state.paymentDraft || {};

        return `
            <div class="folio-payment-card">
                <div class="folio-payment-row">
                    <label>Invoice Number</label>
                    <input id="${this.fid(c, "fp_invoice_number")}" type="text" class="folio-inline-input" value="${escapeHtmlSimple(draft.invoice_number || "")}" readonly>
                </div>
                <div class="folio-payment-row">
                    <label>Date</label>
                    <input id="${this.fid(c, "fp_date")}" type="date" class="folio-inline-input" value="${draft.date || ""}">
                </div>
                <div class="folio-payment-row">
                    <label>Cashiered By</label>
                    <input id="${this.fid(c, "fp_cashiered_by")}" type="text" class="folio-inline-input" value="${escapeHtmlSimple(draft.cashiered_by || "")}" readonly>
                </div>
                <div class="folio-payment-row">
                    <label>Payment Method</label>
                    <select id="${this.fid(c, "fp_method")}" class="folio-inline-input">
                        <option value="Cash" ${draft.method === "Cash" ? "selected" : ""}>Cash</option>
                        <option value="Credit Card" ${draft.method === "Credit Card" ? "selected" : ""}>Credit Card</option>
                        <option value="Debit Card" ${draft.method === "Debit Card" ? "selected" : ""}>Debit Card</option>
                        <option value="Bank Transfer" ${draft.method === "Bank Transfer" ? "selected" : ""}>Bank Transfer</option>
                    </select>
                </div>
                <div class="folio-payment-row">
                    <label>Amount</label>
                    <input id="${this.fid(c, "fp_amount")}" type="number" step="0.01" class="folio-inline-input" value="${draft.amount || ""}">
                </div>
                <div class="folio-payment-actions">
                    <button class="folio-btn folio-btn-plain" onclick="folioCancelPayment('${c}')">Cancel</button>
                    <button class="folio-btn folio-icon-confirm auth-required require-auth" onclick="folioSubmitPayment('${c}')">Pay</button>
                </div>
            </div>
        `;

    },

    collectPaymentDraft(containerId) {

        return {
            invoice_number: document.getElementById(this.fid(containerId, "fp_invoice_number"))?.value || "",
            date: document.getElementById(this.fid(containerId, "fp_date"))?.value || "",
            cashiered_by: document.getElementById(this.fid(containerId, "fp_cashiered_by"))?.value || "",
            method: document.getElementById(this.fid(containerId, "fp_method"))?.value || "Cash",
            amount: document.getElementById(this.fid(containerId, "fp_amount"))?.value || "0"
        };

    },

    generateInvoiceNumber(folio) {

        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const base = folio && folio.id ? folio.id : Math.floor(Math.random() * 100000);

        return `INV-${y}${m}-${String(base).padStart(5, "0")}`;

    },

    // --------------------------------------------------
    // Activity Timeline
    // --------------------------------------------------

    renderHistory(state) {

        if (!state.activity || state.activity.length === 0) {

            return `<div class="folio-history"><div class="folio-empty">No activity yet</div></div>`;

        }

        const groups = this.groupActivityByDay(state.activity);

        const groupsHtml = Object.entries(groups).map(([dayLabel, entries]) => `
            <div class="folio-history-day-label">${dayLabel}</div>
            ${entries.map(e => this.renderActivityEntry(e)).join("")}
        `).join("");

        return `<div class="folio-history">${groupsHtml}</div>`;

    },

    groupActivityByDay(activity) {

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const groups = {};

        activity.forEach(entry => {

            const d = new Date(entry.created_at);
            const dayOnly = new Date(d);
            dayOnly.setHours(0, 0, 0, 0);

            let label;

            if (dayOnly.getTime() === today.getTime()) {
                label = "Today";
            } else if (dayOnly.getTime() === yesterday.getTime()) {
                label = "Yesterday";
            } else {
                label = dayOnly.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
            }

            if (!groups[label]) groups[label] = [];
            groups[label].push(entry);

        });

        return groups;

    },

    renderActivityEntry(entry) {

        const time = new Date(entry.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

        return `
            <div class="folio-history-entry">
                <div class="folio-history-time">${time}</div>
                <div class="folio-history-content">
                    <div class="folio-history-desc">${escapeHtmlSimple(entry.description || entry.action)}</div>
                    ${entry.actor_name ? `<div class="folio-history-actor">${escapeHtmlSimple(entry.actor_name)}</div>` : ""}
                </div>
            </div>
        `;

    }

};


// ======================================================
// Guest/Company ID lookup
// ======================================================

async function folioLookupCustomer(containerId) {

    const idInput = document.getElementById(FolioUI.fid(containerId, "fa_customer_id"));
    if (!idInput || !idInput.value) return;

    try {

        const guest = await FolioService.lookupGuestById(Number(idInput.value));

        if (!guest) {

            folioShowMessage("Guest ID not found — will be generated as new", "info");
            return;

        }

        document.getElementById(FolioUI.fid(containerId, "fa_name")).value = `${guest.first_name || ""} ${guest.last_name || ""}`.trim();
        document.getElementById(FolioUI.fid(containerId, "fa_street")).value = guest.address || "";
        document.getElementById(FolioUI.fid(containerId, "fa_postcode")).value = guest.postal_code || "";
        document.getElementById(FolioUI.fid(containerId, "fa_city")).value = guest.city || "";
        document.getElementById(FolioUI.fid(containerId, "fa_country")).value = guest.country || "";

    } catch (e) {

        console.error(e);
        folioShowMessage("Gagal mencari guest", "error");

    }

}