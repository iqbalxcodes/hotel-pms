// ======================================================
// statusBar.js
// Handles: login/logout, message/notification system,
// pagination rendering (bottom status bar)
// ======================================================

// ------------------------------------------------------
// Session state
// ------------------------------------------------------

let isLoggedIn = true;
let currentUsername = "Iqbal";

// contextMode: "message" | "logoutConfirm" | "loginForm" | "confirm"
let contextMode = "message";

let lastMessage = { text: "Ready", type: "info" };
let messageCount = 0;


// ======================================================
// User Area
// ======================================================

function renderUserArea(){

    const el = document.getElementById("userArea");

    if(isLoggedIn){

        el.innerHTML = `👤 <span id="usernameLabel">${currentUsername}</span>`;
        el.onclick = handleUserClick;

    }
    else{

        el.innerHTML = `👤 Login`;
        el.onclick = null;

    }

}

function handleUserClick(){

    if(!isLoggedIn){

        return;

    }

    contextMode = "logoutConfirm";

    renderContextArea();

}

function confirmLogout(willLogout){

    if(willLogout){

        isLoggedIn = false;
        currentUsername = null;

        renderUserArea();

        contextMode = "loginForm";

        renderContextArea();

        return;

    }

    contextMode = "message";

    renderContextArea();

}

function submitLogin(){

    const userInput = document.getElementById("loginUsername");
    const passInput = document.getElementById("loginPassword");

    const username = userInput.value.trim();
    const password = passInput.value.trim();

    if(username === "" || password === ""){

        showMessage("Username / password tidak boleh kosong", "error");
        return;

    }

    // NOTE: this is a placeholder auth check (no real backend auth wired up).
    isLoggedIn = true;
    currentUsername = username;

    renderUserArea();

    showMessage(`Login successful as ${username}`, "success");

}


// ======================================================
// Context Area (message / confirm / login form)
// ======================================================

function renderContextArea(){

    const el = document.getElementById("contextArea");

    if(contextMode === "logoutConfirm"){

        el.innerHTML = `
            <span class="logout-confirm">
                Logout?
                <button onclick="confirmLogout(true)">Yes</button>
                <button onclick="confirmLogout(false)">No</button>
            </span>
        `;

        return;

    }

    if(contextMode === "loginForm"){

        el.innerHTML = `
            <span class="login-form">
                User: <input type="text" id="loginUsername" placeholder="Username">
                Password: <input type="password" id="loginPassword" placeholder="Password">
                <button onclick="submitLogin()">Login</button>
            </span>
        `;

        const passInput = document.getElementById("loginPassword");

        if(passInput){

            passInput.addEventListener("keydown", (e) => {

                if(e.key === "Enter"){

                    submitLogin();

                }

            });

        }

        return;

    }

    if(contextMode === "confirm" && activeConfirm){

        el.innerHTML = `
            <span class="status-confirm">
                ⚠ ${activeConfirm.text}
                <button onclick="resolveConfirm(true)">Yes</button>
                <button onclick="resolveConfirm(false)">No</button>
            </span>
        `;

        return;

    }

    // default: message mode
    const iconMap = {
        success: "✓",
        error: "✕",
        info: "ℹ"
    };

    const icon = iconMap[lastMessage.type] || "ℹ";

    el.innerHTML = `
        <span class="status-msg-${lastMessage.type}">
            🔔 ${messageCount} ${icon} ${lastMessage.text}
        </span>
    `;

}


// ======================================================
// Public API: showMessage / showDevMessage
// ======================================================

function showMessage(text, type = "info"){

    lastMessage = { text, type };
    messageCount += 1;

    contextMode = "message";

    renderContextArea();

}

function showDevMessage(feature){

    showMessage(`${feature} — Function under development`, "info");

}


// ======================================================
// Public API: showConfirm (action requiring Yes/No)
// ======================================================

let activeConfirm = null;

function showConfirm(text, onYes, onNo){

    activeConfirm = { text, onYes, onNo };

    contextMode = "confirm";

    renderContextArea();

}

function resolveConfirm(answer){

    const confirmRef = activeConfirm;

    activeConfirm = null;
    contextMode = "message";

    if(!confirmRef){

        renderContextArea();
        return;

    }

    if(answer && typeof confirmRef.onYes === "function"){

        confirmRef.onYes();

    }
    else if(!answer && typeof confirmRef.onNo === "function"){

        confirmRef.onNo();

    }
    else{

        renderContextArea();

    }

}


// ======================================================
// Pagination Info + Nav
// ======================================================

function renderPaginationInfo(){

    const el = document.getElementById("paginationInfo");

    if(rowsPerPageHover){

        el.innerHTML = renderRowsPerPagePopover();
        return;

    }

    if(totalCount === 0){

        el.innerText = "Showing 0 of 0";
        return;

    }

    if(rowsPerPage === "all"){

        el.innerText = `Showing 1–${totalCount} of ${totalCount}`;
        return;

    }

    const from = (currentPage - 1) * rowsPerPage + 1;
    const to = Math.min(currentPage * rowsPerPage, totalCount);

    el.innerText = `Showing ${from}–${to} of ${totalCount}`;

    attachPaginationHover();

}

let rowsPerPageHover = false;
let customRowsMode = false;

function attachPaginationHover(){

    const el = document.getElementById("paginationInfo");

    el.onmouseenter = () => {

        rowsPerPageHover = true;
        renderPaginationInfo();

    };

    el.onmouseleave = () => {

        if(customRowsMode){

            return;

        }

        rowsPerPageHover = false;
        renderPaginationInfo();

    };

}

function renderRowsPerPagePopover(){

    if(customRowsMode){

        return `
            <span class="rows-per-page-popover" onmouseleave="handlePopoverLeave()">
                Rows:
                <input type="number" id="customRowsInput" min="1" placeholder="e.g. 75">
                <button onclick="applyCustomRows()">Apply</button>
            </span>
        `;

    }

    const options = [25, 50, 100];

    const buttons = options
        .map(n => `<button onclick="changeRowsPerPage(${n})">${n}</button>`)
        .join("");

    return `
        <span class="rows-per-page-popover" onmouseleave="handlePopoverLeave()">
            Rows per page:
            ${buttons}
            <button onclick="changeRowsPerPage('all')">All</button>
            <button onclick="enterCustomRowsMode()">Custom</button>
        </span>
    `;

}

function handlePopoverLeave(){

    if(customRowsMode){

        return;

    }

    rowsPerPageHover = false;
    renderPaginationInfo();

}

function enterCustomRowsMode(){

    customRowsMode = true;
    renderPaginationInfo();

    const input = document.getElementById("customRowsInput");

    if(input){

        input.focus();

        input.addEventListener("keydown", (e) => {

            if(e.key === "Enter"){

                applyCustomRows();

            }

        });

    }

}

function applyCustomRows(){

    const input = document.getElementById("customRowsInput");

    const value = parseInt(input.value, 10);

    if(!value || value < 1){

        showMessage("Rows per page harus lebih dari 0", "error");
        return;

    }

    customRowsMode = false;
    rowsPerPageHover = false;

    changeRowsPerPage(value);

}

function changeRowsPerPage(value){

    rowsPerPage = value;
    currentPage = 1;

    rowsPerPageHover = false;
    customRowsMode = false;

    refreshTable();

}

function renderPaginationNav(){

    const el = document.getElementById("paginationNav");

    const totalPages = getTotalPages();

    const windowStart = Math.max(1, currentPage - 2);
    const windowEnd = Math.min(totalPages, windowStart + 4);

    let pageButtons = "";

    for(let p = windowStart; p <= windowEnd; p++){

        pageButtons += `
            <button
                class="${p === currentPage ? 'active-page' : ''}"
                onclick="goToPage(${p})"
            >${p}</button>
        `;

    }

    el.innerHTML = `
        <button onclick="goToPage(1)" ${currentPage <= 1 ? "disabled" : ""}>«</button>
        <button onclick="goToPage(${currentPage - 1})" ${currentPage <= 1 ? "disabled" : ""}>‹</button>
        ${pageButtons}
        <button onclick="goToPage(${currentPage + 1})" ${currentPage >= totalPages ? "disabled" : ""}>›</button>
        <button onclick="goToPage(${totalPages})" ${currentPage >= totalPages ? "disabled" : ""}>»</button>
    `;

}

function goToPage(page){

    const totalPages = getTotalPages();

    if(page < 1 || page > totalPages || page === currentPage){

        if(page === currentPage){

            return;

        }

    }

    currentPage = Math.min(Math.max(page, 1), totalPages);

    refreshTable();

}

function renderPaginationBar(){

    renderPaginationInfo();
    renderPaginationNav();

}


// ======================================================
// Init
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    renderUserArea();
    renderContextArea();
    renderPaginationInfo();
    renderPaginationNav();

});