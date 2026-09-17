// ======================================================
// statusBadge.js
// Badge status universal: icon (lucide) putih di dalam
// lingkaran warna. Dipakai di room management, room rack,
// client page, atau halaman lain yang butuh badge bulat.
//
// Pakai:
//   renderStatusBadge("DIRTY")          -> HTML string
//   renderStatusBadge("OCCUPIED")       -> khusus computed status
//   refreshStatusBadgeIcons()           -> panggil SEKALI abis
//                                          innerHTML di-set, biar
//                                          lucide gambar svg-nya
// ======================================================

const STATUS_BADGE_MAP = {
    INSPECTED:       { icon: "clipboard-check",  bg: "#2e7d32" }, // hijau
    CLEAN:           { icon: "broom-sparkles",   bg: "#1565c0" }, // biru
    OCCUPIED:        { icon: "user-round-key",   bg: "#f9a825" }, // kuning
    DIRTY:           { icon: "trash",            bg: "#c62828" }, // merah
    OUT_OF_SERVICE:  { icon: "construction",     bg: "#6d4c25" }, // coklat
    BLOCKED:         { icon: "octagon-x",        bg: "#212121" }, // hitam
    AVAILABLE:       { icon: "check",            bg: "#2e7d32" }, // fallback

    // ---- client type badges (client.html) ----
    GUEST:           { icon: "user",             bg: "#1565c0" }, // biru
    COMPANY:         { icon: "building-2",       bg: "#2e7d32" }, // hijau
    TRAVEL_AGENCY:   { icon: "plane",            bg: "#f9a825" }, // kuning
    OTHER:           { icon: "circle-help",      bg: "#616161" }  // abu
};

function renderStatusBadge(statusKey, opts = {}){

    const cfg = STATUS_BADGE_MAP[statusKey];
    if(!cfg) return "";

    const size = opts.size || 20;

    return `
        <span class="status-icon-badge" style="width:${size}px;height:${size}px;background:${cfg.bg}" title="${opts.title || statusKey.replace(/_/g," ")}">
            <i data-lucide="${cfg.icon}"></i>
        </span>
    `;

}

function refreshStatusBadgeIcons(){
    if(window.lucide) lucide.createIcons();
}