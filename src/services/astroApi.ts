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
    details?: string;
    retryable?: boolean;
  };
  meta?: {
    timestamp: string;
  };
}

export interface UserProfile {
  uid: string;
  name: string;
  status: 'onboarding' | 'processing' | 'completed' | 'failed';
  astroData?: {
    summary: string;
    ascendant: string;
    moonSign: string;
    // Full birth chart data
    chart?: any;
  };
  createdAt?: string;
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        'X-Guest-ID': this.token || ''
      },
      body: JSON.stringify({ message, sessionId })
    });
    return response.json();
  }

  async getProfile(): Promise<ApiResponse<UserProfile>> {
    const response = await fetch(`${API_URL}/users/profile`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'X-Guest-ID': this.token || ''
      }
    });
    return response.json();
  }

  /**
   * Verify that astrological data exists and is complete
   * Used before transitioning to chat interface
   */
  async verifyAstroData(): Promise<{ exists: boolean; data?: UserProfile }> {
    try {
      const profile = await this.getProfile();
      
      if (!profile.success || !profile.data) {
        return { exists: false };
      }

      const userData = profile.data;
      
      // Check if user has completed onboarding and has astrological data
      if (userData.status === 'completed' && userData.astroData) {
        return { exists: true, data: userData };
      }

      return { exists: false };
    } catch (error) {
      console.error('[AstroShivaAPI] Error verifying astro data:', error);
      return { exists: false };
    }
  }
}