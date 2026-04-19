const STORAGE_KEY = "budget_app_expenses";
const OTHER_INCOME_STORAGE_KEY = "budget_app_other_incomes";
const PROFILE_STORAGE_KEY = "budget_app_profile";
const THEME_STORAGE_KEY = "budget_app_theme";
const MAX_PAST_MONTHS = 3;

// Inputs and display elements
const hourlyWageInput = document.getElementById("hourlyWage");
const hoursPerWeekInput = document.getElementById("hoursPerWeek");
const weeklyIncomeDisplay = document.getElementById("weeklyIncome");
const monthlyIncomeDisplay = document.getElementById("monthlyIncome");
const otherIncomeTotalDisplay = document.getElementById("otherIncomeTotal");
const totalMonthlyIncomeDisplay = document.getElementById("totalMonthlyIncome");

const otherIncomeForm = document.getElementById("otherIncomeForm");
const otherIncomeNameInput = document.getElementById("otherIncomeName");
const otherIncomeFrequencyInput = document.getElementById("otherIncomeFrequency");
const otherIncomeAmountInput = document.getElementById("otherIncomeAmount");
const otherIncomeError = document.getElementById("otherIncomeError");
const otherIncomeList = document.getElementById("otherIncomeList");
const otherIncomeEmpty = document.getElementById("otherIncomeEmpty");

const expenseForm = document.getElementById("expenseForm");
const expenseNameInput = document.getElementById("expenseName");
const expenseCategoryInput = document.getElementById("expenseCategory");
const expenseAmountInput = document.getElementById("expenseAmount");
const categorySuggestions = document.getElementById("categorySuggestions");
const errorMessage = document.getElementById("errorMessage");

const expenseList = document.getElementById("expenseList");
const emptyState = document.getElementById("emptyState");

const savingsGoalInput = document.getElementById("savingsGoal");
const totalSpentDisplay = document.getElementById("totalSpent");
const remainingMoneyDisplay = document.getElementById("remainingMoney");
const safeToSpendDisplay = document.getElementById("safeToSpend");
const expenseChartCanvas = document.getElementById("expenseChart");
const chartLegend = document.getElementById("chartLegend");
const chartEmpty = document.getElementById("chartEmpty");

const historyMonthSelect = document.getElementById("historyMonthSelect");
const historyTotal = document.getElementById("historyTotal");
const historyList = document.getElementById("historyList");
const historyEmpty = document.getElementById("historyEmpty");

const tabButtons = document.querySelectorAll(".tab-btn");
const pages = document.querySelectorAll(".view");
const themeToggleButton = document.getElementById("themeToggle");

let expenses = pruneExpenses(loadExpenses());
let otherIncomes = loadOtherIncomes();

const CHART_COLORS = [
  "#0b7a75",
  "#2563eb",
  "#ea580c",
  "#7c3aed",
  "#be123c",
  "#0891b2",
  "#65a30d",
  "#b45309",
];

loadProfileInputs();
initializeTheme();
saveExpenses();

function toCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function parsePositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeIncomeFrequency(value) {
  return value === "recurring" ? "recurring" : "one-time";
}

function padMonth(value) {
  return String(value).padStart(2, "0");
}

function getMonthKey(dateObject = new Date()) {
  const year = dateObject.getFullYear();
  const month = dateObject.getMonth() + 1;
  return `${year}-${padMonth(month)}`;
}

function getAllowedMonthKeys() {
  const keys = [];
  const baseDate = new Date();

  for (let offset = 0; offset <= MAX_PAST_MONTHS; offset += 1) {
    const monthDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - offset, 1);
    keys.push(getMonthKey(monthDate));
  }

  return keys;
}

function getMonthLabel(monthKey) {
  const [yearString, monthString] = monthKey.split("-");
  const year = Number(yearString);
  const monthIndex = Number(monthString) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return monthKey;
  }

  const date = new Date(year, monthIndex, 1);
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function pruneExpenses(expenseItems) {
  const allowedKeys = new Set(getAllowedMonthKeys());
  return expenseItems.filter((expense) => allowedKeys.has(expense.monthKey));
}

function getCurrentMonthExpenses() {
  const currentMonthKey = getMonthKey();
  return expenses.filter((expense) => expense.monthKey === currentMonthKey);
}

function getExpensesByMonth(monthKey) {
  return expenses.filter((expense) => expense.monthKey === monthKey);
}

function getMonthlyIncome() {
  const weeklyIncome = getWeeklyIncome();
  return weeklyIncome * 4;
}

function getOtherIncomeTotal() {
  return otherIncomes.reduce((total, income) => total + income.amount, 0);
}

function getTotalMonthlyIncome() {
  return getMonthlyIncome() + getOtherIncomeTotal();
}

function getWeeklyIncome() {
  const wage = parsePositiveNumber(hourlyWageInput.value);
  const hours = parsePositiveNumber(hoursPerWeekInput.value);

  if (wage === null || hours === null) {
    return 0;
  }

  return wage * hours;
}

function getSavingsGoal() {
  const goal = parsePositiveNumber(savingsGoalInput.value);
  return goal === null ? 0 : goal;
}

function getTotalExpenses() {
  return getCurrentMonthExpenses().reduce((total, expense) => total + expense.amount, 0);
}

function saveExpenses() {
  expenses = pruneExpenses(expenses);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function saveOtherIncomes() {
  localStorage.setItem(OTHER_INCOME_STORAGE_KEY, JSON.stringify(otherIncomes));
}

function saveProfileInputs() {
  const profile = {
    hourlyWage: hourlyWageInput.value,
    hoursPerWeek: hoursPerWeekInput.value,
    savingsGoal: savingsGoalInput.value,
  };

  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function loadProfileInputs() {
  const storedData = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!storedData) {
    return;
  }

  try {
    const profile = JSON.parse(storedData);
    if (!profile || typeof profile !== "object") {
      return;
    }

    if (typeof profile.hourlyWage === "string") {
      hourlyWageInput.value = profile.hourlyWage;
    }

    if (typeof profile.hoursPerWeek === "string") {
      hoursPerWeekInput.value = profile.hoursPerWeek;
    }

    if (typeof profile.savingsGoal === "string") {
      savingsGoalInput.value = profile.savingsGoal;
    }
  } catch {
    // Ignore invalid saved profile data.
  }
}

function loadExpenses() {
  const storedData = localStorage.getItem(STORAGE_KEY);
  if (!storedData) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedData);

    return Array.isArray(parsed)
      ? parsed
          .filter(
            (item) =>
              item &&
              typeof item.id === "number" &&
              typeof item.name === "string" &&
              typeof item.amount === "number" &&
              item.amount >= 0
          )
          .map((item) => ({
            id: item.id,
            name: item.name,
            amount: item.amount,
            category:
              typeof item.category === "string" && item.category.trim()
                ? item.category.trim()
                : "Uncategorized",
            monthKey:
              typeof item.monthKey === "string" && /^\d{4}-\d{2}$/.test(item.monthKey)
                ? item.monthKey
                : getMonthKey(),
          }))
      : [];
  } catch {
    return [];
  }
}

function getExpenseCategoryTotals() {
  const totals = {};

  getCurrentMonthExpenses().forEach((expense) => {
    const category =
      typeof expense.category === "string" && expense.category.trim()
        ? expense.category.trim()
        : "Uncategorized";
    totals[category] = (totals[category] || 0) + expense.amount;
  });

  return Object.entries(totals).sort((a, b) => b[1] - a[1]);
}

function getChartColor(index) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

function renderCategorySuggestions() {
  const uniqueCategories = [...new Set(expenses.map((expense) => expense.category))]
    .filter((category) => typeof category === "string" && category.trim())
    .sort((a, b) => a.localeCompare(b));

  categorySuggestions.innerHTML = "";

  uniqueCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    categorySuggestions.appendChild(option);
  });
}

function loadOtherIncomes() {
  const storedData = localStorage.getItem(OTHER_INCOME_STORAGE_KEY);
  if (!storedData) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedData);
    return Array.isArray(parsed)
      ? parsed
          .filter(
            (item) =>
              item &&
              typeof item.id === "number" &&
              typeof item.name === "string" &&
              typeof item.amount === "number" &&
              item.amount > 0
          )
          .map((item) => ({
            id: item.id,
            name: item.name,
            amount: item.amount,
            frequency: normalizeIncomeFrequency(item.frequency),
          }))
      : [];
  } catch {
    return [];
  }
}

function renderExpenseList() {
  const monthExpenses = getCurrentMonthExpenses();
  expenseList.innerHTML = "";

  if (monthExpenses.length === 0) {
    emptyState.style.display = "block";
    renderCategorySuggestions();
    return;
  }

  emptyState.style.display = "none";

  monthExpenses.forEach((expense) => {
    const item = document.createElement("li");
    item.className = "expense-item";

    const info = document.createElement("div");
    info.className = "expense-info";

    const textWrap = document.createElement("div");
    textWrap.className = "expense-text";

    const name = document.createElement("span");
    name.className = "expense-name";
    name.textContent = expense.name;

    const category = document.createElement("span");
    category.className = "expense-category";
    category.textContent = expense.category || "Uncategorized";

    const amount = document.createElement("span");
    amount.className = "expense-amount";
    amount.textContent = toCurrency(expense.amount);

    textWrap.append(name, category);
    info.append(textWrap, amount);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      deleteExpense(expense.id);
    });

    item.append(info, deleteButton);
    expenseList.appendChild(item);
  });

  renderCategorySuggestions();
}

function renderOtherIncomeList() {
  otherIncomeList.innerHTML = "";

  if (otherIncomes.length === 0) {
    otherIncomeEmpty.style.display = "block";
    return;
  }

  otherIncomeEmpty.style.display = "none";

  otherIncomes.forEach((income) => {
    const item = document.createElement("li");
    item.className = "expense-item";

    const info = document.createElement("div");
    info.className = "expense-info";

    const textWrap = document.createElement("div");
    textWrap.className = "expense-text";

    const name = document.createElement("span");
    name.className = "expense-name";
    name.textContent = income.name;

    const frequency = document.createElement("span");
    frequency.className = "expense-category";
    frequency.textContent =
      income.frequency === "recurring" ? "Monthly recurring" : "One-time";

    const amount = document.createElement("span");
    amount.className = "expense-amount";
    amount.textContent = toCurrency(income.amount);

    textWrap.append(name, frequency);
    info.append(textWrap, amount);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      deleteOtherIncome(income.id);
    });

    item.append(info, deleteButton);
    otherIncomeList.appendChild(item);
  });
}

function updateSummary() {
  saveExpenses();

  const weeklyIncome = getWeeklyIncome();
  const monthlyIncome = getMonthlyIncome();
  const otherIncomeTotal = getOtherIncomeTotal();
  const totalMonthlyIncome = getTotalMonthlyIncome();
  const totalSpent = getTotalExpenses();
  const remainingMoney = totalMonthlyIncome - totalSpent;
  const safeToSpend = remainingMoney - getSavingsGoal();

  weeklyIncomeDisplay.textContent = toCurrency(weeklyIncome);
  monthlyIncomeDisplay.textContent = toCurrency(monthlyIncome);
  otherIncomeTotalDisplay.textContent = toCurrency(otherIncomeTotal);
  totalMonthlyIncomeDisplay.textContent = toCurrency(totalMonthlyIncome);
  totalSpentDisplay.textContent = toCurrency(totalSpent);
  remainingMoneyDisplay.textContent = toCurrency(remainingMoney);
  safeToSpendDisplay.textContent = toCurrency(safeToSpend);

  remainingMoneyDisplay.style.color = remainingMoney < 0 ? "var(--danger)" : "var(--text)";
  safeToSpendDisplay.style.color = safeToSpend < 0 ? "var(--danger)" : "var(--text)";

  renderExpenseChart();
  renderHistoryMonthOptions();
}

function showError(message) {
  errorMessage.textContent = message;
}

function clearError() {
  errorMessage.textContent = "";
}

function addExpense(event) {
  event.preventDefault();

  const name = expenseNameInput.value.trim();
  const category = expenseCategoryInput.value.trim();
  const amount = parsePositiveNumber(expenseAmountInput.value);

  if (!name) {
    showError("Please enter an expense name.");
    return;
  }

  if (amount === null || amount === 0) {
    showError("Please enter a valid expense amount greater than 0.");
    return;
  }

  if (!category) {
    showError("Please enter an expense category.");
    return;
  }

  const newExpense = {
    id: Date.now(),
    name,
    category,
    amount,
    monthKey: getMonthKey(),
  };

  expenses.push(newExpense);
  saveExpenses();

  expenseForm.reset();
  clearError();

  renderExpenseList();
  updateSummary();
}

function showOtherIncomeError(message) {
  otherIncomeError.textContent = message;
}

function clearOtherIncomeError() {
  otherIncomeError.textContent = "";
}

function addOtherIncome(event) {
  event.preventDefault();

  const name = otherIncomeNameInput.value.trim();
  const frequency = normalizeIncomeFrequency(otherIncomeFrequencyInput.value);
  const amount = parsePositiveNumber(otherIncomeAmountInput.value);

  if (!name) {
    showOtherIncomeError("Please enter an income source name.");
    return;
  }

  if (amount === null || amount === 0) {
    showOtherIncomeError("Please enter a valid income amount greater than 0.");
    return;
  }

  const newIncome = {
    id: Date.now(),
    name,
    frequency,
    amount,
  };

  otherIncomes.push(newIncome);
  saveOtherIncomes();
  otherIncomeForm.reset();
  clearOtherIncomeError();
  renderOtherIncomeList();
  updateSummary();
}

function deleteExpense(id) {
  expenses = expenses.filter((expense) => expense.id !== id);
  saveExpenses();
  renderExpenseList();
  updateSummary();
}

function deleteOtherIncome(id) {
  otherIncomes = otherIncomes.filter((income) => income.id !== id);
  saveOtherIncomes();
  renderOtherIncomeList();
  updateSummary();
}

function handleBudgetInputsChange() {
  saveProfileInputs();
  updateSummary();
}

function renderExpenseChart() {
  const totals = getExpenseCategoryTotals();
  chartLegend.innerHTML = "";

  if (totals.length === 0) {
    chartEmpty.style.display = "block";
    expenseChartCanvas.style.display = "none";
    return;
  }

  chartEmpty.style.display = "none";
  expenseChartCanvas.style.display = "block";

  const context = expenseChartCanvas.getContext("2d");
  const chartSize = 240;
  const center = chartSize / 2;
  const radius = 105;
  const totalAmount = totals.reduce((sum, [, amount]) => sum + amount, 0);
  let currentAngle = -Math.PI / 2;

  context.clearRect(0, 0, chartSize, chartSize);

  totals.forEach(([category, amount], index) => {
    const sliceAngle = (amount / totalAmount) * (Math.PI * 2);
    const color = getChartColor(index);

    context.beginPath();
    context.moveTo(center, center);
    context.arc(center, center, radius, currentAngle, currentAngle + sliceAngle);
    context.closePath();
    context.fillStyle = color;
    context.fill();

    currentAngle += sliceAngle;

    const legendItem = document.createElement("li");
    legendItem.className = "chart-legend-item";

    const legendLeft = document.createElement("span");
    legendLeft.className = "legend-left";

    const legendColor = document.createElement("span");
    legendColor.className = "legend-color";
    legendColor.style.backgroundColor = color;

    const legendName = document.createElement("span");
    legendName.textContent = category;

    const legendValue = document.createElement("strong");
    legendValue.textContent = toCurrency(amount);

    legendLeft.append(legendColor, legendName);
    legendItem.append(legendLeft, legendValue);
    chartLegend.appendChild(legendItem);
  });
}

function renderHistoryMonthOptions() {
  if (!historyMonthSelect) {
    return;
  }

  const monthKeys = getAllowedMonthKeys();
  const previousValue = historyMonthSelect.value;
  const currentMonthKey = getMonthKey();

  historyMonthSelect.innerHTML = "";

  monthKeys.forEach((monthKey) => {
    const option = document.createElement("option");
    const label = getMonthLabel(monthKey);
    option.value = monthKey;
    option.textContent = monthKey === currentMonthKey ? `${label} (Current)` : label;
    historyMonthSelect.appendChild(option);
  });

  if (previousValue && monthKeys.includes(previousValue)) {
    historyMonthSelect.value = previousValue;
  } else if (monthKeys[1]) {
    historyMonthSelect.value = monthKeys[1];
  } else {
    historyMonthSelect.value = monthKeys[0];
  }

  renderHistoryList();
}

function renderHistoryList() {
  if (!historyMonthSelect) {
    return;
  }

  const selectedMonth = historyMonthSelect.value;
  const monthExpenses = getExpensesByMonth(selectedMonth);
  historyList.innerHTML = "";

  const total = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  historyTotal.textContent = toCurrency(total);

  if (monthExpenses.length === 0) {
    historyEmpty.style.display = "block";
    return;
  }

  historyEmpty.style.display = "none";

  monthExpenses.forEach((expense) => {
    const item = document.createElement("li");
    item.className = "expense-item";

    const info = document.createElement("div");
    info.className = "expense-info";

    const textWrap = document.createElement("div");
    textWrap.className = "expense-text";

    const name = document.createElement("span");
    name.className = "expense-name";
    name.textContent = expense.name;

    const category = document.createElement("span");
    category.className = "expense-category";
    category.textContent = expense.category || "Uncategorized";

    const amount = document.createElement("span");
    amount.className = "expense-amount";
    amount.textContent = toCurrency(expense.amount);

    textWrap.append(name, category);
    info.append(textWrap, amount);
    item.appendChild(info);
    historyList.appendChild(item);
  });
}

function setActivePage(pageName) {
  pages.forEach((page) => {
    const isActive = page.dataset.page === pageName;
    page.classList.toggle("is-active", isActive);
  });

  tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === pageName;
    button.classList.toggle("is-active", isActive);
    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initialTheme = savedTheme === "dark" || savedTheme === "light"
    ? savedTheme
    : prefersDark
      ? "dark"
      : "light";

  applyTheme(initialTheme);
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.dataset.theme = isDark ? "dark" : "light";

  if (themeToggleButton) {
    themeToggleButton.textContent = isDark ? "Light mode" : "Dark mode";
    themeToggleButton.setAttribute(
      "aria-label",
      isDark ? "Enable light mode" : "Enable dark mode"
    );
  }

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", isDark ? "#0f172a" : "#0b7a75");
  }
}

function toggleTheme() {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

// Recalculate totals as the income and savings inputs change.
hourlyWageInput.addEventListener("input", handleBudgetInputsChange);
hoursPerWeekInput.addEventListener("input", handleBudgetInputsChange);
savingsGoalInput.addEventListener("input", handleBudgetInputsChange);
expenseForm.addEventListener("submit", addExpense);
otherIncomeForm.addEventListener("submit", addOtherIncome);

if (historyMonthSelect) {
  historyMonthSelect.addEventListener("change", renderHistoryList);
}

 tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActivePage(button.dataset.tab);
  });
});

if (themeToggleButton) {
  themeToggleButton.addEventListener("click", toggleTheme);
}

renderExpenseList();
renderOtherIncomeList();
updateSummary();
setActivePage("income");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((registration) => registration.update())
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}
