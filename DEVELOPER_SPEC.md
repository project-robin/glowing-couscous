# 📋 Developer Specification for Astro Shiva API

**For AI Coding Agents & Human Developers**

This document provides strict rules and specifications for building applications on the Astro Shiva API.

---

## 🎯 MANDATORY REQUIREMENTS

### **RULE #1: Onboarding is REQUIRED**

**Every application MUST implement an onboarding flow.**

**Why?**
- Vedic astrology requires exact birth details (date, time, place)
- Without these details, the AI cannot provide personalized readings
- The API will return errors if users try to chat without completing onboarding

**Required Birth Details (ALL required):**
1. **Name** (string, 2-100 characters)
2. **Date of Birth** (ISO 8601: `1990-01-01T00:00:00.000Z`)
3. **Time of Birth** (HH:mm format: `12:00`)
4. **Place of Birth** (string, 2+ characters)
5. **Latitude** (optional, but recommended: `-90` to `90`)
6. **Longitude** (optional, but recommended: `-180` to `180`)
7. **Timezone** (optional, default: `UTC`)

### **Application Flow (STRICT)**

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User opens app                                          │
│     ↓                                                       │
│  2. Check authentication status                             │
│     - If not authenticated → Show login/signup             │
│     ↓                                                       │
│  3. Check onboarding status                                 │
│     - Call GET /api/v1/users/profile                        │
│     - If 404 → User not onboarded                           │
│     - If 200 → User is onboarded                            │
│     ↓                                                       │
│  4. IF NOT onboarded → SHOW ONBOARDING SCREEN               │
│     ⚠️  DO NOT allow access to chat                         │
│     - Form with all required birth details                  │
│     - Validate all fields                                   │
│     - Submit to POST /api/v1/users/onboard                  │
│     - On success → Redirect to chat                         │
│     ↓                                                       │
│  5. IF onboarded → SHOW CHAT INTERFACE                      │
│     - User can now send messages                            │
│     - All responses are personalized                        │
│     - Session persistence                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **Enforcement Code**

```typescript
// ✅ CORRECT: Check onboarding before allowing chat
async function initializeApp() {
  const token = await getAuthToken();

  if (!token) {
    // Redirect to authentication
    window.location.href = '/auth';
    return;
  }

  // Check if user is onboarded
  const response = await fetch(
    'https://astro-shiva-app.vercel.app/api/v1/users/profile',
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  if (response.status === 404) {
    // User needs onboarding - BLOCK CHAT ACCESS
    window.location.href = '/onboarding';
    return;
  }

  // User is onboarded - allow chat access
  showChatInterface();
}

// ❌ WRONG: Allowing chat without onboarding
function badExample() {
  // DON'T do this - chat without checking onboarding
  showChatInterface(); // ❌ WRONG
}
```

---

## 🔐 AUTHENTICATION ARCHITECTURE

### **How It Works**

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Your Frontend App                                          │
│     ↓                                                       │
│  Install Convex SDK                                         │
│  npm install convex @convex-dev/react                       │
│     ↓                                                       │
│  Configure Convex Client                                    │
│  const convex = new ConvexReactClient(                      │
│    "https://YOUR-PROJECT.convex.cloud"                      │
│  )                                                          │
│     ↓                                                       │
│  User Authentication                                        │
│  - Sign in with Google, GitHub, Email, etc.                 │
│  - Convex returns auth token                                │
│     ↓                                                       │
│  Use Token with Astro Shiva API                             │
│  - Pass token in Authorization header                       │
│  - API validates token with Convex                          │
│     ↓                                                       │
│  User Data Storage                                          │
│  - User data stored in YOUR Convex database                 │
│  - Astro Shiva API reads/writes to YOUR Convex              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **Do Developers Need Their Own Convex?**

**YES. Every developer needs their own Convex deployment.**

**Why?**
- Data isolation - each app has its own database
- Authentication - each app manages its own users
- Security - no shared user data between applications
- Scalability - each app scales independently

**How to Set Up:**

1. **Create Convex Account**
   ```bash
   # Visit convex.dev and sign up
   # Or use CLI:
   npx convex dev
   ```

2. **Get Your Convex URL**
   - From Convex dashboard
   - Format: `https://your-project.convex.cloud`

3. **Configure in Astro Shiva API**
   - In Vercel dashboard
   - Add environment variable:
     ```
     NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
     ```

4. **Configure in Your Frontend**
   ```
   VITE_CONVEX_URL=https://your-project.convex.cloud
   # or for Next.js:
   NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
   ```

---

## 🌐 CORS CONFIGURATION

### **Required Setup**

Before deploying, you MUST configure CORS:

1. **Deploy your frontend** (Vercel, Netlify, etc.)
2. **Get your frontend URL** (e.g., `https://my-astro-app.com`)
3. **Configure in Astro Shiva API Vercel dashboard**

**Environment Variable:**
```
ALLOWED_ORIGINS=https://my-astro-app.com,http://localhost:3000,http://localhost:5173
```

**Format:**
- Comma-separated list
- Include production URL
- Include development URLs
- No spaces after commas

---

## 📋 API ENDPOINTS

### **Base URL**
```
https://astro-shiva-app.vercel.app
```

### **1. Health Check** (No Auth)
**GET** `/api/v1/health`

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-01-26T19:52:16.968Z"
}
```

---

### **2. User Onboarding** ⭐ REQUIRED
**POST** `/api/v1/users/onboard`

**Authentication:** ✅ Required (Convex auth token)

**Request Body:**
```json
{
  "name": "John Doe",
  "dateOfBirth": "1990-01-01T00:00:00.000Z",
  "timeOfBirth": "12:00",
  "place": "New York",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "timezone": "America/New_York"
}
```

**Field Requirements:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | ✅ | 2-100 chars |
| `dateOfBirth` | string (ISO 8601) | ✅ | Valid date |
| `timeOfBirth` | string | ✅ | HH:mm format |
| `place` | string | ✅ | 2+ chars |
| `latitude` | number | ❌ | -90 to 90 |
| `longitude` | number | ❌ | -180 to 180 |
| `timezone` | string | ❌ | IANA timezone |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "user_abc123",
    "name": "John Doe",
    "astroProfile": {
      "astroSummary": "Your Vedic astrology profile..."
    }
  }
}
```

**Error Responses:**
- **400**: Validation error (check field requirements)
- **401**: Authentication required (get Convex auth token)
- **500**: Server error

---

### **3. User Profile**
**GET** `/api/v1/users/profile`

**Authentication:** ✅ Required

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "user_abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "astroProfile": { "astroSummary": "..." },
    "createdAt": "2026-01-26T19:52:16.968Z"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found. Please complete onboarding."
  }
}
```

**Use this endpoint to check if user is onboarded!**

---

### **4. Chat Messages** ⭐ MAIN ENDPOINT
**POST** `/api/v1/chat/send`

**Authentication:** ❌ No (Guest mode enabled)

**Request Body:**
```json
{
  "message": "Hello, tell me about my career",
  "sessionId": "optional_session_uuid"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "response": "Based on your Vedic astrology chart...",
    "sessionId": "abc123-def456-ghi789"
  }
}
```

**Error Responses:**
- **400**: Validation error
- **415**: Wrong content type (must be application/json)
- **413**: Request too large (>1MB)
- **429**: Rate limited (60 req/min)
- **500**: Server error

---

### **5. Chat Sessions**
**GET** `/api/v1/chat/sessions?limit=20&offset=0`

**Authentication:** ✅ Required

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session_abc123",
        "createdAt": "2026-01-26T19:52:16.968Z",
        "lastMessageAt": "2026-01-26T19:55:00.000Z",
        "messageCount": 5,
        "summary": "Discussion about career"
      }
    ],
    "total": 1,
    "hasMore": false
  }
}
```

---

## 📱 PLATFORM-SPECIFIC IMPLEMENTATION

### **React (Web)**

```typescript
// 1. Install dependencies
// npm install convex @convex-dev/react

// 2. Setup Convex Client
import { ConvexReactClient } from '@convex-dev/react';

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL
);

// 3. Wrap your app
function App() {
  return (
    <ConvexProvider client={convex}>
      <AstroChatApp />
    </ConvexProvider>
  );
}

// 4. Main component
function AstroChatApp() {
  const { isAuthenticated, isLoading, getToken } = useConvexAuth();
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      if (!isAuthenticated) return;

      const token = await getToken();
      const response = await fetch(
        'https://astro-shiva-app.vercel.app/api/v1/users/profile',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setOnboarded(response.ok);
    }
    checkOnboarding();
  }, [isAuthenticated]);

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <AuthScreen />;
  if (!onboarded) return <OnboardingForm />;
  return <ChatInterface />;
}
```

### **React Native**

```typescript
// 1. Install dependencies
// npm install convex @convex-dev/react-native

// 2. Setup
import { ConvexReactClient } from '@convex-dev/react-native';

const convex = new ConvexReactClient(process.env.CONVEX_URL);

// 3. API Client
async function sendMessage(message: string) {
  const response = await fetch(
    'https://astro-shiva-app.vercel.app/api/v1/chat/send',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    }
  );
  return response.json();
}
```

### **Flutter**

```dart
// 1. Add http dependency
// pubspec.yaml: http: ^1.1.0

// 2. API Client
import 'package:http/http.dart' as http;
import 'dart:convert';

class AstroShivaClient {
  final String baseUrl = 'https://astro-shiva-app.vercel.app';
  String? token;

  Future<Map<String, dynamic>> onboard({
    required String name,
    required String dateOfBirth,
    required String timeOfBirth,
    required String place,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/users/onboard'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token'
      },
      body: jsonEncode({
        'name': name,
        'dateOfBirth': dateOfBirth,
        'timeOfBirth': timeOfBirth,
        'place': place,
      }),
    );
    return jsonDecode(response.body);
  }

  Future<Map<String, dynamic>> sendMessage(String message) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/chat/send'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'message': message}),
    );
    return jsonDecode(response.body);
  }
}
```

### **Python**

```python
import requests
import json

class AstroShivaClient:
    def __init__(self, token=None):
        self.base_url = "https://astro-shiva-app.vercel.app"
        self.token = token

    def onboard(self, name, date_of_birth, time_of_birth, place):
        """Complete user onboarding - REQUIRED before chat"""
        response = requests.post(
            f"{self.base_url}/api/v1/users/onboard",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}"
            },
            json={
                "name": name,
                "dateOfBirth": date_of_birth,
                "timeOfBirth": time_of_birth,
                "place": place
            }
        )
        return response.json()

    def send_message(self, message, session_id=None):
        """Send chat message"""
        response = requests.post(
            f"{self.base_url}/api/v1/chat/send",
            headers={"Content-Type": "application/json"},
            json={"message": message, "sessionId": session_id}
        )
        return response.json()
```

---

## 🎯 COMPLETE APPLICATION TEMPLATE

### **File Structure**
```
src/
├── convex.ts          # Convex client setup
├── api-client.ts      # API wrapper
├── App.tsx            # Main component
├── AuthScreen.tsx     # Authentication
├── OnboardingForm.tsx # Onboarding (REQUIRED)
└── ChatInterface.tsx  # Chat UI
```

### **convex.ts**
```typescript
import { ConvexReactClient } from '@convex-dev/react';

export const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL
);
```

### **api-client.ts**
```typescript
const API_BASE = 'https://astro-shiva-app.vercel.app';

export class AstroShivaAPI {
  constructor(private token?: string) {}

  // Check if user is onboarded
  async getProfile() {
    if (!this.token) throw new Error('No auth token');

    const response = await fetch(`${API_BASE}/api/v1/users/profile`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });

    return response.json();
  }

  // Complete onboarding (REQUIRED)
  async onboard(data: {
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    place: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  }) {
    if (!this.token) throw new Error('No auth token');

    const response = await fetch(`${API_BASE}/api/v1/users/onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(data)
    });

    return response.json();
  }

  // Send chat message
  async sendMessage(message: string, sessionId?: string) {
    const response = await fetch(`${API_BASE}/api/v1/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId })
    });

    return response.json();
  }
}
```

### **App.tsx**
```typescript
import { useState, useEffect } from 'react';
import { useConvexAuth } from '@convex-dev/react';
import { AstroShivaAPI } from './api-client';

function App() {
  const { isAuthenticated, isLoading, getToken } = useConvexAuth();
  const [onboarded, setOnboarded] = useState(false);
  const [api, setApi] = useState<AstroShivaAPI | null>(null);

  useEffect(() => {
    async function init() {
      if (isAuthenticated) {
        const token = await getToken();
        const apiClient = new AstroShivaAPI(token);
        setApi(apiClient);

        // Check if user is onboarded
        const profile = await apiClient.getProfile();
        setOnboarded(profile.success);
      }
    }
    init();
  }, [isAuthenticated]);

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <AuthScreen />;
  if (!onboarded) return <OnboardingForm api={api!} />;
  return <ChatInterface api={api!} />;
}
```

### **OnboardingForm.tsx** ⭐ REQUIRED
```typescript
import { useState } from 'react';
import { AstroShivaAPI } from './api-client';

export function OnboardingForm({ api }: { api: AstroShivaAPI }) {
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    timeOfBirth: '',
    place: '',
    latitude: 0,
    longitude: 0,
    timezone: 'UTC'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await api.onboard({
      ...formData,
      dateOfBirth: new Date(formData.dateOfBirth).toISOString()
    });

    if (result.success) {
      window.location.reload(); // Reload to show chat
    }
  };

  return (
    <div className="onboarding-container">
      <h1>Welcome! Complete Your Astrology Profile</h1>
      <form onSubmit={handleSubmit}>
        <input
          name="name"
          placeholder="Full Name"
          required
          minLength={2}
          maxLength={100}
        />
        <input
          type="date"
          name="dateOfBirth"
          required
        />
        <input
          type="time"
          name="timeOfBirth"
          required
        />
        <input
          name="place"
          placeholder="Birth Place (City)"
          required
          minLength={2}
        />
        <button type="submit">Complete Onboarding</button>
      </form>
    </div>
  );
}
```

### **ChatInterface.tsx**
```typescript
import { useState } from 'react';
import { AstroShivaAPI } from './api-client';

export function ChatInterface({ api }: { api: AstroShivaAPI }) {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    // Add user message
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const result = await api.sendMessage(input, sessionId || undefined);

      if (result.success) {
        // Add AI response
        const aiMessage = { role: 'assistant', content: result.data.response };
        setMessages(prev => [...prev, aiMessage]);

        // Store session ID
        if (result.data.sessionId) {
          setSessionId(result.data.sessionId);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {loading && <div className="message assistant typing">...</div>}
      </div>
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask about your astrology..."
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
```

---

## ✅ CHECKLIST FOR DEVELOPERS

### **Before Deployment**

- [ ] **Convex Setup**
  - [ ] Created Convex account
  - [ ] Created Convex project
  - [ ] Got Convex deployment URL
  - [ ] Configured `NEXT_PUBLIC_CONVEX_URL` in Vercel

- [ ] **CORS Configuration**
  - [ ] Added `ALLOWED_ORIGINS` in Vercel
  - [ ] Included production frontend URL
  - [ ] Included development URLs

- [ ] **Authentication**
  - [ ] Implemented Convex auth in frontend
  - [ ] Handle token retrieval
  - [ ] Handle auth errors

- [ ] **Onboarding Flow** ⭐ MANDATORY
  - [ ] Created onboarding screen
  - [ ] Implemented form validation
  - [ ] Check onboarding status on app load
  - [ ] Block chat access if not onboarded
  - [ ] Call `/api/v1/users/onboard` on submit

- [ ] **Chat Interface**
  - [ ] Created chat UI
  - [ ] Implemented message sending
  - [ ] Handle session persistence
  - [ ] Show loading states
  - [ ] Handle errors gracefully

- [ ] **Testing**
  - [ ] Test health endpoint
  - [ ] Test onboarding flow
  - [ ] Test chat functionality
  - [ ] Test error handling
  - [ ] Test CORS configuration

---

## 🐛 TROUBLESHOOTING

### **Common Issues**

| Issue | Cause | Solution |
|-------|-------|----------|
| `CORS error` | Origin not allowed | Add URL to `ALLOWED_ORIGINS` |
| `401 Unauthorized` | Missing auth token | Get Convex auth token first |
| `404 User not found` | User not onboarded | Complete onboarding first |
| `400 Validation error` | Invalid input | Check field requirements |
| `429 Rate limited` | Too many requests | Wait and retry |
| `500 Server error` | API issue | Try again later |

### **Debug Steps**

```typescript
// Debug: Check if user is onboarded
async function debugOnboarding() {
  const token = await getAuthToken();
  console.log('Token:', token);

  const response = await fetch(
    'https://astro-shiva-app.vercel.app/api/v1/users/profile',
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  console.log('Status:', response.status);
  console.log('Response:', await response.json());
}

// Debug: Test chat endpoint
async function debugChat() {
  const response = await fetch(
    'https://astro-shiva-app.vercel.app/api/v1/chat/send',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' })
    }
  );

  console.log('Status:', response.status);
  console.log('Response:', await response.json());
}
```

---

## 📚 RESOURCES

### **Convex Documentation**
- https://docs.convex.dev/auth
- https://docs.convex.dev/client/react
- https://docs.convex.dev/cli

### **Frontend Frameworks**
- React: https://react.dev
- Vue: https://vuejs.org
- Svelte: https://svelte.dev
- React Native: https://reactnative.dev
- Flutter: https://flutter.dev

### **Testing Commands**
```bash
# Test health
curl https://astro-shiva-app.vercel.app/api/v1/health

# Test chat
curl -X POST https://astro-shiva-app.vercel.app/api/v1/chat/send \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'

# Test onboarding (with token)
curl -X POST https://astro-shiva-app.vercel.app/api/v1/users/onboard \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Test","dateOfBirth":"1990-01-01T00:00:00.000Z","timeOfBirth":"12:00","place":"Test"}'
```

---

## 🎓 SUMMARY

### **Key Rules**

1. **Onboarding is MANDATORY** - Users must provide birth details before chatting
2. **Each developer needs their own Convex** - No shared databases
3. **Configure CORS** - Add `ALLOWED_ORIGINS` in Vercel
4. **Check onboarding status** - Use `GET /api/v1/users/profile`
5. **Handle errors gracefully** - Show user-friendly messages

### **Application Flow**

```
User opens app
    ↓
Check authentication
    ↓
Check onboarding (GET /api/v1/users/profile)
    ↓
If 404 → Show onboarding form
    ↓
Submit to POST /api/v1/users/onboard
    ↓
If success → Show chat interface
    ↓
Send messages to POST /api/v1/chat/send
```

### **Success Criteria**

- ✅ Onboarding form validates all fields
- ✅ User data stored in Convex
- ✅ Chat works after onboarding
- ✅ Session persistence works
- ✅ Error handling is robust
- ✅ CORS is properly configured
- ✅ Mobile responsive design

---

**Document Version:** v1.0.0
**Last Updated:** 2026-01-26
**API Version:** v1
