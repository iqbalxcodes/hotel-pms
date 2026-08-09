// ======================================================
// roomManagementData.js
// Semua akses Supabase untuk Room Management (rooms,
// fundsachen, maintenance_requests, room_activity).
// Tidak ada rendering di sini — murni fetch/insert/update.
// ======================================================

const RM_TODAY_ISO = (() => {

    const d = new Date();

    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

})();


// ------------------------------------------------------
// Rooms
// ------------------------------------------------------

async function rmFetchAllRooms(){

    const { data, error } = await supabaseClient
        .from("rooms")
        .select("*")
        .order("room_number", { ascending: true });

    if(error){
        console.error(error);
        return [];
    }

    return data;

}

async function rmFetchRoom(roomNumber){

    const { data, error } = await supabaseClient
        .from("rooms")
        .select("*")
        .eq("room_number", roomNumber)
        .single();

    if(error){
        console.error(error);
        return null;
    }

    return data;

}

async function rmUpdateRoomStatus(roomNumbers, status, extra = {}){

    const { error } = await supabaseClient
        .from("rooms")
        .update({
            status,
            updated_at: new Date().toISOString(),
            ...extra
        })
        .in("room_number", roomNumbers);

    return { error };

}


// ------------------------------------------------------
// Occupancy (dari reservation, buat Room Overview)
// ------------------------------------------------------

async function rmFetchOccupiedRoomNumbers(){

    const { data, error } = await supabaseClient
        .from("reservation")
        .select("room_number")
        .eq("status", "CHECKED_IN")
        .lte("arrival_date", RM_TODAY_ISO)
        .gte("departure_date", RM_TODAY_ISO);

    if(error){
        console.error(error);
        return new Set();
    }

    return new Set((data || []).map(r => r.room_number));

}


// ------------------------------------------------------
// Fundsachen
// ------------------------------------------------------

const FUNDSACHEN_OPEN_STATUSES = ["UNCLAIMED", "STORED"];

async function rmFetchOpenFundsachen(limit = 5){

    const { data, error } = await supabaseClient
        .from("fundsachen")
        .select("*")
        .in("status", FUNDSACHEN_OPEN_STATUSES)
        .order("found_at", { ascending: false })
        .limit(limit);

    if(error){
        console.error(error);
        return [];
    }

    return data;

}

async function rmFetchFundsachenForRoom(roomNumber){

    const { data, error } = await supabaseClient
        .from("fundsachen")
        .select("*")
        .eq("room_number", roomNumber)
        .order("found_at", { ascending: false });

    if(error){
        console.error(error);
        return [];
    }

    return data;

}

async function rmCreateFundsachen(payload){

    const { data, error } = await supabaseClient
        .from("fundsachen")
        .insert(payload)
        .select()
        .single();

    if(!error && data){

        await rmLogActivity({
            room_number: data.room_number,
            event_type: "FUNDSACHEN",
            description: `Found item reported: ${data.item_name}`,
            actor: data.found_by || null,
            reference_type: "fundsachen",
            reference_id: String(data.id)
        });

    }

    return { data, error };

}

async function rmUpdateFundsachenStatus(id, roomNumber, itemName, status){

    const { error } = await supabaseClient
        .from("fundsachen")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

    if(!error){

        await rmLogActivity({
            room_number: roomNumber,
            event_type: "FUNDSACHEN",
            description: `${itemName} marked as ${status}`,
            reference_type: "fundsachen",
            reference_id: String(id)
        });

    }

    return { error };

}


// ------------------------------------------------------
// Maintenance
// ------------------------------------------------------

const MAINTENANCE_OPEN_STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS"];

async function rmFetchOpenMaintenanceCount(){

    const { count, error } = await supabaseClient
        .from("maintenance_requests")
        .select("*", { count: "exact", head: true })
        .in("status", MAINTENANCE_OPEN_STATUSES);

    if(error){
        console.error(error);
        return 0;
    }

    return count ?? 0;

}

async function rmFetchMaintenanceForRoom(roomNumber){

    const { data, error } = await supabaseClient
        .from("maintenance_requests")
        .select("*")
        .eq("room_number", roomNumber)
        .order("reported_at", { ascending: false });

    if(error){
        console.error(error);
        return [];
    }

    return data;

}

async function rmCreateMaintenance(payload){

    const { data, error } = await supabaseClient
        .from("maintenance_requests")
        .insert(payload)
        .select()
        .single();

    if(!error && data){

        await rmLogActivity({
            room_number: data.room_number,
            event_type: "MAINTENANCE",
            description: `Maintenance request created: ${data.title}`,
            reference_type: "maintenance_requests",
            reference_id: String(data.id)
        });

    }

    return { data, error };

}

async function rmUpdateMaintenanceStatus(id, roomNumber, title, status){

    const payload = { status, updated_at: new Date().toISOString() };

    if(status === "RESOLVED" || status === "CLOSED"){
        payload.resolved_at = new Date().toISOString();
    }

    const { error } = await supabaseClient
        .from("maintenance_requests")
        .update(payload)
        .eq("id", id);

    if(!error){

        await rmLogActivity({
            room_number: roomNumber,
            event_type: "MAINTENANCE",
            description: `${title} → ${status.replace(/_/g, " ")}`,
            reference_type: "maintenance_requests",
            reference_id: String(id)
        });

    }

    return { error };

}


// ------------------------------------------------------
// Blocked / Out of Order rooms
// ------------------------------------------------------

async function rmFetchBlockedOrOOORooms(){

    const { data, error } = await supabaseClient
        .from("rooms")
        .select("*")
        .in("status", ["BLOCKED", "OUT_OF_SERVICE"])
        .order("updated_at", { ascending: false });

    if(error){
        console.error(error);
        return [];
    }

    return data;

}


// ------------------------------------------------------
// Room usage (reservation history untuk 1 kamar)
// ------------------------------------------------------

async function rmFetchRoomUsage(roomNumber, limit = 5){

    const { data, error } = await supabaseClient
        .from("reservation")
        .select("id, guest_name, arrival_date, departure_date, status, room_type, check_in_at, check_out_at")
        .eq("room_number", roomNumber)
        .order("arrival_date", { ascending: false })
        .limit(limit);

    if(error){
        console.error(error);
        return [];
    }

    return data;

}


// ------------------------------------------------------
// Room activity (timeline)
// ------------------------------------------------------

async function rmLogActivity({ room_number, event_type, description, actor = null, reference_type = null, reference_id = null }){

    const { error } = await supabaseClient
        .from("room_activity")
        .insert({ room_number, event_type, description, actor, reference_type, reference_id });

    if(error){
        console.error("Failed to log room activity:", error);
    }

}

async function rmFetchGlobalActivity(limit = 30){

    const { data, error } = await supabaseClient
        .from("room_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

    if(error){
        console.error(error);
        return [];
    }

    return data;

}

async function rmFetchActivityForRoom(roomNumber, limit = 50){

    const { data, error } = await supabaseClient
        .from("room_activity")
        .select("*")
        .eq("room_number", roomNumber)
        .order("created_at", { ascending: false })
        .limit(limit);

    if(error){
        console.error(error);
        return [];
    }

    return data;

}

// Reservasi check-in/out hari ini, dipakai sebagai pseudo-activity
// tambahan di timeline global (data historisnya sudah ada di
// reservation, jadi nggak perlu nunggu dicatat manual).
async function rmFetchTodayReservationEvents(){

    const { data, error } = await supabaseClient
        .from("reservation")
        .select("id, room_number, guest_name, status, check_in_at, check_out_at")
        .or(`check_in_at.gte.${RM_TODAY_ISO},check_out_at.gte.${RM_TODAY_ISO}`);

    if(error || !data){
        return [];
    }

    const events = [];

    data.forEach(res => {

        if(res.check_in_at && res.check_in_at.startsWith(RM_TODAY_ISO)){

            events.push({
                room_number: res.room_number,
                description: `Guest checked in — ${res.guest_name || "Reservation #" + res.id}`,
                created_at: res.check_in_at,
                actor: null
            });

        }

        if(res.check_out_at && res.check_out_at.startsWith(RM_TODAY_ISO)){

            events.push({
                room_number: res.room_number,
                description: `Guest checked out — ${res.guest_name || "Reservation #" + res.id}`,
                created_at: res.check_out_at,
                actor: null
            });

        }

    });

    return events;

}