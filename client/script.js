/**
 * ==========================================
 * TAILWIND CONFIGURATION
 * ==========================================
 */
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: { sans: ["Cairo", "sans-serif"] },
      colors: {
        brand: { dark: "#0f172a", gold: "#d4af37", bg: "#f8fafc" },
        dash: { primary: "#2c3e50", accent: "#f39c12" },
      },
    },
  },
};

/**
 * ==========================================
 * STATE & STORAGE (Delta System)
 * ==========================================
 */
let clientsDB = [];
let trashDB = [];
let activeClient = null;
let currentPDFAbortController = null;

// Fetch data on page load
async function loadDB() {
  try {
    const res = await fetch("/api/data");
    const data = await res.json();
    clientsDB = data.clientsDB || [];
    trashDB = data.trashDB || [];
    renderDashboard();
  } catch (err) {
    console.error("Failed to load DB from backend:", err);
  }
}

// Call load DB on initialization
loadDB();

async function saveDB() {
  try {
    await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientsDB, trashDB }),
    });
  } catch (err) {
    console.error("Failed to save DB to backend:", err);
  }
}

/**
 * ==========================================
 * BACKUP & RESTORE
 * ==========================================
 */

function downloadBackup() {
  window.location.href = "/api/backup";
}

async function handleRestore(input) {
  const file = input.files[0];
  if (!file) return;

  showConfirmModal(
    "تأكيد استعادة البيانات",
    "تحذير: استعادة النسخة الاحتياطية ستمسح جميع البيانات الحالية وتستبدلها ببيانات النسخة. هل أنت متأكد؟",
    async () => {
      const formData = new FormData();
      formData.append("backup", file);

      try {
        const res = await fetch("/api/restore", {
          method: "POST",
          body: formData,
        });
        const result = await res.json();

        if (result.success) {
          showConfirmModal(
            "تم الاستعادة",
            "تمت استعادة البيانات بنجاح! سيتم إعادة تحميل الصفحة الآن.",
            () => window.location.reload(),
            false,
            "green"
          );
        } else {
          showConfirmModal(
            "فشل في الاستعادة",
            "خطأ: " + (result.error || "فشل غير متوقع في معالجة الملف."),
            () => {},
            true,
            "red"
          );
        }
      } catch (err) {
        console.error("Restore failed:", err);
        showConfirmModal(
          "خطأ في الاتصال",
          "حدث خطأ أثناء محاولة الاتصال بالخادم لاستعادة البيانات.",
          () => {},
          true,
          "red"
        );
      } finally {
        input.value = "";
      }
    },
    true,
    "blue"
  );
}

/**
 * ==========================================
 * AUTHENTICATION
 * ==========================================
 */
function handleLogin() {
  const user = document.getElementById("userInput").value.trim();
  const pass = document.getElementById("passInput").value;
  const authorized = ["فوزي", "محمود", "نجاح", "وليد", "omar"];

  if (authorized.includes(user) && pass === "123456789") {
    document.getElementById("login-wrapper").classList.add("page-hidden");
    document
      .getElementById("dashboard-wrapper")
      .classList.remove("page-hidden");
    document.getElementById("adminName").innerText = user;
    renderDashboard();
  } else {
    document.getElementById("errorMessage").classList.remove("hidden");
  }
}

/**
 * ==========================================
 * DASHBOARD & MAIN VIEWS
 * ==========================================
 */
function renderDashboard(query = "") {
  const tbody = document.getElementById("mainTableBody");
  tbody.innerHTML = "";
  const filtered = clientsDB.filter(
    (c) => c.name.includes(query) || c.plot.includes(query),
  );

  filtered.forEach((c) => {
    const totalTips = c.tips.reduce((acc, t) => acc + parseFloat(t.amount), 0);
    const totalExpenses = c.expenses.reduce(
      (acc, e) => acc + parseFloat(e.amount),
      0,
    );
    const owed = c.paid - totalExpenses;

    // تم إضافة تنسيقات UI الخاصة بالصور الدائرية والألوان لتتطابق مع التصميم الجميل
    tbody.innerHTML += `
      <tr class="hover:bg-gray-50 dark:hover:bg-slate-700 transition group">
        <td class="border-x border-gray-100 dark:border-slate-700">
           ${c.name}
        </td>
        <td class="border-x border-gray-100 dark:border-slate-700">${c.plot}</td>
        <td class="text-red-600 font-black border-x border-gray-100 dark:border-slate-700">${owed.toLocaleString()} ج.م</td>
        <td dir="ltr" class="border-x border-gray-100 dark:border-slate-700 font-bold">${c.phone || "---"}</td>
        <td class="rounded-l-2xl border-r-0 ">
          <div class="flex gap-2 justify-end w-fit">
            <button onclick="openClientPage('${c.id}')" class="bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-white px-4 py-2 rounded-lg font-bold hover:bg-[#2c3e50] hover:text-white transition">عرض</button>
            <button onclick="deleteClient('${c.id}')" class="bg-red-50 dark:bg-red-900/30 text-red-500 px-3 py-2 rounded-lg font-bold hover:bg-red-500 hover:text-white transition"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
  });
}

function backToDashboard() {
  document.getElementById("client-wrapper").classList.add("page-hidden");
  document.getElementById("dashboard-wrapper").classList.remove("page-hidden");
  renderDashboard();
}

/**
 * ==========================================
 * CLIENT MANAGEMENT (CRUD)
 * ==========================================
 */
function createNewClient() {
  const name = document.getElementById("newC_Name").value;
  const plot = document.getElementById("newC_Plot").value;
  const total = parseFloat(document.getElementById("newC_Total").value) || 0;

  if (name && plot && total) {
    const newClient = {
      id: Date.now().toString(),
      name,
      plot,
      totalContract: total,
      paid: total,
      phone: "",
      expenses: [],
      tips: [],
      docs: [],
    };
    clientsDB.push(newClient);
    saveDB();
    renderDashboard();
    toggleNewClientModal();
    // تصفير المدخلات
    document.getElementById("newC_Name").value = "";
    document.getElementById("newC_Plot").value = "";
    document.getElementById("newC_Total").value = "";
  }
}

function deleteClient(id) {
  showConfirmModal(
    "تأكيد الحذف",
    "هل أنت متأكد من رغبتك في نقل هذا العميل لسلة المهملات؟",
    () => {
      const idx = clientsDB.findIndex((c) => c.id === id);
      if (idx !== -1) {
        trashDB.push(clientsDB.splice(idx, 1)[0]);
        saveDB();
        renderDashboard();
      }
    },
  );
}

function restoreClient(id) {
  const idx = trashDB.findIndex((c) => c.id === id);
  if (idx !== -1) {
    clientsDB.push(trashDB.splice(idx, 1)[0]);
    saveDB();
    renderDashboard();
    openTrashModal(); // Refresh list
  }
}

async function permanentDeleteClient(id) {
  showConfirmModal(
    "حذف نهائي",
    "تحذير: سيتم حذف هذا العميل وجميع ملفاته المرفقة نهائياً من النظام. هل أنت متأكد؟",
    async () => {
      try {
        const res = await fetch("/api/permanent-delete-client", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: id }),
        });
        const data = await res.json();
        if (data.success) {
          // Update local state
          trashDB = trashDB.filter((c) => c.id !== id);
          openTrashModal();
        } else {
          alert("فشل الحذف: " + (data.error || "خطأ غير معروف"));
        }
      } catch (err) {
        console.error("Permanent delete failed:", err);
      }
    },
  );
}

/**
 * ==========================================
 * CLIENT DETAILS UI
 * ==========================================
 */
function openClientPage(id) {
  activeClient = clientsDB.find((c) => c.id === id);
  document.getElementById("dashboard-wrapper").classList.add("page-hidden");
  document.getElementById("client-wrapper").classList.remove("page-hidden");

  updateClientDOM();
}

function updateClientDOM() {
  if (!activeClient) return;
  document.getElementById("clientNameText").innerText = activeClient.name;
  document.getElementById("clientPlotText").innerText =
    "قطعة: " + activeClient.plot;
  document.getElementById("clientPhoneText").innerText =
    activeClient.phone || "لا يوجد";
  document.getElementById("totalContractText").innerText =
    activeClient.totalContract.toLocaleString();

  const payments = activeClient.payments || [];
  const totalPaidFromHistory = payments.reduce(
    (acc, p) => acc + parseFloat(p.amount),
    0,
  );

  // Backward compatibility: use existing paid if no payments history exists
  const effectivePaid =
    payments.length > 0
      ? totalPaidFromHistory + activeClient.paid
      : activeClient.paid || 0;

  const expenses = activeClient.expenses.reduce(
    (acc, e) => acc + parseFloat(e.amount),
    0,
  );

  document.getElementById("paidAmountText").innerText = (
    effectivePaid - expenses
  ).toLocaleString();

  const totalTips = activeClient.tips.reduce(
    (acc, t) => acc + parseFloat(t.amount),
    0,
  );
  const totalExpenses = activeClient.expenses.reduce(
    (acc, e) => acc + parseFloat(e.amount),
    0,
  );

  const owed = totalTips;

  document.getElementById("owedAmountText").innerText = owed.toLocaleString();

  // رندر الجداول
  renderClientExpenses();
  renderClientTips();
  renderClientPayments(); // New: مدخلات المكتب
  renderClientDocuments();
  renderClientPDFs();
}

function renderClientPayments() {
  const container = document.getElementById("newMoneyToOffice");
  if (!container) return;

  const payments = activeClient.payments || [];
  container.innerHTML = payments.length
    ? payments
        .map(
          (p) => `
        <tr class="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition">
          <td class="p-3 font-bold">${p.receiver || "---"}</td>
          <td class="p-3 text-gray-500 text-xs">${p.date || "---"}</td>
          <td class="p-3 text-green-600 font-bold">+${parseFloat(p.amount).toLocaleString()} ج.م</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="3" class="p-4 text-center text-gray-400">لا توجد مدفوعات مسجلة</td></tr>`;
}

function renderClientExpenses() {
  document.getElementById("expensesTableBody").innerHTML = activeClient.expenses
    .map(
      (e) => `
        <tr class="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition">
          <td class="p-3 font-bold">${e.reason}</td>
          <td class="p-3 text-gray-500 text-xs">${e.date || "---"}</td>
          <td class="p-3 text-red-500 font-bold">-${e.amount} ج.م</td>
        </tr>`,
    )
    .join("");
}

// دفع الاكراميات
function renderClientTips() {
  document.getElementById("tipsTableBody").innerHTML = activeClient.tips
    .map(
      (t) => `
        <tr class="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition">
          <td class="p-3 font-bold">${t.reason}</td>
          <td class="p-3 text-gray-500 dark:text-gray-400 text-xs">${t.payer}</td>
          <td class="p-3 text-gray-500 text-xs">${t.date || "---"}</td>
          <td class="p-3 text-orange-600 font-bold">+${t.amount} ج.م</td>
        </tr>`,
    )
    .join("");
}

// يمكنك استخدام هذا الدالة إذا أردت عرض الإكراميات بشكل منفصل في مكان آخر بالصفحة، مثلاً في قسم "مدخلات العميل إلى المكتب"

function renderClientNewMoneyToOffice() {
  document.getElementById("newMoneyToOffice").innerHTML = activeClient.tips
    .map(
      (t) => `
        <tr class="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition">
          <td class="p-3 text-gray-500 dark:text-gray-400 text-xs">${t.payer}</td>
          <td class="p-3 text-gray-500 text-xs">${t.date || "---"}</td>
          <td class="p-3 text-orange-600 font-bold">+${t.amount} ج.م</td>
        </tr>`,
    )
    .join("");
}

function renderClientDocuments() {
  document.getElementById("documentsTableBody").innerHTML = activeClient.docs
    .map(
      (d, i) => `
        <tr class="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition">
          <td class="p-4 font-bold text-brand-primary dark:text-gray-200">${d.person}</td>
          <td class="p-4">${d.name}</td>
          <td class="p-4 text-gray-500 dark:text-gray-400">${d.purpose}</td>
          <td class="p-4 font-bold">${d.place}</td>
          <td class="p-4 text-gray-500 text-xs">${d.date || "---"}</td>
          <td class="p-4">
            <button onclick="editDoc(${i})" class="bg-blue-50 text-blue-600 dark:bg-blue-900/30 px-3 py-1 rounded-lg font-bold hover:bg-blue-100 transition"><i class="fas fa-pen"></i> تعديل</button>
          </td>
        </tr>`,
    )
    .join("");
}

function renderClientPDFs() {
  const pdfs = activeClient.pdfs || [];
  const container = document.getElementById("pdfTableBody");
  if (!container) return;

  container.innerHTML = pdfs.length
    ? pdfs.map((p) => {
          if (!p) return "";
          
          // 1. تحديد نوع الملف من الامتداد
          const fileName = p.originalName || "";
          const ext = fileName.split('.').pop().toLowerCase();
          
          // 2. اختيار الأيقونة واللون المناسب
          let iconClass = "fa-file-alt text-gray-400"; // افتراضي (ملف عام)
          
          if (ext === "pdf") {
            iconClass = "fa-file-pdf text-red-500";
          } else if (["jpg", "jpeg", "png"].includes(ext)) {
            iconClass = "fa-file-image text-blue-500";
          } else if (ext === "dwg") {
            iconClass = "fa-drafting-compass text-orange-500"; // أيقونة البرجل للمهندسين
          }

          return `
        <tr class="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition">
          <td class="p-3 font-bold flex items-center gap-3">
            <i class="fas ${iconClass} text-xl w-6 text-center"></i>
            <span>${fileName}</span>
          </td>
          <td class="p-3 text-gray-500 text-xs">${p.date || "---"}</td>
          <td class="p-3 text-center">
            <div class="flex gap-2 justify-center">
              <button onclick="previewUploadedPDF('${p.filename}', '${p.originalName}')" class="bg-blue-50 text-blue-600 dark:bg-blue-900/30 px-3 py-1 rounded-lg font-bold hover:bg-blue-500 hover:text-white transition flex items-center gap-1">
                <i class="fas fa-eye"></i> معاينة
              </button>
              <button onclick="downloadPDF('${p.path}', '${p.originalName}')" class="bg-green-50 text-green-600 dark:bg-green-900/30 px-3 py-1 rounded-lg font-bold hover:bg-green-500 hover:text-white transition flex items-center gap-1">
                <i class="fas fa-download"></i> تحميل
              </button>
              <button onclick="deletePDF('${activeClient.id}', '${p.filename}')" class="bg-red-50 text-red-600 dark:bg-red-900/30 px-3 py-1 rounded-lg font-bold hover:bg-red-500 hover:text-white transition flex items-center gap-1">
                <i class="fas fa-trash"></i> حذف
              </button>
            </div>
          </td>
        </tr>`;
        })
        .join("")
    : `<tr><td colspan="3" class="p-6 text-center text-gray-400 font-bold">لا توجد ملفات مرفوعة</td></tr>`;
}

/**
 * ==========================================
 * PDF ACTIONS (PREVIEW, GENERATE, DOWNLOAD, DELETE)
 * ==========================================
 */

function previewUploadedPDF(url, title) {
  openPDFPreview(title, url);
}

async function openPDFPreview(title, dataOrUrl) {
  if (currentPDFAbortController) {
    currentPDFAbortController.abort();
  }
  currentPDFAbortController = new AbortController();
  const signal = currentPDFAbortController.signal;

  document.getElementById("pdfPreviewTitle").innerText = title;
  const container = document.getElementById("pdfViewerContainer");

  container.innerHTML = `
    <div id="pdf-loader" class="flex flex-col items-center justify-center p-20">
      <i class="fas fa-circle-notch fa-spin fa-3x text-blue-500 mb-4"></i>
      <p class="text-gray-600 font-bold">جاري تحميل المعاينة...</p>
    </div>
  `;
  document.getElementById("pdfPreviewModal").classList.remove("hidden");

  try {
    let responseData;
    let contentType = "";

    // 1. جلب البيانات من السيرفر
    if (dataOrUrl instanceof ArrayBuffer || dataOrUrl instanceof Uint8Array) {
      responseData = dataOrUrl;
      contentType = "application/pdf";
    } else {
      const response = await fetch("/api/pdf-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: dataOrUrl }),
        signal: signal,
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || "فشل في تحميل الملف");

      contentType = result.contentType;
      
      // تحويل الـ Base64 لـ Uint8Array
      const binaryString = window.atob(result.data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      responseData = bytes;
    }

    if (signal.aborted) return;
    container.innerHTML = ""; 
    container.className = "flex-1 bg-slate-800 overflow-y-auto p-4 flex flex-col items-center gap-4";

    // 2. منطق العرض حسب النوع (Switch Logic)
    
    // أ- لو الملف صورة (JPG, PNG)
    if (contentType.startsWith("image/")) {
      const blob = new Blob([responseData], { type: contentType });
      const imageUrl = URL.createObjectURL(blob);
      container.innerHTML = `<img src="${imageUrl}" class="max-w-full h-auto shadow-2xl rounded-lg bg-white">`;
    } 
    
    // ب- لو الملف PDF
    else if (contentType === "application/pdf") {
      const pdfjsLib = window["pdfjs-dist/build/pdf"];
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

      const loadingTask = pdfjsLib.getDocument({ data: responseData.buffer || responseData });
      const pdf = await loadingTask.promise;

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        if (signal.aborted) return;
        const page = await pdf.getPage(pageNum);
        const viewport_orig = page.getViewport({ scale: 1.0 });
        const scale = (container.clientWidth - 80) / viewport_orig.width;
        const viewport = page.getViewport({ scale: Math.min(scale, 2.0) });

        const canvas = document.createElement("canvas");
        canvas.className = "shadow-2xl mb-8 mx-auto bg-white rounded-sm block";
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        container.appendChild(canvas);
      }
    } 
    
    // ج- لو ملف DWG أو غير مدعوم للمعاينة
    else {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center p-20 text-center text-white">
          <i class="fas fa-file-contract text-6xl mb-6 text-dash-accent"></i>
          <h3 class="text-2xl font-black mb-2">ملف مخطط (DWG)</h3>
          <p class="text-gray-400 max-w-md">ملفات الأوتوكاد لا تدعم المعاينة المباشرة في المتصفح. يمكنك تحميل الملف لفتحه بواسطة البرنامج المختص.</p>
          <button onclick="downloadPDF('/files/${dataOrUrl}', '${title}')" class="mt-8 bg-dash-accent hover:bg-orange-600 text-white px-10 py-4 rounded-2xl font-black transition shadow-lg flex items-center gap-3">
             <i class="fas fa-download"></i> تحميل الملف الآن
          </button>
        </div>
      `;
    }

  } catch (err) {
    if (err.name === "AbortError") return;
    console.error("Preview Error:", err);
    container.innerHTML = `<div class="text-red-500 p-10 font-bold text-center">خطأ في المعاينة: ${err.message}</div>`;
  }
}

function closePDFPreview() {
  if (currentPDFAbortController) {
    currentPDFAbortController.abort();
    currentPDFAbortController = null;
  }
  document.getElementById("pdfPreviewModal").classList.add("hidden");
  document.getElementById("pdfViewerContainer").innerHTML = "";
}

async function previewStatementPDF() {
  if (!activeClient) return;

  const { jsPDF } = window.jspdf;
  const element = document.getElementById("financials-capture-area");

  // Open a loading state or just proceed
  const btn = event.currentTarget;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحضير...';
  btn.disabled = true;

  try {
    // Generate canvas from HTML
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: document.documentElement.classList.contains("dark")
        ? "#0f172a"
        : "#f8fafc",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    // Calculate dimensions
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

    // Show in preview modal
    const pdfData = pdf.output("arraybuffer");
    openPDFPreview(`كشف حساب - ${activeClient.name}`, pdfData);
  } catch (err) {
    console.error("PDF Generation Error:", err);
    alert("حدث خطأ أثناء إنشاء الملف");
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
}

function downloadPDF(url, originalName) {
  const link = document.createElement("a");
  link.href = url;
  link.download = originalName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function deletePDF(clientId, filename) {
  // التأكد من المستخدم قبل الحذف
  showConfirmModal(
    "تأكيد الحذف",
    "هل أنت متأكد من حذف هذا المستند نهائياً؟",
    async () => {
      try {
        const response = await fetch("/api/delete-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, filename }),
        });

        const result = await response.json();

        if (result.success) {
          // تحديث البيانات محلياً بعد الحذف الناجح
          activeClient.pdfs = activeClient.pdfs.filter(p => p.filename !== filename);
          saveDB(); // حفظ التغييرات في ملف الـ JSON
          updateClientDOM(); // إعادة رسم الجدول
        } else {
          alert("فشل الحذف: " + (result.error || "خطأ غير معروف"));
        }
      } catch (err) {
        console.error("Delete error:", err);
        alert("حدث خطأ أثناء الاتصال بالسيرفر لحذف الملف");
      }
    }
  );
}

async function handleFileUpload(input) {
  const file = input.files[0];
  if (!file || !activeClient) return;

  // التحقق من الامتدادات المسموحة (PDF, DWG, الصور)
  const allowedExtensions = /(\.pdf|\.dwg|\.jpg|\.jpeg|\.png)$/i;
  if (!allowedExtensions.exec(file.name)) {
    alert("نوع الملف غير مدعوم! مسموح فقط بـ PDF و DWG والصور.");
    input.value = ""; 
    return;
  }

  const formData = new FormData();
  formData.append("pdf", file); // بنسيبها pdf هنا عشان الـ Multer في السيرفر مستنيها بالاسم ده
  formData.append("clientId", activeClient.id);

  try {
    const res = await fetch("/api/upload-pdf", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (data.success) {
      if (!activeClient.pdfs) activeClient.pdfs = [];
      
      // التعديل هنا: بنقرأ data.file اللي جاية من السيرفر، ولو مش موجودة بنجرب data.pdf للضمان
      const newFile = data.file || data.pdf;
      activeClient.pdfs.push(newFile);
      
      renderClientPDFs();
      saveDB(); // مهم جداً تسيف الحالة الجديدة
      // alert("تم رفع الملف بنجاح");
    } else {
      alert("فشل رفع الملف: " + data.error);
    }
  } catch (err) {
    console.error("Upload error:", err);
    alert("حدث خطأ أثناء الرفع");
  } finally {
    input.value = ""; 
  }
}

/**
 * ==========================================
 * TRANSACTIONS
 * ==========================================
 */
function addExp() {
  const r = document.getElementById("in1").value;
  const a = parseFloat(document.getElementById("in2").value);
  const d = document.getElementById("inExpDate").value;
  if (r && a) {
    activeClient.expenses.push({ reason: r, amount: a, date: d });
    saveDB();
    updateClientDOM();
    closeSubModal();
  }
}

function addNewMoney() {
  const r = document.getElementById("in2").value;
  const a = parseFloat(document.getElementById("in3").value);
  const d = document.getElementById("inNewMoneyDate").value;
  if (r && a) {
    activeClient.expenses.push({ reason: r, amount: a, date: d });
    saveDB();
    updateClientDOM();
    closeSubModal();
  }
}

function addTip() {
  const r = document.getElementById("in1").value;
  const p = document.getElementById("in2").value;
  const a = parseFloat(document.getElementById("in3").value);
  const d = document.getElementById("inTipDate").value;
  if (r && a) {
    activeClient.tips.push({ reason: r, payer: p, amount: a, date: d });
    saveDB();
    updateClientDOM();
    closeSubModal();
  }
}

function addDoc() {
  const p = document.getElementById("in1").value;
  const n = document.getElementById("in2").value;
  const g = document.getElementById("in3").value;
  const l = document.getElementById("in4").value;
  const d = document.getElementById("inDocDate").value;
  if (p && n) {
    activeClient.docs.push({
      person: p,
      name: n,
      purpose: g,
      place: l,
      date: d,
    });
    saveDB();
    updateClientDOM();
    closeModals();
  }
}

function saveEditDoc(i) {
  const p = document.getElementById("in1").value;
  const n = document.getElementById("in2").value;
  const g = document.getElementById("in3").value;
  const l = document.getElementById("in4").value;
  const d = document.getElementById("inDocDate").value;
  if (p && n && activeClient.docs[i]) {
    activeClient.docs[i] = {
      person: p,
      name: n,
      purpose: g,
      place: l,
      date: d,
    };
    saveDB();
    updateClientDOM();
    closeModals();
  }
}

function addNewMoney() {
  const receiver = document.getElementById("in2").value;
  const amount = parseFloat(document.getElementById("in3").value);
  const date = document.getElementById("inNewMoneyDate").value;

  if (receiver && amount) {
    if (!activeClient.payments) activeClient.payments = [];
    activeClient.payments.push({
      id: Date.now().toString(),
      receiver,
      amount,
      date,
    });

    // Update the flat "paid" for legacy support if needed,
    // though updateClientDOM now prefers payments history.
    // activeClient.paid = activeClient.payments.reduce(
    //   (acc, p) => acc + parseFloat(p.amount),
    //   0,
    // );

    saveDB();
    updateClientDOM();
    closeSubModal();
  }
}

/**
 * ==========================================
 * INLINE EDITING
 * ==========================================
 */
let currentEditField = null;

function requestEdit(field, type = "text", title = "القيمة") {
  currentEditField = field;
  document.getElementById("editModalTitle").innerText = `تعديل ${title}`;
  document.getElementById("newValueInput").type = type;
  document.getElementById("newValueInput").value = activeClient[field] || "";
  document.getElementById("editValueModal").classList.remove("hidden");
  document.getElementById("newValueInput").focus();
}

function saveNewValue() {
  if (!activeClient || !currentEditField) return;
  const val = document.getElementById("newValueInput").value;

  if (currentEditField === "paid" || currentEditField === "totalContract") {
    activeClient[currentEditField] = parseFloat(val) || 0;
  } else {
    activeClient[currentEditField] = val;
  }

  saveDB();
  updateClientDOM();
  closeModals();
}

function editDoc(i) {
  showSubModal("doc", i);
}

/**
 * ==========================================
 * MODALS & UI HELPERS
 * ==========================================
 */
function closeModals() {
  document.getElementById("subModal").classList.add("hidden");
  document.getElementById("editValueModal").classList.add("hidden");
  document.getElementById("trashModal").classList.add("hidden");
  document.getElementById("newClientModal").classList.add("hidden");
  closeConfirmModal();
}

function showSubModal(type, docIdx = null) {
  const div = document.getElementById("subModalContent");
  if (type === "exp") {
    div.innerHTML = `
      <h3 class="font-black text-2xl mb-6 dark:text-white text-center">إضافة مصروف</h3>
      <div class="space-y-4 mb-6">
        <input id="in1" class="w-full px-4 py-2 rounded-xl border-2 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white" placeholder="البيان" />
        <input id="in2" type="number" class="w-full px-4 py-2 rounded-xl border-2 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white" placeholder="المبلغ" />
        <input id="inExpDate" type="date" class="w-full px-4 py-2 rounded-xl border-2 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white" />
      </div>
      <button onclick="addExp()" class="w-full bg-red-500 text-white py-3 rounded-xl font-black text-lg shadow-lg hover:bg-red-600">تسجيل وحفظ</button>
    `;
    document.getElementById("subModal").firstElementChild.className =
      "bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl w-96 text-right relative border-t-4 border-red-500";
  }
  // الاكراميات
  else if (type === "tip") {
    div.innerHTML = `
      <h3 class="font-black text-2xl mb-6 dark:text-white text-center">إضافة إكرامية</h3>
      <div class="space-y-4 mb-6">
        <input id="in1" class="w-full px-4 py-2 rounded-xl border-2 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white" placeholder="المصلحة" />
        <input id="in2" class="w-full px-4 py-2 rounded-xl border-2 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white" placeholder="من سدد؟" />
        <input id="in3" type="number" class="w-full px-4 py-2 rounded-xl border-2 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white" placeholder="المبلغ" />
        <input id="inTipDate" type="date" class="w-full px-4 py-2 rounded-xl border-2 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white" />
      </div>
      <button onclick="addTip()" class="w-full bg-orange-500 text-white py-3 rounded-xl font-black text-lg shadow-lg hover:bg-orange-600">تسجيل وحفظ</button>
    `;
    document.getElementById("subModal").firstElementChild.className =
      "bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl w-96 text-right relative border-t-4 border-orange-500";
  }
  // اضافه مبلغ جديد من العميل
  else if (type === "newMoney") {
    div.innerHTML = `
      <h3 class="font-black text-2xl mb-6 dark:text-white text-center">إضافة مبلغ جديد</h3>
      <div class="space-y-4 mb-6">
        <input id="in2" class="w-full px-4 py-2 rounded-xl border-2 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white" placeholder="من استلم؟" />
        <input id="in3" type="number" class="w-full px-4 py-2 rounded-xl border-2 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white" placeholder="المبلغ" />
        <input id="inNewMoneyDate" type="date" class="w-full px-4 py-2 rounded-xl border-2 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white" />
      </div>
      <button onclick="addNewMoney()" class="w-full bg-orange-500 text-white py-3 rounded-xl font-black text-lg shadow-lg hover:bg-orange-600">تسجيل وحفظ</button>
    `;
    document.getElementById("subModal").firstElementChild.className =
      "bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl w-96 text-right relative border-t-4 border-orange-500";
  }
  // حركة مستند
  else if (type === "doc") {
    const isEdit = docIdx !== null;
    const doc = isEdit ? activeClient.docs[docIdx] : { person: "", name: "", purpose: "", place: "", date: "" };

    div.innerHTML = `
      <h3 class="font-black text-2xl mb-6 dark:text-white text-center">${isEdit ? 'تعديل مستند' : 'حركة مستند'}</h3>
      <div class="space-y-4 mb-6">
        <input id="in1" class="w-full px-4 py-2 rounded-xl border-2 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white" placeholder="المستلم" value="${doc.person}" />
        <input id="in2" class="w-full px-4 py-2 rounded-xl border-2 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white" placeholder="اسم الورقة" value="${doc.name}" />
        <input id="in3" class="w-full px-4 py-2 rounded-xl border-2 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white" placeholder="الغرض" value="${doc.purpose}" />
        <input id="in4" class="w-full px-4 py-2 rounded-xl border-2 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white" placeholder="المكان" value="${doc.place}" />
        <input id="inDocDate" type="date" class="w-full px-4 py-2 rounded-xl border-2 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white" value="${doc.date}" />
      </div>
      <button onclick="${isEdit ? `saveEditDoc(${docIdx})` : 'addDoc()'}" class="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-lg shadow-lg hover:bg-blue-700">
        ${isEdit ? 'حفظ التعديلات' : 'تسجيل وحفظ'}
      </button>
    `;
    document.getElementById("subModal").firstElementChild.className =
      "bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl w-96 text-right relative border-t-4 border-blue-500";
  }
  document.getElementById("subModal").classList.remove("hidden");
}

function closeSubModal() {
  document.getElementById("subModal").classList.add("hidden");
}

function openTrashModal() {
  const list = document.getElementById("trashList");
  list.innerHTML = trashDB.length
    ? trashDB
        .map(
          (c) => `
        <div class="flex justify-between items-center bg-gray-50 dark:bg-slate-700 p-4 rounded-xl border border-gray-100 dark:border-slate-600 mb-3">
            <span class="font-bold dark:text-white">${c.name} - ${c.plot}</span>
            <div class="flex gap-2">
              <button onclick="restoreClient('${c.id}')" class="text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg font-bold hover:bg-green-500 hover:text-white transition">استعادة</button>
              <button onclick="permanentDeleteClient('${c.id}')" class="text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg font-bold hover:bg-red-500 hover:text-white transition">حذف نهائي</button>
            </div>
        </div>`,
        )
        .join("")
    : "<p class='text-center text-gray-500 font-bold py-6'>السلة فارغة</p>";
  document.getElementById("trashModal").classList.remove("hidden");
}

function toggleDarkMode() {
  document.documentElement.classList.toggle("dark");
  const icon = document.getElementById("themeIcon");
  if (document.documentElement.classList.contains("dark")) {
    icon.classList.replace("fa-moon", "fa-sun");
  } else {
    icon.classList.replace("fa-sun", "fa-moon");
  }
}

function toggleNewClientModal() {
  document.getElementById("newClientModal").classList.toggle("hidden");
}

/**
 * ==========================================
 * CUSTOM CONFIRM MODAL
 * ==========================================
 */
function showConfirmModal(title, message, onConfirm, showCancel = true, type = "red") {
  document.getElementById("confirmTitle").innerText = title;
  document.getElementById("confirmMessage").innerText = message;
  
  const modalDiv = document.getElementById("confirmModal").firstElementChild;
  const iconDiv = modalDiv.querySelector("div");
  const confirmBtn = document.getElementById("confirmBtn");
  const cancelBtn = confirmBtn.nextElementSibling;

  // Apply visual theme based on type
  if (type === "green") {
    modalDiv.style.borderTopColor = "#22c55e"; // green-500
    iconDiv.className = "w-20 h-20 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl";
    iconDiv.innerHTML = '<i class="fas fa-check-circle"></i>';
    confirmBtn.className = "flex-1 bg-green-500 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-green-600 transition-all active:scale-95";
  } else if (type === "blue") {
    modalDiv.style.borderTopColor = "#3b82f6"; // blue-500
    iconDiv.className = "w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl";
    iconDiv.innerHTML = '<i class="fas fa-info-circle"></i>';
    confirmBtn.className = "flex-1 bg-blue-500 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-blue-600 transition-all active:scale-95";
  } else {
    modalDiv.style.borderTopColor = "#ef4444"; // red-500
    iconDiv.className = "w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl";
    iconDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    confirmBtn.className = "flex-1 bg-red-500 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-red-600 transition-all active:scale-95";
  }

  cancelBtn.style.display = showCancel ? "block" : "none";
  document.getElementById("confirmModal").classList.remove("hidden");

  // Reset events
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  newBtn.addEventListener("click", () => {
    onConfirm();
    closeConfirmModal();
  });
}

function closeConfirmModal() {
  document.getElementById("confirmModal").classList.add("hidden");
}
