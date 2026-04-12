const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();

const projectRoot = path.join(__dirname, "../..");
const configuredPath = process.env.DB_PATH || "./database/hospital.db";
const dbPath = path.isAbsolute(configuredPath)
  ? configuredPath
  : path.join(projectRoot, configuredPath.replace(/^\.\//, ""));

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        id: this.lastID,
        changes: this.changes
      });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row || null);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows || []);
    });
  });
}

async function ensureTableColumn(tableName, columnName, definition) {
  const columns = await all(`PRAGMA table_info(${tableName})`);
  const exists = columns.some((column) => column.name === columnName);

  if (exists) {
    return;
  }

  await run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

function nowIso(offsetMinutes = 0) {
  return new Date(Date.now() + offsetMinutes * 60 * 1000).toISOString();
}

async function seedPortalData() {
  const existing = await get("SELECT COUNT(*) AS total FROM portal_users");
  if (existing && existing.total > 0) {
    return;
  }

  const demoUsers = [
    {
      name: "Maya Rao",
      email: "superadmin@abchospital.com",
      phone: "9876500100",
      role: "super_admin",
      specialization: "",
      experienceYears: 0,
      department: "Executive Office",
      notes: "Full system authority",
      password: "SuperAdmin@123"
    },
    {
      name: "Riya Kapoor",
      email: "admin@abchospital.com",
      phone: "9876500099",
      role: "admin",
      specialization: "",
      experienceYears: 0,
      department: "Operations",
      notes: "Hospital operations administrator",
      password: "Admin@123"
    },
    {
      name: "Dr. Priya Sharma",
      email: "doctor@abchospital.com",
      phone: "9876500001",
      role: "doctor",
      specialization: "Cardiology",
      experienceYears: 12,
      department: "Cardiology",
      notes: "Primary cardiology consultant",
      password: "Doctor@123"
    },
    {
      name: "Dr. Karan Nair",
      email: "dr.nair@abchospital.com",
      phone: "9876500002",
      role: "doctor",
      specialization: "Orthopedics",
      experienceYears: 9,
      department: "Orthopedics",
      notes: "Sports injury specialist",
      password: "Doctor@123"
    },
    {
      name: "Neha Iyer",
      email: "nurse@abchospital.com",
      phone: "9876500200",
      role: "nurse",
      specialization: "Emergency Triage",
      experienceYears: 6,
      department: "Emergency",
      notes: "Queue coordination and triage support",
      password: "Nurse@123"
    },
    {
      name: "Ankit Verma",
      email: "receptionist@abchospital.com",
      phone: "9876500300",
      role: "receptionist",
      specialization: "",
      experienceYears: 4,
      department: "Front Desk",
      notes: "Patient registration and desk management",
      password: "Reception@123"
    },
    {
      name: "Rahul Sen",
      email: "staff@abchospital.com",
      phone: "9876500400",
      role: "staff",
      specialization: "",
      experienceYears: 5,
      department: "Emergency Support",
      notes: "Emergency intake and queue handling",
      password: "Staff@123"
    },
    {
      name: "Aarav Mehta",
      email: "patient@abchospital.com",
      phone: "9876543210",
      role: "patient",
      specialization: "",
      experienceYears: 0,
      department: "General",
      notes: "Demo patient account",
      password: "Patient@123"
    },
    {
      name: "Sara Thomas",
      email: "sara.patient@abchospital.com",
      phone: "9876543211",
      role: "patient",
      specialization: "",
      experienceYears: 0,
      department: "General",
      notes: "Secondary demo patient",
      password: "Patient@123"
    }
  ];

  const userIds = {};

  for (const user of demoUsers) {
    const passwordHash = bcrypt.hashSync(user.password, 10);
    const insert = await run(
      `INSERT INTO portal_users (
        name,
        email,
        phone,
        password_hash,
        role,
        specialization,
        experience_years,
        department,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.name,
        user.email.toLowerCase(),
        user.phone,
        passwordHash,
        user.role,
        user.specialization,
        user.experienceYears,
        user.department,
        user.notes
      ]
    );

    userIds[user.email] = insert.id;
  }

  const appointments = [
    {
      patientEmail: "patient@abchospital.com",
      doctorEmail: "doctor@abchospital.com",
      createdByEmail: "patient@abchospital.com",
      appointmentDate: nowIso(90),
      status: "pending",
      medicalField: "cardiology",
      severity: 4,
      symptoms: "Shortness of breath and chest tightness during stairs",
      reason: "Cardiac assessment",
      patientNotes: "Symptoms worsened in the last 48 hours.",
      doctorNotes: "",
      decisionNotes: "Awaiting doctor review."
    },
    {
      patientEmail: "patient@abchospital.com",
      doctorEmail: "dr.nair@abchospital.com",
      createdByEmail: "receptionist@abchospital.com",
      appointmentDate: nowIso(-7200),
      status: "completed",
      medicalField: "orthopedics",
      severity: 2,
      symptoms: "Persistent knee pain after running",
      reason: "Orthopedic follow-up",
      patientNotes: "Pain while climbing stairs.",
      doctorNotes: "Suggested rehab exercises and light activity.",
      decisionNotes: "Completed after consultation."
    },
    {
      patientEmail: "sara.patient@abchospital.com",
      doctorEmail: "doctor@abchospital.com",
      createdByEmail: "receptionist@abchospital.com",
      appointmentDate: nowIso(240),
      status: "accepted",
      medicalField: "cardiology",
      severity: 3,
      symptoms: "Palpitations and fatigue",
      reason: "Consultation for irregular heartbeat",
      patientNotes: "Needs ECG review.",
      doctorNotes: "Accepted and moved to today's list.",
      decisionNotes: "Bring last blood test reports."
    }
  ];

  const appointmentIds = {};

  for (const appointment of appointments) {
    const insert = await run(
      `INSERT INTO portal_appointments (
        patient_id,
        doctor_id,
        created_by_user_id,
        appointment_date,
        status,
        medical_field,
        severity,
        symptoms,
        reason,
        patient_notes,
        doctor_notes,
        decision_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userIds[appointment.patientEmail],
        userIds[appointment.doctorEmail],
        userIds[appointment.createdByEmail],
        appointment.appointmentDate,
        appointment.status,
        appointment.medicalField,
        appointment.severity,
        appointment.symptoms,
        appointment.reason,
        appointment.patientNotes,
        appointment.doctorNotes,
        appointment.decisionNotes
      ]
    );

    appointmentIds[`${appointment.patientEmail}:${appointment.doctorEmail}:${appointment.reason}`] =
      insert.id;
  }

  const emergencyCases = [
    {
      patientName: "Walk-in: Kavya Singh",
      patientAge: 54,
      symptoms: "Severe chest pain, sweating, dizziness",
      severity: 5,
      status: "waiting",
      patientUserEmail: null,
      addedByEmail: "staff@abchospital.com",
      assignedDoctorEmail: "doctor@abchospital.com",
      assignedNurseEmail: "nurse@abchospital.com",
      notes: "Critical intake from emergency desk.",
      createdAt: nowIso(-35)
    },
    {
      patientName: "Aarav Mehta",
      patientAge: 31,
      symptoms: "Sharp abdominal pain with nausea",
      severity: 3,
      status: "triaged",
      patientUserEmail: "patient@abchospital.com",
      addedByEmail: "receptionist@abchospital.com",
      assignedDoctorEmail: "dr.nair@abchospital.com",
      assignedNurseEmail: "nurse@abchospital.com",
      notes: "Waiting for imaging and physician review.",
      createdAt: nowIso(-20)
    },
    {
      patientName: "Walk-in: Mohan Das",
      patientAge: 42,
      symptoms: "Minor wrist swelling after a fall",
      severity: 1,
      status: "waiting",
      patientUserEmail: null,
      addedByEmail: "staff@abchospital.com",
      assignedDoctorEmail: null,
      assignedNurseEmail: null,
      notes: "Observed in low priority queue.",
      createdAt: nowIso(-10)
    }
  ];

  for (const entry of emergencyCases) {
    await run(
      `INSERT INTO portal_emergency_cases (
        patient_name,
        patient_age,
        symptoms,
        severity,
        status,
        patient_user_id,
        added_by_user_id,
        assigned_doctor_id,
        assigned_nurse_id,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.patientName,
        entry.patientAge,
        entry.symptoms,
        entry.severity,
        entry.status,
        entry.patientUserEmail ? userIds[entry.patientUserEmail] : null,
        userIds[entry.addedByEmail],
        entry.assignedDoctorEmail ? userIds[entry.assignedDoctorEmail] : null,
        entry.assignedNurseEmail ? userIds[entry.assignedNurseEmail] : null,
        entry.notes,
        entry.createdAt,
        entry.createdAt
      ]
    );
  }

  const chatInsert = await run(
    `INSERT INTO portal_chats (
      patient_id,
      doctor_id,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?)`,
    [
      userIds["patient@abchospital.com"],
      userIds["doctor@abchospital.com"],
      nowIso(-180),
      nowIso(-30)
    ]
  );

  await run(
    `INSERT INTO portal_messages (chat_id, sender_id, body, created_at)
    VALUES (?, ?, ?, ?)`,
    [
      chatInsert.id,
      userIds["patient@abchospital.com"],
      "Doctor, the breathing discomfort is stronger this evening. Should I come earlier?",
      nowIso(-180)
    ]
  );
  await run(
    `INSERT INTO portal_messages (chat_id, sender_id, body, created_at)
    VALUES (?, ?, ?, ?)`,
    [
      chatInsert.id,
      userIds["doctor@abchospital.com"],
      "Yes, please arrive 30 minutes early. If the pain gets worse, head to emergency immediately.",
      nowIso(-120)
    ]
  );
  await run(
    `INSERT INTO portal_messages (chat_id, sender_id, body, created_at)
    VALUES (?, ?, ?, ?)`,
    [
      chatInsert.id,
      userIds["patient@abchospital.com"],
      "Understood. I will reach by 9:30 AM.",
      nowIso(-30)
    ]
  );

  const completedAppointmentId =
    appointmentIds["patient@abchospital.com:dr.nair@abchospital.com:Orthopedic follow-up"];

  const prescriptionInsert = await run(
    `INSERT INTO portal_prescriptions (
      appointment_id,
      patient_id,
      doctor_id,
      title,
      current_version_number,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      completedAppointmentId,
      userIds["patient@abchospital.com"],
      userIds["dr.nair@abchospital.com"],
      "Knee pain follow-up",
      2,
      nowIso(-6800),
      nowIso(-6500)
    ]
  );

  await run(
    `INSERT INTO portal_prescription_versions (
      prescription_id,
      version_number,
      diagnosis,
      medicines_json,
      notes,
      change_summary,
      created_by_user_id,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      prescriptionInsert.id,
      1,
      "Patellofemoral pain syndrome",
      JSON.stringify([
        {
          name: "Aceclofenac",
          dosage: "100 mg",
          timing: "Twice daily after meals"
        }
      ]),
      "Start physiotherapy and avoid running for 10 days.",
      "Initial prescription created.",
      userIds["dr.nair@abchospital.com"],
      nowIso(-6800)
    ]
  );

  await run(
    `INSERT INTO portal_prescription_versions (
      prescription_id,
      version_number,
      diagnosis,
      medicines_json,
      notes,
      change_summary,
      created_by_user_id,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      prescriptionInsert.id,
      2,
      "Patellofemoral pain syndrome with inflammation",
      JSON.stringify([
        {
          name: "Aceclofenac",
          dosage: "100 mg",
          timing: "Twice daily after meals"
        },
        {
          name: "Vitamin D3",
          dosage: "60,000 IU",
          timing: "Once weekly for 6 weeks"
        }
      ]),
      "Continue physiotherapy. Add quadriceps strengthening and review after 3 weeks.",
      "Added Vitamin D3 and updated rehab plan.",
      userIds["dr.nair@abchospital.com"],
      nowIso(-6500)
    ]
  );

  await run(
    "UPDATE portal_appointments SET prescription_id = ? WHERE id = ?",
    [prescriptionInsert.id, completedAppointmentId]
  );

  const activeAdmissions = [
    {
      patientEmail: "patient@abchospital.com",
      appointmentId: completedAppointmentId,
      admittedByDoctorEmail: "dr.nair@abchospital.com",
      roomLabel: "Ward B-12",
      status: "admitted",
      careNotes: "Support knee rehabilitation, monitor pain score, and confirm evening medication dose.",
      admittedAt: nowIso(-6200)
    },
    {
      patientEmail: "sara.patient@abchospital.com",
      appointmentId:
        appointmentIds[
          "sara.patient@abchospital.com:doctor@abchospital.com:Consultation for irregular heartbeat"
        ],
      admittedByDoctorEmail: "doctor@abchospital.com",
      roomLabel: "Observation 03",
      status: "under_observation",
      careNotes: "Monitor palpitations, maintain hydration, and prepare for cardiology review.",
      admittedAt: nowIso(-180)
    }
  ];

  for (const admission of activeAdmissions) {
    await run(
      `INSERT INTO portal_admissions (
        patient_id,
        appointment_id,
        admitted_by_doctor_id,
        room_label,
        status,
        care_notes,
        admitted_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userIds[admission.patientEmail],
        admission.appointmentId,
        userIds[admission.admittedByDoctorEmail],
        admission.roomLabel,
        admission.status,
        admission.careNotes,
        admission.admittedAt,
        admission.admittedAt
      ]
    );
  }

  const billingRecords = [
    {
      patientEmail: "patient@abchospital.com",
      appointmentId: completedAppointmentId,
      createdByEmail: "receptionist@abchospital.com",
      category: "Orthopedic consultation",
      amount: 1850,
      status: "paid",
      dueDate: nowIso(-7000),
      paidAt: nowIso(-6900),
      notes: "Cleared at the front desk after follow-up."
    },
    {
      patientEmail: "sara.patient@abchospital.com",
      appointmentId:
        appointmentIds[
          "sara.patient@abchospital.com:doctor@abchospital.com:Consultation for irregular heartbeat"
        ],
      createdByEmail: "receptionist@abchospital.com",
      category: "Cardiology OPD booking",
      amount: 2400,
      status: "pending",
      dueDate: nowIso(360),
      paidAt: null,
      notes: "Collect billing before consultation starts."
    }
  ];

  for (const bill of billingRecords) {
    await run(
      `INSERT INTO portal_bills (
        patient_id,
        appointment_id,
        created_by_user_id,
        category,
        amount,
        status,
        due_date,
        paid_at,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userIds[bill.patientEmail],
        bill.appointmentId,
        userIds[bill.createdByEmail],
        bill.category,
        bill.amount,
        bill.status,
        bill.dueDate,
        bill.paidAt,
        bill.notes,
        bill.dueDate,
        bill.paidAt || bill.dueDate
      ]
    );
  }

  const notifications = [
    {
      userEmail: "doctor@abchospital.com",
      type: "appointment",
      severity: "medium",
      title: "New urgent appointment",
      body: "Aarav Mehta booked a severity 4 cardiology appointment.",
      meta: JSON.stringify({ section: "appointments" }),
      createdAt: nowIso(-40)
    },
    {
      userEmail: "patient@abchospital.com",
      type: "chat",
      severity: "medium",
      title: "Doctor replied in chat",
      body: "Dr. Priya Sharma responded to your message.",
      meta: JSON.stringify({ section: "chat" }),
      createdAt: nowIso(-28)
    },
    {
      userEmail: "nurse@abchospital.com",
      type: "emergency",
      severity: "critical",
      title: "Critical emergency intake",
      body: "Walk-in: Kavya Singh entered the queue with severity 5.",
      meta: JSON.stringify({ section: "queue" }),
      createdAt: nowIso(-36)
    },
    {
      userEmail: "admin@abchospital.com",
      type: "report",
      severity: "low",
      title: "Morning snapshot ready",
      body: "Operations dashboard refreshed with updated patient stats.",
      meta: JSON.stringify({ section: "reports" }),
      createdAt: nowIso(-60)
    }
  ];

  for (const notification of notifications) {
    await run(
      `INSERT INTO portal_notifications (
        user_id,
        type,
        severity,
        title,
        body,
        meta_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userIds[notification.userEmail],
        notification.type,
        notification.severity,
        notification.title,
        notification.body,
        notification.meta,
        notification.createdAt
      ]
    );
  }
}

async function seedOperationalExtensions() {
  const admissions = await get("SELECT COUNT(*) AS total FROM portal_admissions");

  if (!admissions?.total) {
    const patient = await get("SELECT id FROM portal_users WHERE email = ?", ["patient@abchospital.com"]);
    const sara = await get("SELECT id FROM portal_users WHERE email = ?", ["sara.patient@abchospital.com"]);
    const doctor = await get("SELECT id FROM portal_users WHERE email = ?", ["doctor@abchospital.com"]);
    const drNair = await get("SELECT id FROM portal_users WHERE email = ?", ["dr.nair@abchospital.com"]);
    const orthopedicAppointment = await get(
      "SELECT id FROM portal_appointments WHERE reason = ? ORDER BY id ASC LIMIT 1",
      ["Orthopedic follow-up"]
    );
    const cardiologyAppointment = await get(
      "SELECT id FROM portal_appointments WHERE reason = ? ORDER BY id ASC LIMIT 1",
      ["Consultation for irregular heartbeat"]
    );

    if (patient && drNair && orthopedicAppointment) {
      await run(
        `INSERT INTO portal_admissions (
          patient_id,
          appointment_id,
          admitted_by_doctor_id,
          room_label,
          status,
          care_notes,
          admitted_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patient.id,
          orthopedicAppointment.id,
          drNair.id,
          "Ward B-12",
          "admitted",
          "Support knee rehabilitation, monitor pain score, and confirm evening medication dose.",
          nowIso(-6200),
          nowIso(-6200)
        ]
      );
    }

    if (sara && doctor && cardiologyAppointment) {
      await run(
        `INSERT INTO portal_admissions (
          patient_id,
          appointment_id,
          admitted_by_doctor_id,
          room_label,
          status,
          care_notes,
          admitted_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sara.id,
          cardiologyAppointment.id,
          doctor.id,
          "Observation 03",
          "under_observation",
          "Monitor palpitations, maintain hydration, and prepare for cardiology review.",
          nowIso(-180),
          nowIso(-180)
        ]
      );
    }
  }

  const bills = await get("SELECT COUNT(*) AS total FROM portal_bills");

  if (!bills?.total) {
    const patient = await get("SELECT id FROM portal_users WHERE email = ?", ["patient@abchospital.com"]);
    const sara = await get("SELECT id FROM portal_users WHERE email = ?", ["sara.patient@abchospital.com"]);
    const receptionist = await get("SELECT id FROM portal_users WHERE email = ?", ["receptionist@abchospital.com"]);
    const orthopedicAppointment = await get(
      "SELECT id FROM portal_appointments WHERE reason = ? ORDER BY id ASC LIMIT 1",
      ["Orthopedic follow-up"]
    );
    const cardiologyAppointment = await get(
      "SELECT id FROM portal_appointments WHERE reason = ? ORDER BY id ASC LIMIT 1",
      ["Consultation for irregular heartbeat"]
    );

    if (patient && receptionist && orthopedicAppointment) {
      await run(
        `INSERT INTO portal_bills (
          patient_id,
          appointment_id,
          created_by_user_id,
          category,
          amount,
          status,
          due_date,
          paid_at,
          notes,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patient.id,
          orthopedicAppointment.id,
          receptionist.id,
          "Orthopedic consultation",
          1850,
          "paid",
          nowIso(-7000),
          nowIso(-6900),
          "Cleared at the front desk after follow-up.",
          nowIso(-7000),
          nowIso(-6900)
        ]
      );
    }

    if (sara && receptionist && cardiologyAppointment) {
      await run(
        `INSERT INTO portal_bills (
          patient_id,
          appointment_id,
          created_by_user_id,
          category,
          amount,
          status,
          due_date,
          paid_at,
          notes,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sara.id,
          cardiologyAppointment.id,
          receptionist.id,
          "Cardiology OPD booking",
          2400,
          "pending",
          nowIso(360),
          null,
          "Collect billing before consultation starts.",
          nowIso(-60),
          nowIso(-60)
        ]
      );
    }
  }
}

async function initializeDatabase() {
  await run("PRAGMA foreign_keys = ON");

  await run(`
    CREATE TABLE IF NOT EXISTS portal_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      google_sub TEXT,
      role TEXT NOT NULL CHECK (
        role IN ('patient', 'doctor', 'admin', 'super_admin', 'nurse', 'receptionist', 'staff')
      ),
      specialization TEXT DEFAULT '',
      experience_years INTEGER DEFAULT 0,
      department TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ensureTableColumn("portal_users", "google_sub", "TEXT");

  await run(`
    CREATE TABLE IF NOT EXISTS portal_appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      created_by_user_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled')
      ),
      medical_field TEXT DEFAULT 'general',
      severity INTEGER NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
      symptoms TEXT DEFAULT '',
      reason TEXT DEFAULT '',
      patient_notes TEXT DEFAULT '',
      doctor_notes TEXT DEFAULT '',
      decision_notes TEXT DEFAULT '',
      prescription_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES portal_users(id),
      FOREIGN KEY (doctor_id) REFERENCES portal_users(id),
      FOREIGN KEY (created_by_user_id) REFERENCES portal_users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS portal_admissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      appointment_id INTEGER,
      admitted_by_doctor_id INTEGER NOT NULL,
      room_label TEXT DEFAULT '',
      shifted_to TEXT DEFAULT '',
      shifted_updated_by_user_id INTEGER,
      status TEXT NOT NULL DEFAULT 'admitted' CHECK (
        status IN ('admitted', 'under_observation', 'discharged')
      ),
      care_notes TEXT DEFAULT '',
      admitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES portal_users(id),
      FOREIGN KEY (appointment_id) REFERENCES portal_appointments(id),
      FOREIGN KEY (admitted_by_doctor_id) REFERENCES portal_users(id),
      FOREIGN KEY (shifted_updated_by_user_id) REFERENCES portal_users(id)
    )
  `);

  await ensureTableColumn("portal_admissions", "shifted_to", "TEXT DEFAULT ''");
  await ensureTableColumn("portal_admissions", "shifted_updated_by_user_id", "INTEGER");

  await run(`
    CREATE TABLE IF NOT EXISTS portal_emergency_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_name TEXT NOT NULL,
      patient_age INTEGER NOT NULL,
      symptoms TEXT NOT NULL,
      severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
      status TEXT NOT NULL DEFAULT 'waiting' CHECK (
        status IN ('waiting', 'triaged', 'assigned', 'in_treatment', 'stable', 'closed')
      ),
      patient_user_id INTEGER,
      added_by_user_id INTEGER NOT NULL,
      assigned_doctor_id INTEGER,
      assigned_nurse_id INTEGER,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_user_id) REFERENCES portal_users(id),
      FOREIGN KEY (added_by_user_id) REFERENCES portal_users(id),
      FOREIGN KEY (assigned_doctor_id) REFERENCES portal_users(id),
      FOREIGN KEY (assigned_nurse_id) REFERENCES portal_users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS portal_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      appointment_id INTEGER,
      created_by_user_id INTEGER NOT NULL,
      category TEXT NOT NULL DEFAULT 'OPD Consultation',
      amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'paid', 'partial')
      ),
      due_date TEXT,
      paid_at TEXT,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES portal_users(id),
      FOREIGN KEY (appointment_id) REFERENCES portal_appointments(id),
      FOREIGN KEY (created_by_user_id) REFERENCES portal_users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS portal_chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (patient_id, doctor_id),
      FOREIGN KEY (patient_id) REFERENCES portal_users(id),
      FOREIGN KEY (doctor_id) REFERENCES portal_users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS portal_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES portal_chats(id),
      FOREIGN KEY (sender_id) REFERENCES portal_users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS portal_prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL UNIQUE,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      title TEXT DEFAULT '',
      current_version_number INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES portal_appointments(id),
      FOREIGN KEY (patient_id) REFERENCES portal_users(id),
      FOREIGN KEY (doctor_id) REFERENCES portal_users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS portal_prescription_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prescription_id INTEGER NOT NULL,
      version_number INTEGER NOT NULL,
      diagnosis TEXT DEFAULT '',
      medicines_json TEXT NOT NULL,
      notes TEXT DEFAULT '',
      change_summary TEXT DEFAULT '',
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (prescription_id, version_number),
      FOREIGN KEY (prescription_id) REFERENCES portal_prescriptions(id),
      FOREIGN KEY (created_by_user_id) REFERENCES portal_users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS portal_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'critical')),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      meta_json TEXT DEFAULT '{}',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES portal_users(id)
    )
  `);

  await run("CREATE INDEX IF NOT EXISTS idx_portal_users_role ON portal_users(role)");
  await run(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_users_google_sub ON portal_users(google_sub) WHERE google_sub IS NOT NULL"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_portal_appointments_doctor ON portal_appointments(doctor_id)"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_portal_admissions_status ON portal_admissions(status, admitted_at)"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_portal_appointments_patient ON portal_appointments(patient_id)"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_portal_emergency_severity ON portal_emergency_cases(severity)"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_portal_messages_chat ON portal_messages(chat_id, created_at)"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_portal_notifications_user ON portal_notifications(user_id, created_at)"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_portal_bills_status ON portal_bills(status, due_date)"
  );

  await seedPortalData();
  await seedOperationalExtensions();
}

module.exports = {
  all,
  db,
  dbPath,
  get,
  initializeDatabase,
  run
};
