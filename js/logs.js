// ======================================================
// logs.js
// ======================================================

let myTier = "STAFF";

async function refreshTable(){

    const { count, error: countError } = await buildBaseQuery(true);

    if(countError){
        console.error(countError);
        showMessage("Gagal memuat activity log", "error");
        return;
    }

    totalCount = count ?? 0;
    clampCurrentPage();

    const { data, error } = await buildDataQuery();

    if(error){
        console.error(error);
        showMessage("Gagal memuat activity log", "error");
        return;
    }

    renderLogRows(data);
    renderPaginationBar();

}

async function loadLogs(){

    currentPage = 1;
    await refreshTable();

}

async function deleteSelectedLogs(){

    if(myTier !== "ADMIN"){
        showMessage("Hanya admin yang bisa menghapus log", "error");
        return;
    }

    const selected = [...document.querySelectorAll(".log-checkbox:checked")];

    if(selected.length === 0){
        showMessage("No entries selected", "error");
        return;
    }

    showConfirm(
        `Delete ${selected.length} log entr${selected.length === 1 ? "y" : "ies"}? This cannot be undone.`,
        async () => {

            const ids = selected.map(item => item.dataset.id);

            const { error } = await supabaseClient
                .from("audit_logs")
                .delete()
                .in("id", ids);

            if(error){
                console.error(error);
                showMessage("Failed to delete entries", "error");
                return;
            }

            showMessage("Entries deleted", "success");
            await refreshTable();
            hideActionBar();

        },
        () => showMessage("Delete cancelled", "info")
    );

}

async function exportLogs(){

    const { data, error } = await buildExportQuery();

    if(error){
        console.error(error);
        showMessage("Export failed", "error");
        return;
    }

    if(typeof exportList === "function"){
        exportList(data, "activity_log.csv");
        showMessage("Export completed", "success");
    } else {
        // fallback kalau export.js (dari halaman lain) belum di-load di sini
        const csv = [
            "created_at,category,action,entity_type,entity_label,actor_name,actor_role,description",
            ...data.map(r => [r.created_at, r.category, r.action, r.entity_type, r.entity_label, r.actor_name, r.actor_role, r.description]
                .map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "activity_log.csv";
        a.click();
        URL.revokeObjectURL(url);

        showMessage("Export completed", "success");
    }

}

document.addEventListener("DOMContentLoaded", async () => {

    startClock();

    logsReadUrlScope();

    try {

        const property = await getActiveProperty();
        currentPropertyId = property.id;

        const { data: tier } = await supabaseClient.rpc("my_access_tier", { p_property_id: property.id });
        myTier = tier || "STAFF";

        const deleteBtn = document.getElementById("logsDeleteBtn");
        if(deleteBtn){
            deleteBtn.style.display = myTier === "ADMIN" ? "inline-flex" : "none";
        }

        const scopeNote = document.getElementById("logsScopeNote");
        if(scopeNote && activeEntityType){
            scopeNote.style.display = "block";
            scopeNote.innerText = `Showing activity for: ${activeEntityType} (${activeEntityId})`;
        }

    } catch(err){
        console.error("Failed to resolve active property:", err);
        showMessage("Gagal menentukan property aktif — pastikan sudah login", "error");
    }

    rowsPerPage = calculateRowsPerPage();

    try { await loadLogs(); }
    catch(err){ console.error("loadLogs failed:", err); }

    try { await adjustRowsPerPageAndRefresh(); }
    catch(err){ console.error("adjustRowsPerPageAndRefresh failed:", err); }

    window.addEventListener("resize", debounce(async () => {
        await adjustRowsPerPageAndRefresh();
    }, 300));

    const scrollContainer = document.getElementById("logsTableScroll");
    if(scrollContainer && window.ResizeObserver){
        const ro = new ResizeObserver(debounce(() => { adjustRowsPerPageAndRefresh(); }, 300));
        ro.observe(scrollContainer);
    }

});