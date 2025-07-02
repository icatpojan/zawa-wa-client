const express = require("express");
const axios = require("axios");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());

const BASE_URL = "https://api-zawa.azickri.com";
const SESSION_FILE = path.join(__dirname, "session.json");

// Helper functions to read/write session
function readSession() {
    if (fs.existsSync(SESSION_FILE)) {
        const data = fs.readFileSync(SESSION_FILE, "utf-8");
        return JSON.parse(data);
    }
    return null;
}

async function saveSession(session) {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
}

function isSessionValid(session) {
    if (!session || !session.id || !session.sessionId || !session.expiredAt) return false;
    return new Date(session.expiredAt) > new Date();
}

// Main endpoint: send message
app.post("/send", async (req, res) => {
    try {
        let session = readSession();
        // If session is not valid OR id/sessionId is empty, authorize and save new session
        if (!isSessionValid(session) || !session.id || !session.sessionId) {
            const authRes = await axios.post(`${BASE_URL}/authorize`);
            const data = authRes.data;
            const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            session = { ...data, expiredAt };
            await saveSession(session);

            // Generate QR code (try twice if first attempt fails)
            let qrRes = await axios.get(`${BASE_URL}/qrcode`, {
                headers: {
                    id: session.id,
                    "session-id": session.sessionId,
                },
            });
            let qrcode = qrRes.data.qrcode;
            // If qrcode is empty, read session again and try once more
            if (!qrcode) {
                session = readSession();
                qrRes = await axios.get(`${BASE_URL}/qrcode`, {
                    headers: {
                        id: session.id,
                        "session-id": session.sessionId,
                    },
                });
                qrcode = qrRes.data.qrcode;
            }

            // Add prefix if needed
            if (qrcode && !qrcode.startsWith("data:image/png;base64,")) {
                qrcode = "data:image/png;base64," + qrcode;
            }
            // If still fails, return error
            if (!qrcode) {
                return res.status(500).json({
                    status: "error",
                    message: "Failed to generate QR code. Please try again.",
                    data: { qrcode: "" },
                });
            }
            return res.status(200).json({
                status: "pending_scan",
                message: "Please scan the QR code to activate WhatsApp session.",
                data: { qrcode },
            });
        }
        // Session is valid, try to send message
        const { phone, type } = req.body;
        if (!phone || !type) {
            return res.status(400).json({
                status: "error",
                message: "Body must contain 'phone' and 'type'.",
            });
        }
        const response = await axios.post(`${BASE_URL}/message`, req.body, {
            headers: {
                id: session.id,
                "session-id": session.sessionId,
            },
        });
        return res.status(200).json({
            status: "success",
            message: "Message sent successfully",
            data: response.data,
        });
    } catch (error) {
        // If error because QR code not scanned yet
        if (
            error.response &&
            error.response.data &&
            error.response.data.message &&
            error.response.data.message.includes("the store doesn't contain a device JID")
        ) {
            // Get latest session
            let session = readSession();

            if (!session || !session.id || !session.sessionId) {
                return res.status(500).json({
                    status: "error",
                    message: "Session not found. Please try again.",
                    data: { qrcode: "" },
                });
            }

            // Generate QR code again
            let qrRes = await axios.get(`${BASE_URL}/qrcode`, {
                headers: {
                    id: session.id,
                    "session-id": session.sessionId,
                },
            });
            let qrcode = qrRes.data.qrcode;

            if (qrcode && !qrcode.startsWith("data:image/png;base64,")) {
                qrcode = "data:image/png;base64," + qrcode;
            }

            if (!qrcode) {
                return res.status(500).json({
                    status: "error",
                    message: "Failed to generate QR code. Please try again.",
                    data: { qrcode: "" },
                });
            }

            return res.status(200).json({
                status: "pending_scan",
                message: "Please scan the QR code to activate WhatsApp session.",
                data: { qrcode },
            });
        }
        return res.status(error.response?.status || 500).json({
            status: "error",
            message: error.response?.data?.message || error.message,
            error: error.response?.data || error.message,
        });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Service listening on port ${PORT}`);
});
