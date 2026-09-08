// ======================================================
// roomManagementData.js
// ======================================================

const RM_TODAY_ISO = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
})();

async function rmFetchAllRooms(){

    const propertyId = await getActivePropertyId();

    const { data, error } = await supabaseClient
        .from("room_list_view")
        .select("*")
        .eq("property_id", propertyId)
        .order("room_number", { ascending: true });

    if(error){ console.error(error); return []; }
    return data;

}

async function rmFetchRoom(roomNumber){

    const propertyId = await getActivePropertyId();

    const { data, error } = await supabaseClient
        .from("room_list_view")
        .select("*")
        .eq("property_id", propertyId)
        .eq("room_number", roomNumber)
        .single();

    if(error){ console.error(error); return null; }
    return data;

}

async function rmUpdateRoomStatus(roomNumbers, status, extra = {}){

    const propertyId = await getActivePropertyId();

    let patch = { updated_at: new Date().toISOString(), ...extra };

    if(status === "BLOCKED"){
        patch.operational_status = "BLOCKED";
    } else {
        patch.housekeeping_status = status;
        patch.operational_status = "OPEN";
    }

    const { error } = await supabaseClient
        .from("rooms")
        .update(patch)
        .eq("property_id", propertyId)
        .in("room_number", roomNumbers);

    return { error };

}

async function rmFetchOccupiedRoomNumbers(){

    const propertyId = await getActivePropertyId();

    const { data, error } = await supabaseClient
        .from("reservation_list_view")
        .select("room_number")
        .eq("property_id", propertyId)
        .eq("status", "CHECKED_IN")
        .lte("arrival_date", RM_TODAY_ISO)
        .gte("departure_date", RM_TODAY_ISO);

    if(error){ console.error(error); return new Set(); }
    return new Set((data || []).map(r => r.room_number));

}

const FUNDSACHEN_OPEN_STATUSES = ["UNCLAIMED"];

async function rmFetchOpenFundsachen(limit = 5){

    const propertyId = await getActivePropertyId();

    const { data, error } = await supabaseClient
        .from("lost_found_list_view")
        .select("*")
        .eq("property_id", propertyId)
        .in("status", FUNDSACHEN_OPEN_STATUSES)
        .order("found_at", { ascending: false })
        .limit(limit);

    if(error){ console.error(error); return []; }
    return data;

}

async function rmFetchFundsachenForRoom(roomNumber){

    const propertyId = await getActivePropertyId();

    const { data, error } = await supabaseClient
        .from("lost_found_list_view")
        .select("*")
        .eq("property_id", propertyId)
        .eq("room_number", roomNumber)
        .order("found_at", { ascending: false });

    if(error){ console.error(error); return []; }
    return data;

}

async function rmCreateFundsachen(payload){

    const propertyId = await getActivePropertyId();
    const roomId = await getRoomIdByNumber(propertyId, payload.room_number);

    const { data, error } = await supabaseClient
        .from("lost_found_items")
        .insert({
            property_id: propertyId,
            room_id: roomId,
            item_name: payload.item_name,
            found_by: payload.found_by || null
        })
        .select()
        .single();

    if(!error && data){
        await rmLogActivity({
            room_number: payload.room_number,
            event_type: "FUNDSACHEN",
            description: `Found item reported: ${data.item_name}`,
            actor: data.found_by || null,
            reference_type: "lost_found_items",
            reference_id: data.id
        });
    }

    return { data: data ? { ...data, room_number: payload.room_number } : null, error };

}

async function rmUpdateFundsachenStatus(id, roomNumber, itemName, status){

    const { error } = await supabaseClient
        .from("lost_found_items")
        .update({ status })
        .eq("id", id);

    if(!error){
        await rmLogActivity({
            room_number: roomNumber,
            event_type: "FUNDSACHEN",
            description: `${itemName} marked as ${status}`,
            reference_type: "lost_found_items",
            reference_id: id
        });
    }

    return { error };

}

const MAINTENANCE_OPEN_STATUSES = ["OPEN", "IN_PROGRESS"];

async function rmFetchOpenMaintenanceCount(){

    const propertyId = await getActivePropertyId();

    const { count, error } = await supabaseClient
        .from("maintenance_requests")
        .select("*", { count: "exact", head: true })
        .eq("property_id", propertyId)
        .in("status", MAINTENANCE_OPEN_STATUSES);

    if(error){ console.error(error); return 0; }
    return count ?? 0;

}

async function rmFetchMaintenanceForRoom(roomNumber){

    const propertyId = await getActivePropertyId();

    const { data, error } = await supabaseClient
        .from("maintenance_list_view")
        .select("*")
        .eq("property_id", propertyId)
        .eq("room_number", roomNumber)
        .order("reported_at", { ascending: false });

    if(error){ console.error(error); return []; }
    return data;

}

async function rmCreateMaintenance(payload){

    const propertyId = await getActivePropertyId();
    const roomId = await getRoomIdByNumber(propertyId, payload.room_number);

    const { data, error } = await supabaseClient
        .from("maintenance_requests")
        .insert({
            property_id: propertyId,
            room_id: roomId,
            title: payload.title,
            priority: payload.priority
        })
        .select()
        .single();

    if(!error && data){
        await rmLogActivity({
            room_number: payload.room_number,
            event_type: "MAINTENANCE",
            description: `Maintenance request created: ${data.title}`,
            reference_type: "maintenance_requests",
            reference_id: data.id
        });
    }

    return { data: data ? { ...data, room_number: payload.room_number } : null, error };

}

async function rmUpdateMaintenanceStatus(id, roomNumber, title, status){

    const payload = { status };
    if(status === "RESOLVED") payload.resolved_at = new Date().toISOString();

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
            reference_id: id
        });
    }

    return { error };

}

async function rmFetchBlockedOrOOORooms(){

    const propertyId = await getActivePropertyId();

    const { data, error } = await supabaseClient
        .from("room_list_view")
        .select("*")
        .eq("property_id", propertyId)
        .in("status", ["BLOCKED", "OUT_OF_SERVICE"])
        .order("updated_at", { ascending: false });

    if(error){ console.error(error); return []; }
    return data;

}

async function rmFetchRoomUsage(roomNumber, limit = 5){

    const propertyId = await getActivePropertyId();

    const { data, error } = await supabaseClient
        .from("reservation_list_view")
        .select("id, guest_name, arrival_date, departure_date, status, room_type, checked_in_at, checked_out_at")
        .eq("property_id", propertyId)
        .eq("room_number", roomNumber)
        .order("arrival_date", { ascending: false })
        .limit(limit);

    if(error){ console.error(error); return []; }
    return data;

}

async function rmLogActivity({ room_number, event_type, description, actor = null, reference_type = null, reference_id = null }){

    const propertyId = await getActivePropertyId();

    const { error } = await supabaseClient
        .from("room_activity")
        .insert({
            property_id: propertyId,
            room_number,
            event_type,
            description,
            actor,
            reference_type,
            reference_id: reference_id ? String(reference_id) : null
        });

    if(error) console.error("Failed to log room activity:", error);

}

async function rmFetchGlobalActivity(limit = 30){

    const propertyId = await getActivePropertyId();

    const { data, error } = await supabaseClient
        .from("room_activity")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if(error){ console.error(error); return []; }
    return data;

}

async function rmFetchActivityForRoom(roomNumber, limit = 50){

    const propertyId = await getActivePropertyId();

    const { data, error } = await supabaseClient
        .from("room_activity")
        .select("*")
        .eq("property_id", propertyId)
        .eq("room_number", roomNumber)
        .order("created_at", { ascending: false })
        .limit(limit);

    if(error){ console.error(error); return []; }
    return data;

}

async function rmFetchTodayReservationEvents(){

    const propertyId = await getActivePropertyId();

    const { data, error } = await supabaseClient
        .from("reservation_list_view")
        .select("id, room_number, guest_name, status, checked_in_at, checked_out_at")
        .eq("property_id", propertyId)
        .or(`checked_in_at.gte.${RM_TODAY_ISO},checked_out_at.gte.${RM_TODAY_ISO}`);

    if(error || !data) return [];

    const events = [];

    data.forEach(res => {

        if(res.checked_in_at && res.checked_in_at.startsWith(RM_TODAY_ISO)){
            events.push({
                room_number: res.room_number,
                description: `Guest checked in — ${res.guest_name || "Reservation #" + res.id}`,
                created_at: res.checked_in_at,
                actor: null
            });
        }

        if(res.checked_out_at && res.checked_out_at.startsWith(RM_TODAY_ISO)){
            events.push({
                room_number: res.room_number,
                description: `Guest checked out — ${res.guest_name || "Reservation #" + res.id}`,
                created_at: res.checked_out_at,
                actor: null
            });
        }

    });

    return events;

}