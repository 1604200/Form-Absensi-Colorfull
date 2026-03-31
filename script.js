const page1 = document.getElementById("page1");
const page2 = document.getElementById("page2");
const openBtn = document.getElementById("openBtn");
const backBtn = document.getElementById("backBtn");

const idCardInput = document.getElementById("idCard");
const namaInput = document.getElementById("nama");
const nimInput = document.getElementById("nim");
const jurusanInput = document.getElementById("jurusan");
const hariKeInput = document.getElementById("hariKe");
const tanggalInput = document.getElementById("tanggal");
const keteranganInput = document.getElementById("keterangan");
const manualIdCardInput = document.getElementById("manualIdCard");

const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");
const printBtn = document.getElementById("printBtn");

const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const filterDate = document.getElementById("filterDate");

const printNama = document.getElementById("printNama");
const printNim = document.getElementById("printNim");
const printJurusan = document.getElementById("printJurusan");
const printIdCard = document.getElementById("printIdCard");

const outNama = document.getElementById("outNama");
const outNim = document.getElementById("outNim");
const outJurusan = document.getElementById("outJurusan");
const outIdCard = document.getElementById("outIdCard");
const printGeneratedTime = document.getElementById("printGeneratedTime");
const printTableBody = document.getElementById("printTableBody");

const tableBody = document.getElementById("tableBody");
const emptyState = document.getElementById("emptyState");

const video = document.getElementById("video");
const canvasCapture = document.getElementById("canvasCapture");
const startCameraBtn = document.getElementById("startCameraBtn");
const scanBtn = document.getElementById("scanBtn");
const stopCameraBtn = document.getElementById("stopCameraBtn");
const resetScanBtn = document.getElementById("resetScanBtn");
const ocrResult = document.getElementById("ocrResult");

const themeDots = document.querySelectorAll(".theme-dot");

let attendanceData = [];
let cameraStream = null;
let editingId = null;

document.addEventListener("DOMContentLoaded", () => {
  initHariOptions();
  initDefaultDate();
  loadStorage();
  loadTheme();
  renderTable();

  openBtn.addEventListener("click", () => showPage(2));
  backBtn.addEventListener("click", () => showPage(1));

  saveBtn.addEventListener("click", saveAttendance);
  clearBtn.addEventListener("click", clearForm);
  printBtn.addEventListener("click", printAttendance);

  startCameraBtn.addEventListener("click", startCamera);
  stopCameraBtn.addEventListener("click", stopCamera);
  scanBtn.addEventListener("click", scanIdCard);
  resetScanBtn.addEventListener("click", resetScanResult);

  searchInput.addEventListener("input", renderTable);
  filterStatus.addEventListener("change", renderTable);
  filterDate.addEventListener("change", renderTable);

  [namaInput, nimInput, jurusanInput, idCardInput].forEach((el) => {
    el.addEventListener("input", syncPrintIdentity);
  });

  themeDots.forEach((dot) => {
    dot.addEventListener("click", () => setTheme(dot.dataset.theme));
  });
});

function showPage(pageNumber) {
  if (pageNumber === 1) {
    page1.classList.add("active");
    page2.classList.remove("active");
    stopCamera();
  } else {
    page2.classList.add("active");
    page1.classList.remove("active");
  }
}

function initHariOptions() {
  hariKeInput.innerHTML = '<option value="">Pilih hari</option>';
  for (let i = 1; i <= 365; i++) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = String(i);
    hariKeInput.appendChild(option);
  }
}

function initDefaultDate() {
  tanggalInput.value = toISODate(new Date());
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTanggal(date) {
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function formatCreated(date) {
  const datePart = date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  const timePart = date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  return `${datePart}, ${timePart}`;
}

function formatPrintMeta(date) {
  return date.toLocaleString("en-US", {
    year: "2-digit",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function syncPrintIdentity() {
  if (!printNama.value.trim()) printNama.value = namaInput.value.trim();
  if (!printNim.value.trim()) printNim.value = nimInput.value.trim();
  if (!printJurusan.value.trim()) printJurusan.value = jurusanInput.value.trim();
  if (!printIdCard.value.trim()) printIdCard.value = idCardInput.value.trim();
}

function saveStorage() {
  localStorage.setItem("attendance_coquette_cat_mix", JSON.stringify(attendanceData));
}

function loadStorage() {
  try {
    const raw = localStorage.getItem("attendance_coquette_cat_mix");
    attendanceData = raw ? JSON.parse(raw) : [];
  } catch {
    attendanceData = [];
  }
}

function saveAttendance() {
  const idCard = (manualIdCardInput.value.trim() || idCardInput.value.trim());
  const nama = namaInput.value.trim();
  const nim = nimInput.value.trim();
  const jurusan = jurusanInput.value.trim();
  const hariKe = hariKeInput.value.trim();
  const tanggalISO = tanggalInput.value;
  const keterangan = keteranganInput.value;

  if (!idCard || !nama || !nim || !jurusan || !hariKe || !tanggalISO || !keterangan) {
    alert("Isi semua data dulu ya.");
    return;
  }

  if (editingId) {
    const target = attendanceData.find((item) => item.uid === editingId);
    if (!target) return;

    target.idCard = idCard;
    target.nama = nama;
    target.nim = nim;
    target.jurusan = jurusan;
    target.hariKe = hariKe;
    target.tanggalISO = tanggalISO;
    target.tanggalLabel = formatTanggal(new Date(tanggalISO));
    target.keterangan = keterangan;

    saveStorage();
    renderTable();
    fillPrintIdentity(target);
    resetMiniForm();
    editingId = null;
    saveBtn.querySelector(".menu-text").textContent = "Save";
    animateButton(saveBtn);
    return;
  }

  const selectedDate = new Date(tanggalISO);
  const now = new Date();

  const newItem = {
    uid: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    idCard,
    nama,
    nim,
    jurusan,
    hariKe,
    tanggalISO,
    tanggalLabel: formatTanggal(selectedDate),
    keterangan,
    dibuat: formatCreated(now)
  };

  attendanceData.push(newItem);
  saveStorage();
  renderTable();
  fillPrintIdentity(newItem);
  resetMiniForm();
  animateButton(saveBtn);
}

function fillPrintIdentity(item) {
  printNama.value = item.nama;
  printNim.value = item.nim;
  printJurusan.value = item.jurusan;
  printIdCard.value = item.idCard;
}

function resetMiniForm() {
  manualIdCardInput.value = "";
  hariKeInput.value = "";
  tanggalInput.value = toISODate(new Date());
  keteranganInput.value = "Hadir";
}

function clearForm() {
  idCardInput.value = "";
  namaInput.value = "";
  nimInput.value = "";
  jurusanInput.value = "";
  manualIdCardInput.value = "";
  hariKeInput.value = "";
  tanggalInput.value = toISODate(new Date());
  keteranganInput.value = "Hadir";
  editingId = null;
  saveBtn.querySelector(".menu-text").textContent = "Save";
}

function getFilteredData() {
  const keyword = searchInput.value.trim().toLowerCase();
  const status = filterStatus.value;
  const date = filterDate.value;

  return attendanceData.filter((item) => {
    const matchKeyword =
      item.idCard.toLowerCase().includes(keyword) ||
      item.nama.toLowerCase().includes(keyword) ||
      item.jurusan.toLowerCase().includes(keyword) ||
      item.nim.toLowerCase().includes(keyword);

    const matchStatus = !status || item.keterangan === status;
    const matchDate = !date || item.tanggalISO === date;

    return matchKeyword && matchStatus && matchDate;
  });
}

function renderTable() {
  const filteredData = getFilteredData();
  tableBody.innerHTML = "";

  if (filteredData.length === 0) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  filteredData.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "table-row";

    row.innerHTML = `
      <div class="table-cell">${index + 1}</div>
      <div class="table-cell id">${escapeHtml(item.idCard)}</div>
      <div class="table-cell">${escapeHtml(item.hariKe)}</div>
      <div class="table-cell small">${escapeHtml(item.tanggalLabel)}</div>
      <div class="table-cell">
        <span class="badge-status ${getBadgeClass(item.keterangan)}">${escapeHtml(item.keterangan)}</span>
      </div>
      <div class="table-cell small">${escapeHtml(item.dibuat)}</div>
      <div class="table-cell">
        <div class="action-group">
          <button class="edit-small" data-id="${item.uid}" type="button">Edit</button>
          <button class="delete-icon-btn" data-id="${item.uid}" type="button" title="Hapus">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"/>
              <path d="M8 6V4.8A1.8 1.8 0 0 1 9.8 3h4.4A1.8 1.8 0 0 1 16 4.8V6"/>
              <path d="M6.5 6l.9 13.1A2 2 0 0 0 9.4 21h5.2a2 2 0 0 0 2-1.9L17.5 6"/>
              <path d="M10 10v6"/>
              <path d="M14 10v6"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    row.querySelector(".edit-small").addEventListener("click", () => editAttendance(item.uid));
    row.querySelector(".delete-icon-btn").addEventListener("click", () => deleteAttendance(item.uid));
    tableBody.appendChild(row);
  });
}

function getBadgeClass(status) {
  if (status === "Hadir") return "hadir";
  if (status === "Izin") return "izin";
  if (status === "Sakit") return "sakit";
  return "alpha";
}

function editAttendance(uid) {
  const item = attendanceData.find((row) => row.uid === uid);
  if (!item) return;

  editingId = uid;
  idCardInput.value = item.idCard;
  namaInput.value = item.nama;
  nimInput.value = item.nim;
  jurusanInput.value = item.jurusan;
  hariKeInput.value = item.hariKe;
  tanggalInput.value = item.tanggalISO;
  keteranganInput.value = item.keterangan;
  manualIdCardInput.value = item.idCard;
  saveBtn.querySelector(".menu-text").textContent = "Update";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function deleteAttendance(uid) {
  attendanceData = attendanceData.filter((item) => item.uid !== uid);
  saveStorage();
  renderTable();
}

function animateButton(button) {
  button.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.06)" },
      { transform: "scale(1)" }
    ],
    { duration: 240, easing: "ease" }
  );
}

function buildPrintTable() {
  const filteredData = getFilteredData();
  printTableBody.innerHTML = "";

  filteredData.forEach((item, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(item.idCard)}</td>
      <td>${escapeHtml(item.hariKe)}</td>
      <td>${escapeHtml(item.tanggalLabel)}</td>
      <td>${escapeHtml(item.keterangan)}</td>
      <td>${escapeHtml(item.dibuat)}</td>
    `;
    printTableBody.appendChild(row);
  });
}

function printAttendance() {
  const latest = attendanceData[attendanceData.length - 1] || null;

  outNama.textContent = printNama.value.trim() || latest?.nama || namaInput.value.trim() || "-";
  outNim.textContent = printNim.value.trim() || latest?.nim || nimInput.value.trim() || "-";
  outJurusan.textContent = printJurusan.value.trim() || latest?.jurusan || jurusanInput.value.trim() || "-";
  outIdCard.textContent = printIdCard.value.trim() || latest?.idCard || idCardInput.value.trim() || "-";

  printGeneratedTime.textContent = formatPrintMeta(new Date());
  buildPrintTable();
  window.print();
}

/* camera - hanya ID Card */
async function startCamera() {
  try {
    if (cameraStream) return;

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    video.srcObject = cameraStream;
    ocrResult.textContent = "Kamera aktif. Siap untuk scan ID card.";
  } catch (error) {
    console.error(error);
    alert("Tidak bisa membuka kamera. Pastikan izin kamera aktif.");
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  video.srcObject = null;
}

function resetScanResult() {
  ocrResult.textContent = "Belum ada hasil scan.";
  idCardInput.value = "";
  manualIdCardInput.value = "";
}

async function scanIdCard() {
  if (!video.srcObject) {
    alert("Aktifkan kamera dulu.");
    return;
  }

  try {
    ocrResult.textContent = "Sedang membaca ID card...";

    const ctx = canvasCapture.getContext("2d");
    canvasCapture.width = video.videoWidth || 1280;
    canvasCapture.height = video.videoHeight || 720;
    ctx.drawImage(video, 0, 0, canvasCapture.width, canvasCapture.height);

    const result = await Tesseract.recognize(canvasCapture, "eng+ind", {
      logger: (info) => {
        if (info.status === "recognizing text") {
          ocrResult.textContent = `Sedang membaca ID card... ${Math.round((info.progress || 0) * 100)}%`;
        }
      }
    });

    const rawText = result?.data?.text || "";
    const detectedIdCard = extractIdCardOnly(rawText);

    if (!detectedIdCard) {
      ocrResult.textContent = "ID Card tidak terdeteksi. Coba ulang dengan pencahayaan lebih terang.";
      return;
    }

    idCardInput.value = detectedIdCard;
    manualIdCardInput.value = detectedIdCard;
    printIdCard.value = detectedIdCard;

    if (!hariKeInput.value) {
      hariKeInput.value = String(attendanceData.length + 1);
    }

    tanggalInput.value = toISODate(new Date());
    ocrResult.textContent = `ID Card: ${detectedIdCard}\n\nNama, NIM, dan Jurusan silakan isi manual.`;
  } catch (error) {
    console.error(error);
    ocrResult.textContent = "Scan gagal. Coba lagi dengan pencahayaan lebih terang.";
  }
}

function extractIdCardOnly(text) {
  const cleaned = text.replace(/\r/g, "\n").replace(/[|]/g, "I").trim();
  const lines = cleaned.split("\n").map(line => line.trim()).filter(Boolean);

  let idCard = findLabelValue(lines, ["id card", "idcard", "id"]);
  if (idCard) return normalizeIdCard(idCard);

  const matchCode = cleaned.match(/[A-Z]{2,}\s?\d{1,8}/);
  if (matchCode) return normalizeIdCard(matchCode[0]);

  const matchNumber = cleaned.match(/\b\d{2,8}\b/);
  if (matchNumber) return `PKL ${matchNumber[0]}`;

  return "";
}

function normalizeIdCard(value) {
  return value
    .replace(/[^\w\s\-/.]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .toUpperCase();
}

function findLabelValue(lines, labels) {
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const label of labels) {
      if (lower.includes(label)) {
        const parts = line.split(/[:\-]/);
        if (parts.length > 1) {
          return parts.slice(1).join(" ").trim();
        }
        return line.replace(new RegExp(label, "ig"), "").trim();
      }
    }
  }
  return "";
}

/* theme */
function setTheme(themeName) {
  document.body.classList.remove(
    "theme-pastel-pink",
    "theme-pastel-blue",
    "theme-pastel-green",
    "theme-pastel-brown"
  );

  if (themeName !== "pastel-purple") {
    document.body.classList.add(`theme-${themeName}`);
  }

  localStorage.setItem("attendance_theme_choice", themeName);
  updateThemeActive(themeName);
}

function loadTheme() {
  const storedTheme = localStorage.getItem("attendance_theme_choice") || "pastel-purple";
  setTheme(storedTheme);
}

function updateThemeActive(themeName) {
  themeDots.forEach((dot) => {
    dot.classList.toggle("active", dot.dataset.theme === themeName);
  });
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}