export const API_URL = import.meta.env.VITE_ASTRO_API_URL;

export interface OnboardingData {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  place: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface ChatMessage {
  message: string;
  sessionId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export class AstroShivaAPI {
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  async onboard(data: OnboardingData): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_URL}/users/onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async sendMessage(message: string, sessionId?: string): Promise<ApiResponse<{
    response: string;
    sessionId: string;
  }>> {
    const response = await fetch(`${API_URL}/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId })
    });
    return response.json();
  }

  async getProfile(): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_URL}/users/profile`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }
}