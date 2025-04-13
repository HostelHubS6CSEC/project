let selectedRole = "";
let authMode = "";

function openAuthModal(mode) {
    authMode = mode;
    document.getElementById("authModal").classList.remove("hidden");
    document.getElementById("authTitle").innerText = mode === "login" ? "Login" : "Sign Up";
    document.getElementById("roleSelection").classList.remove("hidden");
    document.getElementById("authForm").classList.add("hidden");
    gsap.from("#authModal", { opacity: 0, y: -50, duration: 0.5 });
}

function closeAuthModal() {
    gsap.to("#authModal", { opacity: 0, y: -50, duration: 0.5, onComplete: () => document.getElementById("authModal").classList.add("hidden") });
}

function setRole(role) {
    selectedRole = role;
    document.getElementById("roleSelection").classList.add("hidden");
    document.getElementById("authForm").classList.remove("hidden");
    document.getElementById("selectedRoleText").innerText = `Selected Role: ${role.toUpperCase()}`;
    document.getElementById("semester").classList.toggle("hidden", role !== "hosteller");
}

document.getElementById("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
        role: selectedRole,
        hostelRollNo: document.getElementById("hostelRollNo").value,
        semester: selectedRole === "hosteller" ? document.getElementById("semester").value : null,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
    };

    const endpoint = authMode === "login" ? "/api/login" : "/api/signup";
    const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (res.ok) {
        closeAuthModal();
        hideAllDashboards();
        document.getElementById(`${selectedRole}Dashboard`).classList.remove("hidden");
    } else {
        alert("Authentication failed!");
    }
});

function hideAllDashboards() {
    document.querySelectorAll(".dashboard").forEach(dash => dash.classList.add("hidden"));
}

function logout() {
    hideAllDashboards();
}

function openGatePassForm() {
    alert("Gate pass form would open here.");
}

// Home Screen Animations
gsap.from("#home h1", { opacity: 0, y: -50, duration: 1, delay: 0.5 });
gsap.from("#home p", { opacity: 0, y: 20, duration: 1, delay: 1 });
gsap.from("#home button", { opacity: 0, scale: 0.8, duration: 1, delay: 1.5 });