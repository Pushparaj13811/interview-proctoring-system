# Interview Proctoring System - API Documentation

## Base URL
```
http://localhost:4000/api/v1
```

## WebSocket URL
```
ws://localhost:4000/ws
```

## Authentication
Currently no authentication implemented. Can be added using JWT tokens.

---

## API Endpoints

### 1. Candidates API

#### Create Candidate
```http
POST /candidates
```
**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com"  // optional
}
```
**Response:** `201 Created`

#### Get All Candidates
```http
GET /candidates
```
**Response:** Array of candidates with their sessions

#### Get Candidate by ID
```http
GET /candidates/:id
```
**Response:** Candidate with sessions, events, and reports

#### Update Candidate
```http
PUT /candidates/:id
```
**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "new@example.com"
}
```

#### Delete Candidate
```http
DELETE /candidates/:id
```

---

### 2. Sessions API

#### Create Session
```http
POST /sessions
```
**Request Body:**
```json
{
  "candidateId": "cuid_xxx",
  "videoUrl": "https://..."  // optional
}
```

#### Get All Sessions
```http
GET /sessions
```

#### Get Active Sessions
```http
GET /sessions/active
```
Returns all sessions that haven't ended yet.

#### Get Session by ID
```http
GET /sessions/:id
```

#### Get Sessions by Candidate
```http
GET /sessions/candidate/:candidateId
```

#### End Session
```http
POST /sessions/:id/end
```
**Request Body:**
```json
{
  "integrityScore": 85  // optional, auto-calculated if not provided
}
```

#### Update Video URL
```http
PUT /sessions/:id/video
```
**Request Body:**
```json
{
  "videoUrl": "https://cloudinary.com/video.mp4"
}
```

#### Calculate Integrity Score
```http
GET /sessions/:id/score
```
Returns calculated integrity score based on events.

---

### 3. Events API

#### Log Single Event
```http
POST /events
```
**Request Body:**
```json
{
  "sessionId": "cuid_xxx",
  "type": "LOOKING_AWAY",  // LOOKING_AWAY | NO_FACE | MULTIPLE_FACES | OBJECT_DETECTED | EYE_CLOSED | AUDIO_SUSPICIOUS
  "label": "phone detected",  // optional
  "confidence": 0.85,  // optional (0-1)
  "duration": 5,  // optional (seconds)
  "meta": {}  // optional metadata
}
```

#### Log Batch Events
```http
POST /events/batch
```
**Request Body:**
```json
{
  "events": [
    {
      "sessionId": "cuid_xxx",
      "type": "LOOKING_AWAY",
      "timestamp": "2025-01-01T10:00:00Z"
    },
    // ... more events
  ]
}
```

#### Get Events by Session
```http
GET /events/:sessionId
```

#### Get Events by Type
```http
GET /events/:sessionId/type?type=LOOKING_AWAY
```

#### Get Filtered Events
```http
GET /events/:sessionId/filtered?type=NO_FACE&startTime=2025-01-01T10:00:00Z&endTime=2025-01-01T11:00:00Z&label=phone
```

#### Get Event Statistics
```http
GET /events/:sessionId/statistics
```
Returns aggregated statistics for a session.

#### Get Recent Events
```http
GET /events/recent?limit=10
```

---

### 4. Reports API

#### Generate Report
```http
POST /reports
```
**Request Body:**
```json
{
  "sessionId": "cuid_xxx",
  "format": "pdf"  // pdf | csv | json
}
```

#### Get PDF Report
```http
GET /reports/session/:sessionId/pdf
```
Downloads PDF report directly.

#### Get CSV Report
```http
GET /reports/session/:sessionId/csv
```
Downloads CSV report directly.

#### Get JSON Report
```http
GET /reports/session/:sessionId/json
```
Returns report data in JSON format.

#### Get Reports by Session
```http
GET /reports/session/:sessionId
```

#### Get Report by ID
```http
GET /reports/:id
```

#### Delete Report
```http
DELETE /reports/:id
```

---

### 5. Upload API

#### Upload Video File
```http
POST /upload/video/:sessionId
```
**Form Data:**
- `video`: Video file (multipart/form-data)

**Supported formats:** MP4, MPEG, QuickTime, WebM
**Max size:** 500MB

#### Upload Video from URL
```http
POST /upload/video-url/:sessionId
```
**Request Body:**
```json
{
  "url": "https://example.com/video.mp4"
}
```

#### Upload Event Snapshot
```http
POST /upload/snapshot/:sessionId/:eventId
```
**Form Data:**
- `image`: Image file (multipart/form-data)

---

## WebSocket API

### Connection
```javascript
const ws = new WebSocket('ws://localhost:4000/ws');
```

### Message Types

#### 1. Join Session
**Send:**
```json
{
  "type": "join_session",
  "sessionId": "cuid_xxx",
  "role": "candidate"  // candidate | interviewer
}
```
**Receive:**
```json
{
  "type": "joined_session",
  "sessionId": "cuid_xxx"
}
```

#### 2. Leave Session
**Send:**
```json
{
  "type": "leave_session"
}
```

#### 3. Send Event
**Send:**
```json
{
  "type": "event",
  "data": {
    "type": "LOOKING_AWAY",
    "label": "distracted",
    "confidence": 0.85
  }
}
```

#### 4. Send Batch Events
**Send:**
```json
{
  "type": "batch_events",
  "events": [
    {
      "type": "NO_FACE",
      "timestamp": "2025-01-01T10:00:00Z"
    }
  ]
}
```

#### 5. Real-time Alerts
**Receive:**
```json
{
  "type": "alert",
  "severity": "high",
  "message": "Critical event detected: MULTIPLE_FACES",
  "event": { /* event data */ }
}
```

#### 6. User Join/Leave Notifications
**Receive:**
```json
{
  "type": "user_joined",
  "clientId": "client_xxx",
  "role": "interviewer"
}
```

#### 7. Ping/Pong (Keep-alive)
**Send:**
```json
{
  "type": "ping"
}
```
**Receive:**
```json
{
  "type": "pong"
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "data": null
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

---

## Data Models

### Candidate
```typescript
{
  id: string;
  name: string;
  email?: string;
  createdAt: Date;
  sessions?: Session[];
}
```

### Session
```typescript
{
  id: string;
  candidateId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;  // seconds
  videoUrl?: string;
  integrityScore?: number;  // 0-100
  createdAt: Date;
  candidate?: Candidate;
  events?: Event[];
  reports?: Report[];
}
```

### Event
```typescript
{
  id: string;
  sessionId: string;
  type: EventType;
  timestamp: Date;
  duration?: number;
  label?: string;
  confidence?: number;  // 0-1
  meta?: object;
  session?: Session;
}
```

### Report
```typescript
{
  id: string;
  sessionId: string;
  format: string;  // pdf | csv | json
  fileUrl: string;
  generatedAt: Date;
  session?: Session;
}
```

### EventType Enum
```typescript
enum EventType {
  LOOKING_AWAY = "LOOKING_AWAY",
  NO_FACE = "NO_FACE",
  MULTIPLE_FACES = "MULTIPLE_FACES",
  OBJECT_DETECTED = "OBJECT_DETECTED",
  EYE_CLOSED = "EYE_CLOSED",
  AUDIO_SUSPICIOUS = "AUDIO_SUSPICIOUS"
}
```

---

## Integrity Score Calculation

The integrity score starts at 100 and deductions are made based on events:

- **LOOKING_AWAY**: -5 points per event
- **NO_FACE**: -10 points per event
- **MULTIPLE_FACES**: -20 points per event
- **OBJECT_DETECTED**: -15 points per event
- **EYE_CLOSED**: -5 points per event
- **AUDIO_SUSPICIOUS**: -10 points per event

Final score is clamped between 0 and 100.

---

## Environment Variables

Create a `.env` file with:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/interview_proctoring
PORT=4000
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CORS_ORIGIN=http://localhost:3000
```

---

## Testing with cURL

### Create a candidate
```bash
curl -X POST http://localhost:4000/api/v1/candidates \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

### Start a session
```bash
curl -X POST http://localhost:4000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{"candidateId": "cuid_xxx"}'
```

### Log an event
```bash
curl -X POST http://localhost:4000/api/v1/events \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "cuid_xxx", "type": "LOOKING_AWAY"}'
```

### Generate PDF report
```bash
curl -X GET http://localhost:4000/api/v1/reports/session/{sessionId}/pdf \
  --output report.pdf
```

---

## Frontend Integration Example

```javascript
// REST API
const response = await fetch('http://localhost:4000/api/v1/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ candidateId: 'cuid_xxx' })
});

// WebSocket
const ws = new WebSocket('ws://localhost:4000/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'join_session',
    sessionId: 'cuid_xxx',
    role: 'candidate'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// Send event via WebSocket
ws.send(JSON.stringify({
  type: 'event',
  data: {
    type: 'LOOKING_AWAY',
    confidence: 0.85
  }
}));
```