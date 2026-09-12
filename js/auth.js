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

    const { data, error } = await supabaseClient
        .from("app_users")
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
// Access gating — bukan di-hide, tapi di-disable + pudar +
// lock badge + tooltip ("kenapa gak bisa diklik").
//
// - class="auth-required"                -> perlu login
// - class="auth-required" data-roles="admin,manager"
//                                          -> perlu role tsb
//
// Catatan: ini murni UX. Keamanan sesungguhnya ada di RLS
// policy Supabase (server-side), jadi meskipun elemen ini
// dipaksa di-enable lewat DevTools, request ke DB tetap
// akan ditolak kalau user belum login/role gak sesuai.
// ------------------------------------------------------

function applyAuthVisibility(){

    document.querySelectorAll(".auth-required").forEach(el => {

        const rolesAttr = el.dataset.roles;

        let allowed;
        let reason = "Login diperlukan untuk aksi ini";

        if(rolesAttr){

            const roles = rolesAttr.split(",").map(r => r.trim());
            allowed = hasRole(...roles);

            if(!allowed && isLoggedIn()){

                reason = `Hanya untuk role: ${roles.join(", ")}`;

            }

        }
        else{

            allowed = isLoggedIn();

        }

        setLockedState(el, !allowed, reason);

    });

}

function setLockedState(el, locked, reason){

    const isFormControl =
        el.tagName === "BUTTON" ||
        el.tagName === "INPUT" ||
        el.tagName === "SELECT" ||
        el.tagName === "TEXTAREA";

    if(locked){

        el.classList.add("auth-locked");
        el.title = `🔒 ${reason}`;

        if(isFormControl){

            el.disabled = true;

        }
        else{

            el.setAttribute("aria-disabled", "true");

        }

    }
    else{

        el.classList.remove("auth-locked");
        el.removeAttribute("title");

        if(isFormControl){

            el.disabled = false;

        }
        else{

            el.removeAttribute("aria-disabled");

        }

    }

}


document.addEventListener("DOMContentLoaded", initAuth);

// ======================================================
// Avatar login bubble -- popup nempel di bawah tombol avatar
// PageHeader (BEDA sama form login inline di #userArea/status
// bar bawah, itu tetep ada). Isinya diadaptasi dari auth-card
// Dienstplan: Login + Forgot Password. Flow "Register Your
// Business" (onboarding org) SENGAJA DICABUT -- gak relevan,
// PMS ini single-tenant, gak ada konsep multi-organization.
// ======================================================

function authBubbleHtml(){

    if(isLoggedIn()){

        const name = currentProfile ? (currentProfile.full_name || currentProfile.email) : currentUser.email;
        const role = currentProfile ? currentProfile.role : "-";

        return `
            <div class="auth-bubble-card">
                <h3>${escapeHtmlAuth(name)}</h3>
                <p class="auth-bubble-role">${escapeHtmlAuth(role)}</p>
                <div class="auth-actions-row">
                    <button class="primary" id="authBubbleLogoutBtn">Log out</button>
                </div>
            </div>
        `;

    }

    return `
        <div class="auth-bubble-card">
            <h3>Login</h3>

            <label>Email</label>
            <input type="email" id="authBubbleEmail" autocomplete="username">

            <label>Password</label>
            <div class="auth-pass-row">
                <input type="password" id="authBubblePassword" autocomplete="current-password">
                <button type="button" class="auth-eye" id="authBubbleEyeBtn" title="Show/hide password">👁</button>
            </div>

            <div class="auth-actions-row">
                <label class="auth-check">
                    <input type="checkbox" id="authBubbleRemember" checked>
                    <span>Remember me</span>
                </label>
                <button class="primary" id="authBubbleLoginBtn">Log in</button>
            </div>

            <div id="authBubbleError" class="auth-error" style="display:none;"></div>

            <p class="auth-hint"><a href="#" id="authBubbleForgotToggle">Forgot password?</a></p>

            <div id="authBubbleForgotSection" style="display:none;">
                <hr>
                <label>Email for recovery link</label>
                <div class="auth-forgot-row">
                    <input type="email" id="authBubbleForgotEmail" autocomplete="email">
                    <button type="button" id="authBubbleForgotBtn">Reset</button>
                </div>
                <p class="auth-hint" id="authBubbleForgotMsg"></p>
            </div>
        </div>
    `;

}

function closeAuthBubble(){
    document.getElementById("authBubble")?.remove();
    document.removeEventListener("click", authBubbleOutsideClick);
}

function authBubbleOutsideClick(e){
    const bubble = document.getElementById("authBubble");
    const btn = document.querySelector(".ph-avatar-btn");
    if(bubble && !bubble.contains(e.target) && e.target !== btn && !btn?.contains(e.target)){
        closeAuthBubble();
    }
}

function toggleAuthBubble(){

    const existing = document.getElementById("authBubble");
    if(existing){ closeAuthBubble(); return; }

    const anchor = document.querySelector(".ph-avatar-btn");
    if(!anchor) return;

    const bubble = document.createElement("div");
    bubble.id = "authBubble";
    bubble.className = "auth-bubble";
    bubble.innerHTML = authBubbleHtml();
    document.body.appendChild(bubble);

    const rect = anchor.getBoundingClientRect();
    bubble.style.top = (rect.bottom + 8) + "px";
    bubble.style.left = Math.max(8, rect.left) + "px";

    bindAuthBubbleEvents();

    setTimeout(() => document.addEventListener("click", authBubbleOutsideClick), 0);

}
window.toggleAuthBubble = toggleAuthBubble;

function bindAuthBubbleEvents(){

    document.getElementById("authBubbleLogoutBtn")?.addEventListener("click", async () => {
        await handleLogout();
        closeAuthBubble();
    });

    const eyeBtn = document.getElementById("authBubbleEyeBtn");
    const passInput = document.getElementById("authBubblePassword");

    if(eyeBtn && passInput){
        eyeBtn.addEventListener("click", () => {
            passInput.type = passInput.type === "password" ? "text" : "password";
        });
    }

    document.getElementById("authBubbleLoginBtn")?.addEventListener("click", handleAuthBubbleLogin);
    passInput?.addEventListener("keydown", (e) => { if(e.key === "Enter") handleAuthBubbleLogin(); });

    document.getElementById("authBubbleForgotToggle")?.addEventListener("click", (e) => {
        e.preventDefault();
        const sec = document.getElementById("authBubbleForgotSection");
        if(sec) sec.style.display = sec.style.display === "none" ? "block" : "none";
    });

    document.getElementById("authBubbleForgotBtn")?.addEventListener("click", handleAuthBubbleForgot);

}

async function handleAuthBubbleLogin(){

    const email = document.getElementById("authBubbleEmail").value.trim();
    const password = document.getElementById("authBubblePassword").value;
    const errEl = document.getElementById("authBubbleError");

    if(!email || !password){
        errEl.textContent = "Email dan password wajib diisi";
        errEl.style.display = "block";
        return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if(error){
        errEl.textContent = error.message;
        errEl.style.display = "block";
        return;
    }

    closeAuthBubble();
    showMessage("Login berhasil", "success");

}

async function handleAuthBubbleForgot(){

    const email = document.getElementById("authBubbleForgotEmail").value.trim();
    const msgEl = document.getElementById("authBubbleForgotMsg");

    if(!email){
        msgEl.textContent = "Isi email dulu";
        return;
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset.html`
    });

    msgEl.textContent = error ? error.message : "Link reset terkirim, cek email.";

}