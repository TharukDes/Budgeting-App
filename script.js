const STORAGE_KEY = "budget_app_expenses";
const PROFILE_STORAGE_KEY = "budget_app_profile";

// Inputs and display elements
const hourlyWageInput = document.getElementById("hourlyWage");
const hoursPerWeekInput = document.getElementById("hoursPerWeek");
const weeklyIncomeDisplay = document.getElementById("weeklyIncome");
const monthlyIncomeDisplay = document.getElementById("monthlyIncome");

const expenseForm = document.getElementById("expenseForm");
const expenseNameInput = document.getElementById("expenseName");
const expenseAmountInput = document.getElementById("expenseAmount");
const errorMessage = document.getElementById("errorMessage");

const expenseList = document.getElementById("expenseList");
const emptyState = document.getElementById("emptyState");

const savingsGoalInput = document.getElementById("savingsGoal");
const totalSpentDisplay = document.getElementById("totalSpent");
const remainingMoneyDisplay = document.getElementById("remainingMoney");
const safeToSpendDisplay = document.getElementById("safeToSpend");
const tabButtons = document.querySelectorAll(".tab-btn");
const pages = document.querySelectorAll(".view");

let expenses = loadExpenses();

loadProfileInputs();

function toCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function parsePositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function getMonthlyIncome() {
  const weeklyIncome = getWeeklyIncome();
  return weeklyIncome * 4;
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
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
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

    // Keep only valid expense objects in case localStorage data is corrupted.
    return Array.isArray(parsed)
      ? parsed.filter(
          (item) =>
            item &&
            typeof item.id === "number" &&
            typeof item.name === "string" &&
            typeof item.amount === "number" &&
            item.amount >= 0
        )
      : [];
  } catch {
    return [];
  }
}

function renderExpenseList() {
  expenseList.innerHTML = "";

  if (expenses.length === 0) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  expenses.forEach((expense) => {
    const item = document.createElement("li");
    item.className = "expense-item";

    const info = document.createElement("div");
    info.className = "expense-info";

    const name = document.createElement("span");
    name.textContent = expense.name;

    const amount = document.createElement("span");
    amount.className = "expense-amount";
    amount.textContent = toCurrency(expense.amount);

    info.append(name, amount);

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
}

function updateSummary() {
  const weeklyIncome = getWeeklyIncome();
  const monthlyIncome = getMonthlyIncome();
  const totalSpent = getTotalExpenses();
  const remainingMoney = monthlyIncome - totalSpent;
  const safeToSpend = remainingMoney - getSavingsGoal();

  weeklyIncomeDisplay.textContent = toCurrency(weeklyIncome);
  monthlyIncomeDisplay.textContent = toCurrency(monthlyIncome);
  totalSpentDisplay.textContent = toCurrency(totalSpent);
  remainingMoneyDisplay.textContent = toCurrency(remainingMoney);
  safeToSpendDisplay.textContent = toCurrency(safeToSpend);

  remainingMoneyDisplay.style.color = remainingMoney < 0 ? "#b91c1c" : "#1f2937";
  safeToSpendDisplay.style.color = safeToSpend < 0 ? "#b91c1c" : "#1f2937";
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
  const amount = parsePositiveNumber(expenseAmountInput.value);

  if (!name) {
    showError("Please enter an expense name.");
    return;
  }

  if (amount === null || amount === 0) {
    showError("Please enter a valid expense amount greater than 0.");
    return;
  }

  const newExpense = {
    id: Date.now(),
    name,
    amount,
  };

  expenses.push(newExpense);
  saveExpenses();

  expenseForm.reset();
  clearError();

  renderExpenseList();
  updateSummary();
}

function deleteExpense(id) {
  expenses = expenses.filter((expense) => expense.id !== id);
  saveExpenses();
  renderExpenseList();
  updateSummary();
}

function handleBudgetInputsChange() {
  saveProfileInputs();
  updateSummary();
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

// Recalculate totals as the income and savings inputs change.
hourlyWageInput.addEventListener("input", handleBudgetInputsChange);
hoursPerWeekInput.addEventListener("input", handleBudgetInputsChange);
savingsGoalInput.addEventListener("input", handleBudgetInputsChange);
expenseForm.addEventListener("submit", addExpense);
tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActivePage(button.dataset.tab);
  });
});

renderExpenseList();
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
