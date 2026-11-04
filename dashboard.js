// ChargeSmart Dashboard Controller — Stations, Chargers & Slot Scheduling
const demoStations = [
  {id:1,name:"SunGrid EV Plaza",area:"Chandapura Circle",distance:4,rate:11.9,wait:5,slots:4,status:"available",type:"AC Type 2"},
  {id:2,name:"MetroVolt Station",area:"Bommasandra Metro",distance:2.4,rate:12.5,wait:7,slots:2,status:"available",type:"AC Type 2"},
  {id:3,name:"GreenPoint Charging Hub",area:"Electronic City Phase 1",distance:1.2,rate:13.8,wait:4,slots:3,status:"available",type:"DC Fast · CCS2"},
  {id:4,name:"Lakeview ChargePoint",area:"Jigani Road",distance:6.3,rate:14.1,wait:8,slots:2,status:"available",type:"DC Fast · CCS2"},
  {id:5,name:"EcoCharge Central",area:"Hosur Road",distance:3.1,rate:15.2,wait:18,slots:0,status:"busy",type:"DC Fast · CCS2"},
  {id:6,name:"PowerLane Express",area:"Bommasandra Industrial Area",distance:5.6,rate:16.4,wait:22,slots:0,status:"busy",type:"Ultra-fast · CCS2"}
];

// Available 1-hour charging slots
const TIME_SLOTS = [
  "08:00 AM - 09:00 AM",
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 01:00 PM",
  "01:00 PM - 02:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM",
  "05:00 PM - 06:00 PM",
  "06:00 PM - 07:00 PM",
  "07:00 PM - 08:00 PM"
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Date format helpers
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getOffsetDateString(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "Today";
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3) {
      const obj = new Date(parts[0], parts[1] - 1, parts[2]);
      const today = getTodayString();
      const tomorrow = getOffsetDateString(1);
      if (dateStr === today) return `Today (${obj.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
      if (dateStr === tomorrow) return `Tomorrow (${obj.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
      return obj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  } catch (e) {}
  return dateStr;
}

function formatFullDate(dateStr) {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const obj = new Date(y, m - 1, d);
    return obj.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  } catch (e) {
    return dateStr;
  }
}

// Storage helpers
function getBookings() {
  const raw = localStorage.getItem("chargesmart_bookings");
  if (!raw) {
    const initial = [
      {
        id: "CS-839201",
        station: "GreenPoint Charging Hub",
        energy: 28,
        amount: 386.40,
        status: "Confirmed (demo)",
        driver: "Alex EV Driver",
        vehicle: "EV-KA-05-4122",
        bookingDate: getTodayString(),
        slotTime: "10:00 AM - 11:00 AM"
      },
      {
        id: "CS-710482",
        station: "SunGrid EV Plaza",
        energy: 35,
        amount: 416.50,
        status: "Confirmed (demo)",
        driver: "Priya Sharma",
        vehicle: "NEXON-EV-98",
        bookingDate: getTodayString(),
        slotTime: "02:00 PM - 03:00 PM"
      },
      {
        id: "CS-629105",
        station: "MetroVolt Station",
        energy: 20,
        amount: 250.00,
        status: "Confirmed (demo)",
        driver: "Rohan Verma",
        vehicle: "EV-MH-02-7711",
        bookingDate: getOffsetDateString(1),
        slotTime: "09:00 AM - 10:00 AM"
      }
    ];
    saveBookings(initial);
    return initial;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

const saveBookings = b => localStorage.setItem("chargesmart_bookings", JSON.stringify(b));

const getChargers = () => JSON.parse(localStorage.getItem("chargesmart_chargers") || JSON.stringify([
  {id:1,name:"AC Charger 01",status:"available",rate:12.5},
  {id:2,name:"AC Charger 02",status:"available",rate:12.5},
  {id:3,name:"DC Fast Charger 01",status:"busy",rate:16.4},
  {id:4,name:"DC Fast Charger 02",status:"available",rate:16.4}
]));

const saveChargers = c => localStorage.setItem("chargesmart_chargers", JSON.stringify(c));
const money = n => "₹" + Number(n).toFixed(2);
const isOwner = location.pathname.endsWith("owner.html");
let selectedStation = null;

// Auth & Session guard
function getActiveSession() {
  try {
    const raw = localStorage.getItem("chargesmart_session");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.user) return parsed.user;
    }
  } catch (e) {
    console.warn("Session read notice:", e);
  }
  return null;
}

async function guardAndName() {
  let user = getActiveSession();
  if (!user && supabaseClient) {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) {
        user = {
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email,
          role: session.user.user_metadata?.role || "driver"
        };
      }
    } catch (e) {
      console.warn("Supabase auth check:", e);
    }
  }

  if (!user) {
    location.href = "login.html?role=" + (isOwner ? "owner" : "driver");
    return;
  }

  const role = user.role || "driver";
  if ((isOwner && role !== "owner") || (!isOwner && role !== "driver")) {
    location.href = role === "owner" ? "owner.html" : "driver.html";
    return;
  }

  const el = document.querySelector("#welcomeName");
  if (el) el.textContent = user.full_name || user.username || user.email || (isOwner ? "Station Owner" : "Alex Driver");
}

document.querySelector("#logout")?.addEventListener("click", async () => {
  localStorage.removeItem("chargesmart_session");
  if (supabaseClient) {
    try { await supabaseClient.auth.signOut(); } catch (e) {}
  }
  location.href = "index.html";
});

// ==========================================
// 1. DRIVER PLATFORM: CALENDAR & SCHEDULER
// ==========================================
let calCurrentYear = new Date().getFullYear();
let calCurrentMonth = new Date().getMonth(); // 0-indexed
let activeSchedulerDate = getTodayString();

function initDriverPlatformCalendar() {
  const stationSelect = document.querySelector("#schedulerStationSelect");
  if (!stationSelect) return; // Only on driver.html

  // Populate stations dropdown
  stationSelect.innerHTML = demoStations.map(s => `
    <option value="${s.name}" data-id="${s.id}">${s.name} (${s.type} · ${money(s.rate)}/kWh)</option>
  `).join("");

  stationSelect.addEventListener("change", () => {
    renderPlatformSlots();
    updatePlatformCost();
  });

  document.querySelector("#schedulerEnergy")?.addEventListener("input", updatePlatformCost);

  document.querySelector("#calPrevMonth")?.addEventListener("click", () => {
    calCurrentMonth--;
    if (calCurrentMonth < 0) {
      calCurrentMonth = 11;
      calCurrentYear--;
    }
    renderPlatformCalendar();
  });

  document.querySelector("#calNextMonth")?.addEventListener("click", () => {
    calCurrentMonth++;
    if (calCurrentMonth > 11) {
      calCurrentMonth = 0;
      calCurrentYear++;
    }
    renderPlatformCalendar();
  });

  document.querySelector("#calTodayBtn")?.addEventListener("click", () => {
    const today = new Date();
    calCurrentYear = today.getFullYear();
    calCurrentMonth = today.getMonth();
    activeSchedulerDate = getTodayString();
    renderPlatformCalendar();
    renderPlatformSlots();
    updatePlatformCost();
  });

  document.querySelector("#calTomorrowBtn")?.addEventListener("click", () => {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    calCurrentYear = tom.getFullYear();
    calCurrentMonth = tom.getMonth();
    activeSchedulerDate = getOffsetDateString(1);
    renderPlatformCalendar();
    renderPlatformSlots();
    updatePlatformCost();
  });

  document.querySelector("#schedulerBookBtn")?.addEventListener("click", bookFromPlatformScheduler);

  renderPlatformCalendar();
  renderPlatformSlots();
  updatePlatformCost();
}

function renderPlatformCalendar() {
  const monthYearEl = document.querySelector("#calMonthYear");
  const daysGrid = document.querySelector("#calDaysGrid");
  if (!daysGrid) return;

  if (monthYearEl) {
    monthYearEl.textContent = `${MONTH_NAMES[calCurrentMonth]} ${calCurrentYear}`;
  }

  const todayStr = getTodayString();
  const bookings = getBookings();
  const bookedDates = new Set(bookings.map(b => b.bookingDate));

  const firstDay = new Date(calCurrentYear, calCurrentMonth, 1).getDay();
  const daysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();

  let html = "";
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${calCurrentYear}-${String(calCurrentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === activeSchedulerDate;
    const isPast = dateStr < todayStr;
    const hasBooking = bookedDates.has(dateStr);

    html += `
      <button type="button"
        class="cal-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${isPast ? "past" : ""} ${hasBooking ? "has-booking" : ""}"
        data-date="${dateStr}"
        ${isPast ? "disabled" : ""}
        title="${dateStr}${hasBooking ? " (Has reservation)" : ""}">
        ${day}
      </button>
    `;
  }

  daysGrid.innerHTML = html;

  daysGrid.querySelectorAll(".cal-day:not(.past):not(.empty)").forEach(btn => {
    btn.addEventListener("click", () => {
      activeSchedulerDate = btn.dataset.date;
      renderPlatformCalendar();
      renderPlatformSlots();
      updatePlatformCost();
    });
  });

  const dateTitleEl = document.querySelector("#slotSelectedDateDisplay");
  if (dateTitleEl) {
    dateTitleEl.textContent = formatFullDate(activeSchedulerDate);
  }
}

function renderPlatformSlots() {
  const container = document.querySelector("#schedulerSlotGrid");
  const hiddenInput = document.querySelector("#schedulerChosenSlot");
  const stationName = document.querySelector("#schedulerStationSelect")?.value;
  const summaryEl = document.querySelector("#slotAvailabilitySummary");
  if (!container || !stationName) return;

  const bookings = getBookings();
  const bookedSlots = bookings
    .filter(b => b.station === stationName && b.bookingDate === activeSchedulerDate)
    .map(b => b.slotTime);

  const availableCount = TIME_SLOTS.filter(s => !bookedSlots.includes(s)).length;
  if (summaryEl) {
    summaryEl.textContent = `${availableCount} of ${TIME_SLOTS.length} slots available`;
    summaryEl.className = `status ${availableCount > 0 ? "available" : "busy"}`;
  }

  let currentSelected = hiddenInput?.value;
  if (!currentSelected || bookedSlots.includes(currentSelected)) {
    const firstFree = TIME_SLOTS.find(s => !bookedSlots.includes(s));
    currentSelected = firstFree || "";
    if (hiddenInput) hiddenInput.value = currentSelected;
  }

  container.innerHTML = TIME_SLOTS.map(slot => {
    const isBooked = bookedSlots.includes(slot);
    const isSelected = !isBooked && (slot === currentSelected);
    return `
      <button type="button"
        class="slot-pill ${isSelected ? "selected" : ""} ${isBooked ? "booked" : ""}"
        data-slot="${slot}"
        ${isBooked ? "disabled" : ""}>
        <span>${slot}</span>
        <span class="slot-tag">${isBooked ? "Booked" : (isSelected ? "Selected" : "Available")}</span>
      </button>
    `;
  }).join("");

  container.querySelectorAll(".slot-pill:not(.booked)").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".slot-pill").forEach(p => {
        p.classList.remove("selected");
        const tag = p.querySelector(".slot-tag");
        if (tag && !p.classList.contains("booked")) tag.textContent = "Available";
      });

      btn.classList.add("selected");
      const tag = btn.querySelector(".slot-tag");
      if (tag) tag.textContent = "Selected";

      if (hiddenInput) hiddenInput.value = btn.dataset.slot;
      updatePlatformCost();
    });
  });
}

function updatePlatformCost() {
  const stationName = document.querySelector("#schedulerStationSelect")?.value;
  const st = demoStations.find(s => s.name === stationName) || demoStations[0];
  const energyInput = document.querySelector("#schedulerEnergy");
  const kwh = Math.max(1, Number(energyInput?.value) || 20);
  const cost = kwh * st.rate;

  const costEl = document.querySelector("#schedulerCostDisplay");
  if (costEl) costEl.textContent = money(cost);

  const noteEl = document.querySelector("#schedulerRateNote");
  if (noteEl) noteEl.textContent = `(${money(st.rate)} / kWh)`;
}

function bookFromPlatformScheduler() {
  const stationName = document.querySelector("#schedulerStationSelect")?.value;
  const st = demoStations.find(s => s.name === stationName);
  const slotTime = document.querySelector("#schedulerChosenSlot")?.value;
  const vehicle = (document.querySelector("#schedulerVehicleId")?.value || "EV-1024").trim();
  const kwh = Math.max(1, Math.min(200, Number(document.querySelector("#schedulerEnergy")?.value) || 20));
  const statusMsg = document.querySelector("#schedulerStatusMsg");

  if (!st || !slotTime) {
    if (statusMsg) {
      statusMsg.textContent = "Please select an available slot.";
      statusMsg.className = "scheduler-msg error";
    }
    return;
  }

  const bookings = getBookings();
  const taken = bookings.some(b => b.station === st.name && b.bookingDate === activeSchedulerDate && b.slotTime === slotTime);
  if (taken) {
    if (statusMsg) {
      statusMsg.textContent = "This slot was already booked. Please choose another slot.";
      statusMsg.className = "scheduler-msg error";
    }
    renderPlatformSlots();
    return;
  }

  const driverName = document.querySelector("#welcomeName")?.textContent || "EV Driver";
  const newBooking = {
    id: "CS-" + Date.now().toString().slice(-6),
    station: st.name,
    energy: kwh,
    amount: kwh * st.rate,
    status: "Confirmed (demo)",
    driver: driverName,
    vehicle,
    bookingDate: activeSchedulerDate,
    slotTime,
    createdAt: new Date().toISOString()
  };

  bookings.unshift(newBooking);
  saveBookings(bookings);

  if (statusMsg) {
    statusMsg.textContent = `✓ Reserved ${slotTime} at ${st.name} for ${formatDateDisplay(activeSchedulerDate)}!`;
    statusMsg.className = "scheduler-msg success";
    setTimeout(() => { statusMsg.textContent = ""; }, 4000);
  }

  renderPlatformCalendar();
  renderPlatformSlots();
  renderBookings();
  renderOwnerCalendar();
  renderOwnerSlotTimeline();
}

// ==========================================
// 2. OWNER PLATFORM: CALENDAR & TIMELINE
// ==========================================
let ownerCalYear = new Date().getFullYear();
let ownerCalMonth = new Date().getMonth(); // 0-indexed
let activeOwnerDate = getTodayString();

function initOwnerPlatformCalendar() {
  const daysGrid = document.querySelector("#ownerCalDaysGrid");
  if (!daysGrid) return; // Only on owner.html

  // Populate station filter dropdown
  const filterSelect = document.querySelector("#ownerScheduleStationFilter");
  if (filterSelect) {
    filterSelect.innerHTML = `<option value="all">All Stations (Network Wide)</option>` +
      demoStations.map(s => `<option value="${s.name}">${s.name}</option>`).join("");

    filterSelect.addEventListener("change", renderOwnerSlotTimeline);
  }

  document.querySelector("#ownerCalPrevMonth")?.addEventListener("click", () => {
    ownerCalMonth--;
    if (ownerCalMonth < 0) {
      ownerCalMonth = 11;
      ownerCalYear--;
    }
    renderOwnerCalendar();
    renderOwnerSlotTimeline();
  });

  document.querySelector("#ownerCalNextMonth")?.addEventListener("click", () => {
    ownerCalMonth++;
    if (ownerCalMonth > 11) {
      ownerCalMonth = 0;
      ownerCalYear++;
    }
    renderOwnerCalendar();
    renderOwnerSlotTimeline();
  });

  document.querySelector("#ownerCalTodayBtn")?.addEventListener("click", () => {
    const today = new Date();
    ownerCalYear = today.getFullYear();
    ownerCalMonth = today.getMonth();
    activeOwnerDate = getTodayString();
    renderOwnerCalendar();
    renderOwnerSlotTimeline();
  });

  document.querySelector("#ownerCalTomorrowBtn")?.addEventListener("click", () => {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    ownerCalYear = tom.getFullYear();
    ownerCalMonth = tom.getMonth();
    activeOwnerDate = getOffsetDateString(1);
    renderOwnerCalendar();
    renderOwnerSlotTimeline();
  });

  renderOwnerCalendar();
  renderOwnerSlotTimeline();
}

function renderOwnerCalendar() {
  const monthYearEl = document.querySelector("#ownerCalMonthYear");
  const daysGrid = document.querySelector("#ownerCalDaysGrid");
  if (!daysGrid) return;

  if (monthYearEl) {
    monthYearEl.textContent = `${MONTH_NAMES[ownerCalMonth]} ${ownerCalYear}`;
  }

  const todayStr = getTodayString();
  const bookings = getBookings();
  const bookingCountByDate = {};
  bookings.forEach(b => {
    bookingCountByDate[b.bookingDate] = (bookingCountByDate[b.bookingDate] || 0) + 1;
  });

  const firstDay = new Date(ownerCalYear, ownerCalMonth, 1).getDay();
  const daysInMonth = new Date(ownerCalYear, ownerCalMonth + 1, 0).getDate();

  let html = "";
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${ownerCalYear}-${String(ownerCalMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === activeOwnerDate;
    const count = bookingCountByDate[dateStr] || 0;
    const hasBooking = count > 0;

    html += `
      <button type="button"
        class="cal-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${hasBooking ? "has-booking" : ""}"
        data-date="${dateStr}"
        title="${dateStr}: ${count} booking(s)">
        ${day}
      </button>
    `;
  }

  daysGrid.innerHTML = html;

  daysGrid.querySelectorAll(".cal-day:not(.empty)").forEach(btn => {
    btn.addEventListener("click", () => {
      activeOwnerDate = btn.dataset.date;
      renderOwnerCalendar();
      renderOwnerSlotTimeline();
    });
  });

  const dateTitleEl = document.querySelector("#ownerSelectedDateDisplay");
  if (dateTitleEl) {
    dateTitleEl.textContent = formatFullDate(activeOwnerDate);
  }
}

function renderOwnerSlotTimeline() {
  const timelineEl = document.querySelector("#ownerSlotTimeline");
  if (!timelineEl) return;

  const stationFilter = document.querySelector("#ownerScheduleStationFilter")?.value || "all";
  const bookings = getBookings();
  const dayBookings = bookings.filter(b =>
    b.bookingDate === activeOwnerDate &&
    (stationFilter === "all" || b.station === stationFilter)
  );

  // Update header badges
  const badgeEl = document.querySelector("#ownerDateBookingsBadge");
  if (badgeEl) {
    badgeEl.textContent = `${dayBookings.length} ${dayBookings.length === 1 ? "Booking" : "Bookings"}`;
    badgeEl.className = `status ${dayBookings.length > 0 ? "available" : "busy"}`;
  }

  const revenueEl = document.querySelector("#ownerDayRevenue");
  if (revenueEl) {
    const dayRev = dayBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    revenueEl.textContent = money(dayRev);
  }

  // Render timeline rows for each slot
  timelineEl.innerHTML = TIME_SLOTS.map(slot => {
    const matching = dayBookings.filter(b => b.slotTime === slot);

    if (matching.length > 0) {
      return matching.map(m => `
        <div class="timeline-row occupied">
          <span class="timeline-slot-time">⏰ ${slot}</span>
          <div class="timeline-driver-info">
            <span class="timeline-station-pill">⚡ ${m.station}</span>
            <b>${m.driver}</b>
            <small style="color:var(--muted)">(${m.vehicle || "EV"})</small>
            <span class="timeline-energy">${m.energy} kWh</span>
          </div>
          <div>
            <b>${money(m.amount)}</b> &nbsp;
            <span class="status available">Confirmed</span>
          </div>
        </div>
      `).join("");
    } else {
      return `
        <div class="timeline-row free">
          <span class="timeline-slot-time">⏰ ${slot}</span>
          <span class="timeline-free-tag">No reservations (Available for drivers)</span>
          <span class="status" style="background:#f0f4fa;color:#6b829e">Free Slot</span>
        </div>
      `;
    }
  }).join("");
}

// ==========================================
// 3. STATIONS LIST & MODAL BOOKING
// ==========================================
function renderStations() {
  const list = document.querySelector("#stationList");
  if (!list) return;
  const q = (document.querySelector("#search")?.value || "").toLowerCase();
  const filter = document.querySelector("#filter")?.value || "all";
  const sort = document.querySelector("#sort")?.value || "recommended";
  let rows = demoStations.filter(s => (s.name + " " + s.area).toLowerCase().includes(q) && (filter === "all" || s.status === filter));
  if (sort === "price") rows.sort((a, b) => a.rate - b.rate);
  if (sort === "wait") rows.sort((a, b) => a.wait - b.wait);

  list.innerHTML = rows.map(s => `
    <article class="station-card">
      <div class="station-top">
        <span class="station-icon">⚡</span>
        <span class="status ${s.status}">${s.status === "available" ? `${s.slots} slots available` : "Busy · 0 slots"}</span>
      </div>
      <h3>${s.name}</h3>
      <p>${s.area} · ${s.distance} km · ${s.type}</p>
      <div class="station-bottom">
        <div>
          <b>${money(s.rate)}</b>
          <small>/ kWh · ${s.wait} min wait</small>
        </div>
        <button class="btn ${s.status === "available" ? "primary" : "secondary"} book" data-id="${s.id}" ${s.status !== "available" ? "disabled" : ""}>
          ${s.status === "available" ? "Book slot" : "Full"}
        </button>
      </div>
    </article>
  `).join("") || "<p>No stations match the filters.</p>";

  list.querySelectorAll(".book").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      const st = demoStations.find(s => s.id === id);

      const stationSelect = document.querySelector("#schedulerStationSelect");
      if (stationSelect && st) {
        stationSelect.value = st.name;
        renderPlatformSlots();
        updatePlatformCost();
      }

      openBooking(id);
    });
  });
}

function openBooking(id) {
  selectedStation = demoStations.find(s => s.id === id);
  if (!selectedStation) return;

  const modal = document.querySelector("#bookingModal");
  if (!modal) return;

  document.querySelector("#modalTitle").textContent = selectedStation.name;
  document.querySelector("#energy").value = 20;

  const dateInput = document.querySelector("#bookingDate");
  const todayStr = getTodayString();
  if (dateInput) {
    dateInput.min = todayStr;
    dateInput.value = todayStr;
  }

  document.querySelectorAll("#dateQuickPills .pill-btn").forEach((btn, i) => {
    btn.classList.toggle("active", i === 0);
  });

  renderSlotGrid(selectedStation.name, todayStr);
  updateEstimate();
  modal.classList.remove("hidden");
}

function renderSlotGrid(stationName, dateStr) {
  const container = document.querySelector("#slotGrid");
  const hiddenInput = document.querySelector("#selectedSlot");
  const countInfo = document.querySelector("#slotCountInfo");
  if (!container) return;

  const bookings = getBookings();
  const bookedSlots = bookings
    .filter(b => b.station === stationName && b.bookingDate === dateStr)
    .map(b => b.slotTime);

  const availableCount = TIME_SLOTS.filter(s => !bookedSlots.includes(s)).length;
  if (countInfo) {
    countInfo.textContent = `(${availableCount} of ${TIME_SLOTS.length} slots available)`;
  }

  let currentSelected = hiddenInput?.value;
  if (!currentSelected || bookedSlots.includes(currentSelected)) {
    const firstFree = TIME_SLOTS.find(s => !bookedSlots.includes(s));
    currentSelected = firstFree || "";
    if (hiddenInput) hiddenInput.value = currentSelected;
  }

  container.innerHTML = TIME_SLOTS.map(slot => {
    const isBooked = bookedSlots.includes(slot);
    const isSelected = !isBooked && (slot === currentSelected);
    return `
      <button type="button"
        class="slot-pill ${isSelected ? "selected" : ""} ${isBooked ? "booked" : ""}"
        data-slot="${slot}"
        ${isBooked ? "disabled" : ""}>
        <span>${slot}</span>
        <span class="slot-tag">${isBooked ? "Booked" : (isSelected ? "Selected" : "Available")}</span>
      </button>
    `;
  }).join("");

  container.querySelectorAll(".slot-pill:not(.booked)").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".slot-pill").forEach(p => {
        p.classList.remove("selected");
        const tag = p.querySelector(".slot-tag");
        if (tag && !p.classList.contains("booked")) tag.textContent = "Available";
      });

      btn.classList.add("selected");
      const tag = btn.querySelector(".slot-tag");
      if (tag) tag.textContent = "Selected";

      const slot = btn.dataset.slot;
      if (hiddenInput) hiddenInput.value = slot;
      updateEstimate();
    });
  });
}

function updateEstimate() {
  if (!selectedStation) return;
  const kwh = Math.max(0, Number(document.querySelector("#energy")?.value) || 0);
  const cost = kwh * selectedStation.rate;
  const dateStr = document.querySelector("#bookingDate")?.value || getTodayString();
  const slotStr = document.querySelector("#selectedSlot")?.value || "10:00 AM - 11:00 AM";

  const costEl = document.querySelector("#costEstimate");
  if (costEl) costEl.textContent = money(cost);

  const summaryEnergy = document.querySelector("#summaryEnergy");
  if (summaryEnergy) summaryEnergy.textContent = `${kwh} kWh`;

  const summaryDateTime = document.querySelector("#summaryDateTime");
  if (summaryDateTime) summaryDateTime.textContent = `${formatDateDisplay(dateStr)} • ${slotStr}`;
}

// Modal date listeners
document.querySelector("#bookingDate")?.addEventListener("change", (e) => {
  const dateStr = e.target.value;
  const todayStr = getTodayString();
  const tomStr = getOffsetDateString(1);
  const twoStr = getOffsetDateString(2);

  document.querySelectorAll("#dateQuickPills .pill-btn").forEach(btn => {
    const offset = Number(btn.dataset.offset);
    const matches = (offset === 0 && dateStr === todayStr) ||
                    (offset === 1 && dateStr === tomStr) ||
                    (offset === 2 && dateStr === twoStr);
    btn.classList.toggle("active", matches);
  });

  if (selectedStation) renderSlotGrid(selectedStation.name, dateStr);
  updateEstimate();
});

document.querySelectorAll("#dateQuickPills .pill-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#dateQuickPills .pill-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const offset = Number(btn.dataset.offset);
    const targetDate = getOffsetDateString(offset);

    const dateInput = document.querySelector("#bookingDate");
    if (dateInput) dateInput.value = targetDate;

    if (selectedStation) renderSlotGrid(selectedStation.name, targetDate);
    updateEstimate();
  });
});

document.querySelector("#energy")?.addEventListener("input", updateEstimate);
document.querySelector("#closeModal")?.addEventListener("click", () => {
  document.querySelector("#bookingModal")?.classList.add("hidden");
});

document.querySelector("#confirmBooking")?.addEventListener("click", () => {
  if (!selectedStation) return;
  const energy = Math.max(1, Math.min(200, Number(document.querySelector("#energy").value) || 20));
  const bookingDate = document.querySelector("#bookingDate")?.value || getTodayString();
  const slotTime = document.querySelector("#selectedSlot")?.value;

  if (!slotTime) {
    alert("Please select an available time slot.");
    return;
  }

  const bookings = getBookings();
  const isTaken = bookings.some(b => b.station === selectedStation.name && b.bookingDate === bookingDate && b.slotTime === slotTime);
  if (isTaken) {
    alert("This slot was just reserved. Please pick another available time slot.");
    renderSlotGrid(selectedStation.name, bookingDate);
    return;
  }

  const amount = energy * selectedStation.rate;
  const driverName = document.querySelector("#welcomeName")?.textContent || "EV Driver";
  const vehicle = (document.querySelector("#vehicleId")?.value || "EV-1024").trim();

  const newBooking = {
    id: "CS-" + Date.now().toString().slice(-6),
    station: selectedStation.name,
    energy,
    amount,
    status: "Confirmed (demo)",
    driver: driverName,
    vehicle,
    bookingDate,
    slotTime,
    createdAt: new Date().toISOString()
  };

  bookings.unshift(newBooking);
  saveBookings(bookings);

  document.querySelector("#bookingModal")?.classList.add("hidden");
  renderBookings();
  renderPlatformCalendar();
  renderPlatformSlots();
  renderOwnerCalendar();
  renderOwnerSlotTimeline();
});

// ==========================================
// 4. RENDER BOOKINGS & SCHEDULE TABLES
// ==========================================
function renderBookings() {
  const allBookings = getBookings();
  const count = document.querySelector("#bookingCount");
  if (count) count.textContent = allBookings.length;

  // Driver Table Render
  const driverRows = document.querySelector("#bookingRows");
  if (driverRows) {
    driverRows.innerHTML = allBookings.map(b => `
      <tr>
        <td><b>${b.id}</b><br><small style="color:var(--muted)">${b.vehicle || 'EV'}</small></td>
        <td>${b.station}</td>
        <td><span class="date-badge">📅 ${formatDateDisplay(b.bookingDate)}</span></td>
        <td><span class="time-badge">⏰ ${b.slotTime || 'Flexible'}</span></td>
        <td>${b.energy} kWh</td>
        <td><b>${money(b.amount)}</b></td>
        <td><span class="status available">${b.status}</span></td>
      </tr>
    `).join("") || '<tr><td colspan="7">No bookings yet. Choose an available station above to book a date and time slot.</td></tr>';
  }

  // Owner Table & Schedule Bar Render
  const ownerRows = document.querySelector("#ownerBookingRows");
  if (ownerRows) {
    const dateFilter = document.querySelector("#ownerDateFilter")?.value;
    const filtered = dateFilter
      ? allBookings.filter(b => b.bookingDate === dateFilter)
      : allBookings;

    ownerRows.innerHTML = filtered.map(b => `
      <tr>
        <td><b>${b.id}</b></td>
        <td>${b.driver}</td>
        <td>${b.station}</td>
        <td><span class="date-badge">📅 ${formatDateDisplay(b.bookingDate)}</span></td>
        <td><span class="time-badge">⏰ ${b.slotTime || 'Flexible'}</span></td>
        <td>${b.energy} kWh</td>
        <td><b>${money(b.amount)}</b></td>
        <td><span class="status available">${b.status}</span></td>
      </tr>
    `).join("") || `<tr><td colspan="8">No reservations found ${dateFilter ? `for ${formatDateDisplay(dateFilter)}` : ""}.</td></tr>`;

    // Update Schedule Summary Bar in Owner Console
    const todayStr = getTodayString();
    const todayCount = allBookings.filter(b => b.bookingDate === todayStr).length;
    const upcomingCount = allBookings.filter(b => b.bookingDate > todayStr).length;
    const totalEnergy = allBookings.reduce((sum, b) => sum + (Number(b.energy) || 0), 0);

    const todayEl = document.querySelector("#todaySlotsCount");
    if (todayEl) todayEl.textContent = todayCount;

    const upcomingEl = document.querySelector("#upcomingSlotsCount");
    if (upcomingEl) upcomingEl.textContent = upcomingCount;

    const energyEl = document.querySelector("#totalEnergyReserved");
    if (energyEl) energyEl.textContent = `${totalEnergy} kWh`;

    const totalSlotsEl = document.querySelector("#totalSlotsCount");
    if (totalSlotsEl) totalSlotsEl.textContent = allBookings.length;

    const rev = document.querySelector("#revenue");
    if (rev) rev.textContent = money(allBookings.reduce((sum, b) => sum + b.amount, 0));
  }
}

// Owner Date Filter Listeners
document.querySelector("#ownerDateFilter")?.addEventListener("change", renderBookings);
document.querySelector("#clearDateFilter")?.addEventListener("click", () => {
  const input = document.querySelector("#ownerDateFilter");
  if (input) input.value = "";
  renderBookings();
});

// Render Chargers
function renderChargers() {
  const list = document.querySelector("#chargerList");
  if (!list) return;
  const chargers = getChargers();
  list.innerHTML = chargers.map(c => `
    <article class="charger-card">
      <div>
        <span class="station-icon">⚡</span>
        <h3>${c.name}</h3>
        <p>${money(c.rate)}/kWh</p>
      </div>
      <div>
        <span class="status ${c.status}">${c.status}</span>
        <button class="btn secondary toggle" data-id="${c.id}">Change status</button>
      </div>
    </article>
  `).join("");

  list.querySelectorAll(".toggle").forEach(btn => btn.addEventListener("click", () => {
    const all = getChargers();
    const c = all.find(x => x.id === Number(btn.dataset.id));
    c.status = c.status === "available" ? "busy" : "available";
    saveChargers(all);
    renderChargers();
    updateOwnerStats();
  }));

  updateOwnerStats();
}

function updateOwnerStats() {
  const all = getChargers();
  const total = document.querySelector("#totalChargers");
  if (total) total.textContent = all.length;
  const available = document.querySelector("#availableChargers");
  if (available) available.textContent = all.filter(c => c.status === "available").length;
  const utilization = document.querySelector("#utilization");
  if (utilization) utilization.textContent = Math.round((all.filter(c => c.status === "busy").length / Math.max(all.length, 1)) * 100) + "%";
}

// Driver search & filter listeners
document.querySelector("#search")?.addEventListener("input", renderStations);
document.querySelector("#filter")?.addEventListener("change", renderStations);
document.querySelector("#sort")?.addEventListener("change", renderStations);
document.querySelector("#navigateNearby")?.addEventListener("click", () => location.href = "ev-navigation.html");

// Add Charger & Export CSV listeners
document.querySelector("#addCharger")?.addEventListener("click", () => {
  const all = getChargers();
  all.push({id: Date.now(), name: `Charger ${String(all.length + 1).padStart(2, "0")}`, status: "available", rate: 14.5});
  saveChargers(all);
  renderChargers();
});

document.querySelector("#exportCsv")?.addEventListener("click", () => {
  const rows = getBookings();
  const csv = [
    ["Booking ID", "Driver", "Station", "Date", "Slot Time", "Energy kWh", "Amount", "Status"],
    ...rows.map(b => [
      b.id,
      b.driver,
      b.station,
      b.bookingDate || getTodayString(),
      b.slotTime || "Flexible",
      b.energy,
      b.amount,
      b.status
    ])
  ].map(r => r.map(x => `"${String(x ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chargesmart-bookings-schedule.csv";
  a.click();
  URL.revokeObjectURL(url);
});

// Initialization
renderStations();
renderBookings();
renderChargers();
initDriverPlatformCalendar();
initOwnerPlatformCalendar();
guardAndName();
