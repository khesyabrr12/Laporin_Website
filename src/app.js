const API_BASE_URL = "http://localhost:3000/api";
const AUTH_TOKEN_KEY = "laporin_token";
const AUTH_USER_KEY = "laporin_user";

function getToken() {
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
}

function getUser() {
  try {
    const user = sessionStorage.getItem(AUTH_USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch {
    sessionStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
}

function showMessage(element, message, tone = "error") {
  if (!element) return;
  element.textContent = message;
  element.classList.remove("hidden", "border-rose-200", "bg-rose-50", "text-rose-700", "border-emerald-200", "bg-emerald-50", "text-emerald-700");
  if (tone === "success") {
    element.classList.add("border-emerald-200", "bg-emerald-50", "text-emerald-700");
  } else {
    element.classList.add("border-rose-200", "bg-rose-50", "text-rose-700");
  }
}

function hideMessage(element) {
  if (element) element.classList.add("hidden");
}

async function apiRequest(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Tidak dapat terhubung ke server. Pastikan backend Laporin berjalan di localhost:3000.");
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    throw new Error("Server mengirim respons yang tidak dapat dibaca.");
  }

  if (response.status === 401 && auth) {
    clearSession();
    window.location.href = window.location.pathname.includes("/admin/")
      ? "../admin/login.html"
      : "../users/login.html";
    throw new Error(payload.message || "Sesi berakhir. Silakan login kembali.");
  }
  if (!response.ok) throw new Error(payload.message || `Permintaan gagal (${response.status}).`);
  return payload;
}

function redirectByRole(user) {
  window.location.href = user.role === "admin" ? "../admin/dashboard.html" : "../users/dashboard.html";
}

function setupLoginForm(formId, emailId, passwordId, messageId, expectedRole) {
  const form = document.getElementById(formId);
  if (!form) return;
  const message = document.getElementById(messageId);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage(message);
    const button = form.querySelector('button[type="submit"]');
    const originalText = button.textContent.trim();
    button.disabled = true;
    button.textContent = "Memproses...";

    try {
      const result = await apiRequest("/auth/login", {
        method: "POST",
        auth: false,
        body: {
          email: document.getElementById(emailId).value.trim(),
          password: document.getElementById(passwordId).value,
        },
      });
      if (expectedRole && result.user.role !== expectedRole) {
        throw new Error(expectedRole === "admin" ? "Akun ini bukan akun admin." : "Silakan gunakan halaman login admin.");
      }
      sessionStorage.setItem(AUTH_TOKEN_KEY, result.token);
      sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
      redirectByRole(result.user);
    } catch (error) {
      showMessage(message, error.message);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });
}

function setupRegisterForm() {
  const form = document.getElementById("registerForm");
  if (!form) return;
  const message = document.getElementById("registerMessage");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage(message);
    const button = document.getElementById("registerSubmitButton");
    button.disabled = true;
    button.textContent = "Mendaftarkan...";
    try {
      await apiRequest("/auth/register", {
        method: "POST",
        auth: false,
        body: {
          name: document.getElementById("registerName").value.trim(),
          email: document.getElementById("registerEmail").value.trim(),
          password: document.getElementById("registerPassword").value,
        },
      });
      showMessage(message, "Registrasi berhasil. Mengarahkan ke halaman login...", "success");
      window.setTimeout(() => {
        window.location.href = "./login.html";
      }, 900);
    } catch (error) {
      showMessage(message, error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Buat akun";
    }
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function safeImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusBadge(status) {
  const styles = {
    menunggu: "bg-amber-50 text-amber-700 ring-amber-600/15",
    diproses: "bg-sky-50 text-sky-700 ring-sky-600/15",
    selesai: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    ditolak: "bg-rose-50 text-rose-700 ring-rose-600/15",
  };
  const labels = {
    menunggu: "Menunggu",
    diproses: "Diproses",
    selesai: "Selesai",
    ditolak: "Ditolak",
  };
  const style = styles[status] || "bg-slate-100 text-slate-600 ring-slate-500/10";
  const label = labels[status] || status || "Tidak diketahui";
  return `<span class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style}">${escapeHtml(label)}</span>`;
}

function setModalOpen(modal, open) {
  modal.classList.toggle("hidden", !open);
  modal.classList.toggle("flex", open);
  document.body.classList.toggle("overflow-hidden", open);
}

function initLogoutButtons() {
  for (const id of ["logoutButton", "mobileLogoutButton", "adminLogoutButton", "adminMobileLogoutButton"]) {
    document.getElementById(id)?.addEventListener("click", () => {
      clearSession();
      window.location.href = window.location.pathname.includes("/admin/")
        ? "../admin/login.html"
        : "../users/login.html";
    });
  }
}

function requireRole(expectedRole) {
  const user = getUser();
  if (!getToken() || !user || user.role !== expectedRole) {
    clearSession();
    window.location.href = expectedRole === "admin" ? "../admin/login.html" : "../users/login.html";
    return null;
  }
  return user;
}

async function initUserDashboard() {
  const user = requireRole("user");
  if (!user) return;
  initLogoutButtons();

  const name = user.name || "Siswa";
  document.getElementById("sidebarUserName").textContent = name;
  document.getElementById("sidebarUserEmail").textContent = user.email || "";
  document.getElementById("headerUserName").textContent = name;
  document.getElementById("userAvatar").textContent = name.trim().charAt(0).toUpperCase() || "S";

  const dashboardMessage = document.getElementById("dashboardMessage");
  const reportForm = document.getElementById("reportForm");
  const reportModal = document.getElementById("reportModal");
  const detailModal = document.getElementById("reportDetailModal");
  const confirmModal = document.getElementById("confirmModal");
  const tableBody = document.getElementById("userReportsTableBody");
  const emptyState = document.getElementById("userReportsEmptyState");
  const categorySelect = document.getElementById("reportCategory");
  let reports = [];
  let deleteReportId = null;

  const renderReports = () => {
    const query = document.getElementById("reportSearch").value.trim().toLowerCase();
    const selectedStatus = document.getElementById("reportStatusFilter").value;
    const filtered = reports.filter((report) => {
      const searchText = `${report.title} ${report.name_category} ${report.location}`.toLowerCase();
      return (!query || searchText.includes(query)) && (!selectedStatus || report.status === selectedStatus);
    });

    document.getElementById("totalReportsCount").textContent = String(reports.length);
    document.getElementById("waitingReportsCount").textContent = String(reports.filter((report) => report.status === "menunggu").length);
    document.getElementById("processingReportsCount").textContent = String(reports.filter((report) => report.status === "diproses").length);
    document.getElementById("completedReportsCount").textContent = String(reports.filter((report) => report.status === "selesai").length);

    tableBody.innerHTML = filtered.map((report) => {
      const isEditable = report.status === "menunggu";
      return `<tr>
        <td class="px-6 py-4"><button type="button" data-action="detail" data-id="${escapeHtml(report.id_report)}" class="max-w-[230px] truncate text-left font-semibold text-slate-800 hover:text-cyan-800">${escapeHtml(report.title)}</button><p class="mt-1 text-xs text-slate-400">${escapeHtml(report.description)}</p></td>
        <td class="px-6 py-4 text-slate-600">${escapeHtml(report.name_category)}</td>
        <td class="px-6 py-4 text-slate-600">${escapeHtml(report.location)}</td>
        <td class="whitespace-nowrap px-6 py-4 text-xs text-slate-500">${escapeHtml(formatDate(report.created_at))}</td>
        <td class="px-6 py-4">${statusBadge(report.status)}</td>
        <td class="px-6 py-4 text-right"><div class="inline-flex items-center gap-2"><button type="button" data-action="detail" data-id="${escapeHtml(report.id_report)}" class="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Detail</button>${isEditable ? `<button type="button" data-action="edit" data-id="${escapeHtml(report.id_report)}" class="rounded-lg border border-cyan-200 px-2.5 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-50">Edit</button><button type="button" data-action="delete" data-id="${escapeHtml(report.id_report)}" class="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">Hapus</button>` : ""}</div></td>
      </tr>`;
    }).join("");
    emptyState.classList.toggle("hidden", filtered.length !== 0);
    tableBody.closest("table").classList.toggle("hidden", filtered.length === 0);
  };

  const loadReports = async () => {
    tableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-12 text-center text-sm text-slate-400">Memuat laporan...</td></tr>';
    tableBody.closest("table").classList.remove("hidden");
    emptyState.classList.add("hidden");
    try {
      const result = await apiRequest("/reports");
      reports = result.data || [];
      renderReports();
    } catch (error) {
      tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-sm text-rose-600">${escapeHtml(error.message)}</td></tr>`;
      showMessage(dashboardMessage, error.message);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await apiRequest("/categories", { auth: false });
      const categories = result.data || [];
      categorySelect.innerHTML = '<option value="">Pilih kategori</option>' + categories.map((category) =>
        `<option value="${escapeHtml(category.id_category)}">${escapeHtml(category.name_category)}</option>`,
      ).join("");
      if (categories.length === 0) categorySelect.innerHTML = '<option value="">Belum ada kategori tersedia</option>';
    } catch (error) {
      categorySelect.innerHTML = '<option value="">Gagal memuat kategori</option>';
      showMessage(dashboardMessage, error.message);
    }
  };

  const openCreateModal = () => {
    reportForm.reset();
    document.getElementById("reportId").value = "";
    document.getElementById("reportModalTitle").textContent = "Buat pengaduan";
    document.getElementById("submitReportButton").textContent = "Kirim pengaduan";
    document.getElementById("reportImageField").classList.remove("hidden");
    document.getElementById("reportImage").disabled = false;
    hideMessage(document.getElementById("reportFormMessage"));
    setModalOpen(reportModal, true);
    document.getElementById("reportTitle").focus();
  };

  for (const id of ["openCreateReportButton", "newReportButton", "heroCreateReportButton"]) {
    document.getElementById(id).addEventListener("click", openCreateModal);
  }
  for (const id of ["closeReportModalButton", "cancelReportButton"]) {
    document.getElementById(id).addEventListener("click", () => setModalOpen(reportModal, false));
  }
  for (const id of ["closeReportDetailButton", "closeReportDetailFooterButton"]) {
    document.getElementById(id).addEventListener("click", () => setModalOpen(detailModal, false));
  }
  document.getElementById("reportSearch").addEventListener("input", renderReports);
  document.getElementById("reportStatusFilter").addEventListener("change", renderReports);
  document.getElementById("reportImage").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file && (file.size > 5 * 1024 * 1024 || !file.type.startsWith("image/"))) {
      event.target.value = "";
      showMessage(document.getElementById("reportFormMessage"), "Pilih file gambar dengan ukuran maksimal 5 MB.");
    } else {
      hideMessage(document.getElementById("reportFormMessage"));
    }
  });

  tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const report = reports.find((item) => String(item.id_report) === button.dataset.id);
    if (!report) return;

    if (button.dataset.action === "detail") {
      document.getElementById("reportDetailTitle").textContent = report.title;
      const imageUrl = safeImageUrl(report.image_url);
      document.getElementById("reportDetailContent").innerHTML = `
        <div class="grid gap-3 sm:grid-cols-2"><div><p class="text-xs font-medium text-slate-400">Kategori</p><p class="mt-1 text-sm font-medium">${escapeHtml(report.name_category)}</p></div><div><p class="text-xs font-medium text-slate-400">Status</p><div class="mt-1">${statusBadge(report.status)}</div></div><div><p class="text-xs font-medium text-slate-400">Lokasi</p><p class="mt-1 text-sm font-medium">${escapeHtml(report.location)}</p></div><div><p class="text-xs font-medium text-slate-400">Tanggal dibuat</p><p class="mt-1 text-sm font-medium">${escapeHtml(formatDate(report.created_at))}</p></div></div>
        <div><p class="text-xs font-medium text-slate-400">Deskripsi</p><p class="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">${escapeHtml(report.description)}</p></div>
        ${report.admin_note ? `<div class="rounded-xl bg-cyan-50 p-4"><p class="text-xs font-semibold text-cyan-900">Catatan admin</p><p class="mt-1 whitespace-pre-wrap text-sm leading-6 text-cyan-900">${escapeHtml(report.admin_note)}</p></div>` : ""}
        ${imageUrl ? `<a href="${escapeHtml(imageUrl)}" target="_blank" rel="noopener noreferrer" class="block"><img src="${escapeHtml(imageUrl)}" alt="Foto pendukung laporan" class="max-h-72 w-full rounded-xl object-cover" /></a>` : ""}
      `;
      setModalOpen(detailModal, true);
    } else if (button.dataset.action === "edit" && report.status === "menunggu") {
      reportForm.reset();
      document.getElementById("reportId").value = report.id_report;
      document.getElementById("reportTitle").value = report.title;
      document.getElementById("reportCategory").value = report.id_category;
      document.getElementById("reportLocation").value = report.location;
      document.getElementById("reportDescription").value = report.description;
      document.getElementById("reportModalTitle").textContent = "Edit pengaduan";
      document.getElementById("submitReportButton").textContent = "Simpan perubahan";
      document.getElementById("reportImageField").classList.add("hidden");
      document.getElementById("reportImage").disabled = true;
      hideMessage(document.getElementById("reportFormMessage"));
      setModalOpen(reportModal, true);
      document.getElementById("reportTitle").focus();
    } else if (button.dataset.action === "delete" && report.status === "menunggu") {
      deleteReportId = report.id_report;
      document.getElementById("confirmModalText").textContent = `Pengaduan "${report.title}" akan dihapus permanen.`;
      hideMessage(document.getElementById("confirmModalMessage"));
      setModalOpen(confirmModal, true);
    }
  });

  reportForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.getElementById("reportFormMessage");
    hideMessage(message);
    const button = document.getElementById("submitReportButton");
    button.disabled = true;
    button.textContent = "Menyimpan...";
    const id = document.getElementById("reportId").value;
    const values = {
      id_category: Number(categorySelect.value),
      title: document.getElementById("reportTitle").value.trim(),
      description: document.getElementById("reportDescription").value.trim(),
      location: document.getElementById("reportLocation").value.trim(),
    };

    try {
      if (id) {
        await apiRequest(`/reports/${encodeURIComponent(id)}`, { method: "PUT", body: values });
      } else {
        const formData = new FormData();
        Object.entries(values).forEach(([key, value]) => formData.append(key, String(value)));
        const image = document.getElementById("reportImage").files[0];
        if (image) formData.append("image", image);
        await apiRequest("/reports", { method: "POST", body: formData });
      }
      setModalOpen(reportModal, false);
      showMessage(dashboardMessage, id ? "Pengaduan berhasil diperbarui." : "Pengaduan berhasil dikirim.", "success");
      await loadReports();
    } catch (error) {
      showMessage(message, error.message);
    } finally {
      button.disabled = false;
      button.textContent = id ? "Simpan perubahan" : "Kirim pengaduan";
    }
  });

  document.getElementById("cancelDeleteButton").addEventListener("click", () => setModalOpen(confirmModal, false));
  document.getElementById("confirmDeleteButton").addEventListener("click", async () => {
    if (!deleteReportId) return;
    const button = document.getElementById("confirmDeleteButton");
    button.disabled = true;
    button.textContent = "Menghapus...";
    try {
      await apiRequest(`/reports/${encodeURIComponent(deleteReportId)}`, { method: "DELETE" });
      setModalOpen(confirmModal, false);
      showMessage(dashboardMessage, "Pengaduan berhasil dihapus.", "success");
      deleteReportId = null;
      await loadReports();
    } catch (error) {
      showMessage(document.getElementById("confirmModalMessage"), error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Hapus laporan";
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      for (const modal of [reportModal, detailModal, confirmModal]) {
        if (!modal.classList.contains("hidden")) setModalOpen(modal, false);
      }
    }
  });
  await Promise.all([loadReports(), loadCategories()]);
}

async function initAdminDashboard() {
  const user = requireRole("admin");
  if (!user) return;
  initLogoutButtons();
  const name = user.name || "Admin";
  document.getElementById("adminSidebarName").textContent = name;
  document.getElementById("adminSidebarEmail").textContent = user.email || "";
  document.getElementById("adminHeaderName").textContent = name;
  document.getElementById("adminAvatar").textContent = name.trim().charAt(0).toUpperCase() || "A";

  const message = document.getElementById("adminDashboardMessage");
  const tableBody = document.getElementById("adminReportsTableBody");
  const emptyState = document.getElementById("adminReportsEmptyState");
  const modal = document.getElementById("adminReportModal");
  let reports = [];

  const renderReports = () => {
    const query = document.getElementById("adminReportSearch").value.trim().toLowerCase();
    const selectedStatus = document.getElementById("adminReportStatusFilter").value;
    const filtered = reports.filter((report) => {
      const searchText = `${report.title} ${report.nama_pelapor} ${report.email} ${report.location} ${report.name_category}`.toLowerCase();
      return (!query || searchText.includes(query)) && (!selectedStatus || report.status === selectedStatus);
    });
    document.getElementById("adminTotalReportsCount").textContent = String(reports.length);
    document.getElementById("adminWaitingReportsCount").textContent = String(reports.filter((report) => report.status === "menunggu").length);
    document.getElementById("adminProcessingReportsCount").textContent = String(reports.filter((report) => report.status === "diproses").length);
    document.getElementById("adminCompletedReportsCount").textContent = String(reports.filter((report) => report.status === "selesai").length);

    tableBody.innerHTML = filtered.map((report) => `<tr>
      <td class="px-5 py-4"><p class="font-semibold text-slate-800">${escapeHtml(report.nama_pelapor)}</p><p class="mt-1 text-xs text-slate-400">${escapeHtml(report.email)}</p></td>
      <td class="px-5 py-4"><p class="max-w-[220px] truncate font-semibold text-slate-800">${escapeHtml(report.title)}</p><p class="mt-1 max-w-[220px] truncate text-xs text-slate-400">${escapeHtml(report.description)}</p></td>
      <td class="px-5 py-4"><p class="text-slate-700">${escapeHtml(report.name_category)}</p><p class="mt-1 text-xs text-slate-400">${escapeHtml(report.location)}</p></td>
      <td class="whitespace-nowrap px-5 py-4 text-xs text-slate-500">${escapeHtml(formatDate(report.created_at))}</td>
      <td class="px-5 py-4">${statusBadge(report.status)}</td>
      <td class="px-5 py-4 text-right"><button type="button" data-report-id="${escapeHtml(report.id_report)}" class="rounded-lg bg-[#12365f] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0d2949]">Tinjau</button></td>
    </tr>`).join("");
    emptyState.classList.toggle("hidden", filtered.length !== 0);
    tableBody.closest("table").classList.toggle("hidden", filtered.length === 0);

    const priority = reports.filter((report) => report.status === "menunggu" || report.status === "diproses").slice(0, 3);
    const priorityElement = document.getElementById("adminPriorityReports");
    priorityElement.innerHTML = priority.length ? priority.map((report) => `<button type="button" data-priority-id="${escapeHtml(report.id_report)}" class="flex w-full items-start justify-between gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-cyan-200 hover:bg-cyan-50/50"><span class="min-w-0"><span class="block truncate text-sm font-semibold text-slate-800">${escapeHtml(report.title)}</span><span class="mt-1 block truncate text-xs text-slate-500">${escapeHtml(report.nama_pelapor)} · ${escapeHtml(report.location)}</span></span>${statusBadge(report.status)}</button>`).join("") : '<p class="rounded-xl bg-emerald-50 px-4 py-5 text-center text-sm text-emerald-800">Tidak ada laporan yang menunggu tindak lanjut.</p>';
  };

  const loadReports = async () => {
    tableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-12 text-center text-sm text-slate-400">Memuat laporan...</td></tr>';
    tableBody.closest("table").classList.remove("hidden");
    emptyState.classList.add("hidden");
    try {
      const result = await apiRequest("/admin/reports");
      reports = result.data || [];
      renderReports();
      hideMessage(message);
    } catch (error) {
      tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-sm text-rose-600">${escapeHtml(error.message)}</td></tr>`;
      showMessage(message, error.message);
    }
  };

  const openReport = (id) => {
    const report = reports.find((item) => String(item.id_report) === String(id));
    if (!report) return;
    document.getElementById("adminReportId").value = report.id_report;
    document.getElementById("adminReportModalTitle").textContent = report.title;
    document.getElementById("adminReportStatus").value = report.status;
    document.getElementById("adminReportNote").value = report.admin_note || "";
    const imageUrl = safeImageUrl(report.image_url);
    document.getElementById("adminReportDetails").innerHTML = `
      <div class="grid gap-2 sm:grid-cols-2"><p><span class="text-xs text-slate-400">Pelapor</span><br /><strong>${escapeHtml(report.nama_pelapor)}</strong></p><p><span class="text-xs text-slate-400">Email</span><br />${escapeHtml(report.email)}</p><p><span class="text-xs text-slate-400">Kategori</span><br />${escapeHtml(report.name_category)}</p><p><span class="text-xs text-slate-400">Lokasi</span><br />${escapeHtml(report.location)}</p><p><span class="text-xs text-slate-400">Tanggal</span><br />${escapeHtml(formatDate(report.created_at))}</p></div>
      <p class="mt-3 border-t border-slate-200 pt-3"><span class="text-xs text-slate-400">Deskripsi</span><br /><span class="whitespace-pre-wrap">${escapeHtml(report.description)}</span></p>
      ${imageUrl ? `<a href="${escapeHtml(imageUrl)}" target="_blank" rel="noopener noreferrer" class="mt-3 block"><img src="${escapeHtml(imageUrl)}" alt="Foto pendukung laporan" class="max-h-56 w-full rounded-lg object-cover" /></a>` : ""}
    `;
    hideMessage(document.getElementById("adminReportFormMessage"));
    setModalOpen(modal, true);
    document.getElementById("adminReportStatus").focus();
  };

  document.getElementById("adminReportSearch").addEventListener("input", renderReports);
  document.getElementById("adminReportStatusFilter").addEventListener("change", renderReports);
  document.getElementById("refreshAdminReportsButton").addEventListener("click", loadReports);
  tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-report-id]");
    if (button) openReport(button.dataset.reportId);
  });
  document.getElementById("adminPriorityReports").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-priority-id]");
    if (button) openReport(button.dataset.priorityId);
  });
  for (const id of ["closeAdminReportModalButton", "cancelAdminReportButton"]) {
    document.getElementById(id).addEventListener("click", () => setModalOpen(modal, false));
  }
  document.getElementById("adminReportForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formMessage = document.getElementById("adminReportFormMessage");
    hideMessage(formMessage);
    const button = document.getElementById("saveAdminReportButton");
    button.disabled = true;
    button.textContent = "Menyimpan...";
    try {
      const id = document.getElementById("adminReportId").value;
      await apiRequest(`/admin/reports/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: {
          status: document.getElementById("adminReportStatus").value,
          admin_note: document.getElementById("adminReportNote").value.trim(),
        },
      });
      setModalOpen(modal, false);
      showMessage(message, "Status laporan berhasil diperbarui.", "success");
      await loadReports();
    } catch (error) {
      showMessage(formMessage, error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Simpan perubahan";
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) setModalOpen(modal, false);
  });
  await loadReports();
}

setupLoginForm("loginForm", "loginEmail", "loginPassword", "loginMessage");
setupLoginForm("adminLoginForm", "adminLoginEmail", "adminLoginPassword", "adminLoginMessage", "admin");
setupRegisterForm();

if (document.body.dataset.page === "user-dashboard") {
  initUserDashboard();
} else if (document.body.dataset.page === "admin-dashboard") {
  initAdminDashboard();
}
