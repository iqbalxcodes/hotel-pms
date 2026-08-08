// ======================================================
// Development Reservation & Room Status Simulator
// ======================================================

const DEV_MODE = true;

const SIMULATION_KEY = "hotel_pms_last_simulation_date";

// ------------------------------------------------------
// Tunable probabilities (dalam persen, 0-100)
// ------------------------------------------------------

const SIM_CONFIG = {

    pastBootstrap: {
        checkedOutMin: 60, checkedOutMax: 75,
        inHouseMin: 15, inHouseMax: 20,
        cancelChance: 2.5
        // sisanya otomatis jadi NO_SHOW
    },

    todayArrival: {
        checkinChance: 40,
        cancelMin: 2.5, cancelMax: 5
        // sisanya tetap RESERVED
    },

    todayDeparture: {
        checkoutChance: 60
        // sisanya tetap CHECKED_IN
    },

    overdueDeparture: {
        checkoutChance: 85
        // sisanya tetap CHECKED_IN (nginep lebih lama)
    },

    future: {
        cancelMin: 2, cancelMax: 5
        // sisanya tetap RESERVED
    }

};


// ======================================================
// Random Helpers
// ======================================================

function randomInRange(min, max){
    return Math.random() * (max - min) + min;
}

function randomStatus(probabilities){

    const random = Math.random() * 100;
    let total = 0;

    for(const item of probabilities){

        total += item.percent;

        if(random <= total){
            return item.status;
        }

    }

    return probabilities[probabilities.length - 1].status;

}

function formatDateSim(d){

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${y}-${m}-${day}`;

}


// ======================================================
// Main Entry Point (dipanggil sekali per hari)
// ======================================================

async function simulateReservationStatus(){

    if(!DEV_MODE){
        return;
    }

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const today = formatDateSim(todayDate);

    const lastSimulation = localStorage.getItem(SIMULATION_KEY);

    if(lastSimulation === today){
        console.log("Simulator already executed today");
        return;
    }

    console.log("Running daily reservation/room simulator...");

    try {

        await runSimulation(today);
        localStorage.setItem(SIMULATION_KEY, today);

    } catch(err){

        // jangan set localStorage kalau gagal, biar dicoba lagi next reload
        console.error("Simulator failed:", err);

    }

}


// ======================================================
// Core Simulation
// ======================================================

async function runSimulation(today){

    const { data: reservations, error } = await supabaseClient
        .from("reservation")
        .select("id, room_number, arrival_date, departure_date, status")
        .in("status", ["RESERVED", "CHECKED_IN", "Pending"]);

    if(error){
        console.error(error);
        return;
    }

    const { data: rooms, error: roomError } = await supabaseClient
        .from("rooms")
        .select("room_number, status");

    if(roomError){
        console.error(roomError);
        return;
    }

    const roomStatusMap = new Map(rooms.map(r => [r.room_number, r.status]));

    const reservationUpdates = new Map(); // id -> { status, room_number }
    const roomUpdates = new Map(); // room_number -> status

    const occupiedToday = new Map(); // room_number -> reservation id (siapa yg pegang kamar itu hari ini)

    function findAvailableRoom(excludeRoom){

        for(const [roomNumber, status] of roomStatusMap.entries()){

            if(roomNumber === excludeRoom) continue;
            if(occupiedToday.has(roomNumber)) continue;

            if(status === "INSPECTED"){
                return roomNumber;
            }

        }

        return null;

    }

    function claimRoom(res, roomNumber){

        // Cek bentrok: kamar udah dipakai reservation lain hari ini?
        if(occupiedToday.has(roomNumber) && occupiedToday.get(roomNumber) !== res.id){

            const freeRoom = findAvailableRoom(roomNumber);

            if(freeRoom){

                console.warn(`Room ${roomNumber} bentrok, reservation ${res.id} dipindah ke ${freeRoom}`);
                roomNumber = freeRoom;

            } else {

                console.warn(`Room ${roomNumber} bentrok untuk reservation ${res.id}, tidak ada kamar INSPECTED yang free`);

            }

        }

        occupiedToday.set(roomNumber, res.id);

        return roomNumber;

    }

    // --------------------------------------------------
    // Pass 1: reservation yang masih CHECKED_IN & lagi
    // nginep (departure > today) -> klaim kamarnya duluan,
    // status TIDAK diubah.
    // --------------------------------------------------

    for(const res of reservations){

        if(res.status !== "CHECKED_IN" || !res.room_number) continue;
        if(res.departure_date <= today) continue;

        claimRoom(res, res.room_number);

    }

    // --------------------------------------------------
    // Pass 2: proses semua reservation lain sesuai bucket
    // --------------------------------------------------

    for(const res of reservations){

        if(!res.room_number) continue;

        const arrival = res.arrival_date;
        const departure = res.departure_date;

        let newStatus = null; // null = tidak berubah

        // ---- RESERVED, arrival di masa lalu (bootstrap / seed data lama) ----
        if(res.status === "RESERVED" && arrival < today){

            const stillValidStay = departure >= today;
            const cfg = SIM_CONFIG.pastBootstrap;

            newStatus = randomStatus([
                { status: "CHECKED_OUT", percent: randomInRange(cfg.checkedOutMin, cfg.checkedOutMax) },
                { status: "CHECKED_IN", percent: stillValidStay ? randomInRange(cfg.inHouseMin, cfg.inHouseMax) : 0 },
                { status: "CANCELLED", percent: cfg.cancelChance },
                { status: "NO_SHOW", percent: 100 }
            ]);

            if(newStatus === "CHECKED_IN" && !stillValidStay){
                newStatus = "CHECKED_OUT";
            }

        }
        // ---- RESERVED, arrival hari ini ----
        else if(res.status === "RESERVED" && arrival === today){

            const cfg = SIM_CONFIG.todayArrival;

            newStatus = randomStatus([
                { status: "CANCELLED", percent: randomInRange(cfg.cancelMin, cfg.cancelMax) },
                { status: "CHECKED_IN", percent: cfg.checkinChance },
                { status: "RESERVED", percent: 100 }
            ]);

        }
        // ---- RESERVED, arrival di masa depan ----
        else if(res.status === "RESERVED" && arrival > today){

            const cfg = SIM_CONFIG.future;

            newStatus = randomStatus([
                { status: "CANCELLED", percent: randomInRange(cfg.cancelMin, cfg.cancelMax) },
                { status: "RESERVED", percent: 100 }
            ]);

        }
        // ---- CHECKED_IN, departure hari ini ----
        else if(res.status === "CHECKED_IN" && departure === today){

            const cfg = SIM_CONFIG.todayDeparture;

            newStatus = randomStatus([
                { status: "CHECKED_OUT", percent: cfg.checkoutChance },
                { status: "CHECKED_IN", percent: 100 }
            ]);

        }
        // ---- CHECKED_IN, departure kelewat (harusnya udah checkout) ----
        else if(res.status === "CHECKED_IN" && departure < today){

            const cfg = SIM_CONFIG.overdueDeparture;

            newStatus = randomStatus([
                { status: "CHECKED_OUT", percent: cfg.checkoutChance },
                { status: "CHECKED_IN", percent: 100 }
            ]);

        }
        // ---- CHECKED_IN, departure > today: sudah diklaim di Pass 1, skip ----
        else {
            continue;
        }

        if(newStatus === null || newStatus === res.status) continue;

        let finalRoom = res.room_number;

        if(newStatus === "CHECKED_IN"){

            finalRoom = claimRoom(res, res.room_number);
            roomUpdates.set(finalRoom, "DIRTY");

        } else if(newStatus === "CHECKED_OUT"){

            // room dianggap langsung dibersihkan housekeeping (demo)
            roomUpdates.set(res.room_number, "INSPECTED");

        }

        reservationUpdates.set(res.id, { status: newStatus, room_number: finalRoom });

    }

    // --------------------------------------------------
    // Apply ke Supabase
    // --------------------------------------------------

    for(const [id, update] of reservationUpdates.entries()){

        const { error: updateError } = await supabaseClient
            .from("reservation")
            .update({
                status: update.status,
                room_number: update.room_number
            })
            .eq("id", id);

        if(updateError){
            console.error(`Gagal update reservation ${id}:`, updateError);
        }

    }

    for(const [roomNumber, status] of roomUpdates.entries()){

        const { error: roomUpdateError } = await supabaseClient
            .from("rooms")
            .update({
                status: status,
                updated_at: new Date().toISOString()
            })
            .eq("room_number", roomNumber);

        if(roomUpdateError){
            console.error(`Gagal update room ${roomNumber}:`, roomUpdateError);
        }

    }

    console.log(`Simulator selesai: ${reservationUpdates.size} reservation, ${roomUpdates.size} room diupdate.`);

}