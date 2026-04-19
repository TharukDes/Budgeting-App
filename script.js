const STORAGE_KEY = "budget_app_expenses";
const OTHER_INCOME_STORAGE_KEY = "budget_app_other_incomes";
const PROFILE_STORAGE_KEY = "budget_app_profile";
const GOALS_STORAGE_KEY = "budget_app_goals";
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

const expenseTemplates = document.getElementById("expenseTemplates");
const expenseSearchInput = document.getElementById("expenseSearch");
const expenseCategoryFilter = document.getElementById("expenseCategoryFilter");
const csvFileInput = document.getElementById("csvFileInput");
const csvImportButton = document.getElementById("csvImportButton");
const csvImportStatus = document.getElementById("csvImportStatus");

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

const goalForm = document.getElementById("goalForm");
const goalNameInput = document.getElementById("goalName");
const goalTargetInput = document.getElementById("goalTarget");
const goalCurrentInput = document.getElementById("goalCurrent");
const goalError = document.getElementById("goalError");
const goalList = document.getElementById("goalList");
const goalEmpty = document.getElementById("goalEmpty");

const editExpenseModal = document.getElementById("editExpenseModal");
const editExpenseForm = document.getElementById("editExpenseForm");
const editExpenseNameInput = document.getElementById("editExpenseName");
const editExpenseCategoryInput = document.getElementById("editExpenseCategory");
const editExpenseAmountInput = document.getElementById("editExpenseAmount");
const editExpenseError = document.getElementById("editExpenseError");
const cancelEditExpenseButton = document.getElementById("cancelEditExpense");

const tabButtons = document.querySelectorAll(".tab-btn");
const pages = document.querySelectorAll(".view");

let expenses = pruneExpenses(loadExpenses());
let otherIncomes = loadOtherIncomes();
let goals = loadGoals();
let editingExpenseId = null;

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
applyDarkTheme();
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

function showCsvImportStatus(message, type = "info") {
  if (!csvImportStatus) {
    return;
  }

  csvImportStatus.textContent = message;
  csvImportStatus.className = "status-message";

  if (type === "success") {
    csvImportStatus.classList.add("status-success");
  } else if (type === "error") {
    csvImportStatus.classList.add("status-error");
  } else {
    csvImportStatus.classList.add("empty");
  }
}

function normalizeHeaderValue(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function detectCsvDelimiter(headerLine) {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  const tabCount = (headerLine.match(/\t/g) || []).length;

  if (tabCount > commaCount && tabCount > semicolonCount) {
    return "\t";
  }

  return semicolonCount > commaCount ? ";" : ",";
}

function parseCsvContent(csvText, delimiter) {
  const rows = [];
  let currentField = "";
  let currentRow = [];
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        currentField += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentField);
      const hasAnyValue = currentRow.some((cell) => cell.trim() !== "");
      if (hasAnyValue) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
      continue;
    }

    currentField += char;
  }

  currentRow.push(currentField);
  if (currentRow.some((cell) => cell.trim() !== "")) {
    rows.push(currentRow);
  }

  return rows;
}

function findHeaderIndex(headers, candidates) {
  return headers.findIndex((header) => candidates.includes(header));
}

function getColumnIndexes(headers) {
  const descriptionIndex = findHeaderIndex(headers, [
    "description",
    "name",
    "memo",
    "details",
    "merchant",
    "payee",
    "transaction description",
    "narrative",
  ]);
  const amountIndex = findHeaderIndex(headers, [
    "amount",
    "transaction amount",
    "total amount",
    "value",
    "withdrawal amount",
  ]);
  const debitIndex = findHeaderIndex(headers, [
    "debit",
    "debits",
    "withdrawal",
    "debit amount",
  ]);
  const categoryIndex = findHeaderIndex(headers, [
    "category",
    "expense category",
  ]);
  const dateIndex = findHeaderIndex(headers, [
    "date",
    "transaction date",
    "posted date",
    "posting date",
    "post date",
  ]);
  const typeIndex = findHeaderIndex(headers, [
    "type",
    "transaction type",
    "credit/debit",
    "debit/credit",
  ]);

  return {
    descriptionIndex,
    amountIndex,
    debitIndex,
    categoryIndex,
    dateIndex,
    typeIndex,
  };
}

function findHeaderRow(rows) {
  const maxRowsToScan = Math.min(rows.length, 30);

  for (let index = 0; index < maxRowsToScan; index += 1) {
    const headers = rows[index].map((header) => normalizeHeaderValue(header));
    const columnIndexes = getColumnIndexes(headers);

    if (
      columnIndexes.descriptionIndex !== -1 &&
      (columnIndexes.amountIndex !== -1 || columnIndexes.debitIndex !== -1)
    ) {
      return { headerRowIndex: index, ...columnIndexes };
    }
  }

  return null;
}

function looksLikeDateCell(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return false;
  }

  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(raw)) {
    return true;
  }

  const parsed = new Date(raw);
  return !Number.isNaN(parsed.getTime());
}

function inferColumnsWithoutHeader(rows) {
  const sampleRows = rows.slice(0, 50).filter((row) => row.some((cell) => String(cell).trim() !== ""));
  if (sampleRows.length === 0) {
    return null;
  }

  let maxColumns = 0;
  sampleRows.forEach((row) => {
    maxColumns = Math.max(maxColumns, row.length);
  });

  const amountScores = new Array(maxColumns).fill(0);
  const textScores = new Array(maxColumns).fill(0);
  const dateScores = new Array(maxColumns).fill(0);

  sampleRows.forEach((row) => {
    for (let index = 0; index < maxColumns; index += 1) {
      const rawCell = String(row[index] || "").trim();
      if (!rawCell) {
        continue;
      }

      if (parseAmountFromCell(rawCell) !== null) {
        amountScores[index] += 1;
      }

      if (looksLikeDateCell(rawCell)) {
        dateScores[index] += 1;
      }

      if (/[A-Za-z]/.test(rawCell)) {
        textScores[index] += 1;
      }
    }
  });

  const amountIndex = amountScores.indexOf(Math.max(...amountScores));
  const dateIndex = dateScores.indexOf(Math.max(...dateScores));

  let descriptionIndex = -1;
  let bestDescriptionScore = -1;
  for (let index = 0; index < textScores.length; index += 1) {
    if (index === amountIndex) {
      continue;
    }

    if (textScores[index] > bestDescriptionScore) {
      bestDescriptionScore = textScores[index];
      descriptionIndex = index;
    }
  }

  if (descriptionIndex === -1 || amountScores[amountIndex] === 0) {
    return null;
  }

  return {
    headerRowIndex: -1,
    descriptionIndex,
    amountIndex,
    debitIndex: -1,
    categoryIndex: -1,
    dateIndex: dateScores[dateIndex] > 0 ? dateIndex : -1,
    typeIndex: -1,
  };
}

function parseAmountFromCell(rawValue) {
  const cleaned = String(rawValue || "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .replace(/\((.*)\)/, "-$1");

  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

function parseMonthKeyFromDate(rawDateValue) {
  const value = String(rawDateValue || "").trim();
  if (!value) {
    return getMonthKey();
  }

  const directDate = new Date(value);
  if (!Number.isNaN(directDate.getTime())) {
    return getMonthKey(directDate);
  }

  const slashMatch = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const month = Number(slashMatch[1]) - 1;
    const day = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);
    if (year < 100) {
      year += 2000;
    }
    const parsedDate = new Date(year, month, day);
    if (!Number.isNaN(parsedDate.getTime())) {
      return getMonthKey(parsedDate);
    }
  }

  return getMonthKey();
}

function getImportedExpenseAmount(cells, columnMap) {
  if (columnMap.debitIndex !== -1) {
    const debitAmount = parseAmountFromCell(cells[columnMap.debitIndex]);
    return debitAmount !== null && debitAmount > 0 ? debitAmount : null;
  }

  const amountRaw = parseAmountFromCell(cells[columnMap.amountIndex]);
  if (amountRaw === null || amountRaw === 0) {
    return null;
  }

  const typeCell = columnMap.typeIndex !== -1
    ? String(cells[columnMap.typeIndex] || "").toLowerCase()
    : "";

  const looksLikeCredit = /credit|deposit|payment received|refund/i.test(typeCell);
  if (looksLikeCredit && amountRaw > 0) {
    return null;
  }

  return Math.abs(amountRaw);
}

function handleCsvImport() {
  const file = csvFileInput?.files?.[0];
  if (!file) {
    showCsvImportStatus("Please choose a CSV file first.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const csvText = String(reader.result || "");
      const firstLine = csvText.split(/\r?\n/, 1)[0] || "";
      const delimiter = detectCsvDelimiter(firstLine);
      const rows = parseCsvContent(csvText, delimiter);

      if (rows.length < 2) {
        showCsvImportStatus("CSV file appears empty or missing rows.", "error");
        return;
      }

      const headerResult = findHeaderRow(rows);
      const inferredResult = headerResult || inferColumnsWithoutHeader(rows);

      if (!inferredResult) {
        showCsvImportStatus(
          "Could not find transaction columns. Try a different export format from your bank.",
          "error"
        );
        return;
      }

      const {
        headerRowIndex,
        descriptionIndex,
        amountIndex,
        debitIndex,
        categoryIndex,
        dateIndex,
        typeIndex,
      } = inferredResult;

      const newExpenses = [];
      const columnMap = {
        amountIndex,
        debitIndex,
        typeIndex,
      };

      const dataStartIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

      for (let rowIndex = dataStartIndex; rowIndex < rows.length; rowIndex += 1) {
        const cells = rows[rowIndex];
        const name = String(cells[descriptionIndex] || "").trim();
        if (!name) {
          continue;
        }

        const amount = getImportedExpenseAmount(cells, columnMap);
        if (amount === null || amount <= 0) {
          continue;
        }

        const category =
          categoryIndex !== -1 && String(cells[categoryIndex] || "").trim()
            ? String(cells[categoryIndex]).trim()
            : "Imported";

        const monthKey =
          dateIndex !== -1
            ? parseMonthKeyFromDate(cells[dateIndex])
            : getMonthKey();

        newExpenses.push({
          id: Date.now() + rowIndex,
          name,
          category,
          amount,
          monthKey,
        });
      }

      if (newExpenses.length === 0) {
        showCsvImportStatus("No expense rows were imported from this CSV.", "error");
        return;
      }

      expenses = [...expenses, ...newExpenses];
      saveExpenses();
      renderExpenseList();
      updateSummary();
      showCsvImportStatus(`Imported ${newExpenses.length} expense row(s).`, "success");
      csvFileInput.value = "";
    } catch (error) {
      console.error(error);
      showCsvImportStatus("Failed to import CSV. Please check file format.", "error");
    }
  };

  reader.onerror = () => {
    showCsvImportStatus("Could not read that CSV file.", "error");
  };

  reader.readAsText(file);
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

function getFilteredCurrentMonthExpenses() {
  const allCurrentMonthExpenses = getCurrentMonthExpenses();
  const query = (expenseSearchInput?.value || "").trim().toLowerCase();
  const categoryFilter = expenseCategoryFilter?.value || "all";

  return allCurrentMonthExpenses.filter((expense) => {
    const matchesQuery = !query || expense.name.toLowerCase().includes(query);
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    return matchesQuery && matchesCategory;
  });
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

function saveGoals() {
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
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

function loadGoals() {
  const storedData = localStorage.getItem(GOALS_STORAGE_KEY);
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
              typeof item.target === "number" &&
              typeof item.current === "number" &&
              item.target > 0 &&
              item.current >= 0
          )
          .map((item) => ({
            id: item.id,
            name: item.name,
            target: item.target,
            current: item.current,
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

function renderCategoryFilterOptions() {
  if (!expenseCategoryFilter) {
    return;
  }

  const currentMonthCategories = [...new Set(getCurrentMonthExpenses().map((expense) => expense.category))]
    .filter((category) => typeof category === "string" && category.trim())
    .sort((a, b) => a.localeCompare(b));

  const previousValue = expenseCategoryFilter.value || "all";
  expenseCategoryFilter.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All categories";
  expenseCategoryFilter.appendChild(allOption);

  currentMonthCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    expenseCategoryFilter.appendChild(option);
  });

  expenseCategoryFilter.value = currentMonthCategories.includes(previousValue) ? previousValue : "all";
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
  const filteredExpenses = getFilteredCurrentMonthExpenses();
  expenseList.innerHTML = "";

  if (filteredExpenses.length === 0) {
    emptyState.style.display = "block";
    emptyState.textContent = getCurrentMonthExpenses().length === 0
      ? "No expenses added yet."
      : "No expenses match your search/filter.";
    renderCategorySuggestions();
    renderCategoryFilterOptions();
    return;
  }

  emptyState.style.display = "none";

  filteredExpenses.forEach((expense) => {
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

    const actions = document.createElement("div");
    actions.className = "expense-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-btn";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      openEditExpenseModal(expense.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      deleteExpense(expense.id);
    });

    actions.append(editButton, deleteButton);
    item.append(info, actions);
    expenseList.appendChild(item);
  });

  renderCategorySuggestions();
  renderCategoryFilterOptions();
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

function renderGoals() {
  goalList.innerHTML = "";

  if (goals.length === 0) {
    goalEmpty.style.display = "block";
    return;
  }

  goalEmpty.style.display = "none";

  goals.forEach((goal) => {
    const item = document.createElement("li");
    item.className = "goal-item";

    const topRow = document.createElement("div");
    topRow.className = "goal-top";

    const name = document.createElement("span");
    name.className = "goal-name";
    name.textContent = goal.name;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      deleteGoal(goal.id);
    });

    topRow.append(name, deleteButton);

    const progressContainer = document.createElement("div");
    progressContainer.className = "goal-progress";

    const progressFill = document.createElement("div");
    progressFill.className = "goal-progress-fill";
    const percent = Math.min((goal.current / goal.target) * 100, 100);
    progressFill.style.width = `${percent}%`;

    progressContainer.appendChild(progressFill);

    const meta = document.createElement("p");
    meta.className = "goal-meta";
    meta.textContent = `${toCurrency(goal.current)} of ${toCurrency(goal.target)} (${percent.toFixed(0)}%)`;

    const actions = document.createElement("div");
    actions.className = "goal-actions";

    const addInput = document.createElement("input");
    addInput.type = "number";
    addInput.min = "0";
    addInput.step = "0.01";
    addInput.setAttribute("inputmode", "decimal");
    addInput.placeholder = "Add amount";
    addInput.className = "goal-add-input";

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "primary";
    addButton.textContent = "Add";
    addButton.addEventListener("click", () => {
      addToGoal(goal.id, addInput.value);
      addInput.value = "";
    });

    actions.append(addInput, addButton);

    item.append(topRow, progressContainer, meta, actions);
    goalList.appendChild(item);
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

function showEditExpenseError(message) {
  editExpenseError.textContent = message;
}

function clearEditExpenseError() {
  editExpenseError.textContent = "";
}

function openEditExpenseModal(expenseId) {
  const expense = expenses.find((item) => item.id === expenseId);
  if (!expense) {
    return;
  }

  editingExpenseId = expenseId;
  editExpenseNameInput.value = expense.name;
  editExpenseCategoryInput.value = expense.category;
  editExpenseAmountInput.value = String(expense.amount);
  clearEditExpenseError();
  editExpenseModal.hidden = false;
  editExpenseModal.classList.add("open");
  editExpenseModal.setAttribute("aria-hidden", "false");
}

function closeEditExpenseModal() {
  editingExpenseId = null;
  clearEditExpenseError();
  editExpenseForm.reset();
  editExpenseModal.classList.remove("open");
  editExpenseModal.setAttribute("aria-hidden", "true");
  editExpenseModal.hidden = true;
}

function saveEditedExpense(event) {
  event.preventDefault();

  if (editingExpenseId === null) {
    return;
  }

  const name = editExpenseNameInput.value.trim();
  const category = editExpenseCategoryInput.value.trim();
  const amount = parsePositiveNumber(editExpenseAmountInput.value);

  if (!name) {
    showEditExpenseError("Please enter an expense name.");
    return;
  }

  if (!category) {
    showEditExpenseError("Please enter an expense category.");
    return;
  }

  if (amount === null || amount === 0) {
    showEditExpenseError("Please enter a valid expense amount greater than 0.");
    return;
  }

  expenses = expenses.map((expense) =>
    expense.id === editingExpenseId
      ? { ...expense, name, category, amount }
      : expense
  );

  saveExpenses();
  renderExpenseList();
  updateSummary();
  closeEditExpenseModal();
}

function showGoalError(message) {
  goalError.textContent = message;
}

function clearGoalError() {
  goalError.textContent = "";
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

function handleTemplateClick(event) {
  const button = event.target.closest(".template-btn");
  if (!button) {
    return;
  }

  expenseNameInput.value = button.dataset.name || "";
  expenseCategoryInput.value = button.dataset.category || "";
  expenseAmountInput.focus();
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

function addGoal(event) {
  event.preventDefault();

  const name = goalNameInput.value.trim();
  const target = parsePositiveNumber(goalTargetInput.value);
  const current = parsePositiveNumber(goalCurrentInput.value) ?? 0;

  if (!name) {
    showGoalError("Please enter a goal name.");
    return;
  }

  if (target === null || target === 0) {
    showGoalError("Please enter a valid target amount greater than 0.");
    return;
  }

  const goal = {
    id: Date.now(),
    name,
    target,
    current,
  };

  goals.push(goal);
  saveGoals();
  goalForm.reset();
  clearGoalError();
  renderGoals();
}

function addToGoal(goalId, amountValue) {
  const normalized = String(amountValue).trim().replace(",", ".");
  const addAmount = parsePositiveNumber(normalized);

  if (addAmount === null || addAmount === 0) {
    showGoalError("Please enter a valid amount to add to your goal.");
    return;
  }

  goals = goals.map((goal) =>
    goal.id === goalId ? { ...goal, current: goal.current + addAmount } : goal
  );

  clearGoalError();
  saveGoals();
  renderGoals();
}

function deleteGoal(goalId) {
  goals = goals.filter((goal) => goal.id !== goalId);
  saveGoals();
  renderGoals();
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

function applyDarkTheme() {
  document.body.dataset.theme = "dark";
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", "#0f172a");
  }
}

// Recalculate totals as the income and savings inputs change.
hourlyWageInput.addEventListener("input", handleBudgetInputsChange);
hoursPerWeekInput.addEventListener("input", handleBudgetInputsChange);
savingsGoalInput.addEventListener("input", handleBudgetInputsChange);
expenseForm.addEventListener("submit", addExpense);
otherIncomeForm.addEventListener("submit", addOtherIncome);
goalForm.addEventListener("submit", addGoal);
editExpenseForm.addEventListener("submit", saveEditedExpense);

if (expenseSearchInput) {
  expenseSearchInput.addEventListener("input", renderExpenseList);
}

if (expenseCategoryFilter) {
  expenseCategoryFilter.addEventListener("change", renderExpenseList);
}

if (expenseTemplates) {
  expenseTemplates.addEventListener("click", handleTemplateClick);
}

if (csvImportButton) {
  csvImportButton.addEventListener("click", handleCsvImport);
}

if (historyMonthSelect) {
  historyMonthSelect.addEventListener("change", renderHistoryList);
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActivePage(button.dataset.tab);
  });
});

if (cancelEditExpenseButton) {
  cancelEditExpenseButton.addEventListener("click", closeEditExpenseModal);
}

if (editExpenseModal) {
  editExpenseModal.addEventListener("click", (event) => {
    if (event.target === editExpenseModal) {
      closeEditExpenseModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && editExpenseModal.classList.contains("open")) {
    closeEditExpenseModal();
  }
});

renderExpenseList();
renderOtherIncomeList();
renderGoals();
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
