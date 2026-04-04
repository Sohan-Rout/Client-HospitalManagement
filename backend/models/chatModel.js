const { all, get, run } = require("../config/db");

async function fetchChatThreads(currentUser) {
  if (!["patient", "doctor"].includes(currentUser.role)) {
    return [];
  }

  const rows = await all(
    `SELECT
      c.id,
      c.patient_id,
      c.doctor_id,
      c.created_at,
      c.updated_at,
      p.name AS patient_name,
      p.email AS patient_email,
      d.name AS doctor_name,
      d.email AS doctor_email,
      d.specialization AS doctor_specialization
    FROM portal_chats c
    INNER JOIN portal_users p ON p.id = c.patient_id
    INNER JOIN portal_users d ON d.id = c.doctor_id
    WHERE ${currentUser.role === "patient" ? "c.patient_id = ?" : "c.doctor_id = ?"}
    ORDER BY datetime(c.updated_at) DESC`,
    [currentUser.id]
  );

  const threads = [];

  for (const row of rows) {
    const messages = await all(
      `SELECT
        m.id,
        m.body,
        m.created_at,
        u.id AS sender_id,
        u.name AS sender_name,
        u.role AS sender_role
      FROM portal_messages m
      INNER JOIN portal_users u ON u.id = m.sender_id
      WHERE m.chat_id = ?
      ORDER BY datetime(m.created_at) ASC`,
      [row.id]
    );

    threads.push({
      id: row.id,
      patient: {
        id: row.patient_id,
        name: row.patient_name,
        email: row.patient_email
      },
      doctor: {
        id: row.doctor_id,
        name: row.doctor_name,
        email: row.doctor_email,
        specialization: row.doctor_specialization || ""
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      latestMessage: messages.length ? messages[messages.length - 1].body : "",
      messages: messages.map((message) => ({
        id: message.id,
        body: message.body,
        createdAt: message.created_at,
        sender: {
          id: message.sender_id,
          name: message.sender_name,
          role: message.sender_role
        }
      }))
    });
  }

  return threads;
}

async function findChatByParticipants(patientId, doctorId) {
  return get(
    "SELECT id FROM portal_chats WHERE patient_id = ? AND doctor_id = ?",
    [patientId, doctorId]
  );
}

async function createChat(patientId, doctorId) {
  return run(
    `INSERT INTO portal_chats (
      patient_id,
      doctor_id
    ) VALUES (?, ?)`,
    [patientId, doctorId]
  );
}

async function createMessage(chatId, senderId, body) {
  return run(
    `INSERT INTO portal_messages (
      chat_id,
      sender_id,
      body
    ) VALUES (?, ?, ?)`,
    [chatId, senderId, body]
  );
}

async function touchChat(chatId) {
  return run("UPDATE portal_chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [chatId]);
}

module.exports = {
  createChat,
  createMessage,
  fetchChatThreads,
  findChatByParticipants,
  touchChat
};
