// ======================================================
// folioService.js
// Data layer untuk modul Folio. Murni CRUD + activity
// logging — TIDAK tahu apa-apa soal UI/DOM, jadi bisa
// dipakai dari halaman mana saja (reservation, cashiering,
// guest, invoice, dst).
// ======================================================

const FolioService = {

    // --------------------------------------------------
    // Folio
    // --------------------------------------------------

    async getOrCreateFolio(reservationId, folioId = null) {

        if (folioId) {

            const { data, error } = await supabaseClient
                .from("folio")
                .select("*")
                .eq("id", folioId)
                .single();

            if (error) throw error;
            return data;

        }

        const existing = await this.getFoliosByReservation(reservationId);

        if (existing.length > 0) {

            return existing[0];

        }

        const { data: created, error: createError } = await supabaseClient
            .from("folio")
            .insert({ reservation_id: reservationId, folio_number: 1, name: "Folio 1" })
            .select()
            .single();

        if (createError) throw createError;

        await this.logActivity(created.id, "created", "Folio created");

        // Folio 1 baru dibuat -> harga kamar dari reservation langsung
        // dimasukkan sebagai item default (kalau ada harganya). Folio 2/3
        // (dibuat via createNextFolio, mis. dari Move/Split) sengaja TIDAK
        // ikut kena auto-charge ini.
        await this.addRoomChargeFromReservation(created.id, reservationId);

        return created;

    },

    async getFoliosByReservation(reservationId) {

        const { data, error } = await supabaseClient
            .from("folio")
            .select("*")
            .eq("reservation_id", reservationId)
            .order("folio_number", { ascending: true });

        if (error) throw error;
        return data || [];

    },

    async createNextFolio(reservationId) {

        const existing = await this.getFoliosByReservation(reservationId);

        const nextNumber =
            existing.length > 0
            ? Math.max(...existing.map(f => f.folio_number)) + 1
            : 1;

        const { data, error } = await supabaseClient
            .from("folio")
            .insert({ reservation_id: reservationId, folio_number: nextNumber, name: `Folio ${nextNumber}` })
            .select()
            .single();

        if (error) throw error;

        await this.logActivity(data.id, "created", `Folio ${nextNumber} created`);

        return data;

    },

    async findReservationByConfirmation(confirmationNo) {

        const { data, error } = await supabaseClient
            .from("reservation")
            .select("id, confirmation_no, guest_name, room_number")
            .eq("confirmation_no", confirmationNo)
            .maybeSingle();

        if (error) throw error;
        return data;

    },

    // --------------------------------------------------
    // Room charge (default) — dipanggil sekali saat Folio 1
    // pertama kali dibuat untuk sebuah reservation.
    // --------------------------------------------------

    calcNightsFromDates(arrivalDate, departureDate) {

        if (!arrivalDate || !departureDate) return 0;

        const arrival = new Date(arrivalDate);
        const departure = new Date(departureDate);

        const nights = Math.round((departure - arrival) / (1000 * 60 * 60 * 24));

        return nights > 0 ? nights : 0;

    },

    async addRoomChargeFromReservation(folioId, reservationId) {

        if (!reservationId) return;

        try {

            const { data: res, error } = await supabaseClient
                .from("reservation")
                .select("price, room_type, arrival_date, departure_date")
                .eq("id", reservationId)
                .maybeSingle();

            if (error) throw error;

            // Kalau reservation belum punya harga (mis. price null/0),
            // jangan bikin item kosong -> user tetap bisa nambah manual.
            if (!res || !res.price) return;

            const nights = this.calcNightsFromDates(res.arrival_date, res.departure_date) || 1;
            const roomCatalog = this.SERVICE_CATALOG.find(s => s.code === "ROOM");

            await this.addItem(folioId, {
                service_code: "ROOM",
                service_name: res.room_type ? `Room - ${res.room_type}` : "Room",
                quantity: nights,
                unit_price: res.price,
                tax_rate: roomCatalog ? roomCatalog.tax_rate : 19
            });

        } catch (e) {

            // Gagal auto-charge room bukan alasan buat gagalin pembuatan
            // folio -> cukup dicatat, folio tetap kebentuk kosong.
            console.error("Gagal menambahkan room charge otomatis:", e);

        }

    },

    // --------------------------------------------------
    // Items
    // --------------------------------------------------

    async getItems(folioId) {

        const { data, error } = await supabaseClient
            .from("folio_items")
            .select("*")
            .eq("folio_id", folioId)
            .eq("is_deleted", false)
            .order("created_at", { ascending: true });

        if (error) throw error;
        return data || [];

    },

    // end_price = (qty * unit_price - discount) * (1 + tax%)
    calcEndPrice(item) {

        const gross = Number(item.quantity || 0) * Number(item.unit_price || 0);
        const discount = Number(item.discount_amount || 0);
        const taxable = gross - discount;
        const tax = taxable * (Number(item.tax_rate || 0) / 100);

        return Math.round((taxable + tax) * 100) / 100;

    },

    async addItem(folioId, { service_code, service_name, quantity, unit_price, tax_rate }) {

        const end_price = this.calcEndPrice({ quantity, unit_price, tax_rate, discount_amount: 0 });

        const { data, error } = await supabaseClient
            .from("folio_items")
            .insert({ folio_id: folioId, service_code, service_name, quantity, unit_price, tax_rate, end_price })
            .select()
            .single();

        if (error) throw error;

        await this.logActivity(folioId, "added", `Added "${service_name}"`, {
            quantity, unit_price, tax_rate
        });

        return data;

    },

    async updateItem(itemId, patch, { silent = false } = {}) {

        const merged = { ...patch, end_price: this.calcEndPrice(patch) };

        const { data, error } = await supabaseClient
            .from("folio_items")
            .update(merged)
            .eq("id", itemId)
            .select()
            .single();

        if (error) throw error;

        if (!silent) {

            await this.logActivity(data.folio_id, "updated", `Edited "${data.service_name}"`);

        }

        return data;

    },

    async deleteItem(item) {

        const { error } = await supabaseClient
            .from("folio_items")
            .update({ is_deleted: true })
            .eq("id", item.id);

        if (error) throw error;

        await this.logActivity(item.folio_id, "deleted", `Deleted "${item.service_name}"`, {
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            end_price: this.calcEndPrice(item)
        });

    },

    async moveItems(items, targetFolioId, targetFolioLabel) {

        const ids = items.map(i => i.id);

        const { error } = await supabaseClient
            .from("folio_items")
            .update({ folio_id: targetFolioId })
            .in("id", ids);

        if (error) throw error;

        const sourceFolioId = items[0].folio_id;

        for (const item of items) {

            await this.logActivity(sourceFolioId, "moved", `Moved "${item.service_name}"`, {
                item: item.service_name,
                amount: this.calcEndPrice(item),
                from_folio: sourceFolioId,
                to_folio: targetFolioId
            });

            await this.logActivity(targetFolioId, "moved", `Received "${item.service_name}"`, {
                item: item.service_name,
                amount: this.calcEndPrice(item),
                from_folio: sourceFolioId,
                to_folio: targetFolioId
            });

        }

    },

    // splitBasis: { type: 'percentage'|'price', value: number }
    // splitBasis menentukan porsi yang PINDAH ke target folio
    async splitItems(items, splitBasis, targetFolioId) {

        const sourceFolioId = items[0].folio_id;
        const totalSelectedEnd = items.reduce((sum, i) => sum + this.calcEndPrice(i), 0);

        const movedTotal =
            splitBasis.type === "percentage"
            ? totalSelectedEnd * (splitBasis.value / 100)
            : splitBasis.value;

        const ratioMoved = totalSelectedEnd > 0 ? movedTotal / totalSelectedEnd : 0;

        for (const item of items) {

            const itemEnd = this.calcEndPrice(item);
            const itemMovedAmount = itemEnd * ratioMoved;

            const movedQty = Math.round(item.quantity * ratioMoved * 10000) / 10000;
            const remainQty = Math.round((item.quantity - movedQty) * 10000) / 10000;

            await this.updateItem(item.id, {
                quantity: remainQty,
                unit_price: item.unit_price,
                tax_rate: item.tax_rate,
                discount_amount: (item.discount_amount || 0) * (1 - ratioMoved)
            }, { silent: true });

            const { data: newItem, error } = await supabaseClient
                .from("folio_items")
                .insert({
                    folio_id: targetFolioId,
                    service_code: item.service_code,
                    service_name: item.service_name,
                    quantity: movedQty,
                    unit_price: item.unit_price,
                    tax_rate: item.tax_rate,
                    discount_amount: (item.discount_amount || 0) * ratioMoved,
                    end_price: itemMovedAmount
                })
                .select()
                .single();

            if (error) throw error;

            await this.logActivity(sourceFolioId, "split", `Split "${item.service_name}"`, {
                item: item.service_name,
                basis: splitBasis,
                to_folio: targetFolioId,
                moved_amount: Math.round(itemMovedAmount * 100) / 100,
                remain_amount: Math.round((itemEnd - itemMovedAmount) * 100) / 100
            });

            await this.logActivity(targetFolioId, "split", `Received split "${item.service_name}"`, {
                item: item.service_name,
                basis: splitBasis,
                from_folio: sourceFolioId,
                amount: Math.round(itemMovedAmount * 100) / 100
            });

            void newItem;

        }

    },

    // discountBasis: { type: 'percentage'|'price', value: number }
    async applyDiscount(items, discountBasis) {

        const folioId = items[0].folio_id;

        for (const item of items) {

            const gross = item.quantity * item.unit_price;

            const discountAmount =
                discountBasis.type === "percentage"
                ? gross * (discountBasis.value / 100)
                : discountBasis.value / items.length; // price basis dibagi rata antar item terpilih

            await this.updateItem(item.id, {
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax_rate: item.tax_rate,
                discount_percent: discountBasis.type === "percentage" ? discountBasis.value : null,
                discount_amount: discountAmount
            }, { silent: true });

            await this.logActivity(folioId, "discounted", `Applied discount on "${item.service_name}"`, {
                item: item.service_name,
                basis: discountBasis,
                discount_amount: Math.round(discountAmount * 100) / 100
            });

        }

    },

    // --------------------------------------------------
    // Payments / Balance
    // --------------------------------------------------

    async getPayments(folioId) {

        const { data, error } = await supabaseClient
            .from("folio_payments")
            .select("*")
            .eq("folio_id", folioId)
            .order("paid_at", { ascending: true });

        if (error) throw error;
        return data || [];

    },

    async addPayment(folioId, amount, paymentMethod) {

        const { data, error } = await supabaseClient
            .from("folio_payments")
            .insert({ folio_id: folioId, amount, payment_method: paymentMethod })
            .select()
            .single();

        if (error) throw error;

        await this.logActivity(folioId, "payment", "Payment received", {
            amount, payment_method: paymentMethod
        });

        return data;

    },

    calcBalance(items, payments) {

        const totalCharges = items.reduce((sum, i) => sum + this.calcEndPrice(i), 0);
        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

        return Math.round((totalCharges - totalPaid) * 100) / 100;

    },

    // --------------------------------------------------
    // Payment terminal (STUB — under development)
    //
    // TODO: ganti isi fungsi ini dengan pemanggilan API
    // terminal pembayaran yang sebenarnya begitu tersedia
    // (mis. request charge ke device EDC/terminal, lalu
    // tunggu callback/status approved-nya). Untuk sekarang
    // fungsi ini hanya menyimulasikan approval supaya alur
    // UI (Take Payment -> Pay -> folio closed) bisa dites.
    // --------------------------------------------------

    async chargePaymentTerminal({ folioId, invoiceNumber, amount, method }) {

        console.warn(
            "[FolioService] Payment terminal API belum terhubung (under development). " +
            "Menyimulasikan pembayaran sukses untuk", { folioId, invoiceNumber, amount, method }
        );

        // Simulasi delay request ke terminal
        await new Promise(resolve => setTimeout(resolve, 400));

        return {
            success: true,
            terminal_ref: null,
            message: "Simulated (terminal API under development)"
        };

    },

    // Kunci folio setelah pembayaran selesai -> item folio tidak
    // bisa diedit lagi (abgeschlossen). Butuh kolom di tabel `folio`:
    // is_closed (bool), invoice_number (text), cashiered_by (text),
    // closed_at (timestamp).
    async closeFolioBilling(folioId, { invoice_number, cashiered_by, paid_at_date } = {}) {

        const { data, error } = await supabaseClient
            .from("folio")
            .update({
                is_closed: true,
                invoice_number: invoice_number || null,
                cashiered_by: cashiered_by || null,
                closed_at: new Date().toISOString()
            })
            .eq("id", folioId)
            .select()
            .single();

        if (error) throw error;

        await this.logActivity(folioId, "closed", `Folio closed (Invoice ${invoice_number || "-"})`, {
            invoice_number, cashiered_by, paid_at_date
        });

        return data;

    },

    async getCurrentUserName() {

        try {

            const { data: userData } = await supabaseClient.auth.getUser();
            return userData?.user?.email || "-";

        } catch (e) {

            return "-";

        }

    },

    // --------------------------------------------------
    // Invoice Address
    // --------------------------------------------------

    async getAddress(folioId) {

        const { data, error } = await supabaseClient
            .from("invoice_address")
            .select("*")
            .eq("folio_id", folioId)
            .maybeSingle();

        if (error) throw error;
        return data;

    },

    async saveAddress(folioId, address) {

        const existing = await this.getAddress(folioId);

        if (existing) {

            const { error } = await supabaseClient
                .from("invoice_address")
                .update(address)
                .eq("id", existing.id);

            if (error) throw error;

        } else {

            const { error } = await supabaseClient
                .from("invoice_address")
                .insert({ ...address, folio_id: folioId });

            if (error) throw error;

        }

        await this.logActivity(folioId, "address_changed", "Invoice address changed");

    },

    async lookupGuestById(guestId) {

        const { data, error } = await supabaseClient
            .from("guests")
            .select("*")
            .eq("id", guestId)
            .maybeSingle();

        if (error) throw error;
        return data;

    },

    // --------------------------------------------------
    // Service catalog (autocomplete). Sementara static,
    // tinggal ganti isi function ini kalau nanti ada tabel
    // `services` sendiri.
    // --------------------------------------------------

    SERVICE_CATALOG: [
        { code: "ROOM", name: "Room", tax_rate: 19, unit_price: 0 },
        { code: "BRK",  name: "Breakfast", tax_rate: 19, unit_price: 22 },
        { code: "DEP",  name: "Deposit", tax_rate: 0, unit_price: 0 },
        { code: "MINI", name: "Minibar", tax_rate: 19, unit_price: 8 },
        { code: "PARK", name: "Parking", tax_rate: 19, unit_price: 15 },
        { code: "REF",  name: "Refreshment", tax_rate: 19, unit_price: 5 }
    ],

    searchServiceCatalog(keyword) {

        const kw = (keyword || "").trim().toLowerCase();
        if (!kw) return [];

        return this.SERVICE_CATALOG.filter(s =>
            s.name.toLowerCase().startsWith(kw) || s.code.toLowerCase().startsWith(kw)
        );

    },

    // --------------------------------------------------
    // Activity (tabel generic `activity`)
    // --------------------------------------------------

    async getActivity(folioId) {

        const { data, error } = await supabaseClient
            .from("activity")
            .select("*")
            .eq("entity_type", "folio")
            .eq("entity_id", folioId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data || [];

    },

    async logActivity(folioId, action, description, details = null) {

        let actorId = null;
        let actorName = null;

        try {

            const { data: userData } = await supabaseClient.auth.getUser();
            actorId = userData?.user?.id || null;
            actorName = userData?.user?.email || null;

        } catch (e) {

            // belum login / auth belum siap -> tetap catat activity tanpa actor

        }

        const { error } = await supabaseClient
            .from("activity")
            .insert({
                entity_type: "folio",
                entity_id: folioId,
                folio_id: folioId,
                action,
                actor_id: actorId,
                actor_name: actorName,
                description,
                details
            });

        if (error) console.error("Failed to log activity:", error);

    }

};