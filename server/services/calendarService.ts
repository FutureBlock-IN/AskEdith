import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { storage } from '../storage';
import type { CalendarIntegration, InsertCalendarIntegration } from '@shared/schema';

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: {
        type: 'hangoutsMeet';
      };
    };
  };
}

export class CalendarService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.BASE_URL}/api/calendar/oauth/callback`
    );
  }

  /**
   * Generate OAuth URL for Google Calendar authorization
   */
  generateAuthUrl(expertId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: expertId, // Pass expertId through state parameter
      prompt: 'consent' // Force consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, expertId: string): Promise<CalendarIntegration> {
    try {
      const { tokens } = await this.oauth2Client.getAccessToken(code);
      
      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to obtain necessary tokens from Google');
      }

      // Set credentials to get user info
      this.oauth2Client.setCredentials(tokens);
      
      // Get primary calendar info
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      const calendarList = await calendar.calendarList.list();
      const primaryCalendar = calendarList.data.items?.find(cal => cal.primary);

      if (!primaryCalendar) {
        throw new Error('Could not access primary calendar');
      }

      // Create or update calendar integration
      const integrationData: InsertCalendarIntegration = {
        expertId,
        provider: 'google',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
        calendarId: primaryCalendar.id || 'primary',
        calendarName: primaryCalendar.summary || 'Primary Calendar',
        isActive: true,
        lastSyncAt: new Date(),
        syncErrors: null
      };

      return await storage.createOrUpdateCalendarIntegration(integrationData);
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to connect Google Calendar');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(integration: CalendarIntegration): Promise<string> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: integration.refreshToken
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      if (!credentials.access_token) {
        throw new Error('Failed to refresh access token');
      }

      // Update stored tokens
      await storage.updateCalendarIntegration(integration.id, {
        accessToken: credentials.access_token,
        tokenExpiresAt: new Date(credentials.expiry_date || Date.now() + 3600000),
        lastSyncAt: new Date()
      });

      return credentials.access_token;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      // Mark integration as inactive if refresh fails
      await storage.updateCalendarIntegration(integration.id, {
        isActive: false,
        syncErrors: JSON.stringify({ error: 'Token refresh failed', timestamp: new Date() })
      });
      throw new Error('Calendar integration expired. Please reconnect.');
    }
  }

  /**
   * Get valid access token for expert
   */
  private async getValidAccessToken(expertId: string): Promise<{ token: string; integration: CalendarIntegration }> {
    const integration = await storage.getCalendarIntegration(expertId);
    
    if (!integration || !integration.isActive) {
      throw new Error('No active calendar integration found');
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes
    const now = new Date();
    const expiryTime = new Date(integration.tokenExpiresAt);

    if (expiryTime.getTime() - now.getTime() < expiryBuffer) {
      const newToken = await this.refreshAccessToken(integration);
      return { token: newToken, integration };
    }

    return { token: integration.accessToken, integration };
  }

  /**
   * Create appointment event in Google Calendar
   */
  async createAppointmentEvent(
    expertId: string,
    appointment: {
      id: number;
      clientName: string;
      clientEmail: string;
      scheduledAt: Date;
      duration: number;
      notes?: string;
    }
  ): Promise<{ eventId: string; meetingLink?: string }> {
    try {
      const { token } = await this.getValidAccessToken(expertId);
      
      this.oauth2Client.setCredentials({ access_token: token });
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const startTime = new Date(appointment.scheduledAt);
      const endTime = new Date(startTime.getTime() + appointment.duration * 60 * 1000);

      const event: CalendarEvent = {
        summary: `Consultation with ${appointment.clientName}`,
        description: `
Consultation appointment through CaregiversCommunity platform.

Client: ${appointment.clientName}
Email: ${appointment.clientEmail}
Duration: ${appointment.duration} minutes
${appointment.notes ? `\nNotes: ${appointment.notes}` : ''}

Appointment ID: #${appointment.id}
        `.trim(),
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'America/New_York'
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'America/New_York'
        },
        attendees: [
          { email: appointment.clientEmail, displayName: appointment.clientName }
        ],
        conferenceData: {
          createRequest: {
            requestId: `appointment-${appointment.id}-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        }
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1, // Required for Meet links
        sendUpdates: 'all' // Send invites to attendees
      });

      const meetingLink = response.data.conferenceData?.entryPoints?.[0]?.uri;

      return {
        eventId: response.data.id!,
        meetingLink
      };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  /**
   * Update appointment event in Google Calendar
   */
  async updateAppointmentEvent(
    expertId: string,
    eventId: string,
    updates: {
      scheduledAt?: Date;
      duration?: number;
      status?: string;
    }
  ): Promise<void> {
    try {
      const { token } = await this.getValidAccessToken(expertId);
      
      this.oauth2Client.setCredentials({ access_token: token });
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      // Get existing event
      const existingEvent = await calendar.events.get({
        calendarId: 'primary',
        eventId
      });

      if (!existingEvent.data) {
        throw new Error('Event not found');
      }

      const event = existingEvent.data;

      // Update fields if provided
      if (updates.scheduledAt && updates.duration) {
        const startTime = new Date(updates.scheduledAt);
        const endTime = new Date(startTime.getTime() + updates.duration * 60 * 1000);
        
        event.start = {
          dateTime: startTime.toISOString(),
          timeZone: 'America/New_York'
        };
        event.end = {
          dateTime: endTime.toISOString(),
          timeZone: 'America/New_York'
        };
      }

      if (updates.status === 'cancelled') {
        event.status = 'cancelled';
      }

      await calendar.events.update({
        calendarId: 'primary',
        eventId,
        resource: event,
        sendUpdates: 'all'
      });
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw new Error('Failed to update calendar event');
    }
  }

  /**
   * Delete appointment event from Google Calendar
   */
  async deleteAppointmentEvent(expertId: string, eventId: string): Promise<void> {
    try {
      const { token } = await this.getValidAccessToken(expertId);
      
      this.oauth2Client.setCredentials({ access_token: token });
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
        sendUpdates: 'all'
      });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }

  /**
   * Check for calendar conflicts
   */
  async checkForConflicts(
    expertId: string,
    startTime: Date,
    endTime: Date,
    excludeEventId?: string
  ): Promise<boolean> {
    try {
      const { token } = await this.getValidAccessToken(expertId);
      
      this.oauth2Client.setCredentials({ access_token: token });
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      
      // Filter out cancelled events and the event we're checking against
      const activeEvents = events.filter(event => 
        event.status !== 'cancelled' && 
        event.id !== excludeEventId
      );

      return activeEvents.length > 0;
    } catch (error) {
      console.error('Error checking for conflicts:', error);
      // Return true (conflict) on error to be safe
      return true;
    }
  }

  /**
   * Sync expert availability with calendar
   */
  async syncAvailability(expertId: string): Promise<void> {
    try {
      const { token, integration } = await this.getValidAccessToken(expertId);
      
      this.oauth2Client.setCredentials({ access_token: token });
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      // Get events for the next 30 days
      const now = new Date();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      
      // Update sync timestamp
      await storage.updateCalendarIntegration(integration.id, {
        lastSyncAt: new Date(),
        syncErrors: null
      });

      // TODO: Process events and update blocked time slots
      // This would involve creating/updating blocked time slots based on calendar events
      
    } catch (error) {
      console.error('Error syncing availability:', error);
      const integration = await storage.getCalendarIntegration(expertId);
      if (integration) {
        await storage.updateCalendarIntegration(integration.id, {
          syncErrors: JSON.stringify({ error: error.message, timestamp: new Date() })
        });
      }
      throw new Error('Failed to sync calendar availability');
    }
  }

  /**
   * Disconnect calendar integration
   */
  async disconnectCalendar(expertId: string): Promise<void> {
    try {
      const integration = await storage.getCalendarIntegration(expertId);
      if (integration) {
        // Revoke tokens with Google
        this.oauth2Client.setCredentials({
          access_token: integration.accessToken,
          refresh_token: integration.refreshToken
        });

        try {
          await this.oauth2Client.revokeCredentials();
        } catch (error) {
          // Continue even if revocation fails
          console.warn('Failed to revoke Google credentials:', error);
        }

        // Mark integration as inactive
        await storage.updateCalendarIntegration(integration.id, {
          isActive: false
        });
      }
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      throw new Error('Failed to disconnect calendar');
    }
  }
}

export const calendarService = new CalendarService();