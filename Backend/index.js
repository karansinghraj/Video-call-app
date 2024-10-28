// External and Internal Modules
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
app.use(cors());

// Routers and Models
const { UserRouter } = require("./Routes/UserRoute");

// Create HTTP server and attach Socket.IO
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Middleware
app.use(express.json());
app.use("/users", UserRouter);

// Socket Connection
let allConnectedUsers = [];

io.on("connection", (socket) => {
    console.log("New Client Connected!");
    allConnectedUsers.push(socket.id);

    socket.on("preOffer", (data) => {
        console.log("Received preOffer", data);
        const { connection_type, personal_code } = data;
        const reqUser = allConnectedUsers.find((socketId) => socketId === personal_code);

        if (reqUser) {
            const data = {
                connection_type,
                personal_code: socket.id, // ID of client 2
            };
            io.to(personal_code).emit("preOffers", data); // Emit to the requested user
        } else {
            io.to(socket.id).emit("pre_offer_answer", { preOfferAnswer: "Not_Found" });
        }
    });

    socket.on("pre_offer_answer", (data) => {
        const reqUser = allConnectedUsers.find((socketId) => socketId === data.callerSocketId);
        if (reqUser) {
            io.to(data.callerSocketId).emit("pre_offer_answer", data); // Emit to the requesting user
        }
    });

    socket.on("webRTC_signaling", (data) => {
        const { connectedUserSocketId } = data;
        const reqUser = allConnectedUsers.find((socketId) => socketId === connectedUserSocketId);
        if (reqUser) {
            io.to(connectedUserSocketId).emit("webRTC_signaling", data);
        }
    });

    socket.on("user_hanged_up", (data) => {
        const { connectedUserSocketId } = data;
        const reqUser = allConnectedUsers.find((socketId) => socketId === connectedUserSocketId);
        if (reqUser) {
            io.to(connectedUserSocketId).emit("user_hanged_up");
        }
    });

    socket.on("disconnect", () => {
        console.log("User Disconnected");
        allConnectedUsers = allConnectedUsers.filter((disconnectedSocketId) => disconnectedSocketId !== socket.id);
    });
});

// Listening to Server
const port = process.env.PORT || 5000;
httpServer.listen(port, async () => {
    try {
        // await connection; // Uncomment if you have a DB connection setup
        console.log("Connected to DB");
    } catch (error) {
        console.log("Not able to connect to DB");
    }
    console.log(`Server is running at port ${port}`);
});
