
/* =========================================================
   PROFITPILOT
   Main Frontend Application
   ========================================================= */

const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api"
    : "/api";
const AUTH_STORAGE_KEY = "profitpilot_auth";

let authState = {
  token: null,
  user: null
};

let currentReports = [];
let currentAnalytics = null;
let performanceChart = null;

/* =========================================================
   DOM HELPERS
   ========================================================= */

const $ = (id) => document.getElementById(id);

function showElement(element) {
  if (element) {
    element.classList.remove("hidden");
  }
}

function hideElement(element) {
  if (element) {
    element.classList.add("hidden");
  }
}

function setText(id, value) {
  const element = $(id);

  if (element) {
    element.textContent = value ?? "";
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCurrency(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "KSh 0.00";
  }

  return `KSh ${number.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "N/A";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatDateTime(dateValue) {
  if (!dateValue) {
    return "N/A";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* =========================================================
   LOCAL AUTH STORAGE
   ========================================================= */

function saveAuthState() {
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify(authState)
  );
}

function loadAuthState() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!stored) {
      return false;
    }

    const parsed = JSON.parse(stored);

    if (!parsed.token || !parsed.user) {
      return false;
    }

    authState = parsed;

    return true;
  } catch (error) {
    console.error("Failed to load authentication state:", error);

    localStorage.removeItem(AUTH_STORAGE_KEY);

    return false;
  }
}

function clearAuthState() {
  authState = {
    token: null,
    user: null
  };

  localStorage.removeItem(AUTH_STORAGE_KEY);
}

/* =========================================================
   API REQUEST HELPER
   ========================================================= */

async function apiRequest(endpoint, options = {}) {
  const config = {
    method: "GET",
    ...options,
    headers: {
      ...(options.headers || {})
    }
  };

  if (authState.token) {
    config.headers.Authorization = `Bearer ${authState.token}`;
  }

  if (
    config.body &&
    typeof config.body !== "string"
  ) {
    config.headers["Content-Type"] = "application/json";
    config.body = JSON.stringify(config.body);
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      config
    );
  } catch (error) {
    throw new Error(
      "Unable to connect to ProfitPilot. Please check that the server is running."
    );
  }

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (response.status === 401) {
    clearAuthState();

    showAuthScreen();

    throw new Error(
      data.message || "Your session has expired. Please log in again."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message || "Something went wrong. Please try again."
    );
  }

  return data;
}

/* =========================================================
   AUTH SCREEN
   ========================================================= */

function showAuthScreen() {
  const authScreen = $("authScreen");
  const appScreen = $("appScreen");

  showElement(authScreen);
  hideElement(appScreen);

  updateAuthTabs("login");
}

function showAppScreen() {
  const authScreen = $("authScreen");
  const appScreen = $("appScreen");

  hideElement(authScreen);
  showElement(appScreen);
}

/* =========================================================
   AUTH TABS
   ========================================================= */

function updateAuthTabs(activeTab) {
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  document.querySelectorAll(".auth-form").forEach((form) => {
    form.classList.remove("active");
  });

  if (activeTab === "register") {
    $("registerTab")?.classList.add("active");
    $("registerForm")?.classList.add("active");
  } else {
    $("loginTab")?.classList.add("active");
    $("loginForm")?.classList.add("active");
  }
}

/* =========================================================
   REGISTER
   ========================================================= */

async function registerUser(event) {
  event.preventDefault();

  const name = $("registerName")?.value.trim();
  const email = $("registerEmail")?.value.trim();
  const password = $("registerPassword")?.value;
  const message = $("registerMessage");

  if (!name || !email || !password) {
    setFormMessage(
      message,
      "Please complete all required fields.",
      "error"
    );
    return;
  }

  try {
    setFormMessage(
      message,
      "Creating your account...",
      "success"
    );

    const response = await apiRequest("/auth/register", {
      method: "POST",
      body: {
        name,
        email,
        password
      }
    });

    authState = {
      token: response.token,
      user: response.user
    };

    saveAuthState();

    showAppScreen();

    await initializeApplication();

    showNotification(
      "Account created successfully. Welcome to ProfitPilot!",
      "success"
    );

    $("registerForm")?.reset();
  } catch (error) {
    setFormMessage(
      message,
      error.message,
      "error"
    );
  }
}

/* =========================================================
   LOGIN
   ========================================================= */

async function loginUser(event) {
  event.preventDefault();

  const email = $("loginEmail")?.value.trim();
  const password = $("loginPassword")?.value;
  const message = $("loginMessage");

  if (!email || !password) {
    setFormMessage(
      message,
      "Please enter your email and password.",
      "error"
    );
    return;
  }

  try {
    setFormMessage(
      message,
      "Signing you in...",
      "success"
    );

    const response = await apiRequest("/auth/login", {
      method: "POST",
      body: {
        email,
        password
      }
    });

    authState = {
      token: response.token,
      user: response.user
    };

    saveAuthState();

    showAppScreen();

    await initializeApplication();

    showNotification(
      "Welcome back to ProfitPilot!",
      "success"
    );

    $("loginForm")?.reset();
  } catch (error) {
    setFormMessage(
      message,
      error.message,
      "error"
    );
  }
}

/* =========================================================
   LOGOUT
   ========================================================= */

function logoutUser() {
  clearAuthState();

  if (performanceChart) {
    performanceChart.destroy();
    performanceChart = null;
  }

  showAuthScreen();

  showNotification(
    "You have been logged out.",
    "success"
  );
}

/* =========================================================
   FORM MESSAGE
   ========================================================= */

function setFormMessage(element, message, type = "success") {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.className = `form-message ${type}`;
}

/* =========================================================
   NOTIFICATIONS
   ========================================================= */

function showNotification(message, type = "success") {
  let notification = $("globalNotification");

  if (!notification) {
    notification = document.createElement("div");
    notification.id = "globalNotification";

    notification.style.position = "fixed";
    notification.style.top = "20px";
    notification.style.right = "20px";
    notification.style.zIndex = "9999";
    notification.style.maxWidth = "380px";

    document.body.appendChild(notification);
  }

  notification.textContent = message;

  notification.style.padding = "13px 16px";
  notification.style.borderRadius = "10px";
  notification.style.fontWeight = "600";
  notification.style.boxShadow =
    "0 10px 30px rgba(15, 23, 42, 0.15)";

  if (type === "error") {
    notification.style.background = "#fef2f2";
    notification.style.color = "#991b1b";
    notification.style.border = "1px solid #fecaca";
  } else {
    notification.style.background = "#f0fdf4";
    notification.style.color = "#166534";
    notification.style.border = "1px solid #bbf7d0";
  }

  clearTimeout(notification._timer);

  notification._timer = setTimeout(() => {
    notification.remove();
  }, 3500);
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.section;

      if (!target) {
        return;
      }

      navigateToSection(target);
    });
  });
}

function navigateToSection(sectionId) {
  document.querySelectorAll(".page-section").forEach((section) => {
    section.classList.add("hidden");
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
  });

  const section = $(sectionId);

  if (section) {
    section.classList.remove("hidden");
  }

  const activeLink = document.querySelector(
    `.nav-link[data-section="${sectionId}"]`
  );

  activeLink?.classList.add("active");

  if (sectionId === "dashboardSection") {
    loadDashboard();
  }

  if (sectionId === "reportsSection") {
    loadReports();
  }

  if (sectionId === "analyticsSection") {
    loadAnalytics();
  }

  if (sectionId === "profileSection") {
    loadProfile();
  }

  if (sectionId === "plansSection") {
    loadSubscription();
  }

  if (sectionId === "adminSection") {
    loadAdminDashboard();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =========================================================
   USER / PLAN UI
   ========================================================= */

function isPremiumUser() {
  return (
    authState.user &&
    authState.user.plan === "premium" &&
    authState.user.subscriptionStatus === "active"
  );
}

function isAdminUser() {
  return (
    authState.user &&
    authState.user.role === "admin"
  );
}

function updateUserUI() {
  const user = authState.user;

  if (!user) {
    return;
  }

  const premium = isPremiumUser();

  setText(
    "headerPlanBadge",
    premium ? "Premium" : "Free"
  );

  $("headerPlanBadge")?.classList.toggle(
    "premium",
    premium
  );

  $("headerPlanBadge")?.classList.toggle(
    "free",
    !premium
  );

  if ($("adminNav")) {
    if (isAdminUser()) {
      showElement($("adminNav"));
    } else {
      hideElement($("adminNav"));
    }
  }

  updateDashboardPlanUI();
  updateProfileAccountUI();
  updatePremiumUI();
}

/* =========================================================
   DASHBOARD PLAN UI
   ========================================================= */

function updateDashboardPlanUI() {
  const user = authState.user;

  if (!user) {
    return;
  }

  const premium = isPremiumUser();

  setText(
    "dashboardPlanName",
    premium ? "Premium Plan" : "Free Plan"
  );

  setText(
    "dashboardPlanDescription",
    premium
      ? "You have access to all current ProfitPilot premium features."
      : "You are currently using the free ProfitPilot plan."
  );

  const usage = Number(user.reportsThisMonth || 0);

  if (premium) {
    setText(
      "dashboardReportUsage",
      "Unlimited saved reports"
    );
  } else {
    setText(
      "dashboardReportUsage",
      `${usage} / 5 reports used this month`
    );
  }

  const upgradeButton = $("dashboardUpgradeBtn");

  if (upgradeButton) {
    if (premium) {
      upgradeButton.textContent = "Premium Active";
      upgradeButton.disabled = true;
    } else {
      upgradeButton.textContent = "Upgrade to Premium";
      upgradeButton.disabled = false;
    }
  }

  const card = $("dashboardPlanCard");

  if (card) {
    card.classList.toggle("premium", premium);
  }
}

/* =========================================================
   PROFILE ACCOUNT UI
   ========================================================= */

function updateProfileAccountUI() {
  const user = authState.user;

  if (!user) {
    return;
  }

  const premium = isPremiumUser();

  setText(
    "profilePlanName",
    premium ? "Premium" : "Free"
  );

  setText(
    "profilePlanStatus",
    premium
      ? "Active subscription"
      : "Free account"
  );

  setText(
    "profileAccountStatus",
    user.accountStatus || "active"
  );

  setText(
    "profileRole",
    user.role || "user"
  );

  const upgradeButton = $("profileUpgradeBtn");

  if (upgradeButton) {
    if (premium) {
      upgradeButton.textContent = "Premium Active";
      upgradeButton.disabled = true;
    } else {
      upgradeButton.textContent = "Upgrade to Premium";
      upgradeButton.disabled = false;
    }
  }
}

/* =========================================================
   PREMIUM UI
   ========================================================= */

function updatePremiumUI() {
  const premium = isPremiumUser();

  const analyticsNotice = $("analyticsUpgradeNotice");

  if (analyticsNotice) {
    if (premium) {
      hideElement(analyticsNotice);
    } else {
      showElement(analyticsNotice);
    }
  }

  document.querySelectorAll(".premium-feature").forEach((element) => {
    element.classList.toggle("premium-active", premium);
  });
}

/* =========================================================
   DASHBOARD
   ========================================================= */

async function loadDashboard() {
  try {
    const response = await apiRequest("/reports");

    currentReports = response.reports || [];

    updateDashboardStats();
  } catch (error) {
    console.error("Dashboard loading error:", error);
  }
}

function updateDashboardStats() {
  const reports = currentReports;

  const totalReports = reports.length;

  const totalRevenue = reports.reduce(
    (sum, report) => sum + Number(report.revenue || 0),
    0
  );

  const totalProfit = reports.reduce(
    (sum, report) => sum + Number(report.profit || 0),
    0
  );

  const averageMargin =
    totalRevenue > 0
      ? (totalProfit / totalRevenue) * 100
      : 0;

  setText(
    "dashboardTotalReports",
    totalReports
  );

  setText(
    "dashboardTotalRevenue",
    formatCurrency(totalRevenue)
  );

  setText(
    "dashboardTotalProfit",
    formatCurrency(totalProfit)
  );

  setText(
    "dashboardAverageMargin",
    `${averageMargin.toFixed(2)}%`
  );

  updateDashboardPlanUI();
}

/* =========================================================
   CALCULATOR
   ========================================================= */

function calculateProfit() {
  const businessName =
    $("businessName")?.value.trim() || "Unnamed Business";

  const businessType =
    $("businessType")?.value.trim() || "General Business";

  const revenue = Number(
    $("revenue")?.value || 0
  );

  const fixedCosts = Number(
    $("fixedCosts")?.value || 0
  );

  const variableCosts = Number(
    $("variableCosts")?.value || 0
  );

  const breakEven =
    Number($("breakEven")?.value || 0);

  if (
    !Number.isFinite(revenue) ||
    revenue < 0
  ) {
    showNotification(
      "Please enter a valid revenue amount.",
      "error"
    );
    return null;
  }

  if (
    !Number.isFinite(fixedCosts) ||
    fixedCosts < 0
  ) {
    showNotification(
      "Please enter valid fixed costs.",
      "error"
    );
    return null;
  }

  if (
    !Number.isFinite(variableCosts) ||
    variableCosts < 0
  ) {
    showNotification(
      "Please enter valid variable costs.",
      "error"
    );
    return null;
  }

  const totalCosts = fixedCosts + variableCosts;

  const profit = revenue - totalCosts;

  const margin =
    revenue > 0
      ? (profit / revenue) * 100
      : 0;

  const breakEvenRevenue =
    breakEven > 0
      ? breakEven
      : fixedCosts;

  const result = {
    businessName,
    businessType,
    revenue,
    fixedCosts,
    variableCosts,
    totalCosts,
    profit,
    margin,
    breakEvenRevenue
  };

  displayCalculatorResult(result);

  return result;
}

function displayCalculatorResult(result) {
  setText(
    "resultProfit",
    formatCurrency(result.profit)
  );

  setText(
    "resultMargin",
    `${result.margin.toFixed(2)}%`
  );

  setText(
    "resultRevenue",
    formatCurrency(result.revenue)
  );

  setText(
    "resultCosts",
    formatCurrency(result.totalCosts)
  );

  setText(
    "resultBreakEven",
    formatCurrency(result.breakEvenRevenue)
  );

  const resultCard = $("calculatorResultCard");

  if (resultCard) {
    showElement(resultCard);
  }

  const profitElement = $("resultProfit");

  if (profitElement) {
    profitElement.style.color =
      result.profit >= 0
        ? "var(--success)"
        : "var(--danger)";
  }
}

/* =========================================================
   SAVE REPORT
   ========================================================= */

async function saveCurrentReport() {
  const result = calculateProfit();

  if (!result) {
    return;
  }

  const user = authState.user;

  if (!user) {
    return;
  }

  if (
    user.plan !== "premium" &&
    Number(user.reportsThisMonth || 0) >= 5
  ) {
    showNotification(
      "You have reached the free plan's 5-report monthly limit. Upgrade to Premium for unlimited reports.",
      "error"
    );

    navigateToSection("plansSection");

    return;
  }

  try {
    const response = await apiRequest("/reports", {
      method: "POST",
      body: result
    });

    if (response.report) {
      currentReports.unshift(response.report);
    }

    if (response.user) {
      authState.user = response.user;
      saveAuthState();
      updateUserUI();
    }

    showNotification(
      "Report saved successfully.",
      "success"
    );

    updateDashboardStats();
  } catch (error) {
    showNotification(
      error.message,
      "error"
    );
  }
}

/* =========================================================
   REPORTS
   ========================================================= */

async function loadReports() {
  const container = $("reportsList");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      Loading reports...
    </div>
  `;

  try {
    const response = await apiRequest("/reports");

    currentReports = response.reports || [];

    renderReports(currentReports);

    updateDashboardStats();
  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Unable to load reports</h3>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
  }
}

function renderReports(reports) {
  const container = $("reportsList");

  if (!container) {
    return;
  }

  if (!reports.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No reports yet</h3>
        <p>
          Calculate your business performance and save your
          first report.
        </p>
        <button
          class="btn btn-primary"
          onclick="navigateToSection('calculatorSection')"
        >
          Open Calculator
        </button>
      </div>
    `;

    return;
  }

  container.innerHTML = reports
    .map((report) => {
      const profitClass =
        Number(report.profit) >= 0
          ? "var(--success)"
          : "var(--danger)";

      return `
        <article class="report-card">
          <div class="report-card-header">
            <div>
              <h3>
                ${escapeHTML(
                  report.businessName || "Unnamed Business"
                )}
              </h3>

              <div class="report-card-meta">
                ${escapeHTML(
                  report.businessType || "Business"
                )}
                ·
                ${formatDate(report.createdAt)}
              </div>
            </div>

            <div class="report-card-actions">
              <button
                class="btn btn-small btn-outline"
                onclick="downloadReport('${report._id}')"
              >
                Download
              </button>

              <button
                class="btn btn-small btn-danger"
                onclick="deleteReport('${report._id}')"
              >
                Delete
              </button>
            </div>
          </div>

          <div class="report-metrics">
            <div class="report-metric">
              <span>Revenue</span>
              <strong>
                ${formatCurrency(report.revenue)}
              </strong>
            </div>

            <div class="report-metric">
              <span>Total Costs</span>
              <strong>
                ${formatCurrency(report.totalCosts)}
              </strong>
            </div>

            <div class="report-metric">
              <span>Profit</span>
              <strong style="color:${profitClass}">
                ${formatCurrency(report.profit)}
              </strong>
            </div>

            <div class="report-metric">
              <span>Margin</span>
              <strong>
                ${Number(report.margin || 0).toFixed(2)}%
              </strong>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function filterReports() {
  const query =
    $("reportSearch")?.value
      .trim()
      .toLowerCase() || "";

  if (!query) {
    renderReports(currentReports);
    return;
  }

  const filtered = currentReports.filter((report) => {
    return (
      String(report.businessName || "")
        .toLowerCase()
        .includes(query) ||
      String(report.businessType || "")
        .toLowerCase()
        .includes(query)
    );
  });

  renderReports(filtered);
}

async function deleteReport(reportId) {
  if (!reportId) {
    return;
  }

  const confirmed = window.confirm(
    "Delete this report? This action cannot be undone."
  );

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/reports/${reportId}`, {
      method: "DELETE"
    });

    currentReports = currentReports.filter(
      (report) => report._id !== reportId
    );

    renderReports(currentReports);

    updateDashboardStats();

    showNotification(
      "Report deleted.",
      "success"
    );
  } catch (error) {
    showNotification(
      error.message,
      "error"
    );
  }
}

/* =========================================================
   DOWNLOAD REPORT
   ========================================================= */

function downloadReport(reportId) {
  const report = currentReports.find(
    (item) => item._id === reportId
  );

  if (!report) {
    showNotification(
      "Report could not be found.",
      "error"
    );
    return;
  }

  if (!isPremiumUser()) {
    showNotification(
      "Report downloads are available on the Premium plan.",
      "error"
    );

    navigateToSection("plansSection");

    return;
  }

  const content = [
    "PROFITPILOT BUSINESS REPORT",
    "============================",
    "",
    `Business: ${report.businessName || "N/A"}`,
    `Business Type: ${report.businessType || "N/A"}`,
    `Date: ${formatDateTime(report.createdAt)}`,
    "",
    `Revenue: ${formatCurrency(report.revenue)}`,
    `Fixed Costs: ${formatCurrency(report.fixedCosts)}`,
    `Variable Costs: ${formatCurrency(report.variableCosts)}`,
    `Total Costs: ${formatCurrency(report.totalCosts)}`,
    `Profit: ${formatCurrency(report.profit)}`,
    `Profit Margin: ${Number(report.margin || 0).toFixed(2)}%`,
    `Break-even Revenue: ${formatCurrency(
      report.breakEvenRevenue
    )}`,
    "",
    "Generated by ProfitPilot",
    "Know your numbers. Grow your business."
  ].join("\n");

  const blob = new Blob(
    [content],
    {
      type: "text/plain;charset=utf-8"
    }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download =
    `${report.businessName || "profitpilot-report"}-report.txt`;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}

/* =========================================================
   ANALYTICS
   ========================================================= */

async function loadAnalytics() {
  const premium = isPremiumUser();

  if (!premium) {
    renderFreeAnalytics();
    return;
  }

  try {
    const response = await apiRequest("/reports");

    currentReports = response.reports || [];

    currentAnalytics =
      buildAnalytics(currentReports);

    renderAnalytics(currentAnalytics);
  } catch (error) {
    showNotification(
      error.message,
      "error"
    );
  }
}

function buildAnalytics(reports) {
  const totalRevenue = reports.reduce(
    (sum, report) =>
      sum + Number(report.revenue || 0),
    0
  );

  const totalCosts = reports.reduce(
    (sum, report) =>
      sum + Number(report.totalCosts || 0),
    0
  );

  const totalProfit = reports.reduce(
    (sum, report) =>
      sum + Number(report.profit || 0),
    0
  );

  const averageMargin =
    totalRevenue > 0
      ? (totalProfit / totalRevenue) * 100
      : 0;

  const bestReport =
    reports.length > 0
      ? reports.reduce((best, report) => {
          if (!best) {
            return report;
          }

          return Number(report.profit || 0) >
            Number(best.profit || 0)
            ? report
            : best;
        }, null)
      : null;

  return {
    totalRevenue,
    totalCosts,
    totalProfit,
    averageMargin,
    bestReport
  };
}

function renderFreeAnalytics() {
  const notice = $("analyticsUpgradeNotice");

  if (notice) {
    showElement(notice);
  }

  setText(
    "analyticsTotalRevenue",
    "Premium"
  );

  setText(
    "analyticsTotalProfit",
    "Premium"
  );

  setText(
    "analyticsAverageMargin",
    "Premium"
  );

  setText(
    "analyticsBestBusiness",
    "Premium"
  );

  if (performanceChart) {
    performanceChart.destroy();
    performanceChart = null;
  }
}

function renderAnalytics(analytics) {
  hideElement($("analyticsUpgradeNotice"));

  setText(
    "analyticsTotalRevenue",
    formatCurrency(
      analytics.totalRevenue
    )
  );

  setText(
    "analyticsTotalProfit",
    formatCurrency(
      analytics.totalProfit
    )
  );

  setText(
    "analyticsAverageMargin",
    `${analytics.averageMargin.toFixed(2)}%`
  );

  setText(
    "analyticsBestBusiness",
    analytics.bestReport
      ? analytics.bestReport.businessName
      : "No data"
  );

  renderPerformanceChart();

  renderBusinessInsights(analytics);
}

function renderPerformanceChart() {
  const canvas = $("performanceChart");

  if (!canvas || !window.Chart) {
    return;
  }

  if (performanceChart) {
    performanceChart.destroy();
  }

  const sortedReports = [...currentReports]
    .sort(
      (a, b) =>
        new Date(a.createdAt) -
        new Date(b.createdAt)
    )
    .slice(-10);

  const labels = sortedReports.map(
    (report) =>
      report.businessName || "Business"
  );

  const profits = sortedReports.map(
    (report) =>
      Number(report.profit || 0)
  );

  performanceChart = new Chart(
    canvas.getContext("2d"),
    {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Profit",
            data: profits,
            borderWidth: 2,
            tension: 0.25,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    }
  );
}

function renderBusinessInsights(analytics) {
  const container = $("businessInsights");

  if (!container) {
    return;
  }

  const insights = [];

  if (analytics.totalProfit > 0) {
    insights.push({
      title: "Your businesses are profitable",
      text: `Combined profit across your saved reports is ${formatCurrency(
        analytics.totalProfit
      )}.`
    });
  } else if (analytics.totalProfit < 0) {
    insights.push({
      title: "Costs need attention",
      text: "Your saved reports currently show an overall loss. Review your largest expenses."
    });
  } else {
    insights.push({
      title: "Break-even position",
      text: "Your combined saved reports are currently around break-even."
    });
  }

  if (analytics.averageMargin >= 20) {
    insights.push({
      title: "Strong average margin",
      text: `Your average profit margin is ${analytics.averageMargin.toFixed(
        2
      )}%.`
    });
  } else {
    insights.push({
      title: "Margin opportunity",
      text: `Your average margin is ${analytics.averageMargin.toFixed(
        2
      )}%. Look for ways to reduce unnecessary costs or improve pricing.`
    });
  }

  if (analytics.bestReport) {
    insights.push({
      title: "Top-performing report",
      text: `${analytics.bestReport.businessName} currently has the highest reported profit.`
    });
  }

  container.innerHTML = insights
    .map(
      (insight) => `
        <div class="insight-item">
          <strong>${escapeHTML(insight.title)}</strong>
          <span>${escapeHTML(insight.text)}</span>
        </div>
      `
    )
    .join("");
}

/* =========================================================
   PROFILE
   ========================================================= */

async function loadProfile() {
  try {
    const response = await apiRequest("/profile");

    const profile = response.user || response.profile;

    if (!profile) {
      return;
    }

    populateProfileForm(profile);

    authState.user = {
      ...authState.user,
      ...profile
    };

    saveAuthState();

    updateUserUI();
  } catch (error) {
    showNotification(
      error.message,
      "error"
    );
  }
}

function populateProfileForm(profile) {
  setInputValue(
    "profileName",
    profile.name
  );

  setInputValue(
    "profileBusinessName",
    profile.businessName
  );

  setInputValue(
    "profileBusinessType",
    profile.businessType
  );

  setInputValue(
    "profilePhone",
    profile.phone
  );

  setInputValue(
    "profileLocation",
    profile.location
  );

  setInputValue(
    "profileDescription",
    profile.businessDescription
  );
}

function setInputValue(id, value) {
  const element = $(id);

  if (element) {
    element.value = value || "";
  }
}

async function saveProfile(event) {
  event.preventDefault();

  const payload = {
    name:
      $("profileName")?.value.trim() || "",

    businessName:
      $("profileBusinessName")?.value.trim() || "",

    businessType:
      $("profileBusinessType")?.value.trim() || "",

    phone:
      $("profilePhone")?.value.trim() || "",

    location:
      $("profileLocation")?.value.trim() || "",

    businessDescription:
      $("profileDescription")?.value.trim() || ""
  };

  try {
    const response = await apiRequest(
      "/profile",
      {
        method: "PUT",
        body: payload
      }
    );

    const updatedUser =
      response.user || response.profile;

    if (updatedUser) {
      authState.user = {
        ...authState.user,
        ...updatedUser
      };

      saveAuthState();

      updateUserUI();
    }

    showNotification(
      "Profile updated successfully.",
      "success"
    );
  } catch (error) {
    showNotification(
      error.message,
      "error"
    );
  }
}

/* =========================================================
   AUTO-FILL CALCULATOR FROM PROFILE
   ========================================================= */

async function autoFillCalculatorFromProfile() {
  try {
    const response = await apiRequest("/profile");

    const profile =
      response.user || response.profile;

    if (!profile) {
      return;
    }

    if (
      $("businessName") &&
      !$("businessName").value &&
      profile.businessName
    ) {
      $("businessName").value =
        profile.businessName;
    }

    if (
      $("businessType") &&
      !$("businessType").value &&
      profile.businessType
    ) {
      $("businessType").value =
        profile.businessType;
    }
  } catch (error) {
    console.error(
      "Could not auto-fill calculator:",
      error
    );
  }
}

/* =========================================================
   SUBSCRIPTIONS
   ========================================================= */

async function loadSubscription() {
  try {
    const response =
      await apiRequest("/subscription");

    renderSubscription(response);
  } catch (error) {
    showNotification(
      error.message,
      "error"
    );
  }
}

function renderSubscription(data) {
  const premium =
    data.plan === "premium" &&
    data.subscriptionStatus === "active";

  setText(
    "subscriptionCurrentPlan",
    premium ? "Premium" : "Free"
  );

  setText(
    "subscriptionCurrentStatus",
    data.subscriptionStatus || "inactive"
  );

  setText(
    "subscriptionStartDate",
    formatDate(data.subscriptionStartDate)
  );

  setText(
    "subscriptionEndDate",
    formatDate(data.subscriptionEndDate)
  );

  const subscribeButton = $("subscribeBtn");

  if (subscribeButton) {
    if (premium) {
      subscribeButton.textContent =
        "Premium Active";

      subscribeButton.disabled = true;
    } else {
      subscribeButton.textContent =
        "Request Premium";
      subscribeButton.disabled = false;
    }
  }

  const cancelButton =
    $("cancelSubscriptionBtn");

  if (cancelButton) {
    if (premium) {
      showElement(cancelButton);
    } else {
      hideElement(cancelButton);
    }
  }

  renderSubscriptionStatusContent(data);
}

function renderSubscriptionStatusContent(data) {
  const container =
    $("subscriptionStatusContent");

  if (!container) {
    return;
  }

  const status =
    data.subscriptionStatus || "inactive";

  if (
    status === "active" &&
    data.subscriptionEndDate
  ) {
    container.innerHTML = `
      <div class="subscription-status">
        <div>
          <strong>Premium subscription active</strong>
          <small>
            Access available until
            ${formatDate(data.subscriptionEndDate)}
          </small>
        </div>

        <span class="status-pill premium">
          Active
        </span>
      </div>
    `;

    return;
  }

  if (status === "pending") {
    container.innerHTML = `
      <div class="subscription-status">
        <div>
          <strong>Payment verification pending</strong>
          <small>
            Your premium request has been submitted.
            An administrator needs to activate it.
          </small>
        </div>

        <span class="status-pill pending">
          Pending
        </span>
      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="subscription-status">
      <div>
        <strong>Free plan</strong>
        <small>
          Upgrade to Premium when you are ready.
        </small>
      </div>

      <span class="status-pill free">
        Free
      </span>
    </div>
  `;
}

/* =========================================================
   REQUEST PREMIUM
   ========================================================= */

async function requestPremiumSubscription(event) {
  if (event) {
    event.preventDefault();
  }

  const paymentReference =
    $("paymentReference")?.value.trim();

  const message =
    $("subscriptionMessage");

  if (!paymentReference) {
    setFormMessage(
      message,
      "Please enter your payment reference.",
      "error"
    );

    return;
  }

  try {
    setFormMessage(
      message,
      "Submitting your premium request...",
      "success"
    );

    const response =
      await apiRequest(
        "/subscription/subscribe",
        {
          method: "POST",
          body: {
            paymentReference
          }
        }
      );

    if (response.subscription) {
      setFormMessage(
        message,
        "Premium request submitted. Please wait for administrator activation.",
        "success"
      );
    }

    $("subscriptionForm")?.reset();

    await loadSubscription();
  } catch (error) {
    setFormMessage(
      message,
      error.message,
      "error"
    );
  }
}

/* =========================================================
   CANCEL SUBSCRIPTION
   ========================================================= */

async function cancelSubscription() {
  const confirmed = window.confirm(
    "Cancel your Premium subscription? You will keep access until the current subscription end date."
  );

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(
      "/subscription/cancel",
      {
        method: "POST"
      }
    );

    showNotification(
      "Subscription cancellation requested.",
      "success"
    );

    await loadSubscription();

    await loadProfile();
  } catch (error) {
    showNotification(
      error.message,
      "error"
    );
  }
}

/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

async function loadAdminDashboard() {
  if (!isAdminUser()) {
    hideElement($("adminSection"));
    return;
  }

  try {
    await Promise.all([
      loadAdminStats(),
      loadAdminUsers(),
      loadAdminSubscriptions()
    ]);
  } catch (error) {
    showNotification(
      error.message,
      "error"
    );
  }
}

async function loadAdminStats() {
  const response =
    await apiRequest("/admin/stats");

  const stats =
    response.stats || response;

  setText(
    "adminTotalUsers",
    stats.totalUsers || 0
  );

  setText(
    "adminActiveUsers",
    stats.activeUsers || 0
  );

  setText(
    "adminPremiumUsers",
    stats.premiumUsers || 0
  );

  setText(
    "adminTotalReports",
    stats.totalReports || 0
  );
}

async function loadAdminUsers() {
  const container =
    $("adminUsersList");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      Loading users...
    </div>
  `;

  const response =
    await apiRequest("/admin/users");

  const users =
    response.users || [];

  if (!users.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No users found</h3>
        <p>No platform users are currently available.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = users
    .map((user) => {
      const disabled =
        user.accountStatus === "disabled";

      const premium =
        user.plan === "premium";

      return `
        <div class="admin-list-item">
          <div class="admin-list-item-top">
            <div>
              <strong>
                ${escapeHTML(user.name)}
              </strong>

              <small>
                ${escapeHTML(user.email)}
              </small>

              <small>
                ${escapeHTML(
                  user.businessName ||
                    "No business profile"
                )}
              </small>
            </div>

            <div>
              <span class="status-pill ${
                disabled
                  ? "disabled"
                  : "active"
              }">
                ${
                  disabled
                    ? "Disabled"
                    : "Active"
                }
              </span>

              <span class="status-pill ${
                premium
                  ? "premium"
                  : "free"
              }">
                ${
                  premium
                    ? "Premium"
                    : "Free"
                }
              </span>
            </div>
          </div>

          <div class="admin-list-item-actions">
            ${
              disabled
                ? `
                  <button
                    class="btn btn-small btn-success"
                    onclick="restoreUser('${user._id}')"
                  >
                    Restore
                  </button>
                `
                : `
                  ${
                    user._id !== authState.user._id
                      ? `
                        <button
                          class="btn btn-small btn-danger"
                          onclick="disableUser('${user._id}')"
                        >
                          Disable
                        </button>
                      `
                      : `
                        <span class="form-help">
                          Current admin
                        </span>
                      `
                  }
                `
            }

            <button
              class="btn btn-small btn-outline"
              onclick="viewAdminUser('${user._id}')"
            >
              View
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadAdminSubscriptions() {
  const container =
    $("adminSubscriptionsList");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      Loading subscriptions...
    </div>
  `;

  const response =
    await apiRequest("/admin/subscriptions");

  const subscriptions =
    response.subscriptions || [];

  if (!subscriptions.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No subscriptions</h3>
        <p>
          Premium subscription requests will appear here.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = subscriptions
    .map((subscription) => {
      const user =
        subscription.userId || {};

      const status =
        subscription.status || "pending";

      return `
        <div class="admin-list-item">
          <div class="admin-list-item-top">
            <div>
              <strong>
                ${escapeHTML(
                  user.name || "Unknown User"
                )}
              </strong>

              <small>
                ${escapeHTML(
                  user.email || "No email"
                )}
              </small>

              <small>
                Reference:
                ${escapeHTML(
                  subscription.paymentReference ||
                    "N/A"
                )}
              </small>

              <small>
                ${formatDateTime(
                  subscription.createdAt
                )}
              </small>
            </div>

            <span class="status-pill ${escapeHTML(
              status
            )}">
              ${escapeHTML(status)}
            </span>
          </div>

          ${
            status === "pending"
              ? `
                <div class="admin-list-item-actions">
                  <button
                    class="btn btn-small btn-success"
                    onclick="activateSubscription('${subscription._id}')"
                  >
                    Activate Premium
                  </button>
                </div>
              `
              : ""
          }
        </div>
      `;
    })
    .join("");
}

/* =========================================================
   ADMIN USER ACTIONS
   ========================================================= */

async function disableUser(userId) {
  if (!userId) {
    return;
  }

  const confirmed = window.confirm(
    "Disable this user account?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(
      `/admin/users/${userId}/disable`,
      {
        method: "PATCH"
      }
    );

    showNotification(
      "User account disabled.",
      "success"
    );

    await loadAdminDashboard();
  } catch (error) {
    showNotification(
      error.message,
      "error"
    );
  }
}

async function restoreUser(userId) {
  if (!userId) {
    return;
  }

  try {
    await apiRequest(
      `/admin/users/${userId}/restore`,
      {
        method: "PATCH"
      }
    );

    showNotification(
      "User account restored.",
      "success"
    );

    await loadAdminDashboard();
  } catch (error) {
    showNotification(
      error.message,
      "error"
    );
  }
}

async function activateSubscription(
  subscriptionId
) {
  if (!subscriptionId) {
    return;
  }

  const confirmed = window.confirm(
    "Activate Premium for this subscription?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(
      `/admin/subscriptions/${subscriptionId}/activate`,
      {
        method: "PATCH"
      }
    );

    showNotification(
      "Premium subscription activated.",
      "success"
    );

    await loadAdminDashboard();
  } catch (error) {
    showNotification(
      error.message,
      "error"
    );
  }
}

async function viewAdminUser(userId) {
  if (!userId) {
    return;
  }

  try {
    const response =
      await apiRequest(
        `/admin/users/${userId}`
      );

    const user =
      response.user || {};

    const reports =
      response.reports || [];

    const subscriptions =
      response.subscriptions || [];

    const message = [
      `Name: ${user.name || "N/A"}`,
      `Email: ${user.email || "N/A"}`,
      `Business: ${
        user.businessName || "N/A"
      }`,
      `Plan: ${user.plan || "free"}`,
      `Account: ${
        user.accountStatus || "active"
      }`,
      `Reports: ${reports.length}`,
      `Subscriptions: ${subscriptions.length}`
    ].join("\n");

    window.alert(message);
  } catch (error) {
    showNotification(
      error.message,
      "error"
    );
  }
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeApplication() {
  showAppScreen();

  updateUserUI();

  await loadProfile();

  await loadDashboard();

  await autoFillCalculatorFromProfile();

  setupInitialSection();

  if (isAdminUser()) {
    await loadAdminDashboard();
  }
}

function setupInitialSection() {
  const firstSection =
    document.querySelector(".page-section");

  document.querySelectorAll(".page-section").forEach(
    (section) => {
      section.classList.add("hidden");
    }
  );

  const dashboard =
    $("dashboardSection");

  if (dashboard) {
    dashboard.classList.remove("hidden");
  }

  document.querySelectorAll(".nav-link").forEach(
    (link) => {
      link.classList.remove("active");
    }
  );

  const dashboardNav =
    document.querySelector(
      '.nav-link[data-section="dashboardSection"]'
    );

  dashboardNav?.classList.add("active");
}

/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {
  $("loginTab")?.addEventListener(
    "click",
    () => updateAuthTabs("login")
  );

  $("registerTab")?.addEventListener(
    "click",
    () => updateAuthTabs("register")
  );

  $("loginForm")?.addEventListener(
    "submit",
    loginUser
  );

  $("registerForm")?.addEventListener(
    "submit",
    registerUser
  );

  $("logoutBtn")?.addEventListener(
    "click",
    logoutUser
  );

  $("calculateBtn")?.addEventListener(
    "click",
    calculateProfit
  );

  $("saveReportBtn")?.addEventListener(
    "click",
    saveCurrentReport
  );

  $("reportSearch")?.addEventListener(
    "input",
    filterReports
  );

  $("profileForm")?.addEventListener(
    "submit",
    saveProfile
  );

  $("subscriptionForm")?.addEventListener(
    "submit",
    requestPremiumSubscription
  );

  $("cancelSubscriptionBtn")?.addEventListener(
    "click",
    cancelSubscription
  );

  $("subscribeBtn")?.addEventListener(
    "click",
    () => {
      navigateToSection("plansSection");
    }
  );

  $("dashboardUpgradeBtn")?.addEventListener(
    "click",
    () => {
      navigateToSection("plansSection");
    }
  );

  $("analyticsUpgradeBtn")?.addEventListener(
    "click",
    () => {
      navigateToSection("plansSection");
    }
  );

  $("profileUpgradeBtn")?.addEventListener(
    "click",
    () => {
      navigateToSection("plansSection");
    }
  );

  $("refreshAdminBtn")?.addEventListener(
    "click",
    loadAdminDashboard
  );

  setupNavigation();
}

/* =========================================================
   APPLICATION START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    setupEventListeners();

    const authenticated =
      loadAuthState();

    if (!authenticated) {
      showAuthScreen();
      return;
    }

    try {
      await initializeApplication();
    } catch (error) {
      console.error(
        "Application initialization error:",
        error
      );

      showNotification(
        error.message ||
          "Unable to initialize ProfitPilot.",
        "error"
      );
    }
  }
);

/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.navigateToSection =
  navigateToSection;

window.deleteReport =
  deleteReport;

window.downloadReport =
  downloadReport;

window.disableUser =
  disableUser;

window.restoreUser =
  restoreUser;

window.activateSubscription =
  activateSubscription;

window.viewAdminUser =
  viewAdminUser;
