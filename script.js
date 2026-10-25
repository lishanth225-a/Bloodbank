/* ==========================================
   LIFEDROP BLOOD BANK MANAGEMENT SYSTEM
   Frontend JavaScript
========================================== */

"use strict";

// ==========================================
// STORAGE CONFIGURATION
// ==========================================

const STORAGE_KEYS = {
    donations: "lifedrop_donations",
    requests: "lifedrop_requests"
};

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

// Demonstration stock figures.
// These are NOT real blood bank inventory figures.
const INITIAL_INVENTORY = {
    "A+": 24,
    "A-": 12,
    "B+": 20,
    "B-": 8,
    "O+": 30,
    "O-": 10,
    "AB+": 36,
    "AB-": 20
};

const INITIAL_DONOR_COUNT = 128;

let donations = loadRecords(STORAGE_KEYS.donations);
let requests = loadRecords(STORAGE_KEYS.requests);

let toastTimeout;

// ==========================================
// SAFE LOCAL STORAGE
// ==========================================

function loadRecords(key) {
    try {
        const stored = localStorage.getItem(key);

        if (!stored) {
            return [];
        }

        const parsed = JSON.parse(stored);

        return Array.isArray(parsed) ? parsed : [];

    } catch (error) {
        console.error("Could not load saved records:", error);
        return [];
    }
}

function saveRecords(key, records) {
    try {
        localStorage.setItem(key, JSON.stringify(records));
        return true;

    } catch (error) {
        console.error("Could not save records:", error);

        showToast(
            "Unable to save data. Check browser storage settings.",
            "error"
        );

        return false;
    }
}

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", initializeApp);

function initializeApp() {
    setCurrentDate();
    setDateLimits();
    registerNavigation();
    registerForms();
    registerSearch();
    registerMobileMenu();

    renderAll();

    document.getElementById("currentYear").textContent =
        new Date().getFullYear();
}

// ==========================================
// DATE DISPLAY
// ==========================================

function setCurrentDate() {
    const dateElement = document.getElementById("todayDate");

    dateElement.textContent = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function setDateLimits() {
    const today = getLocalDateString();

    const donationDate = document.getElementById("donorDate");
    const requestDate = document.getElementById("requestDate");

    donationDate.min = today;
    requestDate.min = today;

    donationDate.value = today;
    requestDate.value = today;
}

function formatDate(dateString) {
    if (!dateString) {
        return "—";
    }

    const date = new Date(dateString + "T12:00:00");

    if (Number.isNaN(date.getTime())) {
        return escapeHTML(dateString);
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

// ==========================================
// PAGE NAVIGATION
// ==========================================

const PAGE_TITLES = {
    dashboard: "Dashboard Overview",
    donate: "Donate Blood",
    request: "Request Blood",
    inventory: "Blood Inventory",
    donations: "Donation Records",
    requests: "Blood Request Records"
};

function registerNavigation() {
    document.querySelectorAll("[data-page]").forEach(button => {
        button.addEventListener("click", () => {
            navigateTo(button.dataset.page);
        });
    });

    document.querySelectorAll("[data-goto]").forEach(button => {
        button.addEventListener("click", () => {
            navigateTo(button.dataset.goto);
        });
    });

    document.getElementById("sidebarDonateBtn").addEventListener(
        "click",
        () => navigateTo("donate")
    );
}

function navigateTo(pageName) {
    if (!PAGE_TITLES[pageName]) {
        return;
    }

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    document.getElementById(pageName).classList.add("active");

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle(
            "active",
            link.dataset.page === pageName
        );
    });

    document.getElementById("pageTitle").textContent =
        PAGE_TITLES[pageName];

    document.getElementById("breadcrumb").textContent =
        PAGE_TITLES[pageName];

    document.querySelector(".sidebar").classList.remove("open");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    // Refresh data when entering a page.
    renderAll();
}

// ==========================================
// MOBILE MENU
// ==========================================

function registerMobileMenu() {
    const menuButton = document.getElementById("mobileMenu");
    const sidebar = document.querySelector(".sidebar");

    menuButton.addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });

    document.addEventListener("click", event => {
        if (
            window.innerWidth <= 900 &&
            sidebar.classList.contains("open") &&
            !sidebar.contains(event.target) &&
            !menuButton.contains(event.target)
        ) {
            sidebar.classList.remove("open");
        }
    });
}

// ==========================================
// FORM EVENT REGISTRATION
// ==========================================

function registerForms() {
    document.getElementById("donationForm").addEventListener(
        "submit",
        handleDonationSubmit
    );

    document.getElementById("requestForm").addEventListener(
        "submit",
        handleRequestSubmit
    );

    document.getElementById("donationForm").addEventListener(
        "reset",
        () => {
            setTimeout(() => {
                document.getElementById("donorDate").value =
                    getLocalDateString();
            }, 0);
        }
    );

    document.getElementById("requestForm").addEventListener(
        "reset",
        () => {
            setTimeout(() => {
                document.getElementById("requestDate").value =
                    getLocalDateString();
            }, 0);
        }
    );
}

// ==========================================
// DONATION FORM
// ==========================================

function handleDonationSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.reportValidity()) {
        return;
    }

    const age = Number(document.getElementById("donorAge").value);

    if (!Number.isInteger(age) || age < 18 || age > 100) {
        showToast(
            "Please enter a valid age of 18 or older.",
            "error"
        );

        return;
    }

    const phone = document.getElementById("donorPhone").value.trim();

    if (!/^[0-9]{10}$/.test(phone)) {
        showToast(
            "Enter a valid 10-digit phone number.",
            "error"
        );

        return;
    }

    const donationDate = document.getElementById("donorDate").value;

    if (!isValidDate(donationDate) || donationDate < getLocalDateString()) {
        showToast(
            "Please select today or a future donation date.",
            "error"
        );

        return;
    }

    const donor = {
        id: createId(),
        name: document.getElementById("donorName").value.trim(),
        age: age,
        gender: document.getElementById("donorGender").value,
        bloodGroup: document.getElementById("donorBlood").value,
        phone: phone,
        email: document.getElementById("donorEmail").value.trim(),
        city: document.getElementById("donorCity").value.trim(),
        preferredDate: donationDate,
        status: "Pending",
        createdAt: new Date().toISOString()
    };

    if (
        !donor.name ||
        !donor.bloodGroup ||
        !donor.city
    ) {
        showToast("Please complete all required fields.", "error");
        return;
    }

    donations.unshift(donor);

    if (!saveRecords(STORAGE_KEYS.donations, donations)) {
        donations.shift();
        return;
    }

    form.reset();

    setDateLimits();
    renderAll();

    showToast(
        "Donation registration submitted successfully!",
        "success"
    );

    navigateTo("donations");
}

// ==========================================
// BLOOD REQUEST FORM
// ==========================================

function handleRequestSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.reportValidity()) {
        return;
    }

    const phone = document.getElementById("requestPhone").value.trim();

    if (!/^[0-9]{10}$/.test(phone)) {
        showToast(
            "Enter a valid 10-digit phone number.",
            "error"
        );

        return;
    }

    const units = Number(document.getElementById("requestUnits").value);

    if (!Number.isInteger(units) || units < 1 || units > 100) {
        showToast(
            "Enter a quantity between 1 and 100 units.",
            "error"
        );

        return;
    }

    const requiredDate = document.getElementById("requestDate").value;

    if (
        !isValidDate(requiredDate) ||
        requiredDate < getLocalDateString()
    ) {
        showToast(
            "Please select today or a future date.",
            "error"
        );

        return;
    }

    const request = {
        id: createId(),
        requesterName: document.getElementById("requesterName").value.trim(),
        hospitalName: document.getElementById("hospitalName").value.trim(),
        bloodGroup: document.getElementById("requestBlood").value,
        units: units,
        phone: phone,
        city: document.getElementById("requestCity").value.trim(),
        requiredDate: requiredDate,
        priority: document.getElementById("requestPriority").value,
        reason: document.getElementById("requestReason").value.trim(),
        status: "Pending",
        createdAt: new Date().toISOString()
    };

    if (
        !request.requesterName ||
        !request.hospitalName ||
        !request.bloodGroup ||
        !request.city
    ) {
        showToast("Please complete all required fields.", "error");
        return;
    }

    requests.unshift(request);

    if (!saveRecords(STORAGE_KEYS.requests, requests)) {
        requests.shift();
        return;
    }

    form.reset();

    setDateLimits();

    renderAll();

    showToast(
        "Blood request submitted successfully!",
        "success"
    );

    navigateTo("requests");
}

// ==========================================
// VALIDATION HELPERS
// ==========================================

function isValidDate(dateString) {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return false;
    }

    const date = new Date(dateString + "T12:00:00");

    return (
        !Number.isNaN(date.getTime()) &&
        getLocalDateString(date) === dateString
    );
}

function createId() {
    return (
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8)
    ).toUpperCase();
}

// ==========================================
// SEARCH FUNCTIONALITY
// ==========================================

function registerSearch() {
    document.getElementById("inventorySearch").addEventListener(
        "input",
        renderInventory
    );

    document.getElementById("donationSearch").addEventListener(
        "input",
        renderDonationTable
    );

    document.getElementById("requestSearch").addEventListener(
        "input",
        renderRequestTable
    );
}

// ==========================================
// RENDER ALL SECTIONS
// ==========================================

function renderAll() {
    renderDashboard();
    renderBloodGrid();
    renderInventory();
    renderDonationTable();
    renderRequestTable();
    renderRecentActivity();
}

// ==========================================
// DASHBOARD STATISTICS
// ==========================================

function getTotalInventory() {
    return Object.values(INITIAL_INVENTORY).reduce(
        (total, units) => total + units,
        0
    );
}

function renderDashboard() {
    document.getElementById("totalUnits").textContent =
        getTotalInventory();

    document.getElementById("inventoryTotal").textContent =
        getTotalInventory();

    document.getElementById("totalDonors").textContent =
        INITIAL_DONOR_COUNT + donations.length;

    document.getElementById("totalRequests").textContent =
        requests.length;

    document.getElementById("pendingRequests").textContent =
        requests.filter(request => request.status === "Pending").length;

    document.getElementById("lowStockGroups").textContent =
        BLOOD_GROUPS.filter(
            group => INITIAL_INVENTORY[group] < 10
        ).length;
}

// ==========================================
// DASHBOARD BLOOD AVAILABILITY
// ==========================================

function renderBloodGrid() {
    const container = document.getElementById("dashboardBloodGrid");

    container.innerHTML = BLOOD_GROUPS.map(group => {
        const units = INITIAL_INVENTORY[group];

        return `
            <div class="blood-card">
                <div class="blood-type">${escapeHTML(group)}</div>
                <strong>${units}</strong>
                <small>Sample units</small>
            </div>
        `;
    }).join("");
}

// ==========================================
// INVENTORY TABLE
// ==========================================

function renderInventory() {
    const tbody = document.getElementById("inventoryTable");

    const query = document.getElementById("inventorySearch")
        .value.trim().toLowerCase();

    const filteredGroups = BLOOD_GROUPS.filter(group =>
        group.toLowerCase().includes(query)
    );

    if (filteredGroups.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <strong>No blood groups found</strong>
                    <span>Try searching for another blood group.</span>
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML = filteredGroups.map(group => {
        const units = INITIAL_INVENTORY[group];

        const percentage = Math.min(
            (units / 40) * 100,
            100
        );

        const isLow = units < 10;

        const status = units === 0
            ? "Unavailable"
            : isLow
                ? "Low Stock"
                : "Available";

        const badgeClass = units === 0
            ? "unavailable"
            : isLow
                ? "low"
                : "available";

        return `
            <tr>
                <td>
                    <span class="table-blood">${escapeHTML(group)}</span>
                </td>

                <td><strong>${units}</strong> units</td>

                <td>
                    <div class="stock-bar">
                        <div class="stock-track">
                            <div
                                class="stock-fill ${isLow ? "low" : ""}"
                                style="width:${percentage}%"
                            ></div>
                        </div>

                        <span class="stock-number">
                            ${Math.round(percentage)}%
                        </span>
                    </div>
                </td>

                <td>
                    <span class="badge ${badgeClass}">
                        ${status}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}

// ==========================================
// DONATION RECORDS TABLE
// ==========================================

function renderDonationTable() {
    const tbody = document.getElementById("donationTable");

    const query = document.getElementById("donationSearch")
        .value.trim().toLowerCase();

    const filtered = donations.filter(donor => {
        const searchable = [
            donor.name,
            donor.bloodGroup,
            donor.phone,
            donor.city,
            donor.status
        ].join(" ").toLowerCase();

        return searchable.includes(query);
    });

    document.getElementById("donationRecordCount").textContent =
        `${filtered.length} record${filtered.length === 1 ? "" : "s"}`;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <strong>No donation records found</strong>
                    <span>
                        Submit a donation registration to see it here.
                    </span>
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML = filtered.map(donor => `
        <tr>
            <td>
                <strong>${escapeHTML(donor.name)}</strong>
            </td>

            <td>
                <span class="table-blood">
                    ${escapeHTML(donor.bloodGroup)}
                </span>
            </td>

            <td>${escapeHTML(donor.phone)}</td>

            <td>${escapeHTML(donor.city)}</td>

            <td>${formatDate(donor.preferredDate)}</td>

            <td>
                <span class="badge ${statusClass(donor.status)}">
                    ${escapeHTML(donor.status)}
                </span>
            </td>
        </tr>
    `).join("");
}

// ==========================================
// REQUEST RECORDS TABLE
// ==========================================

function renderRequestTable() {
    const tbody = document.getElementById("requestTable");

    const query = document.getElementById("requestSearch")
        .value.trim().toLowerCase();

    const filtered = requests.filter(request => {
        const searchable = [
            request.requesterName,
            request.hospitalName,
            request.bloodGroup,
            request.city,
            request.priority,
            request.status
        ].join(" ").toLowerCase();

        return searchable.includes(query);
    });

    document.getElementById("requestRecordCount").textContent =
        `${filtered.length} record${filtered.length === 1 ? "" : "s"}`;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <strong>No blood requests found</strong>
                    <span>
                        Submit a blood request to see it here.
                    </span>
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML = filtered.map(request => `
        <tr>
            <td>
                <strong>${escapeHTML(request.requesterName)}</strong>
            </td>

            <td>${escapeHTML(request.hospitalName)}</td>

            <td>
                <span class="table-blood">
                    ${escapeHTML(request.bloodGroup)}
                </span>
            </td>

            <td>${request.units}</td>

            <td>
                <span class="badge ${priorityClass(request.priority)}">
                    ${escapeHTML(request.priority)}
                </span>
            </td>

            <td>${formatDate(request.requiredDate)}</td>

            <td>
                <span class="badge ${statusClass(request.status)}">
                    ${escapeHTML(request.status)}
                </span>
            </td>
        </tr>
    `).join("");
}

// ==========================================
// RECENT ACTIVITY
// ==========================================

function renderRecentActivity() {
    const container = document.getElementById("recentActivity");

    const donationActivities = donations.map(donor => ({
        type: "donation",
        name: donor.name,
        detail: `Donation registration · ${donor.bloodGroup}`,
        time: donor.createdAt
    }));

    const requestActivities = requests.map(request => ({
        type: "request",
        name: request.requesterName,
        detail: `Blood request · ${request.bloodGroup}`,
        time: request.createdAt
    }));

    const activities = [
        ...donationActivities,
        ...requestActivities
    ]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 5);

    if (activities.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <strong>No recent activity</strong>
                <span>Your submitted donations and requests will appear here.</span>
            </div>
        `;

        return;
    }

    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon ${activity.type}">
                ${activity.type === "donation" ? "♡" : "✚"}
            </div>

            <div class="activity-text">
                <strong>${escapeHTML(activity.name)}</strong>
                <p>${escapeHTML(activity.detail)}</p>
            </div>

            <span class="activity-time">
                ${formatTimeAgo(activity.time)}
            </span>
        </div>
    `).join("");
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "Recently";
    }

    const elapsed = Math.max(0, Date.now() - date.getTime());

    const minutes = Math.floor(elapsed / 60000);

    if (minutes < 1) {
        return "Just now";
    }

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 30) {
        return `${days}d ago`;
    }

    return formatDate(dateString);
}

// ==========================================
// BADGE HELPERS
// ==========================================

function statusClass(status) {
    switch (status) {
        case "Approved":
            return "approved";

        case "Rejected":
            return "rejected";

        case "Pending":
        default:
            return "pending";
    }
}

function priorityClass(priority) {
    switch (priority) {
        case "Emergency":
            return "emergency";

        case "Urgent":
            return "urgent";

        default:
            return "available";
    }
}

// ==========================================
// HTML ESCAPING
// Helps prevent user-entered values from
// being interpreted as HTML.
// ==========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.className = "toast";
    }, 3500);
}