(function () {
  "use strict";

  var STORAGE_KEY = "milkJournal.entries";

  // ---------- storage ----------

  function loadEntries() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function upsertEntry(dateKey, period, liters) {
    var entries = loadEntries();
    var existing = entries.find(function (e) {
      return e.date === dateKey && e.period === period;
    });
    if (existing) {
      existing.liters = liters;
      existing.updatedAt = Date.now();
    } else {
      entries.push({ date: dateKey, period: period, liters: liters, updatedAt: Date.now() });
    }
    saveEntries(entries);
    return entries;
  }

  function deleteEntry(dateKey, period) {
    var entries = loadEntries().filter(function (e) {
      return !(e.date === dateKey && e.period === period);
    });
    saveEntries(entries);
    return entries;
  }

  // ---------- date / period helpers ----------

  var PERIOD_ORDER = ["Morning", "Afternoon", "Evening"];

  function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function dateKey(d) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function displayDate(dKey) {
    var parts = dKey.split("-");
    return parts[2] + "-" + parts[1] + "-" + parts[0];
  }

  function currentPeriod(d) {
    var hour = d.getHours();
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    return "Evening";
  }

  var EDIT_WINDOW_DAYS = 30;

  function oldestEditableDateKey() {
    var d = new Date();
    d.setDate(d.getDate() - EDIT_WINDOW_DAYS);
    return dateKey(d);
  }

  function formatLiters(n) {
    var rounded = Math.round(n * 100) / 100;
    return (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2).replace(/0$/, "")) + "L";
  }

  function formatLitersSpaced(n) {
    var rounded = Math.round(n * 100) / 100;
    return rounded.toFixed(1) + " L";
  }

  // ---------- remembered custom quantity ----------

  var CUSTOM_LITERS_KEY = "milkJournal.customLiters";

  function getSavedCustomLiters() {
    var raw = localStorage.getItem(CUSTOM_LITERS_KEY);
    var val = raw ? parseFloat(raw) : NaN;
    return !isNaN(val) && val > 0 ? val : null;
  }

  function saveCustomLiters(val) {
    localStorage.setItem(CUSTOM_LITERS_KEY, String(val));
  }

  // ---------- toast ----------

  var toastEl = document.getElementById("toast");
  var toastTimer = null;

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 1800);
  }

  // ---------- view switching ----------

  var views = {
    home: document.getElementById("view-home"),
    history: document.getElementById("view-history"),
    bill: document.getElementById("view-bill")
  };
  var tabButtons = document.querySelectorAll(".tab-btn");

  function showView(name) {
    Object.keys(views).forEach(function (key) {
      views[key].classList.toggle("active", key === name);
    });
    tabButtons.forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.view === name);
    });
    if (name === "history") renderHistory();
    if (name === "home") renderHome();
  }

  tabButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      showView(btn.dataset.view);
    });
  });

  // ---------- home view ----------

  var todayCardLabelEl = document.getElementById("today-card-label");
  var todayCardDateEl = document.getElementById("today-card-date");
  var todayCardPeriodEl = document.getElementById("today-card-period");
  var logHintEl = document.getElementById("log-hint");
  var todayEntriesEl = document.getElementById("today-entries");
  var monthSummaryTitleEl = document.getElementById("month-summary-title");
  var monthSummaryCardEl = document.getElementById("month-summary-card");
  var qtyButtons = document.querySelectorAll(".qty-btn");
  var toggleDatePickerBtn = document.getElementById("toggle-date-picker");
  var datePickerPanel = document.getElementById("date-picker-panel");
  var dateInputEl = document.getElementById("date-input");
  var periodPillsEl = document.getElementById("period-pills");
  var backToTodayBtn = document.getElementById("back-to-today");
  var qtyBtnCustomEl = document.getElementById("qty-btn-custom");
  var qtyBtnCustomTitleEl = document.getElementById("qty-btn-custom-title");
  var toggleCustomInputBtn = document.getElementById("toggle-custom-input");
  var customInputPanel = document.getElementById("custom-input-panel");
  var customLitersInputEl = document.getElementById("custom-liters-input");
  var saveCustomBtn = document.getElementById("save-custom-btn");
  var cancelCustomBtn = document.getElementById("cancel-custom-btn");

  // When manual is false, the active date/period always track "right now".
  var manual = false;
  var manualDate = null;
  var manualPeriod = null;

  function getActiveDate() {
    return manual ? manualDate : dateKey(new Date());
  }

  function getActivePeriod() {
    return manual ? manualPeriod : currentPeriod(new Date());
  }

  function enterManualMode(dateVal, periodVal) {
    manual = true;
    manualDate = dateVal;
    manualPeriod = periodVal;
    renderHome();
  }

  function exitManualMode() {
    manual = false;
    manualDate = null;
    manualPeriod = null;
    renderHome();
  }

  function renderHome() {
    var now = new Date();
    var today = dateKey(now);
    var activeDate = getActiveDate();
    var activePeriod = getActivePeriod();

    todayCardLabelEl.textContent = manual ? "EDITING PAST DATE" : "TODAY";
    todayCardDateEl.textContent = displayDate(activeDate);
    todayCardPeriodEl.textContent = activePeriod;
    logHintEl.textContent = manual ? "Tap to log this date's milk" : "Tap to log today's milk";

    toggleDatePickerBtn.hidden = manual;
    datePickerPanel.hidden = !manual;

    var customLiters = getSavedCustomLiters();
    if (customLiters) {
      qtyBtnCustomEl.hidden = false;
      qtyBtnCustomEl.dataset.liters = String(customLiters);
      qtyBtnCustomEl.dataset.label = customLiters + " Liter";
      qtyBtnCustomTitleEl.textContent = formatLiters(customLiters).replace(/L$/, " L");
    } else {
      qtyBtnCustomEl.hidden = true;
    }

    if (manual) {
      dateInputEl.value = activeDate;
      dateInputEl.max = today;
      dateInputEl.min = oldestEditableDateKey();
      periodPillsEl.querySelectorAll(".period-pill").forEach(function (pill) {
        pill.classList.toggle("active", pill.dataset.period === activePeriod);
      });
    }

    var entries = loadEntries().filter(function (e) {
      return e.date === activeDate;
    });

    var byPeriod = {};
    entries.forEach(function (e) {
      byPeriod[e.period] = e.liters;
    });

    var currentPeriodNow = currentPeriod(now);
    todayEntriesEl.innerHTML = PERIOD_ORDER
      .filter(function (p) { return byPeriod[p] !== undefined; })
      .map(function (p) {
        var label = activeDate === today && p === currentPeriodNow
          ? "Saved for this " + p.toLowerCase()
          : "Saved for " + p;
        return '<div class="entry-status-row"><span class="entry-status-dot"></span>' +
          '<span class="entry-status-label">' + label + '</span>' +
          '<span class="entry-status-value">' + formatLitersSpaced(byPeriod[p]) + "</span></div>";
      })
      .join("");

    var monthKey = today.slice(0, 7);
    var monthTotal = loadEntries()
      .filter(function (e) { return e.date.slice(0, 7) === monthKey; })
      .reduce(function (sum, e) { return sum + e.liters; }, 0);
    var monthName = now.toLocaleDateString(undefined, { month: "long" });
    monthSummaryTitleEl.textContent = monthName + " total: " + formatLitersSpaced(monthTotal);
  }

  qtyButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var liters = parseFloat(btn.dataset.liters);
      var label = btn.dataset.label;
      var activeDate = getActiveDate();
      var activePeriod = getActivePeriod();
      var today = dateKey(new Date());

      upsertEntry(activeDate, activePeriod, liters);

      var shortLabel = label.replace("Liter", "L").replace(" ", "");
      var suffix = activeDate === today ? "" : " (" + displayDate(activeDate) + ")";
      showToast("Saved: " + shortLabel + " - " + activePeriod + suffix);

      renderHome();
    });
  });

  monthSummaryCardEl.addEventListener("click", function () {
    showView("bill");
  });

  function openCustomInput() {
    customInputPanel.hidden = false;
    toggleCustomInputBtn.hidden = true;
    customLitersInputEl.value = "";
    customLitersInputEl.focus();
  }

  function closeCustomInput() {
    customInputPanel.hidden = true;
    toggleCustomInputBtn.hidden = false;
  }

  toggleCustomInputBtn.addEventListener("click", openCustomInput);
  cancelCustomBtn.addEventListener("click", closeCustomInput);

  saveCustomBtn.addEventListener("click", function () {
    var val = parseFloat(customLitersInputEl.value);
    if (isNaN(val) || val <= 0) {
      showToast("Enter a valid amount in liters");
      return;
    }
    val = Math.round(val * 100) / 100;

    var activeDate = getActiveDate();
    var activePeriod = getActivePeriod();
    var today = dateKey(new Date());

    upsertEntry(activeDate, activePeriod, val);
    saveCustomLiters(val);

    var suffix = activeDate === today ? "" : " (" + displayDate(activeDate) + ")";
    showToast("Saved: " + formatLiters(val) + " - " + activePeriod + suffix);

    closeCustomInput();
    renderHome();
  });

  toggleDatePickerBtn.addEventListener("click", function () {
    enterManualMode(dateKey(new Date()), currentPeriod(new Date()));
  });

  backToTodayBtn.addEventListener("click", function () {
    exitManualMode();
  });

  dateInputEl.addEventListener("change", function () {
    if (!dateInputEl.value) return;
    var today = dateKey(new Date());
    var oldest = oldestEditableDateKey();
    var picked = dateInputEl.value;
    if (picked > today) picked = today;
    if (picked < oldest) picked = oldest;
    manualDate = picked;
    renderHome();
  });

  periodPillsEl.addEventListener("click", function (evt) {
    var pill = evt.target.closest(".period-pill");
    if (!pill) return;
    manualPeriod = pill.dataset.period;
    renderHome();
  });

  // ---------- history view ----------

  var historyListEl = document.getElementById("history-list");

  function renderHistory() {
    var entries = loadEntries();

    if (entries.length === 0) {
      historyListEl.innerHTML = '<div class="empty-state">No entries yet. Log some milk from the Home tab.</div>';
      return;
    }

    var byDate = {};
    entries.forEach(function (e) {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    });

    var dates = Object.keys(byDate).sort(function (a, b) {
      return a < b ? 1 : -1;
    });

    historyListEl.innerHTML = dates.map(function (d) {
      var dayEntries = byDate[d].slice().sort(function (a, b) {
        return PERIOD_ORDER.indexOf(a.period) - PERIOD_ORDER.indexOf(b.period);
      });
      var dayTotal = dayEntries.reduce(function (sum, e) { return sum + e.liters; }, 0);

      var rows = dayEntries.map(function (e) {
        return '<div class="history-entry">' +
          '<div class="history-entry-info" data-date="' + e.date + '" data-period="' + e.period +
          '" role="button" tabindex="0" aria-label="Edit ' + e.period + ' entry for ' + displayDate(e.date) + '">' +
          '<span class="history-entry-period">' + e.period + '</span>' +
          '<span class="history-entry-liters">' + formatLiters(e.liters) + '</span>' +
          '</div>' +
          '<button type="button" class="delete-btn" data-date="' + e.date + '" data-period="' + e.period + '" aria-label="Delete entry">✕</button>' +
          '</div>';
      }).join("");

      return '<div class="history-group">' +
        '<div class="history-group-header">' +
        '<span class="history-group-date">' + displayDate(d) + '</span>' +
        '<span class="history-group-total">' + formatLiters(dayTotal) + '</span>' +
        '</div>' + rows + '</div>';
    }).join("");
  }

  historyListEl.addEventListener("click", function (evt) {
    var deleteBtn = evt.target.closest(".delete-btn");
    if (deleteBtn) {
      deleteEntry(deleteBtn.dataset.date, deleteBtn.dataset.period);
      renderHistory();
      return;
    }

    var entryInfo = evt.target.closest(".history-entry-info");
    if (entryInfo) {
      if (entryInfo.dataset.date < oldestEditableDateKey()) {
        showToast("Entries older than 30 days can't be edited");
        return;
      }
      enterManualMode(entryInfo.dataset.date, entryInfo.dataset.period);
      showView("home");
    }
  });

  // ---------- bill view ----------

  var billMonthEl = document.getElementById("bill-month");
  var billPriceEl = document.getElementById("bill-price");
  var billResultEl = document.getElementById("bill-result");
  var calcBillBtn = document.getElementById("calc-bill-btn");

  function initBillMonth() {
    var now = new Date();
    billMonthEl.value = now.getFullYear() + "-" + pad2(now.getMonth() + 1);
  }

  function monthLabel(monthValue) {
    var parts = monthValue.split("-");
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  calcBillBtn.addEventListener("click", function () {
    var monthValue = billMonthEl.value;
    if (!monthValue) {
      showToast("Pick a month first");
      return;
    }
    var price = parseFloat(billPriceEl.value);
    if (isNaN(price) || price < 0) {
      showToast("Enter a valid price per liter");
      billResultEl.innerHTML = "";
      return;
    }

    var entries = loadEntries().filter(function (e) {
      return e.date.slice(0, 7) === monthValue;
    });
    var totalLiters = entries.reduce(function (sum, e) { return sum + e.liters; }, 0);
    var totalAmount = totalLiters * price;

    billResultEl.innerHTML =
      '<div class="bill-summary">' +
      '<div class="bill-row"><span>Month</span><span>' + monthLabel(monthValue) + '</span></div>' +
      '<div class="bill-row"><span>Total Liters</span><span>' + formatLiters(totalLiters) + '</span></div>' +
      '<div class="bill-row"><span>Price per Liter</span><span>₹' + price.toFixed(2) + '</span></div>' +
      '<div class="bill-row total"><span>Total Amount</span><span>₹' + totalAmount.toFixed(2) + '</span></div>' +
      '</div>';
  });

  // ---------- add to home screen prompt ----------

  var INSTALL_PROMPT_KEY = "milkJournal.installPromptShown";
  var deferredInstallPrompt = null;

  var installOverlayEl = document.getElementById("install-overlay");
  var installBodyEl = document.getElementById("install-sheet-body");
  var installAddBtn = document.getElementById("install-sheet-add");
  var installDismissBtn = document.getElementById("install-sheet-dismiss");

  window.addEventListener("beforeinstallprompt", function (evt) {
    evt.preventDefault();
    deferredInstallPrompt = evt;
  });

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }

  function showInstallSheet(iosInstructions) {
    if (iosInstructions) {
      installBodyEl.textContent = 'Tap the Share icon, then "Add to Home Screen" to install Milk Journal.';
      installAddBtn.hidden = true;
    } else {
      installBodyEl.textContent = "Get one-tap access every morning, right from your home screen.";
      installAddBtn.hidden = false;
    }
    installOverlayEl.hidden = false;
  }

  function hideInstallSheet() {
    installOverlayEl.hidden = true;
  }

  function maybeShowInstallPrompt() {
    if (localStorage.getItem(INSTALL_PROMPT_KEY)) return;
    localStorage.setItem(INSTALL_PROMPT_KEY, "1");

    if (isStandalone()) return;

    if (deferredInstallPrompt) {
      showInstallSheet(false);
    } else if (isIOS()) {
      showInstallSheet(true);
    }
  }

  document.addEventListener("click", function (evt) {
    if (evt.target.closest("button")) maybeShowInstallPrompt();
  });

  installAddBtn.addEventListener("click", function () {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(function () {
        deferredInstallPrompt = null;
      });
    }
    hideInstallSheet();
  });

  installDismissBtn.addEventListener("click", hideInstallSheet);

  // ---------- init ----------

  initBillMonth();
  renderHome();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });

    // When a new service worker takes over (a fresh deployment activated),
    // reload once so an already-open tab or home-screen app picks up the
    // new page instead of continuing to run the old one from memory.
    var refreshedForUpdate = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (refreshedForUpdate) return;
      refreshedForUpdate = true;
      window.location.reload();
    });
  }
})();
