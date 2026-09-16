// ======================================================
// tableScrollEdge.js
// Edge-hover scroll card. Nempel otomatis ke semua .table-scroll
// yang overflow horizontal. Native scroll manual tetap jalan.
//
// v3: klik tunggal = 1x scroll step (behavior lama tetap ada).
// TAMBAHAN: tahan (pointerdown) lebih dari HOLD_DELAY -> masuk
// mode repeat, scroll terus tiap REPEAT_INTERVAL sampai
// pointerup/leave/cancel. Ini terpisah dari rAF loop posisi
// card (yang urusannya nampilin/nyembunyiin & posisi card doang).
// ======================================================

(function(){

    const EDGE_ZONE = 32;
    const SCROLL_STEP = 220;
    const CARD_W = 28;
    const CARD_H = 36;
    const HOLD_DELAY = 350;      // ms sebelum mulai repeat
    const REPEAT_INTERVAL = 120; // ms antar scroll pas ditahan

    const registry = []; // { container, leftCard, rightCard }

    function makeCard(side){

        const card = document.createElement("div");
        card.className = `table-scroll-edge-card edge-${side}`;
        card.textContent = side === "left" ? "‹" : "›";
        card.style.cssText = `
            position:fixed; z-index:20; display:none;
            width:${CARD_W}px; height:${CARD_H}px;
            align-items:center; justify-content:center;
            background:#fff; border:1px solid #ccc; border-radius:4px;
            box-shadow:0 2px 6px rgba(0,0,0,0.15);
            cursor:pointer; font-size:14px; color:#444; user-select:none;
            touch-action:none;
        `;

        return card;

    }

    // ------------------------------------------------------
    // Hold-to-scroll: dipasang per-card, generic (dipakai buat
    // leftCard & rightCard sama-sama, arah dibedain lewat sign)
    // ------------------------------------------------------

    function bindHoldScroll(card, container, direction){

        let holdTimer = null;
        let repeatTimer = null;
        let firedOnce = false;

        function doScroll(){
            container.scrollBy({ left: direction * SCROLL_STEP, behavior: "smooth" });
        }

        function startRepeat(){
            repeatTimer = setInterval(doScroll, REPEAT_INTERVAL);
        }

        function clearTimers(){
            clearTimeout(holdTimer);
            clearInterval(repeatTimer);
            holdTimer = null;
            repeatTimer = null;
        }

        card.addEventListener("pointerdown", (e) => {

            e.preventDefault();
            firedOnce = false;

            try { card.setPointerCapture(e.pointerId); } catch(err){}

            // klik tunggal langsung scroll 1x (behavior lama)
            doScroll();
            firedOnce = true;

            // kalau ditahan lebih dari HOLD_DELAY -> mulai repeat
            holdTimer = setTimeout(startRepeat, HOLD_DELAY);

        });

        const stop = () => {
            clearTimers();
        };

        card.addEventListener("pointerup", stop);
        card.addEventListener("pointercancel", stop);
        card.addEventListener("pointerleave", stop);

        // safety net kalau pointerup ke-miss (mis. window blur)
        window.addEventListener("blur", stop);

    }

    function setupEdgeScroll(container){

        if(container.dataset.edgeScrollReady) return;
        container.dataset.edgeScrollReady = "1";

        const leftCard = makeCard("left");
        const rightCard = makeCard("right");

        document.body.appendChild(leftCard);
        document.body.appendChild(rightCard);

        bindHoldScroll(leftCard, container, -1);
        bindHoldScroll(rightCard, container, 1);

        registry.push({ container, leftCard, rightCard });

    }

    let mouseX = null, mouseY = null;

    document.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    }, { passive: true });

    // kalau mouse beneran keluar viewport (bukan sekadar lewat elemen
    // lain), reset -- biar card gak nyangkut kalau user pindah window
    document.addEventListener("mouseleave", () => {
        mouseX = null;
        mouseY = null;
    });

    function tick(){

        if (mouseX !== null && mouseY !== null) {

            registry.forEach(({ container, leftCard, rightCard }) => {

                // container mungkin udah lepas dari DOM (halaman lama
                // di-unload dsb) -- skip aman
                if (!container.isConnected) return;

                const rect = container.getBoundingClientRect();
                const hasOverflow = container.scrollWidth > container.clientWidth;

                const insideX = mouseX >= rect.left && mouseX <= rect.right;
                const insideY = mouseY >= rect.top && mouseY <= rect.bottom;

                if (!hasOverflow || !insideX || !insideY) {
                    leftCard.style.display = "none";
                    rightCard.style.display = "none";
                    return;
                }

                const x = mouseX - rect.left;

                const canLeft = container.scrollLeft > 0;
                const canRight = container.scrollLeft < container.scrollWidth - container.clientWidth - 1;

                const nearLeft = x <= EDGE_ZONE && canLeft;
                const nearRight = x >= rect.width - EDGE_ZONE && canRight;

                leftCard.style.display = nearLeft ? "flex" : "none";
                rightCard.style.display = nearRight ? "flex" : "none";

                const topPx = mouseY - CARD_H / 2;

                if (nearLeft) {
                    leftCard.style.top = topPx + "px";
                    leftCard.style.left = (rect.left + 4) + "px";
                }

                if (nearRight) {
                    rightCard.style.top = topPx + "px";
                    rightCard.style.left = (rect.right - CARD_W - 4) + "px";
                }

            });

        } else {

            registry.forEach(({ leftCard, rightCard }) => {
                leftCard.style.display = "none";
                rightCard.style.display = "none";
            });

        }

        requestAnimationFrame(tick);

    }

    requestAnimationFrame(tick);

    function initAll(){
        document.querySelectorAll(".table-scroll").forEach(setupEdgeScroll);
    }

    document.addEventListener("DOMContentLoaded", initAll);

    // safety net: kalau ada .table-scroll dibuat dinamis setelah
    // DOMContentLoaded (fetch+innerHTML dll), rescan berkala
    setInterval(initAll, 1000);

})();