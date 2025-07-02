const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const BASE_URL = "https://api-zawa.azickri.com";

const ALLOWED_TYPES = ["text", "image", "video", "audio", "document", "location", "contact"];

// Endpoint untuk authorize
app.post("/api/authorize", async (req, res) => {
    try {
        const response = await axios.post(`${BASE_URL}/authorize`);
        const data = response.data;
        const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        res.json({
            status: "success",
            message: "Berhasil mendapatkan token authorize",
            data: { ...data, expiredAt },
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            status: "error",
            message: "Gagal authorize",
            error: error.response?.data || error.message,
        });
    }
});

// Endpoint untuk get QR code
app.get("/api/qrcode", async (req, res) => {
    try {
        const { id, "session-id": sessionId } = req.headers;
        if (!id || !sessionId) {
            return res.status(400).json({
                status: "error",
                message: "Header 'id' dan 'session-id' wajib diisi!",
            });
        }
        const response = await axios.get(`${BASE_URL}/qrcode`, {
            headers: {
                id,
                "session-id": sessionId,
            },
        });
        let qrcode = response.data.qrcode;
        if (qrcode && !qrcode.startsWith("data:image/png;base64,")) {
            qrcode = "data:image/png;base64," + qrcode;
        }
        res.json({
            status: "success",
            message: "Berhasil mendapatkan QR code",
            data: { qrcode },
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            status: "error",
            message: "Gagal mendapatkan QR code",
            error: error.response?.data || error.message,
        });
    }
});

// Endpoint untuk kirim pesan
app.post("/api/message", async (req, res) => {
    try {
        const { id, "session-id": sessionId } = req.headers;
        if (!id || !sessionId) {
            return res.status(400).json({
                status: "error",
                message: "Header 'id' dan 'session-id' wajib diisi!",
            });
        }
        if (!req.body || !req.body.phone || !req.body.type) {
            return res.status(400).json({
                status: "error",
                message: "Body wajib mengandung 'phone' dan 'type'!",
            });
        }
        if (!ALLOWED_TYPES.includes(req.body.type)) {
            return res.status(400).json({
                status: "error",
                message: `Tipe pesan tidak valid. Pilih salah satu: ${ALLOWED_TYPES.join(", ")}`,
            });
        }
        const response = await axios.post(`${BASE_URL}/message`, req.body, {
            headers: {
                id,
                "session-id": sessionId,
            },
        });
        res.json({
            status: "success",
            message: "Pesan berhasil dikirim",
            data: response.data,
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            status: "error",
            message: "Gagal mengirim pesan",
            error: error.response?.data || error.message,
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API WA Proxy listening on port ${PORT}`);
});
