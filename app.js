(function () {
  "use strict";

  var STORAGE_KEY = "fivefold-data";

  var PRAYERS = [
    { id: "fajr",    name: "Fajr",    color: "#6C7CE8", x: 40,  y: 140 },
    { id: "dhuhr",   name: "Dhuhr",   color: "#3FB6C9", x: 160, y: 35  },
    { id: "asr",     name: "Asr",     color: "#E8A94D", x: 260, y: 60  },
    { id: "maghrib", name: "Maghrib", color: "#E8703F", x: 355, y: 140 },
    { id: "isha",    name: "Isha",    color: "#9C8FE0", x: 375, y: 185 }
  ];

  var STATES = [null, "ontime", "late"]; // cycle order

  var HABITS = [
    { id: "quran",   name: "Quran",   color: "#3FB6C9" },
    { id: "dhikr",   name: "Dhikr",   color: "#9C8FE0" },
    { id: "fasting", name: "Fasting", color: "#E8A94D" }
  ];

  // ---------- storage ----------

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) throw new Error("empty");
      var parsed = JSON.parse(raw);
      if (!parsed.days) parsed.days = {};
      if (typeof parsed.bestStreak !== "number") parsed.bestStreak = 0;
      return parsed;
    } catch (e) {
      return { focusPrayer: null, onboarded: false, days: {}, bestStreak: 0 };
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Fivefold: could not save data", e);
    }
  }

  var data = loadData();

  // ---------- date helpers ----------

  function dateStr(offsetDays) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - offsetDays);
    return d.toISOString().slice(0, 10);
  }

  function dayRecord(offsetDays) {
    return data.days[dateStr(offsetDays)] || null;
  }

  function ensureDay(offsetDays) {
    var key = dateStr(offsetDays);
    if (!data.days[key]) {
      data.days[key] = {
        fajr: null, dhuhr: null, asr: null, maghrib: null, isha: null,
        quran: null, dhikr: null, fasting: null
      };
    }
    return data.days[key];
  }

  // ---------- streak logic ----------

  function prayerLoggedOn(offset, prayerId) {
    var rec = dayRecord(offset);
    return !!(rec && rec[prayerId]);
  }

  function dayFullyLogged(offset) {
    var rec = dayRecord(offset);
    if (!rec) return false;
    return PRAYERS.every(function (p) { return !!rec[p.id]; });
  }

  function prayerStreak(prayerId) {
    var offset = prayerLoggedOn(0, prayerId) ? 0 : 1;
    if (offset === 1 && !prayerLoggedOn(1, prayerId)) return 0;
    var streak = 0;
    while (prayerLoggedOn(offset, prayerId)) { streak++; offset++; }
    return streak;
  }

  function combinedStreak() {
    var offset = dayFullyLogged(0) ? 0 : 1;
    if (offset === 1 && !dayFullyLogged(1)) return 0;
    var streak = 0;
    while (dayFullyLogged(offset)) { streak++; offset++; }
    return streak;
  }

  function refreshBestStreak() {
    var current = combinedStreak();
    if (current > data.bestStreak) data.bestStreak = current;
  }

  // ---------- onboarding ----------

  function initOnboarding() {
    var modal = document.getElementById("onboarding");
    if (data.onboarded) { modal.classList.add("hidden"); return; }

    var optionsWrap = document.getElementById("onboarding-options");
    PRAYERS.forEach(function (p) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = p.name;
      btn.addEventListener("click", function () {
        data.focusPrayer = p.id;
        data.onboarded = true;
        saveData();
        modal.classList.add("hidden");
        render();
      });
      optionsWrap.appendChild(btn);
    });

    document.getElementById("skip-onboarding").addEventListener("click", function () {
      data.onboarded = true;
      saveData();
      modal.classList.add("hidden");
      render();
    });

    modal.classList.remove("hidden");
  }

  // ---------- arc rendering ----------

  function buildArc() {
    var nodesGroup = document.getElementById("nodes");
    var starsGroup = document.getElementById("stars");
    nodesGroup.innerHTML = "";
    starsGroup.innerHTML = "";

    // scatter a few faint stars on the night side
    var starPositions = [[330, 25], [365, 55], [390, 40], [345, 90], [385, 105]];
    starPositions.forEach(function (pos) {
      var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", pos[0]);
      c.setAttribute("cy", pos[1]);
      c.setAttribute("r", 1.4);
      starsGroup.appendChild(c);
    });

    PRAYERS.forEach(function (p) {
      var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("data-prayer", p.id);
      g.style.cursor = "pointer";

      var ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      ring.setAttribute("class", "node-ring");
      ring.setAttribute("cx", p.x);
      ring.setAttribute("cy", p.y);
      ring.setAttribute("r", 15);
      g.appendChild(ring);

      var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("class", "node-dot");
      dot.setAttribute("cx", p.x);
      dot.setAttribute("cy", p.y);
      dot.setAttribute("r", 9);
      g.appendChild(dot);

      var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("class", "node-label");
      label.setAttribute("x", p.x);
      label.setAttribute("y", p.y < 100 ? p.y - 20 : p.y + 24);
      label.textContent = p.name;
      g.appendChild(label);

      var timeLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      timeLabel.setAttribute("class", "node-time");
      timeLabel.setAttribute("x", p.x);
      timeLabel.setAttribute("y", p.y < 100 ? p.y - 32 : p.y + 36);
      g.appendChild(timeLabel);

      g.addEventListener("click", function () { cyclePrayer(p.id); });
      nodesGroup.appendChild(g);
    });
  }

  function cyclePrayer(prayerId) {
    var today = ensureDay(0);
    var current = today[prayerId];
    var idx = STATES.indexOf(current);
    var next = STATES[(idx + 1) % STATES.length];
    today[prayerId] = next;
    refreshBestStreak();
    saveData();
    render();
  }

  function toggleHabit(habitId) {
    var today = ensureDay(0);
    today[habitId] = today[habitId] ? null : "ontime";
    saveData();
    render();
  }

  function updateArcVisuals() {
    var today = dayRecord(0) || {};
    PRAYERS.forEach(function (p) {
      var g = document.querySelector('[data-prayer="' + p.id + '"]');
      if (!g) return;
      var dot = g.querySelector(".node-dot");
      var ring = g.querySelector(".node-ring");
      var state = today[p.id];

      if (state === "ontime") {
        dot.setAttribute("fill", p.color);
        dot.setAttribute("r", 10);
        dot.style.opacity = 1;
        dot.style.filter = "drop-shadow(0 0 5px " + p.color + "aa)";
      } else if (state === "late") {
        dot.setAttribute("fill", p.color);
        dot.setAttribute("r", 10);
        dot.style.opacity = 0.5;
        dot.style.filter = "none";
      } else {
        dot.setAttribute("fill", "#1E1B3F");
        dot.setAttribute("stroke", p.color);
        dot.setAttribute("stroke-width", "1.5");
        dot.setAttribute("r", 8);
        dot.style.opacity = 1;
        dot.style.filter = "none";
      }

      if (data.focusPrayer === p.id) {
        ring.classList.add("focus");
      } else {
        ring.classList.remove("focus");
      }
    });
  }

  // ---------- stats ----------

  function renderStats() {
    var wrap = document.getElementById("stats");
    wrap.innerHTML = "";

    var cards = [];

    if (data.focusPrayer) {
      var focusName = PRAYERS.filter(function (p) { return p.id === data.focusPrayer; })[0].name;
      cards.push({
        value: prayerStreak(data.focusPrayer),
        label: focusName + " streak",
        focus: true
      });
    } else {
      var today = dayRecord(0) || {};
      var loggedCount = PRAYERS.filter(function (p) { return !!today[p.id]; }).length;
      cards.push({ value: loggedCount + "/5", label: "Logged today", focus: true });
    }

    cards.push({ value: combinedStreak(), label: "Full-day streak" });
    cards.push({ value: data.bestStreak, label: "Best streak" });

    cards.forEach(function (c) {
      var el = document.createElement("div");
      el.className = "stat-card" + (c.focus ? " focus-stat" : "");
      el.innerHTML =
        '<span class="stat-value">' + c.value + '</span>' +
        '<span class="stat-label">' + c.label + '</span>';
      wrap.appendChild(el);
    });
  }

  // ---------- week grid ----------

  function renderWeek() {
    var wrap = document.getElementById("week-grid");
    wrap.innerHTML = "";
    var dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (var offset = 6; offset >= 0; offset--) {
      var d = new Date();
      d.setDate(d.getDate() - offset);
      var rec = dayRecord(offset) || {};

      var row = document.createElement("div");
      row.className = "week-row" + (offset === 0 ? " is-today" : "");

      var label = document.createElement("span");
      label.className = "week-day-label";
      label.textContent = dayLabels[d.getDay()];
      row.appendChild(label);

      PRAYERS.forEach(function (p) {
        var cell = document.createElement("span");
        var state = rec[p.id];
        cell.className = "week-cell" + (state ? " " + state : "");
        if (state) {
          cell.style.background = p.color;
          if (state === "late") cell.style.opacity = 0.5;
        }
        row.appendChild(cell);
      });

      wrap.appendChild(row);
    }
  }

  // ---------- other habits ----------

  function renderHabits() {
    var wrap = document.getElementById("habits-grid");
    wrap.innerHTML = "";
    var today = dayRecord(0) || {};

    HABITS.forEach(function (h) {
      var isActive = !!today[h.id];
      var card = document.createElement("button");
      card.type = "button";
      card.className = "habit-card" + (isActive ? " active" : "");
      card.style.setProperty("--habit-color", h.color);
      card.innerHTML =
        '<span class="habit-dot"></span>' +
        '<span class="habit-name">' + h.name + '</span>' +
        '<span class="habit-streak">' + prayerStreak(h.id) + ' day streak</span>';
      card.addEventListener("click", function () { toggleHabit(h.id); });
      wrap.appendChild(card);
    });
  }

  // ---------- render all ----------

  function render() {
    updateArcVisuals();
    renderStats();
    renderWeek();
    renderHabits();
  }

  // ---------- prayer times (GPS with manual fallback) ----------

  var TIMES_METHOD = 3; // Muslim World League
  var prayerTimes = null;

  function loadCachedTimes() {
    try {
      var raw = JSON.parse(localStorage.getItem("fivefold-times"));
      if (raw && raw.date === dateStr(0)) return raw.timings;
      return null;
    } catch (e) { return null; }
  }

  function cacheTimes(timings) {
    try {
      localStorage.setItem("fivefold-times", JSON.stringify({ date: dateStr(0), timings: timings }));
    } catch (e) { /* ignore */ }
  }

  function loadLocation() {
    try { return JSON.parse(localStorage.getItem("fivefold-location")); }
    catch (e) { return null; }
  }

  function saveLocation(loc) {
    try { localStorage.setItem("fivefold-location", JSON.stringify(loc)); }
    catch (e) { /* ignore */ }
  }

  function fetchTimesByCoords(lat, lon) {
    var ts = Math.floor(Date.now() / 1000);
    var url = "https://api.aladhan.com/v1/timings/" + ts +
      "?latitude=" + lat + "&longitude=" + lon + "&method=" + TIMES_METHOD;
    return fetch(url).then(function (res) { return res.json(); })
      .then(function (json) { return json.data.timings; });
  }

  function fetchTimesByCity(city, country) {
    var url = "https://api.aladhan.com/v1/timingsByCity?city=" + encodeURIComponent(city) +
      "&country=" + encodeURIComponent(country) + "&method=" + TIMES_METHOD;
    return fetch(url).then(function (res) { return res.json(); })
      .then(function (json) { return json.data.timings; });
  }

  function setTimesStatus(text) {
    var el = document.getElementById("times-status");
    if (!text) {
      el.classList.add("hidden");
    } else {
      el.classList.remove("hidden");
      el.textContent = text;
    }
  }

  function showManualForm(message) {
    setTimesStatus(message || "");
    document.getElementById("manual-location-form").classList.remove("hidden");
  }

  function renderTimesOnArc() {
    if (!prayerTimes) return;
    PRAYERS.forEach(function (p) {
      var raw = prayerTimes[p.name];
      if (!raw) return;
      var el = document.querySelector('[data-prayer="' + p.id + '"] .node-time');
      if (el) el.textContent = raw.split(" ")[0];
    });
  }

  function applyTimes(timings) {
    prayerTimes = timings;
    cacheTimes(timings);
    renderTimesOnArc();
    setTimesStatus("");
    document.getElementById("change-location-btn").classList.remove("hidden");
    document.getElementById("manual-location-form").classList.add("hidden");
  }

  function handleTimesError() {
    if (!navigator.onLine) {
      setTimesStatus("You're offline — prayer times will load once you're back online.");
    } else {
      showManualForm("Could not load prayer times. Enter your city instead.");
    }
  }

  function initPrayerTimes() {
    var cached = loadCachedTimes();
    if (cached) { applyTimes(cached); return; }

    var loc = loadLocation();

    if (loc && loc.mode === "manual") {
      setTimesStatus("Loading prayer times…");
      fetchTimesByCity(loc.city, loc.country).then(applyTimes).catch(handleTimesError);
      return;
    }

    if (loc && loc.mode === "gps" && loc.lat) {
      setTimesStatus("Loading prayer times…");
      fetchTimesByCoords(loc.lat, loc.lon).then(applyTimes).catch(handleTimesError);
      return;
    }

    if (!("geolocation" in navigator)) {
      showManualForm("Enter your city for prayer times.");
      return;
    }

    setTimesStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var newLoc = { mode: "gps", lat: pos.coords.latitude, lon: pos.coords.longitude };
        saveLocation(newLoc);
        setTimesStatus("Loading prayer times…");
        fetchTimesByCoords(newLoc.lat, newLoc.lon).then(applyTimes).catch(handleTimesError);
      },
      function () { showManualForm("Location unavailable — enter your city instead."); },
      { timeout: 8000 }
    );
  }

  function initLocationForm() {
    var form = document.getElementById("manual-location-form");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var city = document.getElementById("city-input").value.trim();
      var country = document.getElementById("country-input").value.trim();
      if (!city || !country) return;
      setTimesStatus("Loading prayer times…");
      fetchTimesByCity(city, country)
        .then(function (timings) {
          saveLocation({ mode: "manual", city: city, country: country });
          applyTimes(timings);
        })
        .catch(function () {
          if (!navigator.onLine) { handleTimesError(); return; }
          setTimesStatus("Could not find that city. Check spelling and try again.");
        });
    });

    document.getElementById("change-location-btn").addEventListener("click", function () {
      document.getElementById("manual-location-form").classList.remove("hidden");
    });
  }

  // ---------- PWA install ----------

  var deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    var btn = document.getElementById("install-btn");
    btn.classList.remove("hidden");
    btn.addEventListener("click", function () {
      btn.classList.add("hidden");
      deferredPrompt.prompt();
    });
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("service-worker.js").catch(function (err) {
        console.error("Fivefold: service worker registration failed", err);
      });
    });
  }

  // ---------- init ----------

  document.addEventListener("DOMContentLoaded", function () {
    buildArc();
    refreshBestStreak();
    saveData();
    render();
    initOnboarding();
    initLocationForm();
    initPrayerTimes();
  });
})();
