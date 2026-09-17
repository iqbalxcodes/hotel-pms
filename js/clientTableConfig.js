// ======================================================
// clientTableConfig.js
// Kolom buat TableEngine di client.html (Client List, kolom 2)
// ======================================================

const CLIENT_TABLE_COLUMNS = [
    { key: "client_type", label: "Type", type: "text", width: 40, sortable: false },
    { key: "name", label: "Name", type: "text", width: 160 },
    { key: "city", label: "City", type: "text", width: 110 },
    { key: "country", label: "Country", type: "text", width: 90 }
];