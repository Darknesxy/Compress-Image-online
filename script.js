/* =========================
   IMAGE COMPRESSOR PRO JS
   ========================= */

const state = {
  files: [],
  compressedSizes: [],
  compressedUrls: [],   // per-image compressed dataURL
  totalSaved: 0
};

window.addEventListener("DOMContentLoaded", () => {
  initUpload();
  initControls();
  initRating();
  initFab();
  initPresets();
});

// ---------- UPLOAD & PREVIEW ----------
function initUpload() {
  const uploadZone = document.getElementById("uploadZone");
  const fileInput = document.getElementById("fileInput");
  const imagesBox = document.getElementById("imagesContainer");

  if (!uploadZone || !fileInput || !imagesBox) return;

  ["dragenter", "dragover"].forEach(ev =>
    uploadZone.addEventListener(ev, e => {
      e.preventDefault();
      uploadZone.classList.add("dragging");
    })
  );

  ["dragleave", "drop"].forEach(ev =>
    uploadZone.addEventListener(ev, e => {
      e.preventDefault();
      uploadZone.classList.remove("dragging");
    })
  );

  uploadZone.addEventListener("drop", e => {
    handleFiles(e.dataTransfer.files);
  });

  uploadZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", e => handleFiles(e.target.files));

  function handleFiles(fileList) {
    const files = Array.from(fileList).filter(f =>
      f.type.startsWith("image/")
    );
    if (!files.length) return;

    state.files = files;
    state.compressedSizes = new Array(files.length).fill(0);
    state.compressedUrls  = new Array(files.length).fill(null);
    state.totalSaved = 0;

    renderPreviews();
    updateStats();

    // naya selection par niche wale buttons disable
    const imgBtn = document.getElementById("downloadImgBtn");
    const zipBtn = document.getElementById("downloadZipBtn");
    if (imgBtn) imgBtn.disabled = true;
    if (zipBtn) zipBtn.disabled = true;
  }

  function renderPreviews() {
    imagesBox.innerHTML = "";
    state.files.forEach((file, idx) => {
      const card = document.createElement("div");
      card.className = "image-card glassmorphism";
      card.dataset.index = idx;

      // Yahan se per-card Download button hata diya
      card.innerHTML = `
        <div class="image-thumb">
          <img src="${URL.createObjectURL(file)}" alt="preview" data-rot="0">
        </div>
        <div class="image-meta">
          <div><strong>${file.name}</strong></div>
          <div>Original: ${(file.size / 1024 / 1024).toFixed(2)} MB</div>
          <div id="c-size-${idx}">Compressed: Not yet</div>
        </div>
      `;
      imagesBox.appendChild(card);
    });
  }
}

// ---------- CONTROLS & COMPRESSION ----------
function initControls() {
  const qualitySlider = document.getElementById("qualitySlider");
  const qualityValue = document.getElementById("qualityValue");
  const formatSelect = document.getElementById("formatSelect");
  const compressBtn = document.getElementById("compressBtn");

  if (qualitySlider && qualityValue) {
    qualityValue.textContent = qualitySlider.value + "%";
    qualitySlider.addEventListener("input", () => {
      qualityValue.textContent = qualitySlider.value + "%";
    });
  }

  if (compressBtn) {
    compressBtn.addEventListener("click", async () => {
      if (!state.files.length) return;
      compressBtn.disabled = true;
      compressBtn.textContent = "⏳ Compressing...";

      const q = (qualitySlider ? qualitySlider.value : 80) / 100;
      const format = formatSelect ? formatSelect.value : "image/webp";

      state.totalSaved = 0;

      for (let i = 0; i < state.files.length; i++) {
        const file = state.files[i];
        const dataUrl = await compressImage(file, q, format);
        const sizeBytes = dataURLSize(dataUrl);

        state.compressedSizes[i] = sizeBytes;
        state.compressedUrls[i]  = dataUrl;

        const saved = file.size - sizeBytes;
        state.totalSaved += saved > 0 ? saved : 0;

        const cSizeEl = document.getElementById(`c-size-${i}`);
        if (cSizeEl) {
          cSizeEl.textContent =
            `Compressed: ${(sizeBytes / 1024 / 1024).toFixed(2)} MB`;
        }
      }

      updateStats();
      enableDownloadButtons();   // <<< neeche wale buttons yahan se enable
      compressBtn.disabled = false;
      compressBtn.textContent = "🚀 Compress All";
      if (navigator.vibrate) navigator.vibrate(60);
    });
  }
}

// NAYA: Compress ke baad neeche ke 2 buttons
function enableDownloadButtons() {
  const imgBtn = document.getElementById("downloadImgBtn");
  const zipBtn = document.getElementById("downloadZipBtn");
  if (!imgBtn || !zipBtn) return;

  const hasData = state.compressedUrls.some(u => u);
  if (!hasData) return;

  imgBtn.disabled = false;
  zipBtn.disabled = false;

  // Download Image(s) – sab compressed images alag-alag
  imgBtn.onclick = () => {
    state.compressedUrls.forEach((url, i) => {
      if (!url) return;
      const name = state.files[i]?.name || `image-${i + 1}.png`;
      downloadDataUrl(url, `compressed-${name}`);
    });
  };

  // Download Zip – abhi sirf alert, baad me JSZip se kar sakte ho
  zipBtn.onclick = () => {
    alert("ZIP download ke liye JSZip add karna padega (next step).");
  };
}

function compressImage(file, quality, format) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const maxWidth = 1920;
      let { width, height } = img;
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL(format, quality);
      resolve(dataUrl);
    };
    img.src = URL.createObjectURL(file);
  });
}

function dataURLSize(dataUrl) {
  const head = "base64,";
  const idx = dataUrl.indexOf(head);
  if (idx === -1) return 0;
  const b64 = dataUrl.substring(idx + head.length);
  return Math.ceil((b64.length * 3) / 4);
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ---------- STATS ----------
function updateStats() {
  const totalSavedEl = document.getElementById("totalSaved");
  const compressionRateEl = document.getElementById("compressionRate");

  if (!state.files.length) {
    if (totalSavedEl) totalSavedEl.textContent = "0KB";
    if (compressionRateEl) compressionRateEl.textContent = "0%";
    return;
  }

  const originalTotal = state.files.reduce((s, f) => s + f.size, 0);
  const compressedTotal = state.compressedSizes.reduce((s, x) => s + x, 0);
  const saved = originalTotal - compressedTotal;

  if (totalSavedEl) {
    totalSavedEl.textContent =
      saved > 0 ? (saved / 1024 / 1024).toFixed(2) + " MB" : "0KB";
  }
  if (compressionRateEl && originalTotal) {
    const rate = 100 - (compressedTotal / originalTotal) * 100;
    compressionRateEl.textContent = rate > 0 ? rate.toFixed(1) + "%" : "0%";
  }
}

// ---------- RATING ----------
function initRating() {
  const stars = document.querySelectorAll(".star");
  const avgEl = document.getElementById("avgRating");
  const totalEl = document.getElementById("totalRatings");
  if (!stars.length) return;

  let ratings = JSON.parse(localStorage.getItem("icp_ratings") || "[]");
  updateAverage();

  stars.forEach(star => {
    star.addEventListener("click", () => {
      const val = Number(star.dataset.rate);
      highlight(val);
      saveRating(val);
    });
  });

  function highlight(n) {
    stars.forEach(s => {
      s.classList.toggle("active", Number(s.dataset.rate) <= n);
    });
    if (navigator.vibrate) navigator.vibrate(30);
  }

  function saveRating(r) {
    ratings.push(r);
    localStorage.setItem("icp_ratings", JSON.stringify(ratings));
    updateAverage();
  }

  function updateAverage() {
    if (!ratings.length) return;
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    if (avgEl) avgEl.textContent = avg.toFixed(1);
    if (totalEl) totalEl.textContent = ratings.length;
  }
}

// ---------- PRESETS ----------
function initPresets() {
  const presets = document.querySelectorAll(".preset-btn");
  const slider = document.getElementById("qualitySlider");
  const label = document.getElementById("qualityValue");

  if (!presets.length || !slider || !label) return;

  presets.forEach(btn => {
    btn.addEventListener("click", () => {
      presets.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const text = btn.textContent.toLowerCase();

      if (text.includes("web")) {
        slider.value = 75;
      } else if (text.includes("insta")) {
        slider.value = 85;
      } else if (text.includes("wa")) {
        slider.value = 60;
      }

      label.textContent = slider.value + "%";
    });
  });
}

// ---------- FAB ----------
function initFab() {
  const fab = document.getElementById("uploadFab");
  const fileInput = document.getElementById("fileInput");
  if (!fab || !fileInput) return;

  fab.addEventListener("click", () => fileInput.click());
}