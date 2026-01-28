# 🌌 Astro Shiva: Integration Blueprint & Architectural Analysis

## 🧠 ULTRATHINK: Deep Architectural Reasoning

### 1. The Multi-Tenant Convex Paradox
The core architectural challenge is the **Dual-Convex Context**. We are not just building a frontend; we are building a bridge between the *Developer's Storage* and the *Astro Shiva Processing Engine*. 
- **Psychological Load**: The developer must manage two distinct endpoints. We mitigate this by abstracting the "Astro Shiva Service" into a single singleton that handles token injection automatically.
- **Technical Cost**: Rendering performance is sensitive to the sequential nature of Onboarding → Profile Load → Chat. We implement an **Optimistic UI pattern** for the onboarding phase to reduce perceived latency.
- **Security**: By using the Developer's own Convex deployment for Auth, we ensure PII (Personally Identifiable Information) remains under their control, while only sending non-sensitive birth coordinates to the processing API.

### 2. State Complexity: The Onboarding Gate
Vedic astrology is unforgiving of missing data. The "mandatory" nature of onboarding requires a **Strict State Machine**:
- `IDLE` → `UNAUTHENTICATED` (Redirect to Auth)
- `AUTHENTICATED` → `CHECKING_PROFILE` (Fetch `/api/v1/users/profile`)
- `CHECKING_PROFILE` → `ONBOARDING` (404 caught)
- `ONBOARDING` → `READY` (POST success)
- `READY` → `CHAT_ACTIVE`

### 3. Edge Case Mitigation
- **Drift in Timezones**: API defaults to UTC, but users think in local time. We mandate the inclusion of `timezone` via `Intl.DateTimeFormat().resolvedOptions().timeZone` to prevent natal chart distortion.
- **Guest Mode Chat**: While the API allows it, the UX should warn that results will be generic. We prioritize the "Personalized" path.

---

## 🛠 Phase 1: Environment Orchestration

Ensure your environment variables are configured with perfect precision.

```env
# DEVELOPER'S DEPLOYMENT (Your Data)
VITE_CONVEX_URL=https://[your-unique-subdomain].convex.cloud

# ASTRO SHIVA ENGINE (The API)
VITE_ASTRO_API_URL=https://astro-shiva-app.vercel.app/api/v1
```

---

## 🚀 Phase 2: The Onboarding Flow Logic

### 1. The "Astro Profile" State Machine
Use a custom hook to manage the onboarding gate. This prevents "flash of un-onboarded content".

```typescript
// hooks/useAstroAuth.ts
export const useAstroAuth = () => {
  const { isAuthenticated, getToken } = useAuth0(); // or Clerk/Convex Auth
  const [status, setStatus] = useState<'loading' | 'onboarding' | 'ready'>('loading');

  useEffect(() => {
    const checkState = async () => {
      if (!isAuthenticated) return;
      const token = await getToken();
      
      const res = await fetch(`${API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 404) setStatus('onboarding');
      else if (res.ok) setStatus('ready');
    };
    checkState();
  }, [isAuthenticated]);

  return { status };
};
```

### 2. The Onboarding Payload
Must include high-precision birth data.

```json
{
  "name": "Arjun Sharma",
  "dateOfBirth": "1992-08-15T00:00:00.000Z",
  "timeOfBirth": "05:45",
  "place": "Bangalore, India",
  "timezone": "Asia/Kolkata"
}
```

---

## 💬 Phase 3: Chat Service Integration

The chat integration should feel like a direct link to the cosmos.

### API Client Wrapper
```typescript
// services/astroApi.ts
class AstroShivaService {
  private static instance: AstroShivaService;
  
  async sendMessage(message: string, sessionId?: string) {
    const res = await fetch(`${API_URL}/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId })
    });
    return res.json();
  }
}
```

---

## 🎨 Phase 4: Avant-Garde UX Checklist

- [ ] **Glassmorphic Loading**: Use a backdrop-blur overlay when the AI is "Calculating Planetary Positions".
- [ ] **Typography**: Pair `Playfair Display` (Serif) for AI responses with `Inter` (Sans) for user inputs.
- [ ] **Micro-interactions**: Staggered reveal for chat messages using `framer-motion` (opacity 0 → 1, y: 20 → 0).
- [ ] **Error States**: If birth details are invalid, don't just show "Error"; explain *why* (e.g., "The stars need a more precise birth time").

---

## 🧪 Verification Plan

1. **Auth Loop**: Verify token is correctly sent in `Authorization: Bearer <token>` format.
2. **Onboarding Catch**: Confirm 404 on `/profile` triggers the redirect to the onboarding form.
3. **Payload Integrity**: Inspect network tab to ensure `timeOfBirth` is 24h format and `dateOfBirth` is ISO string.