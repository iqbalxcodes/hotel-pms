// ======================================================
// auth.js
// Login / logout + role-based access (Supabase Auth)
//
// Dipakai bareng-bareng oleh index.html dan
// reservation-detail.html (dan guest.html kalau ada).
// Harus di-include SETELAH js/supabase.js dan SEBELUM
// script lain yang butuh isLoggedIn()/hasRole().
// ======================================================

let currentUser = null;
let currentProfile = null; // { id, email, full_name, role }


// ------------------------------------------------------
// Init: restore session saat load, dengar perubahan auth
// ------------------------------------------------------

async function initAuth(){

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    await handleAuthChange(session);

    supabaseClient.auth.onAuthStateChange(async (_event, newSession) => {

        await handleAuthChange(newSession);

    });

}

async function handleAuthChange(session){

    if(session && session.user){

        currentUser = session.user;
        currentProfile = await fetchProfile(session.user.id);

    }
    else{

        currentUser = null;
        currentProfile = null;

    }

    renderUserArea();
    applyAuthVisibility();

    // Beberapa header tabel (mis. kolom guest) menyisipkan
    // tombol edit berdasarkan status login — render ulang
    // supaya ikut update begitu login/logout terjadi.
    if(typeof renderTableHeader === "function"){

        renderTableHeader();

    }

}

async function fetchProfile(userId){

    const { data, error } =
        await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if(error){

        console.error(error);
        return null;

    }

    return data;

}


// ------------------------------------------------------
// Auth state helpers (dipakai di file lain)
// ------------------------------------------------------

function isLoggedIn(){

    return !!currentUser;

}

function currentRole(){

    return currentProfile ? currentProfile.role : null;

}

function hasRole(...roles){

    return isLoggedIn() && roles.includes(currentRole());

}


// ------------------------------------------------------
// Render #userArea
// ------------------------------------------------------

function escapeHtmlAuth(str){

    const div = document.createElement("div");
    div.textContent = str ?? "";

    return div.innerHTML;

}

function renderUserArea(){

    const el = document.getElementById("userArea");

    if(!el){
        return;
    }

    if(isLoggedIn()){

        const name =
            currentProfile
            ? (currentProfile.full_name || currentProfile.email)
            : currentUser.email;

        const role =
            currentProfile
            ? currentProfile.role
            : "-";

        el.innerHTML = `
            👤 ${escapeHtmlAuth(name)}
            <span class="status-badge">${escapeHtmlAuth(role)}</span>
        `;

        el.onclick = () => showLogoutConfirm();

    }
    else{

        el.innerHTML = `🔒 Login`;

        el.onclick = () => showLoginForm();

    }

}


// ------------------------------------------------------
// Login form (inline, dirender di dalam #userArea)
// ------------------------------------------------------

function showLoginForm(){

    const el = document.getElementById("userArea");

    if(!el){
        return;
    }

    el.onclick = null;

    el.innerHTML = `
        <span class="login-form" onclick="event.stopPropagation()">
            <input type="email" id="loginEmail" placeholder="Email">
            <input type="password" id="loginPassword" placeholder="Password">
            <button id="loginSubmitBtn">Login</button>
            <button id="loginCancelBtn">✕</button>
        </span>
    `;

    document.getElementById("loginSubmitBtn").onclick = handleLoginSubmit;
    document.getElementById("loginCancelBtn").onclick = () => renderUserArea();

    document.getElementById("loginPassword")
        .addEventListener("keydown", (e) => {

            if(e.key === "Enter"){

                handleLoginSubmit();

            }

        });

    document.getElementById("loginEmail").focus();

}

async function handleLoginSubmit(){

    const email =
        document.getElementById("loginEmail").value.trim();

    const password =
        document.getElementById("loginPassword").value;

    if(!email || !password){

        showMessage("Email dan password wajib diisi", "error");
        return;

    }

    const { error } =
        await supabaseClient.auth.signInWithPassword({ email, password });

    if(error){

        console.error(error);
        showMessage("Login gagal: " + error.message, "error");
        return;

    }

    showMessage("Login berhasil", "success");

}


// ------------------------------------------------------
// Logout (inline confirm)
// ------------------------------------------------------

function showLogoutConfirm(){

    const el = document.getElementById("userArea");

    if(!el){
        return;
    }

    el.onclick = null;

    const name =
        currentProfile
        ? (currentProfile.full_name || currentProfile.email)
        : currentUser.email;

    el.innerHTML = `
        <span class="logout-confirm" onclick="event.stopPropagation()">
            Logout ${escapeHtmlAuth(name)}?
            <button id="logoutYesBtn">Yes</button>
            <button id="logoutNoBtn">No</button>
        </span>
    `;

    document.getElementById("logoutYesBtn").onclick = handleLogout;
    document.getElementById("logoutNoBtn").onclick = () => renderUserArea();

}

async function handleLogout(){

    const { error } = await supabaseClient.auth.signOut();

    if(error){

        console.error(error);
        showMessage("Gagal logout", "error");
        return;

    }

    showMessage("Logout berhasil", "success");

}


// ------------------------------------------------------
// Visibility gating
//
// - class="auth-required"                -> hanya tampil kalau login
// - class="auth-required" data-roles="admin,manager"
//                                          -> hanya tampil kalau role cocok
// ------------------------------------------------------

function applyAuthVisibility(){

    document.querySelectorAll(".auth-required").forEach(el => {

        const rolesAttr = el.dataset.roles;

        let allowed;

        if(rolesAttr){

            const roles = rolesAttr.split(",").map(r => r.trim());
            allowed = hasRole(...roles);

        }
        else{

            allowed = isLoggedIn();

        }

        el.style.display = allowed ? "" : "none";

    });

}


document.addEventListener("DOMContentLoaded", initAuth);