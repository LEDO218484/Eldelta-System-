const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", (req, res, next) => {
  // Catch API calls and let them pass through
  if (req.path.startsWith("/api")) {
    return next();
  }

  const dynamicFolderPath = path.join(__dirname, "client");

  // Use express.static to serve files from the dynamically determined folder
  return express.static(dynamicFolderPath)(req, res, next);
});

// Configure Multer for PDF uploads
const multer = require("multer");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "data", "files");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed!"), false);
    }
  },
});

// Paths to database files
const dbPath = path.join(__dirname, "data", "db", "delta_db.json");
const trashPath = path.join(__dirname, "data", "db", "delta_trash.json");

// Serve uploaded files
app.use("/files", express.static(path.join(__dirname, "data", "files")));

// API Endpoint: Get Data
app.get("/api/data", (req, res) => {
  try {
    const clientsDB = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, "utf-8")) : [];
    const trashDB = fs.existsSync(trashPath) ? JSON.parse(fs.readFileSync(trashPath, "utf-8")) : [];
    
    res.json({ clientsDB, trashDB });
  } catch (error) {
    console.error("Error reading db files:", error);
    res.status(500).json({ error: "Failed to read database files" });
  }
});

// API Endpoint: Save Data
app.post("/api/data", (req, res) => {
  try {
    const { clientsDB, trashDB } = req.body;

    // Optional: add some basic validation here if needed
    if (!Array.isArray(clientsDB) || !Array.isArray(trashDB)) {
       return res.status(400).json({ error: "Invalid data format. Expected arrays." });
    }

    fs.writeFileSync(dbPath, JSON.stringify(clientsDB, null, 2));
    fs.writeFileSync(trashPath, JSON.stringify(trashDB, null, 2));

    res.json({ success: true });
  } catch (error) {
    console.error("Error writing db files:", error);
    res.status(500).json({ error: "Failed to write database files" });
  }
});

// API Endpoint: Upload PDF
app.post("/api/upload-pdf", upload.single("pdf"), (req, res) => {
  try {
    const { clientId } = req.body;
    const file = req.file;

    if (!file || !clientId) {
      return res.status(400).json({ error: "Missing file or clientId" });
    }

    const clientsDB = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, "utf-8")) : [];
    const client = clientsDB.find((c) => c.id === clientId);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    if (!client.pdfs) client.pdfs = [];

    const pdfMetadata = {
      originalName: file.originalname,
      filename: file.filename,
      date: new Date().toISOString().split("T")[0],
      path: "/files/" + file.filename,
    };

    client.pdfs.push(pdfMetadata);
    fs.writeFileSync(dbPath, JSON.stringify(clientsDB, null, 2));

    res.json({ success: true, pdf: pdfMetadata });
  } catch (error) {
    console.error("Error uploading PDF:", error);
    res.status(500).json({ error: "Failed to upload PDF" });
  }
});

// API Endpoint: Delete PDF
app.delete("/api/delete-pdf", (req, res) => {
  try {
    const { clientId, filename } = req.body;

    if (!clientId || !filename) {
      return res.status(400).json({ error: "Missing clientId or filename" });
    }

    const clientsDB = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, "utf-8")) : [];
    const client = clientsDB.find((c) => c.id === clientId);

    if (!client || !client.pdfs) {
      return res.status(404).json({ error: "Client or PDF list not found" });
    }

    const pdfIdx = client.pdfs.findIndex((p) => p.filename === filename);
    if (pdfIdx === -1) {
      return res.status(404).json({ error: "PDF entry not found in database" });
    }

    // Remove file from disk
    const filePath = path.join(__dirname, "data", "files", filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from DB
    client.pdfs.splice(pdfIdx, 1);
    fs.writeFileSync(dbPath, JSON.stringify(clientsDB, null, 2));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting PDF:", error);
    res.status(500).json({ error: "Failed to delete PDF" });
  }
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
