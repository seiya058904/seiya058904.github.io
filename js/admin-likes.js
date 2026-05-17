const ADMIN_API_PROD_BASE = "https://ppt-likes-api.seiya-api.workers.dev";
const ADMIN_API_LOCAL_BASES = [
  "http://127.0.0.1:8787",
  "http://127.0.0.1:8788",
  "http://localhost:8787",
  "http://localhost:8788",
];

const ADMIN_TOKEN_KEY = "mpw-admin-token-v1";
const ADMIN_COUNT_MIN = 0;
const ADMIN_COUNT_MAX = 999999;
const ROW_STATE_CLEAR_DELAY = 1800;

const loginPanel = document.getElementById("loginPanel");
const dashboardPanel = document.getElementById("dashboardPanel");
const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("passwordInput");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const refreshButton = document.getElementById("refreshButton");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const positiveOnlyToggle = document.getElementById("positiveOnlyToggle");
const statusBar = document.getElementById("statusBar");
const likesTableBody = document.getElementById("likesTableBody");
const likesRowTemplate = document.getElementById("likesRowTemplate");

let adminItems = [];
let currentSearchTerm = "";
let currentSortMode = "count-desc";
let isRefreshing = false;
let resolvedAdminApiBase = null;
let adminApiBasePromise = null;

function isLocalAdminPage() {
  return (
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost" ||
    window.location.protocol === "file:"
  );
}

async function resolveAdminApiBase() {
  if (resolvedAdminApiBase) {
    return resolvedAdminApiBase;
  }

  if (!isLocalAdminPage()) {
    resolvedAdminApiBase = ADMIN_API_PROD_BASE;
    return resolvedAdminApiBase;
  }

  for (const base of ADMIN_API_LOCAL_BASES) {
    try {
      const response = await fetch(`${base}/api/likes`, {
        method: "GET",
      });

      if (response.ok) {
        resolvedAdminApiBase = base;
        return resolvedAdminApiBase;
      }
    } catch {
      // Try the next local port.
    }
  }

  resolvedAdminApiBase = ADMIN_API_LOCAL_BASES[0];
  return resolvedAdminApiBase;
}

async function getAdminApiBase() {
  if (!adminApiBasePromise) {
    adminApiBasePromise = resolveAdminApiBase();
  }

  return adminApiBasePromise;
}

function getStoredAdminToken() {
  try {
    return window.sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredAdminToken(token) {
  try {
    if (token) {
      window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch {
    // Ignore storage failures.
  }
}

function setStatus(message = "", tone = "") {
  statusBar.textContent = message;

  if (tone) {
    statusBar.dataset.tone = tone;
  } else {
    delete statusBar.dataset.tone;
  }
}

function setToolbarBusy(busy, message = "") {
  isRefreshing = busy;
  refreshButton.disabled = busy;
  searchInput.disabled = busy;
  sortSelect.disabled = busy;
  positiveOnlyToggle.disabled = busy;

  refreshButton.classList.toggle("busy", busy);
  searchInput.classList.toggle("busy", busy);

  if (message) {
    setStatus(message);
  }
}

function showLoginView() {
  loginPanel.hidden = false;
  dashboardPanel.hidden = true;
  logoutButton.hidden = true;
  refreshButton.disabled = true;
  searchInput.disabled = true;
  sortSelect.disabled = true;
  positiveOnlyToggle.disabled = true;
}

function showDashboardView() {
  loginPanel.hidden = true;
  dashboardPanel.hidden = false;
  logoutButton.hidden = false;
  refreshButton.disabled = false;
  searchInput.disabled = false;
  sortSelect.disabled = false;
  positiveOnlyToggle.disabled = false;
}

function sanitizeAdminCount(value) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isInteger(parsed) ? parsed : null;
  }

  return null;
}

function validateCount(value) {
  const parsed = sanitizeAdminCount(value);

  if (parsed === null) {
    return { valid: false, message: "请输入整数" };
  }

  if (parsed < ADMIN_COUNT_MIN) {
    return { valid: false, message: "不能小于 0" };
  }

  if (parsed > ADMIN_COUNT_MAX) {
    return { valid: false, message: `不能大于 ${ADMIN_COUNT_MAX}` };
  }

  return { valid: true, value: parsed };
}

function sortItems(items) {
  const nextItems = [...items];

  nextItems.sort((a, b) => {
    if (currentSortMode === "count-asc") {
      return a.count - b.count || a.itemId.localeCompare(b.itemId);
    }

    if (currentSortMode === "item-asc") {
      return a.itemId.localeCompare(b.itemId);
    }

    return b.count - a.count || a.itemId.localeCompare(b.itemId);
  });

  return nextItems;
}

function getVisibleItems() {
  const keyword = currentSearchTerm.trim().toLowerCase();
  return sortItems(adminItems).filter((item) => {
    if (positiveOnlyToggle.checked && item.count <= 0) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return item.itemId.includes(keyword);
  });
}

function setRowState(row, state, text = "") {
  if (!(row instanceof HTMLTableRowElement)) {
    return;
  }

  row.dataset.state = state;
  const stateNode = row.querySelector(".row-state");
  if (stateNode) {
    stateNode.textContent = text;
  }
}

function clearRowStateLater(row) {
  window.setTimeout(() => {
    if (!(row instanceof HTMLTableRowElement)) {
      return;
    }

    if (row.dataset.state === "saved") {
      setRowState(row, "idle", "");
    }
  }, ROW_STATE_CLEAR_DELAY);
}

function renderTable() {
  likesTableBody.innerHTML = "";
  const visibleItems = getVisibleItems();

  if (visibleItems.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = '<td colspan="3">没有匹配的数据</td>';
    likesTableBody.appendChild(emptyRow);
    return;
  }

  visibleItems.forEach((item) => {
    const row = likesRowTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.itemId = item.itemId;
    row.dataset.initialCount = String(item.count);
    row.dataset.state = "idle";

    row.querySelector(".likes-item-id").textContent = item.itemId;

    const countInput = row.querySelector(".count-input");
    countInput.value = String(item.count);
    countInput.min = String(ADMIN_COUNT_MIN);
    countInput.max = String(ADMIN_COUNT_MAX);

    const resetButton = row.querySelector('[data-action="reset"]');
    resetButton.dataset.tone = "danger";

    likesTableBody.appendChild(row);
  });
}

async function requestAdmin(path, init = {}) {
  const adminApiBase = await getAdminApiBase();
  const token = getStoredAdminToken();
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${adminApiBase}${path}`, {
    ...init,
    headers,
  });

  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return payload;
}

async function loginAdmin(password) {
  return requestAdmin("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

async function fetchAdminLikes() {
  return requestAdmin("/api/admin/likes", {
    method: "GET",
  });
}

async function setAdminLikeCount(itemId, count) {
  return requestAdmin("/api/admin/likes/set", {
    method: "POST",
    body: JSON.stringify({ itemId, count }),
  });
}

async function resetAdminLikeCount(itemId) {
  return requestAdmin("/api/admin/likes/reset", {
    method: "POST",
    body: JSON.stringify({ itemId }),
  });
}

async function loadAdminLikes(message = "Loading data") {
  try {
    setToolbarBusy(true, message);
    const payload = await fetchAdminLikes();
    adminItems = Array.isArray(payload?.items)
      ? payload.items.map((item) => ({
          itemId: String(item.itemId),
          count: Number.isFinite(item.count) ? item.count : 0,
        }))
      : [];
    renderTable();
    setStatus("数据已刷新", "success");
  } catch (error) {
    if (error.status === 401) {
      setStoredAdminToken("");
      showLoginView();
      setStatus("登录已失效，请重新输入密码", "error");
      return;
    }

    setStatus(`读取失败：${error.message}`, "error");
  } finally {
    setToolbarBusy(false);
  }
}

function handleSearchUpdate() {
  searchInput.classList.add("busy");
  currentSearchTerm = searchInput.value.trim().toLowerCase();

  window.requestAnimationFrame(() => {
    renderTable();
    searchInput.classList.remove("busy");
  });
}

function handleSortUpdate() {
  currentSortMode = sortSelect.value;
  renderTable();
}

function updateLocalRowData(itemId, count) {
  adminItems = adminItems.map((item) => (item.itemId === itemId ? { ...item, count } : item));
}

async function handleSaveRow(row) {
  const itemId = row.dataset.itemId;
  const countInput = row.querySelector(".count-input");
  const hint = row.querySelector(".row-hint");
  const saveButton = row.querySelector('[data-action="save"]');
  const resetButton = row.querySelector('[data-action="reset"]');

  const validation = validateCount(countInput.value);
  if (!validation.valid) {
    hint.hidden = false;
    hint.textContent = validation.message;
    setRowState(row, "editing", "");
    return;
  }

  hint.hidden = true;
  countInput.disabled = true;
  saveButton.disabled = true;
  resetButton.disabled = true;
  setRowState(row, "saving", "Saving");

  try {
    const payload = await setAdminLikeCount(itemId, validation.value);
    updateLocalRowData(itemId, payload.count);
    row.dataset.initialCount = String(payload.count);
    countInput.value = String(payload.count);
    setRowState(row, "saved", "Saved");
    setStatus(`已保存 ${itemId}`, "success");
    clearRowStateLater(row);
  } catch (error) {
    if (error.status === 401) {
      setStoredAdminToken("");
      showLoginView();
      setStatus("登录已失效，请重新输入密码", "error");
      return;
    }

    hint.hidden = false;
    hint.textContent = error.message;
    setRowState(row, "error", "Error");
    setStatus(`保存失败：${error.message}`, "error");
  } finally {
    countInput.disabled = false;
    saveButton.disabled = false;
    resetButton.disabled = false;
  }
}

async function handleResetRow(row) {
  const itemId = row.dataset.itemId;
  const countInput = row.querySelector(".count-input");
  const hint = row.querySelector(".row-hint");
  const saveButton = row.querySelector('[data-action="save"]');
  const resetButton = row.querySelector('[data-action="reset"]');

  const confirmed = window.confirm(`确认将 ${itemId} 的点赞数重置为 0 吗？`);
  if (!confirmed) {
    setStatus("Reset cancelled");
    return;
  }

  hint.hidden = true;
  countInput.disabled = true;
  saveButton.disabled = true;
  resetButton.disabled = true;
  setRowState(row, "saving", "Resetting");

  try {
    const payload = await resetAdminLikeCount(itemId);
    updateLocalRowData(itemId, payload.count);
    row.dataset.initialCount = "0";
    countInput.value = "0";
    setRowState(row, "saved", "Saved");
    setStatus(`已重置 ${itemId}`, "success");
    clearRowStateLater(row);
  } catch (error) {
    if (error.status === 401) {
      setStoredAdminToken("");
      showLoginView();
      setStatus("登录已失效，请重新输入密码", "error");
      return;
    }

    hint.hidden = false;
    hint.textContent = error.message;
    setRowState(row, "error", "Error");
    setStatus(`重置失败：${error.message}`, "error");
  } finally {
    countInput.disabled = false;
    saveButton.disabled = false;
    resetButton.disabled = false;
  }
}

async function bootstrapAdmin() {
  const existingToken = getStoredAdminToken();

  if (!existingToken) {
    showLoginView();
    return;
  }

  showDashboardView();
  await loadAdminLikes("Loading dashboard");
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = passwordInput.value.trim();
  if (!password) {
    setStatus("请输入密码", "error");
    return;
  }

  loginButton.disabled = true;
  loginButton.classList.add("busy");
  setStatus("Logging in");

  try {
    const payload = await loginAdmin(password);
    setStoredAdminToken(payload.token);
    passwordInput.value = "";
    showDashboardView();
    setStatus("登录成功", "success");
    await loadAdminLikes("Loading dashboard");
  } catch (error) {
    setStatus(`登录失败：${error.message}`, "error");
  } finally {
    loginButton.disabled = false;
    loginButton.classList.remove("busy");
  }
});

logoutButton?.addEventListener("click", () => {
  setStoredAdminToken("");
  adminItems = [];
  renderTable();
  showLoginView();
  setStatus("已退出后台");
});

refreshButton?.addEventListener("click", async () => {
  if (isRefreshing) {
    return;
  }

  await loadAdminLikes("Refreshing");
});

searchInput?.addEventListener("input", handleSearchUpdate);
sortSelect?.addEventListener("change", handleSortUpdate);
positiveOnlyToggle?.addEventListener("change", renderTable);

likesTableBody?.addEventListener("input", (event) => {
  const input = event.target.closest(".count-input");
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const row = input.closest(".likes-row");
  if (!(row instanceof HTMLTableRowElement)) {
    return;
  }

  const hint = row.querySelector(".row-hint");
  const validation = validateCount(input.value);

  if (!validation.valid) {
    hint.hidden = false;
    hint.textContent = validation.message;
  } else {
    hint.hidden = true;
  }

  setRowState(row, "editing", "");
});

likesTableBody?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const row = button.closest(".likes-row");
  if (!(row instanceof HTMLTableRowElement)) {
    return;
  }

  if (button.dataset.action === "save") {
    await handleSaveRow(row);
    return;
  }

  if (button.dataset.action === "reset") {
    await handleResetRow(row);
  }
});

bootstrapAdmin();
