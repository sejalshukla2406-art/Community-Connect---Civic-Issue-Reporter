
let issues = [];
let map;
let markerGroup;
let tempPin = null;
let categoryChartInstance = null;


const initialMockIssues = [
  {
    id: 1,
    title: "Large pothole on main avenue",
    category: "Roads",
    description: "Deep pothole causing traffic jams near the crossing.",
    latitude: 28.6139,
    longitude: 77.2090,
    status: "REPORTED",
    upvotes: 8,
    isAnonymous: false
  },
  {
    id: 2,
    title: "Overflowing dumpster",
    category: "Sanitation",
    description: "Garbage accumulating outside society gate for 3 days.",
    latitude: 28.6200,
    longitude: 77.2150,
    status: "IN_PROGRESS",
    upvotes: 14,
    isAnonymous: true
  },
  {
    id: 3,
    title: "Broken streetlight near playground",
    category: "Lighting",
    description: "Entire corner is completely dark at night.",
    latitude: 28.6080,
    longitude: 77.2020,
    status: "RESOLVED",
    upvotes: 5,
    isAnonymous: false
  }
];


document.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadIssues();
  setupEventListeners();
});

function initMap() {
  map = L.map("map").setView([28.6139, 77.2090], 14);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  markerGroup = L.layerGroup().addTo(map);


  map.on("click", (e) => {
    setCoordinates(e.latlng.lat, e.latlng.lng);
  });
}

function setCoordinates(lat, lng) {
  document.getElementById("coordinates").value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  if (tempPin) {
    map.removeLayer(tempPin);
  }

  tempPin = L.marker([lat, lng], {
    icon: L.divIcon({
      className: "custom-pin",
      html: "<div style='font-size: 24px;'>📍</div>",
      iconSize: [24, 24],
      iconAnchor: [12, 24]
    })
  }).addTo(map);
}


function getUserLocation() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  const geoBtn = document.getElementById("geoBtn");
  geoBtn.innerText = "Locating...";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      map.setView([lat, lng], 16);
      setCoordinates(lat, lng);
      geoBtn.innerText = "📍 Detect GPS";
    },
    (err) => {
      alert("Could not fetch location: " + err.message);
      geoBtn.innerText = "📍 Detect GPS";
    },
    { enableHighAccuracy: true }
  );
}


function loadIssues() {
  const saved = localStorage.getItem("community_issues");
  issues = saved ? JSON.parse(saved) : [...initialMockIssues];
  renderAll();
}

function saveIssues() {
  localStorage.setItem("community_issues", JSON.stringify(issues));
  renderAll();
}


function renderAll() {
  renderMapMarkers();
  renderFeedList();
  renderStats();
  renderChart();
}

function renderMapMarkers() {
  markerGroup.clearLayers();

  issues.forEach((issue) => {
    const color =
      issue.status === "RESOLVED"
        ? "#16a34a"
        : issue.status === "IN_PROGRESS"
        ? "#f59e0b"
        : "#dc2626";

    const marker = L.circleMarker([issue.latitude, issue.longitude], {
      radius: 8,
      fillColor: color,
      color: "#ffffff",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    }).addTo(markerGroup);

    const popupHtml = `
      <div style="font-family: inherit; min-width: 170px;">
        <h4 style="margin: 0 0 4px 0; font-size: 14px;">${escapeHtml(issue.title)}</h4>
        <p style="margin: 2px 0; font-size: 12px; color: #64748b;">Category: <b>${issue.category}</b></p>
        <p style="margin: 2px 0; font-size: 12px;">Status: <b>${issue.status}</b></p>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <span style="font-size: 13px;">👍 <b>${issue.upvotes}</b></span>
          <button onclick="upvoteIssue(${issue.id})" style="padding: 3px 8px; font-size: 11px; cursor: pointer;">Upvote</button>
        </div>
      </div>
    `;
    marker.bindPopup(popupHtml);
  });
}

function renderFeedList() {
  const feed = document.getElementById("issuesList");
  const filter = document.getElementById("filterCategory").value;

  const filtered = filter === "ALL" 
    ? issues 
    : issues.filter((i) => i.category === filter);

  if (filtered.length === 0) {
    feed.innerHTML = `<p class="empty-state">No issues reported in this category.</p>`;
    return;
  }

  feed.innerHTML = filtered
    .map((item) => {
      const badgeClass =
        item.status === "RESOLVED"
          ? "badge-resolved"
          : item.status === "IN_PROGRESS"
          ? "badge-progress"
          : "badge-reported";

      return `
        <div class="issue-card">
          <div class="issue-card-header">
            <h4>${escapeHtml(item.title)}</h4>
            <span class="badge ${badgeClass}">${item.status}</span>
          </div>
          <p style="font-size: 0.85rem; color: #475569;">${escapeHtml(item.description || "No description provided.")}</p>
          <div class="issue-card-footer">
            <span style="font-size: 0.8rem; color: #64748b;">🏷️ ${item.category}</span>
            <button class="upvote-btn" onclick="upvoteIssue(${item.id})">👍 ${item.upvotes} Upvotes</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderStats() {
  const activeCount = issues.filter((i) => i.status !== "RESOLVED").length;
  document.getElementById("activeCount").innerText = activeCount;

  const summary = document.getElementById("statusSummary");
  if (summary) {
    const reported = issues.filter((i) => i.status === "REPORTED").length;
    const progress = issues.filter((i) => i.status === "IN_PROGRESS").length;
    const resolved = issues.filter((i) => i.status === "RESOLVED").length;

    summary.innerHTML = `
      <div style="margin-top: 15px; font-size: 0.85rem; line-height: 1.6;">
        <p>🔴 <b>${reported}</b> Reported</p>
        <p>🟡 <b>${progress}</b> In Progress</p>
        <p>🟢 <b>${resolved}</b> Resolved</p>
      </div>
    `;
  }
}


function renderChart() {
  const chartCanvas = document.getElementById("categoryChart");
  if (!chartCanvas) return;

  const counts = {};
  issues.forEach((i) => {
    counts[i.category] = (counts[i.category] || 0) + 1;
  });

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  categoryChartInstance = new Chart(chartCanvas, {
    type: "doughnut",
    data: {
      labels: Object.keys(counts),
      datasets: [
        {
          data: Object.values(counts),
          backgroundColor: ["#ef4444", "#f97316", "#3b82f6", "#10b981", "#8b5cf6"]
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" }
      }
    }
  });
}


window.upvoteIssue = function (id) {
  const target = issues.find((i) => i.id === id);
  if (target) {
    target.upvotes += 1;
    saveIssues();
  }
};

window.filterIssuesList = function () {
  renderFeedList();
};

window.switchTab = function (tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));

  if (tabName === "report") {
    document.getElementById("tabReportBtn").classList.add("active");
    document.getElementById("reportTab").classList.add("active");
  } else if (tabName === "feed") {
    document.getElementById("tabFeedBtn").classList.add("active");
    document.getElementById("feedTab").classList.add("active");
  } else if (tabName === "analytics") {
    document.getElementById("tabAnalyticsBtn").classList.add("active");
    document.getElementById("analyticsTab").classList.add("active");
    renderChart();
  }
};


function setupEventListeners() {
  document.getElementById("geoBtn").addEventListener("click", getUserLocation);

  document.getElementById("issueForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const rawCoords = document.getElementById("coordinates").value.split(",");
    if (rawCoords.length !== 2) {
      alert("Please select a location on the map or use GPS.");
      return;
    }

    const newIssue = {
      id: Date.now(),
      title: document.getElementById("title").value.trim(),
      category: document.getElementById("category").value,
      description: document.getElementById("description").value.trim(),
      latitude: parseFloat(rawCoords[0]),
      longitude: parseFloat(rawCoords[1]),
      status: "REPORTED",
      upvotes: 0,
      isAnonymous: document.getElementById("isAnonymous").checked
    };

    issues.unshift(newIssue);
    saveIssues();

    
    e.target.reset();
    if (tempPin) {
      map.removeLayer(tempPin);
      tempPin = null;
    }

    alert("Issue reported successfully!");
    switchTab("feed");
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}