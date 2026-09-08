// ======================================================
// activeProperty.js
// Satu sumber kebenaran property_id + organization_id aktif.
// ======================================================

let _activePropertyCache = null;

async function getActiveProperty(){

    if(_activePropertyCache){
        return _activePropertyCache;
    }

    const keys = ["selectedPropertyId", "currentPropertyId", "property_id", "pms_property_id"];

    for(const key of keys){

        const propertyId = localStorage.getItem(key);
        if(!propertyId) continue;

        const { data, error } = await supabaseClient
            .from("properties")
            .select("id, organization_id, code, name, currency, timezone, status")
            .eq("id", propertyId)
            .eq("status", "ACTIVE")
            .maybeSingle();

        if(!error && data){
            _activePropertyCache = data;
            return data;
        }
    }

    const { data, error } = await supabaseClient
        .from("properties")
        .select("id, organization_id, code, name, currency, timezone, status")
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    if(error) throw error;
    if(!data) throw new Error("No active property is available.");

    _activePropertyCache = data;
    return data;

}

async function getActivePropertyId(){
    const p = await getActiveProperty();
    return p.id;
}

async function getRoomIdByNumber(propertyId, roomNumber){

    const { data, error } = await supabaseClient
        .from("rooms")
        .select("id")
        .eq("property_id", propertyId)
        .eq("room_number", roomNumber)
        .maybeSingle();

    if(error || !data) return null;
    return data.id;

}

window.getActiveProperty = getActiveProperty;
window.getActivePropertyId = getActivePropertyId;
window.getRoomIdByNumber = getRoomIdByNumber;