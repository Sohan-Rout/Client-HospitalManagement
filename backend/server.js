const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const { dbPath, initializeDatabase } = require("./config/db");
const appointmentsRoutes = require("./routes/appointments");
const authRoutes = require("./routes/auth");
const admissionsRoutes = require("./routes/admissions");
const bootstrapRoutes = require("./routes/bootstrap");
const chatRoutes = require("./routes/chat");
const emergencyRoutes = require("./routes/emergency");
const healthRoutes = require("./routes/health");
const notificationsRoutes = require("./routes/notifications");
const prescriptionsRoutes = require("./routes/prescriptions");
const usersRoutes = require("./routes/users");

dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const frontendOutDir = path.join(__dirname, "../frontend/out");
const resolvedFrontendOutDir = path.resolve(frontendOutDir);
const hasFrontendBuild = fs.existsSync(frontendOutDir);

function resolveFrontendExport(requestPath) {
  const normalizedPath = decodeURIComponent(requestPath || "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  const candidates = normalizedPath
    ? [normalizedPath, `${normalizedPath}.html`, path.join(normalizedPath, "index.html")]
    : ["index.html"];

  for (const candidate of candidates) {
    const absolutePath = path.resolve(frontendOutDir, candidate);
    const insideFrontendBuild =
      absolutePath === path.join(resolvedFrontendOutDir, "index.html") ||
      absolutePath.startsWith(`${resolvedFrontendOutDir}${path.sep}`);

    if (!insideFrontendBuild) {
      continue;
    }

    if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
      return absolutePath;
    }
  }

  return null;
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admissions", admissionsRoutes);
app.use("/api", bootstrapRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/prescriptions", prescriptionsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

if (hasFrontendBuild) {
  app.use(express.static(frontendOutDir));

  app.get("*", (req, res) => {
    const frontendFile = resolveFrontendExport(req.path);

    if (!frontendFile) {
      res.status(404).send("Page not found");
      return;
    }

    res.sendFile(frontendFile);
  });
} else {
  app.get("*", (req, res) => {
    res.status(503).json({
      error: "Frontend build not found. Run `npm run build` or `npm run dev:frontend`."
    });
  });
}

initializeDatabase()
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`ABC Hospital portal running on http://${HOST}:${PORT}`);
      console.log(`Database ready at ${dbPath}`);
      if (hasFrontendBuild) {
        console.log(`Frontend build served from ${frontendOutDir}`);
      }
      console.log("Demo accounts:");
      console.log("superadmin@abchospital.com / SuperAdmin@123");
      console.log("admin@abchospital.com / Admin@123");
      console.log("doctor@abchospital.com / Doctor@123");
      console.log("nurse@abchospital.com / Nurse@123");
      console.log("receptionist@abchospital.com / Reception@123");
      console.log("staff@abchospital.com / Staff@123");
      console.log("patient@abchospital.com / Patient@123");
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
