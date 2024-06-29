const express = require("express");
const { createServer } = require("node:http");
const { join } = require("node:path");
const { Server } = require("socket.io");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

async function main() {
  const db = await open({
    filename: "chat.db",
    driver: sqlite3.Database,

  });
}

await db.exec(`
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_offset TEXT UNIQUE,
    content TEXT
);
`);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {server},
});

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

io.on("connection", (socket) => {
  socket.on("chat messages", async (msg) => {
    let result;
    try {
      result = await db.run(`INSERT INTO messages (content) VALUES (?)`, msg);
    } catch (e) {
      return;
    }
    io.emit("chat messages", msg, result.lastID);
  });
});

if (!socket.recovered) {
  try {
    await db.each(
      "SELECT id, content FROM messages WHERE id > ?",
      [socket.handshake.auth.serverOffset || 0],
      (_err, row) => {
        socket.emit("chats messages", row.content, row.id);
      }
    );
  } catch (e) {
    console.log("algo salio demasiado mal");
  }
}

server.listen(3000, () => {
  console.log("server running in http://localhost:3000");
});
