// ======================================================
// roomAvailability.js
// Logic bentrok kamar terpusat (satu kamar hanya boleh
// diisi SATU reservasi per malam/setengah-hari). Dipakai
// bareng oleh roomRack.js, developmentStatusSimulator.js,
// dan reservationDetail.js. Namespaced di window.RoomAvailability
// biar tidak bentrok sama fungsi nama sama di file lain
// (parseDateOnly, addDays, dst juga ada di roomRack.js).
// ======================================================

const RoomAvailability = (function(){

    const OCCUPYING_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT"];

    function parseDateOnly(str){

        if(!str) return null;

        const [y, m, d] = str.split("-").map(Number);

        return new Date(y, m - 1, d);

    }

    function addDays(date, n){

        const d = new Date(date);
        d.setDate(d.getDate() + n);

        return d;

    }

    function diffDays(a, b){

        return Math.round((a - b) / 86400000);

    }

    function formatDateISO(date){

        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");

        return `${y}-${m}-${d}`;

    }

    const EPOCH = new Date(1970, 0, 1);

    function dayIndex(dateStr){

        return diffDays(parseDateOnly(dateStr), EPOCH);

    }

    function halfIndex(dateStr, half){

        return dayIndex(dateStr) * 2 + (half === "PM" ? 1 : 0);

    }

    // Rentang setengah-hari [start, end) yang ditempati satu reservasi.
    // - arrival === departure  -> "day guest": Vormittag -> Nachmittag
    //   hari yang sama (tidak nginap).
    // - arrival !== departure  -> nginap normal: Nachmittag hari datang
    //   -> Vormittag hari pulang (checkout day tidak dihitung occupied).
    function getOccupiedRange(arrivalStr, departureStr){

        if(!arrivalStr || !departureStr) return null;

        if(arrivalStr === departureStr){

            const start = halfIndex(arrivalStr, "AM");

            return { start, end: start + 2, dayUse: true };

        }

        const start = halfIndex(arrivalStr, "PM");
        const end = halfIndex(departureStr, "AM") + 1;

        return { start, end, dayUse: false };

    }

    function rangesOverlap(a, b){

        if(!a || !b) return false;

        return a.start < b.end && b.start < a.end;

    }

    // Konversi rentang setengah-hari balik ke arrival/departure date.
    // Lebar persis 1 hari (2 unit) & mulai dari AM -> day guest.
    // Selain itu selalu dibulatkan ke konvensi nginap normal
    // (mulai dibulatkan ke bawah = hari itu, akhir dibulatkan ke atas).
    function rangeToDates(start, end){

        const width = end - start;

        if(width <= 0) return null;

        if(width === 2 && start % 2 === 0){

            const iso = formatDateISO(addDays(EPOCH, start / 2));

            return { arrival: iso, departure: iso };

        }

        const startDayIdx = Math.floor(start / 2);
        const endDayIdx = Math.ceil(end / 2);

        return {
            arrival: formatDateISO(addDays(EPOCH, startDayIdx)),
            departure: formatDateISO(addDays(EPOCH, endDayIdx))
        };

    }

    // Cek bentrok murni di memori (dipakai simulator — tidak query DB,
    // cukup dikasih daftar reservation yang lagi diproses).
    function findConflictsAmong(reservations, roomNumber, arrivalStr, departureStr, excludeId){

        const targetRange = getOccupiedRange(arrivalStr, departureStr);

        return reservations.filter(r => {

            if(r.room_number !== roomNumber) return false;
            if(excludeId && r.id === excludeId) return false;
            if(!OCCUPYING_STATUSES.includes(r.status)) return false;

            return rangesOverlap(targetRange, getOccupiedRange(r.arrival_date, r.departure_date));

        });

    }

    // Cek bentrok lewat Supabase — ambil kandidat dengan filter tanggal
    // longgar, lalu verifikasi presisi di JS pakai getOccupiedRange
    // (supaya turnover di hari yang sama TIDAK dianggap bentrok).
    async function findConflicts(supabaseClient, roomNumber, arrivalStr, departureStr, excludeId){

        let query = supabaseClient
            .from("reservation")
            .select("id, guest_name, arrival_date, departure_date, status")
            .eq("room_number", roomNumber)
            .in("status", OCCUPYING_STATUSES)
            .lte("arrival_date", departureStr)
            .gte("departure_date", arrivalStr);

        if(excludeId){

            query = query.neq("id", Number(excludeId));

        }

        const { data, error } = await query;

        if(error){

            return { error };

        }

        const targetRange = getOccupiedRange(arrivalStr, departureStr);

        const conflicts = (data || []).filter(r =>
            rangesOverlap(targetRange, getOccupiedRange(r.arrival_date, r.departure_date))
        );

        return { conflicts };

    }

    return {
        OCCUPYING_STATUSES,
        parseDateOnly,
        addDays,
        diffDays,
        formatDateISO,
        getOccupiedRange,
        rangesOverlap,
        rangeToDates,
        findConflictsAmong,
        findConflicts
    };

})();