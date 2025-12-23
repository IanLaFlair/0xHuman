import { Server } from "socket.io";
import { createServer } from "http";

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for dev
        methods: ["GET", "POST"]
    }
});

console.log("🔌 0xHuman Nervous System (Socket.io) starting...");

// Store active game rooms
// gameId -> { players: Set<socketId>, messages: [] }
const rooms = new Map();

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join_game", (gameId) => {
        socket.join(gameId);
        console.log(`User ${socket.id} joined game ${gameId}`);

        // Notify others in room
        socket.to(gameId).emit("system_message", {
            text: "A new entity has entered the arena."
        });
    });

    socket.on("typing", ({ gameId, sender, isTyping }) => {
        socket.to(gameId).emit("typing", { sender, isTyping });
    });

    socket.on("chat_message", ({ gameId, text, sender }) => {
        console.log(`[${gameId}] ${sender}: ${text}`);

        // Broadcast to everyone in the room INCLUDING sender (for simplicity)
        // In a real app, sender usually adds their own message optimistically
        io.to(gameId).emit("chat_message", {
            id: Date.now(),
            gameId, // Add gameId so receivers know which game context this is
            sender,
            text,
            timestamp: Date.now()
        });
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`🚀 Nervous System running on port ${PORT}`);
});
