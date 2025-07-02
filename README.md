# API WA Proxy & One-Endpoint Service

Open source API to send WhatsApp messages via the external API (https://api-zawa.azickri.com) using Express and Axios.

---

## Project Structure

- **zawa-proxy.js**: API Zawa Proxy
  - Provides clean, RESTful endpoints that mirror the original Zawa API.
  - Endpoints: `/api/authorize`, `/api/qrcode`, `/api/message`.
  - Useful for developers who want full control and flexibility over session and message management.

- **wa-sender.js**: One-Endpoint Service
  - Provides a single endpoint `/send` for sending WhatsApp messages.
  - Handles session management, authorization, and QR code generation automatically in the background.
  - Great for simple integrations and automation—just call `/send` and the service handles the rest.

---

## 1. zawa-proxy.js (API Zawa Proxy)

### Endpoints
- `POST /api/authorize` — Get `id`, `sessionId`, and `expiredAt` (valid for 24 hours)
- `GET /api/qrcode` — Get QR code for WhatsApp login (requires `id` and `session-id` headers)
- `POST /api/message` — Send WhatsApp message (requires `id` and `session-id` headers)

### Use Case
- For developers who want to manage session and QR code manually.
- Suitable for advanced integrations and custom workflows.

### Example Request/Response
See the included Postman collection: `api-wa-proxy.postman_collection.json`

---

## 2. wa-sender.js (One-Endpoint Service)

### Endpoint
- `POST /send` — Send WhatsApp message with automatic session management

### How It Works
- On first use or if session expired, service will:
  1. Authorize and save session to `session.json`
  2. Generate QR code and return it in the response (status: `pending_scan`)
  3. User must scan the QR code with WhatsApp app
- If session is active, service will send the message directly.
- If session is active but device not yet scanned, service will return QR code again.

### Example Request
```json
{
  "phone": "6281234567890",
  "type": "text",
  "text": "Hello from Zawa 👋"
}
```

### Example Response (Need to Scan QR)
```json
{
  "status": "pending_scan",
  "message": "Please scan the QR code to activate WhatsApp session.",
  "data": {
    "qrcode": "data:image/png;base64,iVBORw0KGgoAAAANS..."
  }
}
```

### Example Response (Success)
```json
{
  "status": "success",
  "message": "Message sent successfully",
  "data": {
    "messageId": "..."
  }
}
```

### Supported Message Types
- `text`, `image`, `video`, `audio`, `document`, `location`, `contact`
- See Postman collection for detailed body examples for each type.

---

## Session Management
- Session is stored in `session.json`.
- Session is valid for 24 hours. If expired, service will re-authorize and generate a new QR code.
- If you see `pending_scan`, scan the QR code with WhatsApp to activate the session.

---

## Installation & Usage

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. To run API Zawa Proxy:
   ```bash
   node zawa-proxy.js
   ```
4. To run One-Endpoint Service:
   ```bash
   node wa-sender.js
   ```

---

## Postman Collections
- `api-wa-proxy.postman_collection.json` — For zawa-proxy.js (API Zawa Proxy)
- `service.postman_collection.json` — For wa-sender.js (One-Endpoint Service, single endpoint)

Import these collections into Postman to try all endpoints and see example requests/responses for every message type.

---

## Special Thanks
Special thanks to **azickri** for creating [Zawa](https://api-zawa.azickri.com)!

---

## Notes
- The QR code string (base64) returned by the API can be easily viewed as an image using this tool: https://jaredwinick.github.io/base64-image-viewer/
- `id` and `sessionId` are only valid for 24 hours (see `expiredAt` field)
- Make sure headers and body are correct for a successful request

---

Made with ❤️ by the open source community 