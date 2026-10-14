
"use strict";

document.addEventListener("DOMContentLoaded", function() {
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));

    const STORAGE_KEY = "cybershield_incidents_v1";
    const QUIZ_KEY = "cybershield_quiz_v1";

    const priorities = ["Critical", "High", "Medium", "Low"];
    const statuses = ["Open", "In Progress", "Resolved"];

    let incidents = loadIncidents();
    let toastTimer;
    let editingIncidentId = null;

    // --------------------------------------------------
    // SAFE HTML HELPERS
    // --------------------------------------------------

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function(character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[character];
        });
    }

    function makeId() {
        return "INC-" + Date.now().toString(36).toUpperCase()
            + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return "Unknown";
        return date.toLocaleDateString("en-ZA", {
            day: "2-digit", month: "short", year: "numeric"
        });
    }

    function showToast(message) {
        const toast = $("#toast");
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
    }

    function saveIncidents() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents));
            return true;
        } catch (error) {
            showToast("Could not save data. Browser storage may be full or unavailable.");
            console.error("Incident storage error:", error);
            return false;
        }
    }

    function loadIncidents() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved !== null) {
                const parsed = JSON.parse(saved);
                if (!Array.isArray(parsed)) return [];
                return parsed.filter(item =>
                    item && typeof item.id === "string"
                    && typeof item.title === "string"
                    && priorities.includes(item.priority)
                    && statuses.includes(item.status)
                );
            }
        } catch (error) {
            console.error("Could not read saved incidents:", error);
        }

        // Initial sample data makes the dashboard useful on first launch.
        // These records are fictional and can be edited or deleted.
        const now = Date.now();
        return [
            {
                id: "INC-1001", title: "Suspicious login attempt",
                description: "Fictional example: several failed sign-in attempts.",
                priority: "High", status: "Open",
                createdAt: new Date(now - 3600000).toISOString()
            },
            {
                id: "INC-1002", title: "Possible phishing email",
                description: "Fictional example: email requests urgent account verification.",
                priority: "Critical", status: "In Progress",
                createdAt: new Date(now - 7200000).toISOString()
            },
            {
                id: "INC-1003", title: "Unusual network activity",
                description: "Fictional example: unusual activity flagged for review.",
                priority: "Medium", status: "Open",
                createdAt: new Date(now - 86400000).toISOString()
            },
            {
                id: "INC-1004", title: "Security awareness review",
                description: "Fictional example: awareness training completed.",
                priority: "Low", status: "Resolved",
                createdAt: new Date(now - 172800000).toISOString()
            }
        ];
    }

    function priorityClass(priority) {
        return "priority-" + priority.toLowerCase();
    }

    function statusClass(status) {
        return "status-" + status.toLowerCase().replace(/\s+/g, "-");
    }

    function priorityBadge(priority) {
        return `<span class="priority ${priorityClass(priority)}">${escapeHTML(priority)}</span>`;
    }

    function statusBadge(status) {
        return `<span class="status-badge ${statusClass(status)}">${escapeHTML(status)}</span>`;
    }

    // --------------------------------------------------
    // NAVIGATION
    // --------------------------------------------------

    const pageNames = {
        dashboard: "Overview",
        phishing: "Phishing Detector",
        password: "Password Checker",
        incidents: "Incident Management",
        academy: "Cyber Academy"
    };

    function navigate(pageName) {
        if (!pageNames[pageName]) return;

        $$(".page").forEach(page => page.classList.remove("active"));
        const target = $("#page-" + pageName);
        if (target) target.classList.add("active");

        $$(".nav-link").forEach(link => {
            link.classList.toggle("active", link.dataset.page === pageName);
        });

        $("#breadcrumb").textContent = pageNames[pageName];
        $("#sidebar").classList.remove("open");
        window.scrollTo({ top: 0, behavior: "smooth" });

        if (pageName === "dashboard" || pageName === "incidents") {
            renderIncidents();
        }
    }

    document.addEventListener("click", function(event) {
        const pageButton = event.target.closest("[data-page]");
        if (pageButton) {
            event.preventDefault();
            navigate(pageButton.dataset.page);
        }

        const actionButton = event.target.closest("[data-action]");
        if (actionButton && actionButton.dataset.action === "new-incident") {
            openIncidentModal();
        }
    });

    $("#menuToggle").addEventListener("click", () => {
        $("#sidebar").classList.toggle("open");
    });

    document.addEventListener("click", function(event) {
        if (!event.target.closest("#sidebar") &&
            !event.target.closest("#menuToggle")) {
            $("#sidebar").classList.remove("open");
        }
    });

    // --------------------------------------------------
    // INCIDENT MANAGEMENT
    // --------------------------------------------------

    function renderIncidents() {
        const total = incidents.length;
        const open = incidents.filter(item => item.status === "Open").length;
        const progress = incidents.filter(item => item.status === "In Progress").length;
        const resolved = incidents.filter(item => item.status === "Resolved").length;
        const critical = incidents.filter(item => item.priority === "Critical").length;

        $("#totalIncidents").textContent = total;
        $("#openIncidents").textContent = open;
        $("#criticalIncidents").textContent = critical;
        $("#resolvedIncidents").textContent = resolved;
        $("#incidentNavCount").textContent = open;
        $("#tableTotal").textContent = total;
        $("#tableOpen").textContent = open;
        $("#tableProgress").textContent = progress;
        $("#tableResolved").textContent = resolved;

        renderRecentIncidents();
        renderIncidentTable();
        renderSeverityChart();
    }

    function renderRecentIncidents() {
        const recent = [...incidents]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        $("#recentIncidents").innerHTML = recent.map(item => `
            <tr>
                <td><span class="table-id">${escapeHTML(item.id)}</span></td>
                <td>${escapeHTML(item.title)}</td>
                <td>${priorityBadge(item.priority)}</td>
                <td>${statusBadge(item.status)}</td>
                <td>${formatDate(item.createdAt)}</td>
            </tr>
        `).join("");

        $("#recentEmpty").classList.toggle("hidden", recent.length > 0);
    }

    function renderIncidentTable() {
        const query = $("#incidentSearch").value.trim().toLowerCase();
        const priority = $("#priorityFilter").value;
        const status = $("#statusFilter").value;

        const filtered = [...incidents]
            .filter(item => {
                const matchesQuery = [
                    item.id, item.title, item.description
                ].some(value => String(value || "").toLowerCase().includes(query));

                return matchesQuery
                    && (!priority || item.priority === priority)
                    && (!status || item.status === status);
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        $("#incidentTable").innerHTML = filtered.map(item => `
            <tr>
                <td><span class="table-id">${escapeHTML(item.id)}</span></td>
                <td>
                    <strong>${escapeHTML(item.title)}</strong>
                    ${item.description ? `<div style="color:#858ca9;font-size:9px;margin-top:3px;max-width:230px;overflow:hidden;text-overflow:ellipsis">${escapeHTML(item.description)}</div>` : ""}
                </td>
                <td>${priorityBadge(item.priority)}</td>
                <td>${statusBadge(item.status)}</td>
                <td>${formatDate(item.createdAt)}</td>
                <td>
                    <button class="row-action" data-incident-action="status"
                        data-id="${escapeHTML(item.id)}" title="Change status">Update</button>
                    <button class="row-action" data-incident-action="edit"
                        data-id="${escapeHTML(item.id)}" title="Edit incident">Edit</button>
                    <button class="row-action" data-incident-action="delete"
                        data-id="${escapeHTML(item.id)}" title="Delete incident">Delete</button>
                </td>
            </tr>
        `).join("");

        $("#incidentEmpty").classList.toggle("hidden", filtered.length > 0);
    }

    function renderSeverityChart() {
        const counts = {
            Critical: incidents.filter(i => i.priority === "Critical").length,
            High: incidents.filter(i => i.priority === "High").length,
            Medium: incidents.filter(i => i.priority === "Medium").length,
            Low: incidents.filter(i => i.priority === "Low").length
        };

        const total = incidents.length;
        $("#severityTotal").textContent = total;
        $("#criticalLegend").textContent = counts.Critical;
        $("#highLegend").textContent = counts.High;
        $("#mediumLegend").textContent = counts.Medium;
        $("#lowLegend").textContent = counts.Low;

        const colors = {
            Critical: "#ff6b83",
            High: "#ffad66",
            Medium: "#f5d46c",
            Low: "#45d6a0"
        };

        let currentAngle = 0;
        const slices = [];

        priorities.forEach(priority => {
            const degrees = total ? counts[priority] / total * 360 : 0;
            if (degrees > 0) {
                slices.push(`${colors[priority]} ${currentAngle}deg ${currentAngle + degrees}deg`);
                currentAngle += degrees;
            }
        });

        $("#severityDonut").style.background = total
            ? `conic-gradient(${slices.join(", ")})`
            : "#252943";
    }

    function openIncidentModal(incident = null) {
        editingIncidentId = incident ? incident.id : null;
        $("#incidentForm").reset();
        $("#modalTitle").textContent = incident ? "Edit incident" : "Create incident";

        $("#incidentTitle").value = incident ? incident.title : "";
        $("#incidentDescription").value = incident ? incident.description || "" : "";
        $("#incidentPriority").value = incident ? incident.priority : "Medium";
        $("#incidentStatus").value = incident ? incident.status : "Open";

        $("#incidentModal").classList.remove("hidden");
        $("#incidentTitle").focus();
    }

    function closeIncidentModal() {
        $("#incidentModal").classList.add("hidden");
        editingIncidentId = null;
    }

    $("#closeModal").addEventListener("click", closeIncidentModal);
    $("#cancelModal").addEventListener("click", closeIncidentModal);

    $("#incidentModal").addEventListener("click", function(event) {
        if (event.target === $("#incidentModal")) closeIncidentModal();
    });

    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape") closeIncidentModal();
    });

    $("#incidentForm").addEventListener("submit", function(event) {
        event.preventDefault();
        const wasEditing = Boolean(editingIncidentId);
        const title = $("#incidentTitle").value.trim();
        if (!title) {
            showToast("Please enter an incident title.");
            return;
        }

        const description = $("#incidentDescription").value.trim();
        const priority = $("#incidentPriority").value;
        const status = $("#incidentStatus").value;

        if (editingIncidentId) {
            const incident = incidents.find(item => item.id === editingIncidentId);
            if (!incident) {
                showToast("Incident not found.");
                closeIncidentModal();
                return;
            }

            incident.title = title;
            incident.description = description;
            incident.priority = priority;
            incident.status = status;
            incident.updatedAt = new Date().toISOString();
        } else {
            incidents.push({
                id: makeId(),
                title,
                description,
                priority,
                status,
                createdAt: new Date().toISOString()
            });
        }

        if (!saveIncidents()) return;

        closeIncidentModal();
        renderIncidents();
        showToast(wasEditing ? "Incident updated." : "Incident created.");
    });

    $("#incidentTable").addEventListener("click", function(event) {
        const button = event.target.closest("[data-incident-action]");
        if (!button) return;

        const incident = incidents.find(item => item.id === button.dataset.id);
        if (!incident) return;

        const action = button.dataset.incidentAction;

        if (action === "edit") {
            openIncidentModal(incident);
        } else if (action === "status") {
            const currentIndex = statuses.indexOf(incident.status);
            incident.status = statuses[(currentIndex + 1) % statuses.length];
            incident.updatedAt = new Date().toISOString();

            if (saveIncidents()) {
                renderIncidents();
                showToast(`Status changed to ${incident.status}.`);
            }
        } else if (action === "delete") {
            if (!confirm(`Delete "${incident.title}"? This cannot be undone.`)) return;
            incidents = incidents.filter(item => item.id !== incident.id);
            if (saveIncidents()) {
                renderIncidents();
                showToast("Incident deleted.");
            }
        }
    });

    ["incidentSearch", "priorityFilter", "statusFilter"].forEach(id => {
        $("#" + id).addEventListener("input", renderIncidentTable);
        $("#" + id).addEventListener("change", renderIncidentTable);
    });

    $("#clearIncidents").addEventListener("click", function() {
        if (!incidents.length) {
            showToast("There are no incidents to clear.");
            return;
        }

        if (!confirm("Delete ALL incident records from this browser? This cannot be undone.")) return;

        incidents = [];
        if (saveIncidents()) {
            renderIncidents();
            showToast("All incidents cleared.");
        }
    });

    $("#exportIncidents").addEventListener("click", function() {
        if (!incidents.length) {
            showToast("There are no incidents to export.");
            return;
        }

        const headers = ["ID", "Title", "Description", "Priority", "Status", "Created"];
        const rows = incidents.map(item => [
            item.id, item.title, item.description || "",
            item.priority, item.status, item.createdAt
        ]);

        function csvCell(value) {
            let text = String(value ?? "");
            // Reduce the risk of spreadsheet formula injection.
            if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
            return '"' + text.replace(/"/g, '""') + '"';
        }

        const csv = [headers, ...rows]
            .map(row => row.map(csvCell).join(",")).join("\r\n");

        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "cybershield-incidents.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showToast("Incident CSV exported.");
    });

    // --------------------------------------------------
    // SIMULATED THREAT ACTIVITY CHART
    // --------------------------------------------------

    function renderActivityChart() {
        const detected = [14, 23, 18, 31, 24, 35, 28];
        const investigated = [7, 12, 10, 17, 13, 21, 16];

        function points(values) {
            return values.map((value, index) => {
                const x = index * 100;
                const y = 180 - value * 4.1;
                return `${x},${y}`;
            }).join(" ");
        }

        const chart = $("#activityChart");
        chart.innerHTML = `
            <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#8b5cf6" stop-opacity=".3"/>
                    <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
                </linearGradient>
                <filter id="chartGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
            </defs>
            <polygon points="0,200 ${points(detected)} 600,200" fill="url(#chartFill)"/>
            <polyline points="${points(detected)}" fill="none" stroke="#a78bfa"
                stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" filter="url(#chartGlow)"/>
            <polyline points="${points(investigated)}" fill="none" stroke="#45d8e8"
                stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
            ${detected.map((value, index) =>
            `<circle cx="${index * 100}" cy="${180 - value * 4.1}" r="3" fill="#c4b5fd" stroke="#111427" stroke-width="1.5"/>`
        ).join("")}
        `;
    }

    $("#refreshButton").addEventListener("click", function() {
        renderIncidents();
        renderActivityChart();
        showToast("Dashboard refreshed. Threat chart data remains simulated.");
    });

    // --------------------------------------------------
    // PHISHING EMAIL ANALYSIS
    // --------------------------------------------------

    $("#sampleEmail").addEventListener("click", function() {
        $("#emailSender").value = "security-alert@account-verify.example";
        $("#emailSubject").value = "URGENT: Your account will be suspended";
        $("#emailBody").value =
            "Dear customer,\n\nURGENT! Your account will be suspended today. " +
            "Verify your identity immediately to avoid losing access. " +
            "Click here: http://example.invalid/verify-account\n\n" +
            "Enter your password and account details now.\n\nSecurity Team";
        showToast("Fictional sample loaded. It is safe to analyse as text.");
    });

    $("#phishingForm").addEventListener("reset", function() {
        setTimeout(() => {
            $("#phishingPlaceholder").classList.remove("hidden");
            $("#phishingResults").classList.add("hidden");
        }, 0);
    });

    $("#phishingForm").addEventListener("submit", function(event) {
        event.preventDefault();

        const sender = $("#emailSender").value.trim();
        const subject = $("#emailSubject").value.trim();
        const body = $("#emailBody").value.trim();

        if (!body) {
            showToast("Please enter email content to analyse.");
            return;
        }

        const text = `${subject}\n${body}`;
        const indicators = [];
        let score = 0;

        function check(pattern, points, title, explanation) {
            if (pattern.test(text)) {
                score += points;
                indicators.push({ title, explanation, points });
            }
        }

        check(/\b(urgent|immediately|act now|final warning|expires today|within 24 hours|suspended today)\b/i,
            18, "Urgent or threatening language",
            "Pressure to act quickly can prevent careful verification.");

        check(/\b(password|login credentials|passcode|one.time code|verify your identity|enter your details)\b/i,
            22, "Sensitive information requested",
            "Treat unexpected requests for passwords or verification codes with caution.");

        check(/\b(click here|verify now|confirm your account|open the link|download immediately)\b/i,
            12, "Call to action",
            "Unexpected links and instructions should be checked before use.");

        check(/\b(gift card|wire transfer|crypto(currency)?|bitcoin|payment immediately|bank details)\b/i,
            18, "Unusual payment or money request",
            "Unexpected payments, cryptocurrency or gift-card requests deserve independent verification.");

        check(/\b(account (will be|has been) (locked|suspended|closed)|unusual activity detected|security alert)\b/i,
            12, "Account threat or security scare",
            "Attackers sometimes imitate account warnings to encourage rushed decisions.");

        const urls = body.match(/https?:\/\/[^\s<>"']+/gi) || [];
        if (urls.length) {
            score += Math.min(12, urls.length * 6);
            indicators.push({
                title: "Links included in the message",
                explanation: `${urls.length} URL(s) detected. Inspect the real destination independently; a link's presence alone does not prove phishing.`,
                points: Math.min(12, urls.length * 6)
            });
        }

        if (/@/.test(sender) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender)) {
            score += 12;
            indicators.push({
                title: "Unusual sender format",
                explanation: "The sender text does not resemble a standard email address. This alone does not establish fraud.",
                points: 12
            });
        }

        if (/\b(dear customer|dear user|valued customer)\b/i.test(text)) {
            score += 6;
            indicators.push({
                title: "Generic greeting",
                explanation: "Generic greetings can occur in phishing emails, although legitimate bulk messages use them too.",
                points: 6
            });
        }

        if (/\b(guaranteed prize|you have won|claim your reward|free money)\b/i.test(text)) {
            score += 15;
            indicators.push({
                title: "Unexpected prize or reward",
                explanation: "Unsolicited rewards may be used to lure people into sharing information or paying fees.",
                points: 15
            });
        }

        score = Math.min(100, score);

        let level, summary, color;
        if (score >= 60) {
            level = "High risk";
            summary = "Several warning signs were detected. Treat the message cautiously.";
            color = "#ff6b83";
        } else if (score >= 30) {
            level = "Medium risk";
            summary = "Some warning signs were detected. Verify the sender and claims independently.";
            color = "#ffad66";
        } else {
            level = "Lower detected risk";
            summary = "Few indicators were detected. This does not mean the email is safe.";
            color = "#45d6a0";
        }

        $("#phishingPlaceholder").classList.add("hidden");
        $("#phishingResults").classList.remove("hidden");
        $("#riskScore").textContent = score;
        $("#riskScore").style.borderColor = color;
        $("#riskScore").style.color = color;
        $("#riskLevel").textContent = level;
        $("#riskLevel").style.color = color;
        $("#riskSummary").textContent = summary;
        $("#riskMeterFill").style.width = score + "%";
        $("#riskMeterFill").style.background = color;

        $("#phishingIndicators").innerHTML = indicators.length
            ? indicators.map(item => `
                <div class="indicator-item">
                    <span style="color:${color}">⚠</span>
                    <div><strong>${escapeHTML(item.title)}</strong>
                        <p>${escapeHTML(item.explanation)}</p></div>
                </div>
            `).join("")
            : `<div class="indicator-item"><span style="color:#45d6a0">✓</span><div>
                <strong>No configured warning patterns detected</strong>
                <p>Automated checks can miss sophisticated phishing. Continue to verify unexpected messages.</p>
            </div></div>`;

        showToast("Email text analysis completed.");
    });

    // --------------------------------------------------
    // PASSWORD STRENGTH CHECKER
    // --------------------------------------------------

    const passwordInput = $("#passwordInput");

    $("#togglePassword").addEventListener("click", function() {
        const visible = passwordInput.type === "password";
        passwordInput.type = visible ? "text" : "password";
        this.textContent = visible ? "Hide" : "Show";
        this.setAttribute("aria-label", visible ? "Hide password" : "Show password");
    });

    const passwordRules = [
        { label: "At least 12 characters", test: value => value.length >= 12 },
        { label: "Includes lowercase letters", test: value => /[a-z]/.test(value) },
        { label: "Includes uppercase letters", test: value => /[A-Z]/.test(value) },
        { label: "Includes numbers", test: value => /\d/.test(value) },
        { label: "Includes symbols", test: value => /[^A-Za-z0-9]/.test(value) },
        {
            label: "Avoids common or predictable patterns", test: value => {
                const lower = value.toLowerCase();
                const common = [
                    "password", "qwerty", "letmein", "welcome",
                    "admin", "123456", "iloveyou"
                ];
                return !common.some(item => lower.includes(item))
                    && !/(.)\1{3,}/i.test(value)
                    && !/1234|2345|3456|4567|5678|6789|abcd|qwer/i.test(lower);
            }
        }
    ];

    function checkPassword() {
        const value = passwordInput.value;
        const checks = passwordRules.map(rule => ({
            label: rule.label,
            pass: rule.test(value)
        }));

        let score = 0;
        if (value.length >= 8) score += 15;
        if (value.length >= 12) score += 20;
        if (value.length >= 16) score += 10;
        if (/[a-z]/.test(value)) score += 10;
        if (/[A-Z]/.test(value)) score += 10;
        if (/\d/.test(value)) score += 10;
        if (/[^A-Za-z0-9]/.test(value)) score += 15;
        if (checks[5].pass) score += 10;
        score = Math.min(100, score);

        if (!value) score = 0;

        let label = "Very weak";
        let color = "#ff6b83";
        if (score >= 85) { label = "Strong"; color = "#45d6a0"; }
        else if (score >= 65) { label = "Good"; color = "#45d8e8"; }
        else if (score >= 40) { label = "Fair"; color = "#f5d46c"; }
        else if (score >= 20) { label = "Weak"; color = "#ffad66"; }
        if (!value) { label = "Not tested"; color = "#8b91ae"; }

        $("#strengthLabel").textContent = label;
        $("#strengthLabel").style.color = color;
        $("#passwordScore").textContent = `${score} / 100`;
        $("#strengthFill").style.width = score + "%";
        $("#strengthFill").style.background = color;

        $("#passwordChecks").innerHTML = checks.map(item => `
            <div class="check-item ${item.pass ? "pass" : ""}">
                <span class="check-mark">${item.pass ? "✓" : "·"}</span>
                <span>${escapeHTML(item.label)}</span>
            </div>
        `).join("");

        let tip = "Use a long, unique passphrase and avoid personal information.";
        if (value.length > 0 && !checks[0].pass) {
            tip = "Try a longer passphrase made from several unrelated words.";
        } else if (value.length > 0 && !checks[5].pass) {
            tip = "Avoid common passwords, repeated characters and predictable sequences.";
        } else if (score >= 85) {
            tip = "Good result under these simple rules. Use this password for only one account and store it safely in a password manager.";
        }

        $("#passwordTip").textContent = tip;
    }

    passwordInput.addEventListener("input", checkPassword);

    // --------------------------------------------------
    // CYBERSECURITY QUIZ
    // --------------------------------------------------

    const questions = [
        {
            question: "You receive an unexpected email asking you to verify your password using a link. What should you do?",
            options: [
                "Click immediately to avoid losing access",
                "Reply with your password",
                "Visit the official website independently and verify the request",
                "Forward it to all your contacts"
            ],
            answer: 2,
            explanation: "Do not use unexpected links to verify accounts. Visit the official website using a known address or contact the organisation through a trusted channel."
        },
        {
            question: "What is multi-factor authentication (MFA)?",
            options: [
                "Using the same password on multiple sites",
                "Using two or more different types of verification",
                "Changing your username every day",
                "Installing several browsers"
            ],
            answer: 1,
            explanation: "MFA combines different verification factors, such as something you know and something you have, to make unauthorised access harder."
        },
        {
            question: "Which password practice is safest?",
            options: [
                "Use your birthday",
                "Reuse a memorable password everywhere",
                "Use a unique, long password for each account",
                "Write your password in a public profile"
            ],
            answer: 2,
            explanation: "Unique passwords reduce the damage if one service suffers a breach. A password manager can help you generate and store them."
        },
        {
            question: "What should you do with an unexpected attachment from an unknown sender?",
            options: [
                "Open it to identify the sender",
                "Disable your antivirus first",
                "Forward it to your personal email",
                "Verify the sender and report or delete it if suspicious"
            ],
            answer: 3,
            explanation: "Unexpected attachments may contain malicious content. Verify the message through a separate trusted channel before opening anything."
        },
        {
            question: "What does the principle of least privilege mean?",
            options: [
                "Everyone receives administrator access",
                "Users receive only the access needed for their duties",
                "Passwords are not required",
                "All accounts share one login"
            ],
            answer: 1,
            explanation: "Least privilege limits unnecessary access and helps reduce the impact of mistakes or compromised accounts."
        },
        {
            question: "What is ransomware?",
            options: [
                "A program that encrypts or blocks access to data and demands payment",
                "A safe method of backing up files",
                "A type of screen brightness setting",
                "A password manager"
            ],
            answer: 0,
            explanation: "Ransomware is malicious software that can encrypt or deny access to files or systems and demand a ransom."
        },
        {
            question: "Why are software and security updates important?",
            options: [
                "They always make computers slower",
                "They remove the need for passwords",
                "They can fix known vulnerabilities and bugs",
                "They guarantee that attacks are impossible"
            ],
            answer: 2,
            explanation: "Updates often fix security vulnerabilities. Keeping systems updated reduces exposure but does not eliminate every risk."
        },
        {
            question: "You suspect a work account has been compromised. What is a sensible first response?",
            options: [
                "Ignore it until tomorrow",
                "Delete all company records",
                "Post the account details online",
                "Report it promptly through the approved security process"
            ],
            answer: 3,
            explanation: "Prompt reporting helps the security team investigate, contain potential damage and follow the organisation's incident response procedures."
        }
    ];

    let quizOrder = questions.map((_, index) => index);
    let quizIndex = 0;
    let quizScore = 0;
    let selectedAnswer = null;
    let answered = false;

    function loadQuizStats() {
        try {
            const saved = JSON.parse(localStorage.getItem(QUIZ_KEY) || "{}");

            return {
                best: Number(saved.best) || 0,
                completed: Number(saved.completed) || 0,
                latest: saved.latest === null || saved.latest === undefined
                    ? null
                    : Number.isFinite(Number(saved.latest))
                        ? Number(saved.latest)
                        : null
            };
        } catch {
            return { best: 0, completed: 0, latest: null };
        }
    }
    function saveQuizStats(stats) {
        try {
            localStorage.setItem(QUIZ_KEY, JSON.stringify(stats));
            return true;
        } catch (error) {
            console.error("Quiz progress could not be saved:", error);
            showToast("Quiz completed, but progress could not be saved.");
            return false;
        }
    }

    function renderQuizStats() {
        const stats = loadQuizStats();
        $("#bestQuizScore").textContent = stats.best + "%";
        $("#quizCompletions").textContent = stats.completed;
        $("#latestQuizScore").textContent = stats.latest === null ? "—" : stats.latest + "%";
    }

    function renderQuestion() {
        const question = questions[quizOrder[quizIndex]];
        selectedAnswer = null;
        answered = false;

        $("#quizFinished").classList.add("hidden");
        $("#quizContent").classList.remove("hidden");
        $("#quizProgressText").textContent = `QUESTION ${quizIndex + 1} OF ${questions.length}`;
        $("#quizScoreText").textContent = "Score: " + quizScore;
        $("#quizProgressFill").style.width = (quizIndex / questions.length * 100) + "%";
        $("#quizQuestion").textContent = question.question;
        $("#quizDescription").textContent = "Select one answer.";
        $("#quizFeedback").className = "quiz-feedback hidden";

        $("#quizOptions").innerHTML = question.options.map((option, index) => `
            <button type="button" class="quiz-option" data-answer="${index}">
                <span class="option-letter">${String.fromCharCode(65 + index)}</span>
                <span>${escapeHTML(option)}</span>
            </button>
        `).join("");

        $("#quizNext").disabled = true;
        $("#quizNext").textContent = "Check answer";
    }

    $("#quizOptions").addEventListener("click", function(event) {
        const button = event.target.closest("[data-answer]");
        if (!button || answered) return;

        selectedAnswer = Number(button.dataset.answer);
        $$(".quiz-option").forEach(option => option.classList.remove("selected"));
        button.classList.add("selected");
        $("#quizNext").disabled = false;
    });

    $("#quizNext").addEventListener("click", function() {
        if (!answered) {
            if (selectedAnswer === null) return;

            answered = true;
            const question = questions[quizOrder[quizIndex]];
            const correct = selectedAnswer === question.answer;

            if (correct) quizScore++;

            $$(".quiz-option").forEach((option, index) => {
                option.disabled = true;
                if (index === question.answer) option.classList.add("correct");
                if (index === selectedAnswer && !correct) option.classList.add("incorrect");
            });

            const feedback = $("#quizFeedback");
            feedback.className = "quiz-feedback " +
                (correct ? "correct-feedback" : "wrong-feedback");
            feedback.innerHTML = `<strong>${correct ? "✓ Correct!" : "✕ Not quite."}</strong>
                <p>${escapeHTML(question.explanation)}</p>`;
            feedback.classList.remove("hidden");

            $("#quizScoreText").textContent = "Score: " + quizScore;
            $("#quizProgressFill").style.width =
                ((quizIndex + 1) / questions.length * 100) + "%";

            $("#quizNext").textContent =
                quizIndex === questions.length - 1 ? "View results" : "Next question →";
        } else if (quizIndex < questions.length - 1) {
            quizIndex++;
            renderQuestion();
        } else {
            finishQuiz();
        }
    });

    function finishQuiz() {
        const percentage = Math.round(quizScore / questions.length * 100);
        const stats = loadQuizStats();
        stats.best = Math.max(stats.best, percentage);
        stats.latest = percentage;
        stats.completed++;

        saveQuizStats(stats);
        renderQuizStats();

        $("#quizContent").classList.add("hidden");
        $("#quizFinished").classList.remove("hidden");
        $("#quizFinalScore").textContent =
            `You scored ${quizScore} out of ${questions.length} (${percentage}%).`;

        $("#quizFinalMessage").textContent =
            percentage >= 80 ? "Excellent work! You understand many key security principles."
                : percentage >= 50 ? "Good effort! Review the explanations and practise again."
                    : "Keep learning! Review the explanations and try the quiz again.";

        $("#quizProgressText").textContent = "QUIZ COMPLETED";
        $("#quizProgressFill").style.width = "100%";
    }

    function startQuiz() {
        quizOrder = questions.map((_, index) => index);
        // Fisher-Yates shuffle: each new attempt uses a shuffled question order.
        for (let i = quizOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [quizOrder[i], quizOrder[j]] = [quizOrder[j], quizOrder[i]];
        }
        quizIndex = 0;
        quizScore = 0;
        renderQuestion();
    }

    $("#restartQuiz").addEventListener("click", startQuiz);

    // --------------------------------------------------
    // START THE APPLICATION
    // --------------------------------------------------

    renderActivityChart();

    // Store sample incidents on first launch.
    if (localStorage.getItem(STORAGE_KEY) === null) {
        saveIncidents();
    }

    renderIncidents();
    renderQuizStats();
    checkPassword();
    startQuiz();
});
