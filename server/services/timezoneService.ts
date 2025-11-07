import { storage } from '../storage';

export class TimezoneService {
  /**
   * Convert a time from one timezone to another
   */
  static convertTime(
    time: string, // HH:MM format
    date: string, // YYYY-MM-DD format
    fromTimezone: string,
    toTimezone: string
  ): string {
    // Create a date object in the source timezone
    const dateTime = new Date(`${date}T${time}:00`);
    
    // Create formatter for source timezone
    const sourceFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: fromTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    // Create formatter for target timezone
    const targetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: toTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    // Parse the time in source timezone
    const sourceParts = sourceFormatter.formatToParts(dateTime);
    const sourceDate = new Date(
      parseInt(sourceParts.find(p => p.type === 'year')!.value),
      parseInt(sourceParts.find(p => p.type === 'month')!.value) - 1,
      parseInt(sourceParts.find(p => p.type === 'day')!.value),
      parseInt(sourceParts.find(p => p.type === 'hour')!.value),
      parseInt(sourceParts.find(p => p.type === 'minute')!.value)
    );
    
    // Convert to target timezone
    const targetParts = targetFormatter.formatToParts(sourceDate);
    const hour = targetParts.find(p => p.type === 'hour')!.value;
    const minute = targetParts.find(p => p.type === 'minute')!.value;
    
    return `${hour}:${minute}`;
  }

  /**
   * Convert a full timestamp from one timezone to another
   */
  static convertTimestamp(
    timestamp: Date,
    fromTimezone: string,
    toTimezone: string
  ): Date {
    // Get the offset difference
    const sourceDate = new Date(timestamp.toLocaleString("en-US", { timeZone: fromTimezone }));
    const targetDate = new Date(timestamp.toLocaleString("en-US", { timeZone: toTimezone }));
    const offset = targetDate.getTime() - sourceDate.getTime();
    
    return new Date(timestamp.getTime() + offset);
  }

  /**
   * Get available time slots for an expert on a specific date in client's timezone
   */
  static async getAvailableTimeSlotsInClientTimezone(
    expertId: string,
    date: string, // YYYY-MM-DD in client timezone
    clientTimezone: string
  ): Promise<{ time: string; utcTime: Date }[]> {
    // Get expert's timezone
    const expert = await storage.getUser(expertId);
    if (!expert) throw new Error('Expert not found');
    
    const expertTimezone = expert.timezone || 'UTC';
    
    // Get expert's availability for the day of week in their timezone
    const clientDate = new Date(`${date}T12:00:00`); // Use noon to avoid date boundary issues
    const expertDate = this.convertTimestamp(clientDate, clientTimezone, expertTimezone);
    const dayOfWeek = expertDate.getDay();
    
    // Get expert availability for this day
    const availability = await storage.getExpertAvailability(expertId);
    const dayAvailability = availability.filter(
      avail => avail.dayOfWeek === dayOfWeek && avail.isActive
    );
    
    if (dayAvailability.length === 0) return [];
    
    // Generate time slots
    const slots: { time: string; utcTime: Date }[] = [];
    
    for (const avail of dayAvailability) {
      const [startHour, startMinute] = avail.startTime.split(':').map(Number);
      const [endHour, endMinute] = avail.endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      // Generate 30-minute slots
      for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
        const slotHour = Math.floor(minutes / 60);
        const slotMinute = minutes % 60;
        const expertLocalTime = `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}`;
        
        // Convert to client timezone for display
        const clientLocalTime = this.convertTime(
          expertLocalTime,
          expertDate.toISOString().split('T')[0],
          expertTimezone,
          clientTimezone
        );
        
        // Create UTC timestamp for storage
        const expertDateStr = expertDate.toISOString().split('T')[0];
        const utcTime = new Date(`${expertDateStr}T${expertLocalTime}:00`);
        
        // Convert expert local time to UTC
        const utcOffset = this.getTimezoneOffset(expertTimezone, utcTime);
        utcTime.setMinutes(utcTime.getMinutes() - utcOffset);
        
        slots.push({
          time: clientLocalTime,
          utcTime
        });
      }
    }
    
    return slots;
  }

  /**
   * Get timezone offset in minutes for a specific timezone and date
   */
  static getTimezoneOffset(timezone: string, date: Date): number {
    const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const local = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return (local.getTime() - utc.getTime()) / (1000 * 60);
  }

  /**
   * Format time for display in user's timezone
   */
  static formatTimeForUser(
    utcTime: Date,
    userTimezone: string,
    includeDate: boolean = true
  ): string {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: userTimezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    
    if (includeDate) {
      options.month = 'short';
      options.day = 'numeric';
      options.year = 'numeric';
    }
    
    return utcTime.toLocaleString('en-US', options);
  }

  /**
   * Get list of common timezones for dropdown
   */
  static getCommonTimezones(): { value: string; label: string; offset: string }[] {
    return [
      { value: 'America/New_York', label: 'Eastern Time (ET)', offset: 'UTC-5/-4' },
      { value: 'America/Chicago', label: 'Central Time (CT)', offset: 'UTC-6/-5' },
      { value: 'America/Denver', label: 'Mountain Time (MT)', offset: 'UTC-7/-6' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: 'UTC-8/-7' },
      { value: 'America/Phoenix', label: 'Arizona Time (MST)', offset: 'UTC-7' },
      { value: 'America/Anchorage', label: 'Alaska Time (AKT)', offset: 'UTC-9/-8' },
      { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)', offset: 'UTC-10' },
      { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)', offset: 'UTC+0/+1' },
      { value: 'Europe/Paris', label: 'Central European Time (CET)', offset: 'UTC+1/+2' },
      { value: 'Europe/Berlin', label: 'Central European Time (CET)', offset: 'UTC+1/+2' },
      { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', offset: 'UTC+9' },
      { value: 'Asia/Shanghai', label: 'China Standard Time (CST)', offset: 'UTC+8' },
      { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)', offset: 'UTC+4' },
      { value: 'Asia/Kolkata', label: 'India Standard Time (IST)', offset: 'UTC+5:30' },
      { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)', offset: 'UTC+10/+11' },
      { value: 'UTC', label: 'Coordinated Universal Time (UTC)', offset: 'UTC+0' }
    ];
  }

  /**
   * Detect user's timezone using browser
   */
  static detectUserTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      return 'UTC';
    }
  }

  /**
   * Convert appointment time to different timezone for calendar integration
   */
  static convertAppointmentForCalendar(
    scheduledAt: Date,
    fromTimezone: string,
    toTimezone: string
  ): {
    startTime: Date;
    endTime: Date;
    displayTime: string;
  } {
    const startTime = this.convertTimestamp(scheduledAt, fromTimezone, toTimezone);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour default
    
    const displayTime = this.formatTimeForUser(startTime, toTimezone, true);
    
    return { startTime, endTime, displayTime };
  }
}

export const timezoneService = new TimezoneService();