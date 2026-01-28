# Astro Shiva API Documentation

## 🎯 Overview

This document provides comprehensive API documentation for the **Astro Shiva backend**, enabling developers to build frontend applications (web, mobile, desktop) that integrate with our AI-powered Vedic astrology chat system.

**Base URL**: `https://astro-shiva-app.vercel.app`

---

## ⚠️ CRITICAL: Onboarding Requirement

### **MANDATORY ONBOARDING FLOW**

Every application built on this API **MUST** implement an onboarding screen where users provide their birth details. **Without this data, the AI astrology assistant cannot provide personalized readings.**

**Why is onboarding required?**
- Vedic astrology requires exact birth details (date, time, place)
- Without these details, the AI cannot calculate your natal chart
- All chat responses are personalized based on your astrological profile
- The API will return errors if you try to chat without completing onboarding

**Required Birth Details:**
1. **Full Name** (2-100 characters)
2. **Date of Birth** (ISO 8601 format: `1990-01-01T00:00:00.000Z`)
3. **Time of Birth** (HH:mm format, 24-hour: `12:00`)
4. **Place of Birth** (City/Location: `New York`)
5. **Latitude** (Optional, but recommended: `40.7128`)
6. **Longitude** (Optional, but recommended: `-74.0060`)
7. **Timezone** (Optional, default: `UTC`)

### **Application Flow Requirements**

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User opens app                                          │
│     ↓                                                       │
│  2. Check if user has completed onboarding                  │
│     - Check localStorage/sessionStorage                     │
│     - Check if user data exists in Convex                   │
│     ↓                                                       │
│  3. IF NOT onboarded → SHOW ONBOARDING SCREEN               │
│     - Form with birth details                               │
│     - Validate all fields                                   │
│     - Submit to /api/v1/users/onboard                       │
│     ↓                                                       │
│  4. IF onboarded → SHOW CHAT INTERFACE                      │
│     - User can now chat with AI                             │
│     - All responses are personalized                        │
│     ↓                                                       │
│  5. Chat flow                                               │
│     - Send messages to /api/v1/chat/send                    │
│     - Receive AI responses                                  │
│     - Session persistence                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **Enforcement Strategy for Developers**

When building your application, implement these checks:

```typescript
// Example: Check if user is onboarded
async function checkUserOnboarding() {
  const token = await getConvexAuthToken();

  if (!token) {
    // User not logged in - redirect to auth/onboarding
    return { onboarded: false, redirect: '/onboarding' };
  }

  // Try to fetch user profile
  const response = await fetch('https://astro-shiva-app.vercel.app/api/v1/users/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (response.status === 404) {
    // User exists in Convex but no profile - needs onboarding
    return { onboarded: false, redirect: '/onboarding' };
  }

  if (response.ok) {
    // User is onboarded - can access chat
    return { onboarded: true };
  }

  // Error case
  return { onboarded: false, redirect: '/onboarding' };
}
```

---

## 🔐 Authentication Architecture

### **How Authentication Works**

The API uses **Convex Authentication**. Here's the complete flow:

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (Your App)                                        │
│     ↓                                                       │
│  1. Install Convex SDK                                      │
│     npm install convex @convex-dev/react                    │
│     ↓                                                       │
│  2. Configure Convex Client                                 │
│     const convex = new ConvexReactClient(                   │
│       "https://your-convex-url.convex.cloud"                │
│     )                                                       │
│     ↓                                                       │
│  3. User Authentication                                     │
│     - Sign in with Google, GitHub, Email, etc.              │
│     - Convex returns auth token                             │
│     ↓                                                       │
│  4. Use Token with Astro Shiva API                          │
│     - Pass token in Authorization header                    │
│     - API validates token with Convex                       │
│     ↓                                                       │
│  5. User Data Storage                                       │
│     - User data stored in YOUR Convex database              │
│     - Astro Shiva API reads/writes to YOUR Convex           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **Do Developers Need Their Own Convex Account?**

**YES, developers need their own Convex deployment.**

Here's why and how it works:

#### **Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPER'S SETUP                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Your Frontend App                                          │
│     ↓                                                       │
│  Your Convex Backend                                        │
│  (convex.dev deployment)                                    │
│  - Your database                                            │
│  - Your authentication                                      │
│  - Your functions                                           │
│     ↓                                                       │
│  Astro Shiva API (This Backend)                             │
│  (astro-shiva-app.vercel.app)                               │
│  - Connects to YOUR Convex                                  │
│  - Uses YOUR Convex URL                                     │
│  - Reads/Writes YOUR data                                   │
│     ↓                                                       │
│  Result: Complete separation of data                        │
│  - Each developer has their own user database               │
│  - No data sharing between applications                     │
│  - Full control over your users                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **Step-by-Step Setup for Developers**

#### **1. Create Your Convex Account**

```bash
# Visit convex.dev and sign up
# Or use CLI:
npx convex dev
```

#### **2. Get Your Convex Deployment URL**

After creating your Convex project:
1. Go to convex.dev dashboard
2. Create a new project (e.g., "my-astro-app")
3. Copy your deployment URL:
   ```
   https://your-project.convex.cloud
   ```

#### **3. Configure Environment Variables**

In your **Astro Shiva API** Vercel deployment:

```
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

In your **Frontend** deployment:

```
VITE_CONVEX_URL=https://your-project.convex.cloud
# or for Next.js:
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

#### **4. Install Convex SDK in Frontend**

```bash
# React/Next.js
npm install convex @convex-dev/react

# Vue
npm install convex

# Svelte
npm install convex
```

#### **5. Initialize Convex Client**

```typescript
// React Example
import { ConvexReactClient } from '@convex-dev/react';

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL
);

// Wrap your app
function App() {
  return (
    <ConvexProvider client={convex}>
      <YourApp />
    </ConvexProvider>
  );
}
```

#### **6. Implement Authentication**

```typescript
// Using Convex Auth
import { useAuth0 } from '@auth0/auth0-react';
// or
import { useConvexAuth } from '@convex-dev/react';

// Example with Convex Auth
const { isAuthenticated, isLoading } = useConvexAuth();

if (!isAuthenticated) {
  // Redirect to login/onboarding
  window.location.href = '/onboarding';
}
```

#### **7. Get Auth Token for API Calls**

```typescript
// React Example
import { useConvexAuth } from '@convex-dev/react';

function useAstroShivaAPI() {
  const { getToken } = useConvexAuth();

  const callAPI = async (endpoint: string, options: RequestInit = {}) => {
    const token = await getToken();

    const response = await fetch(`https://astro-shiva-app.vercel.app${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    return response.json();
  };

  return { callAPI };
}
```

### **Authentication Flow Summary**

| Scenario | Auth Required | How to Get Token |
|----------|---------------|------------------|
| **Onboarding** | ✅ Yes | Convex authentication (Google, GitHub, Email, etc.) |
| **Chat** | ❌ No | Guest mode - no token needed |
| **Profile** | ✅ Yes | Convex authentication |
| **Sessions** | ✅ Yes | Convex authentication |

---

## 🌐 CORS Configuration

### **Why CORS is Important**

CORS (Cross-Origin Resource Sharing) controls which frontend domains can access your API.

### **Configuration Steps**

1. **Deploy your frontend** (Vercel, Netlify, Firebase, etc.)
2. **Get your frontend URL** (e.g., `https://my-astro-app.com`)
3. **Configure CORS in Astro Shiva API**

**In Vercel Dashboard:**
- Go to Astro Shiva App → Settings → Environment Variables
- Add `ALLOWED_ORIGINS`
- Format: `https://your-frontend.com,http://localhost:3000,http://localhost:5173`

**Example:**
```
ALLOWED_ORIGINS=https://my-astro-app.com,http://localhost:3000,http://localhost:5173
```

### **Mobile App CORS**

For mobile apps (React Native, Flutter, etc.), you typically use:
- **WebView**: Use the same CORS rules
- **Native HTTP Client**: Configure allowed origins in your app config

---

## 📋 API Endpoints

### **1. Health Check**

#### GET `/api/v1/health`
Check if the API is operational.

**Response** (200 OK):
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-01-26T19:52:16.968Z",
  "serverStartTime": "2026-01-26T19:52:16.968Z",
  "environment": "production",
  "dependencies": {
    "convex": {
      "status": "healthy",
      "latency": 0
    }
  }
}
```

**cURL:**
```bash
curl -X GET https://astro-shiva-app.vercel.app/api/v1/health
```

---

### **2. User Onboarding** ⭐ REQUIRED

#### POST `/api/v1/users/onboard`
Initiate user onboarding with birth details. ✨ **ASYNC**

**Authentication Required**: ✅ Yes (Convex auth token)

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
| `name` | string | ✅ | 2-100 characters |
| `dateOfBirth` | string (ISO 8601) | ✅ | Valid date |
| `timeOfBirth` | string | ✅ | HH:mm format |
| `place` | string | ✅ | 2+ characters |
| `latitude` | number | ✅ | -90 to 90 (Required for accuracy) |
| `longitude` | number | ✅ | -180 to 180 (Required for accuracy) |
| `timezone` | string | ❌ | IANA timezone |

**Success Response** (202 Accepted):
The server has accepted the request and is processing it in the background to prevent timeouts during astrological data generation.

```json
{
  "success": true,
  "message": "Onboarding initiated. Please poll /api/v1/users/profile for status.",
  "data": {
    "uid": "uid_abc123",
    "status": "processing"
  }
}
```

**Next Step**: Poll `GET /api/v1/users/profile` until `status` is `"completed"`.

**Error Responses:**
- **400**: Validation error (missing/invalid fields)
- **401**: Authentication required
- **500**: Server error

**cURL:**
```bash
curl -X POST https://astro-shiva-app.vercel.app/api/v1/users/onboard \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <convex_auth_token>" \
  -d '{
    "name": "John Doe",
    "dateOfBirth": "1990-01-01T00:00:00.000Z",
    "timeOfBirth": "12:00",
    "place": "New York",
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

---

### **3. User Profile**

#### GET `/api/v1/users/profile`
Retrieve user profile, status, and astrological data.

**Authentication Required**: ✅ Yes

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "user_abc123",
    "name": "John Doe",
    "status": "completed", // 'processing' | 'completed' | 'failed'
    "email": "john@example.com",
    "astroProfile": {
      "astroSummary": "Your Vedic astrology profile..."
    },
    "createdAt": "2026-01-26T19:52:16.968Z"
  }
}
```

**Polling Logic:**
- If `status` is `"processing"`: Show loading state, retry in 3-5s.
- If `status` is `"completed"`: Proceed to app.
- If `status` is `"failed"`: Show error message (`data.failureReason`).

**Error Response** (404 Not Found):
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found. Please complete onboarding."
  }
}
```

**cURL:**
```bash
curl -X GET https://astro-shiva-app.vercel.app/api/v1/users/profile \
  -H "Authorization: Bearer <convex_auth_token>"
```

#### PUT `/api/v1/users/profile`
Update user profile.

**Authentication Required**: ✅ Yes

**Request Body:**
```json
{
  "name": "John Updated",
  "email": "john.updated@example.com"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "name": "John Updated",
    "updatedAt": "2026-01-26T19:52:16.968Z"
  }
}
```

---

### **4. Chat Messages** ⭐ MAIN ENDPOINT

#### POST `/api/v1/chat/send`
Send a message to the AI astrology assistant.

**Authentication Required**: ❌ No (Guest mode enabled)

**Request Body:**
```json
{
  "message": "Hello, tell me about my career prospects",
  "sessionId": "optional_session_uuid"
}
```

**Field Requirements:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | ✅ | 1-5000 characters |
| `sessionId` | string | ❌ | UUID for session persistence |

**Success Response** (200 OK):**
```json
{
  "success": true,
  "data": {
    "response": "Based on your Vedic astrology chart, your career prospects look excellent...",
    "sessionId": "abc123-def456-ghi789"
  },
  "meta": {
    "timestamp": "2026-01-26T19:52:16.968Z",
    "responseTime": 1500
  }
}
```

**Error Responses:**
- **400**: Validation error
- **415**: Wrong content type
- **413**: Request too large (>1MB)
- **429**: Rate limited
- **500**: Server error

**cURL:**
```bash
curl -X POST https://astro-shiva-app.vercel.app/api/v1/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, tell me about my career prospects"
  }'
```

---

### **5. Chat Sessions**

#### GET `/api/v1/chat/sessions`
Retrieve user's chat history and sessions.

**Authentication Required**: ✅ Yes

**Query Parameters:**
- `limit` (number, optional): 1-100, default: 20
- `offset` (number, optional): default: 0

**Success Response** (200 OK):
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
        "summary": "Discussion about career and relationships"
      }
    ],
    "total": 1,
    "hasMore": false
  }
}
```

**cURL:**
```bash
curl -X GET "https://astro-shiva-app.vercel.app/api/v1/chat/sessions?limit=10&offset=0" \
  -H "Authorization: Bearer <convex_auth_token>"
```

---

### **6. Streaming Health Check**

#### GET `/api/health/stream`
Health check for streaming infrastructure.

**Response** (200 OK):
```json
{
  "status": "healthy",
  "streaming": {
    "canStream": true,
    "activeStreams": 0
  }
}
```

---

### **7. Metrics**

#### GET `/api/v1/metrics`
Prometheus metrics for monitoring.

**Response** (200 OK):
```
# HELP astroai_http_requests_total Total HTTP requests
# TYPE astroai_http_requests_total counter
astroai_http_requests_total{method="POST",route="/api/v1/chat/send",status="200"} 15
```

---

## 📱 Platform-Specific Integration

### **Web Applications (React, Vue, Svelte)**

```typescript
// Complete example for React
import { useState, useEffect } from 'react';
import { ConvexReactClient } from '@convex-dev/react';
import { useConvexAuth } from '@convex-dev/react';

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL
);

function AstroChatApp() {
  const { isAuthenticated, isLoading, getToken } = useConvexAuth();
  const [messages, setMessages] = useState([]);
  const [onboarded, setOnboarded] = useState(false);

  // Check onboarding status
  useEffect(() => {
    async function checkOnboarding() {
      if (!isAuthenticated) return;

      const token = await getToken();
      const response = await fetch(
        'https://astro-shiva-app.vercel.app/api/v1/users/profile',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.status === 404) {
        setOnboarded(false);
      } else if (response.ok) {
        setOnboarded(true);
      }
    }

    checkOnboarding();
  }, [isAuthenticated]);

  // Show onboarding if not completed
  if (!onboarded) {
    return <OnboardingForm />;
  }

  // Show chat interface
  return <ChatInterface />;
}
```

### **Mobile Apps (React Native)**

```typescript
// React Native Example
import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { ConvexReactClient } from '@convex-dev/react-native';

const convex = new ConvexReactClient(
  process.env.CONVEX_URL
);

function AstroChatApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    const response = await fetch(
      'https://astro-shiva-app.vercel.app/api/v1/chat/send',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      }
    );

    const data = await response.json();
    setMessages([...messages, { role: 'user', content: input }]);
    setMessages([...messages, { role: 'assistant', content: data.data.response }]);
  };

  return (
    <View>
      <Text>Astro Chat</Text>
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="Ask about your astrology..."
      />
      <Button title="Send" onPress={sendMessage} />
    </View>
  );
}
```

### **Flutter (Dart)**

```dart
// Flutter Example
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class AstroChatApp extends StatefulWidget {
  @override
  _AstroChatAppState createState() => _AstroChatAppState();
}

class _AstroChatAppState extends State<AstroChatApp> {
  List<Map<String, dynamic>> messages = [];
  TextEditingController controller = TextEditingController();

  Future<void> sendMessage() async {
    final response = await http.post(
      Uri.parse('https://astro-shiva-app.vercel.app/api/v1/chat/send'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'message': controller.text})
    );

    final data = jsonDecode(response.body);

    setState(() {
      messages.add({'role': 'user', 'content': controller.text});
      messages.add({'role': 'assistant', 'content': data['data']['response']});
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          Expanded(child: ListView.builder(
            itemCount: messages.length,
            itemBuilder: (context, i) => ListTile(
              title: Text(messages[i]['content']),
            ),
          )),
          TextField(controller: controller),
          ElevatedButton(onPressed: sendMessage, child: Text('Send')),
        ],
      ),
    );
  }
}
```

### **Python (Desktop/CLI)**

```python
# Python Example
import requests
import json

class AstroShivaClient:
    def __init__(self, token=None):
        self.base_url = "https://astro-shiva-app.vercel.app"
        self.token = token

    def onboard(self, name, date_of_birth, time_of_birth, place):
        """Complete user onboarding"""
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
            json={
                "message": message,
                "sessionId": session_id
            }
        )
        return response.json()

# Usage
client = AstroShivaClient()

# Onboard user
result = client.onboard(
    name="John Doe",
    date_of_birth="1990-01-01T00:00:00.000Z",
    time_of_birth="12:00",
    place="New York"
)

# Send message
response = client.send_message("Hello, tell me about my astrology")
print(response['data']['response'])
```

---

## 🎯 Complete Application Flow

### **Step 1: User Opens App**

```typescript
// Check if user needs onboarding
async function initializeApp() {
  // Get Convex auth token
  const token = await getAuthToken();

  if (!token) {
    // User not authenticated - redirect to auth
    return { screen: 'auth' };
  }

  // Check if user has profile
  const response = await fetch(
    'https://astro-shiva-app.vercel.app/api/v1/users/profile',
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  if (response.status === 404) {
    // User needs onboarding
    return { screen: 'onboarding' };
  }

  // User is ready to chat
  return { screen: 'chat' };
}
```

### **Step 2: Onboarding Screen**

```typescript
// Onboarding Form
function OnboardingForm() {
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    timeOfBirth: '',
    place: '',
    latitude: null,
    longitude: null,
    timezone: 'UTC'
  });

  const handleSubmit = async () => {
    const token = await getAuthToken();

    const response = await fetch(
      'https://astro-shiva-app.vercel.app/api/v1/users/onboard',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      }
    );

    if (response.ok) {
      // Redirect to chat
      navigate('/chat');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Full Name" required />
      <input type="date" name="dateOfBirth" required />
      <input type="time" name="timeOfBirth" required />
      <input name="place" placeholder="Birth Place" required />
      <button type="submit">Complete Onboarding</button>
    </form>
  );
}
```

### **Step 3: Chat Interface**

```typescript
function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);

  const sendMessage = async () => {
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: input }]);

    // Send to API
    const response = await fetch(
      'https://astro-shiva-app.vercel.app/api/v1/chat/send',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, sessionId })
      }
    );

    const data = await response.json();

    // Add AI response
    setMessages(prev => [...prev, { role: 'assistant', content: data.data.response }]);

    // Store session ID
    if (data.data.sessionId) {
      setSessionId(data.data.sessionId);
    }

    setInput('');
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        placeholder="Ask about your astrology..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
```

---

## 🔧 Configuration Checklist

### **For Developers Building Applications**

- [ ] **Create Convex Account**
  - Visit convex.dev
  - Sign up with GitHub/Google
  - Create new project

- [ ] **Get Convex Deployment URL**
  - From Convex dashboard
  - Format: `https://your-project.convex.cloud`

- [ ] **Configure Astro Shiva API**
  - In Vercel dashboard
  - Add environment variable:
    ```
    NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
    ```

- [ ] **Configure CORS**
  - Add `ALLOWED_ORIGINS` in Vercel
  - Include your frontend URLs:
    ```
    ALLOWED_ORIGINS=https://your-app.com,http://localhost:3000
    ```

- [ ] **Install Convex SDK in Frontend**
  ```bash
  npm install convex @convex-dev/react
  ```

- [ ] **Implement Authentication**
  - Set up Convex Auth
  - Handle user sign-in/sign-up

- [ ] **Implement Onboarding Flow**
  - Create onboarding form
  - Validate birth details
  - Call `/api/v1/users/onboard`

- [ ] **Implement Chat Interface**
  - Create chat UI
  - Call `/api/v1/chat/send`
  - Handle responses

- [ ] **Test End-to-End**
  - Test onboarding
  - Test chat
  - Test error handling

---

## 📊 Error Handling

### **Standard Error Format**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [] // Optional validation details
  },
  "meta": {
    "timestamp": "2026-01-26T19:52:16.968Z",
    "requestId": "req_1769457136968"
  }
}
```

### **Common Error Codes**

| Code | HTTP Status | Meaning | Solution |
|------|-------------|---------|----------|
| `VALIDATION_ERROR` | 400 | Invalid input | Check field requirements |
| `USER_NOT_FOUND` | 404 | User not onboarded | Complete onboarding first |
| `AUTH_REQUIRED` | 401 | Missing auth token | Get Convex auth token |
| `RATE_LIMITED` | 429 | Too many requests | Wait and retry |
| `INTERNAL_ERROR` | 500 | Server error | Try again later |

---

## 🚀 Quick Start Template

### **Complete React App Template**

```bash
# 1. Create React app
npm create vite@latest my-astro-app -- --template react-ts

# 2. Install dependencies
npm install convex @convex-dev/react

# 3. Create files
```

**src/convex.ts:**
```typescript
import { ConvexReactClient } from '@convex-dev/react';

export const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL
);
```

**src/api-client.ts:**
```typescript
const API_BASE = 'https://astro-shiva-app.vercel.app';

export class AstroShivaAPI {
  constructor(private token?: string) {}

  async onboard(data: {
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    place: string;
  }) {
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

**src/App.tsx:**
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

        // Check onboarding
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

---

## 📚 Additional Resources

### **Convex Documentation**
- Convex Auth: https://docs.convex.dev/auth
- Convex React: https://docs.convex.dev/client/react
- Convex CLI: https://docs.convex.dev/cli

### **Frontend Frameworks**
- React: https://react.dev
- Vue: https://vuejs.org
- Svelte: https://svelte.dev
- React Native: https://reactnative.dev
- Flutter: https://flutter.dev

### **Testing**
```bash
# Test health endpoint
curl https://astro-shiva-app.vercel.app/api/v1/health

# Test chat endpoint
curl -X POST https://astro-shiva-app.vercel.app/api/v1/chat/send \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'

# Test onboarding (with auth token)
curl -X POST https://astro-shiva-app.vercel.app/api/v1/users/onboard \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Test","dateOfBirth":"1990-01-01T00:00:00.000Z","timeOfBirth":"12:00","place":"Test City"}'
```

---

## 🆘 Support

For issues or questions:
1. Check error responses for details
2. Verify CORS configuration
3. Ensure authentication tokens are valid
4. Check Vercel deployment logs
5. Review Convex dashboard for database issues

---

## 📝 Version History

- **v1.0.0** (2026-01-26): Initial release
  - Edge runtime compatibility fixes
  - CORS support
  - Guest mode for chat
  - Comprehensive error handling
  - Complete API documentation
