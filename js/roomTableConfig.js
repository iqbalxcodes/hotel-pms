// ======================================================
// roomTableConfig.js
// Kolom buat TableEngine di room.html (Room List, kolom 2)
// ======================================================

const ROOM_TABLE_COLUMNS = [
    { key: "status", label: "", type: "text", width: 40, sortable: false },
    { key: "room_number", label: "Room", type: "text", width: 70 },
    { key: "room_type", label: "Type", type: "text", width: 120 },
    { key: "floor", label: "Floor", type: "text", width: 60 },
    { key: "status_label", label: "Status", type: "text", width: 130, sortable: false }
];