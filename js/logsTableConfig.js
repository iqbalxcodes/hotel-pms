// ======================================================
// logsTableConfig.js
// Kolom buat TableEngine di logs.html
// ======================================================

const LOGS_TABLE_COLUMNS = [
    { key: "created_at", label: "Time", type: "datetime", width: 140 },
    { key: "category", label: "Category", type: "text", width: 110 },
    { key: "action", label: "Action", type: "text", width: 90 },
    { key: "entity", label: "Entity", type: "text", width: 180, sortable: false },
    { key: "actor", label: "Actor", type: "text", width: 160, sortable: false },
    { key: "description", label: "Description", type: "text", width: 220, sortable: false },
    { key: "diff", label: "Details", type: "text", width: 260, sortable: false }
];