import { db } from '../db.js';
import { teams, checkInMeetings } from '../../shared/schema.js';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { 
  addDays, 
  addWeeks, 
  addMonths, 
  setDay, 
  setDate,
  startOfMonth,
  endOfMonth,
  getDay,
  getDate,
  format,
  parseISO,
  isAfter,
  isBefore,
  isEqual,
  startOfDay,
  endOfDay
} from 'date-fns';

const DEBUG = process.env.NODE_ENV === 'development';

// Org timezone single source of truth (temporary until org column exists)
const ORG_TIMEZONE = 'Europe/London';
export function getOrgTimezone(): string {
  return ORG_TIMEZONE;
}

/**
 * Format a date to local date string in given timezone
 * @param date UTC date
 * @param tz IANA timezone string
 * @returns YYYY-MM-DD string in local timezone
 */
function getLocalDateKey(date: Date, tz: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

/**
 * Convert UTC date to start of local day in given timezone
 * @param date UTC date  
 * @param tz IANA timezone string
 * @returns UTC date at start of local day
 */
function startOfLocalDay(date: Date, tz: string): Date {
  const localDateStr = getLocalDateKey(date, tz);
  const [year, month, day] = localDateStr.split('-').map(Number);
  return toUtc(year, month, day, 0, 0, tz);
}

/**
 * DST-aware timezone conversion from local to UTC
 * @param year Local year
 * @param month Local month (1-based)
 * @param day Local day
 * @param hour Local hour (24h)
 * @param minute Local minute
 * @param tz IANA timezone string
 * @returns UTC Date
 */
function toUtc(year: number, month: number, day: number, hour: number, minute: number, tz: string): Date {
  // Create a date in the specified timezone
  const localStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  
  // Use Intl.DateTimeFormat to get the UTC equivalent
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Create a local date object
  const localDate = new Date(localStr);
  
  // Get the formatted parts in the target timezone
  const parts = formatter.formatToParts(localDate);
  const dateParts: any = {};
  parts.forEach(part => {
    dateParts[part.type] = part.value;
  });
  
  // Calculate the offset by comparing local and UTC representations
  const tzDate = new Date(`${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}`);
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  
  // Find the offset and apply it
  const offset = tzDate.getTime() - localDate.getTime();
  const resultUtc = new Date(utcDate.getTime() - offset);
  
  return resultUtc;
}

/**
 * Get clamped day of month (handles day > month length)
 * @param year Year
 * @param monthIndex 0-based month index
 * @param day Day of month (1-31)
 * @returns Valid day for that month
 */
function getClampedDayOfMonth(year: number, monthIndex: number, day: number): number {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(day, lastDay);
}

/**
 * Get the Nth weekday of a month
 * @param year Year
 * @param monthIndex 0-based month index  
 * @param weekOfMonth Week number (1-4) or -1 for last
 * @param dow Day of week (0=Sun, 6=Sat)
 * @returns Date or null if not found
 */
function getNthWeekdayOfMonth(year: number, monthIndex: number, weekOfMonth: number, dow: number): Date | null {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  
  // Find all occurrences of the weekday in the month
  const occurrences: Date[] = [];
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === dow) {
      occurrences.push(new Date(d));
    }
  }
  
  if (weekOfMonth === -1) {
    // Return last occurrence
    return occurrences[occurrences.length - 1] || null;
  } else if (weekOfMonth >= 1 && weekOfMonth <= 4) {
    // Return Nth occurrence (1-indexed)
    return occurrences[weekOfMonth - 1] || null;
  }
  
  return null;
}

/**
 * Apply time (HH:MM:SS format) to a date
 * @param date Base date
 * @param timeStr Time string (HH:MM:SS or HH:MM)
 * @returns New date with time applied
 */
function applyTimeToDate(date: Date, timeStr: string): Date {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0] || '9');
  const minutes = parseInt(parts[1] || '0');
  const seconds = parseInt(parts[2] || '0');
  
  const result = new Date(date);
  result.setHours(hours, minutes, seconds, 0);
  return result;
}

/**
 * Calculate meeting dates based on team anchor settings
 * @param teamData Team data with anchor fields
 * @param from Start date (inclusive)
 * @param to End date (exclusive)
 * @param timezone Team timezone
 * @returns Array of UTC meeting dates
 */
function calculateMeetingDates(
  teamData: any,
  from: Date,
  to: Date,
  timezone: string
): Date[] {
  const dates: Date[] = [];
  const cadence = teamData.cadence;
  // Fix: Use snake_case field name from database
  const meetingTime = teamData.meeting_time || '09:00:00';
  
  // Runtime assertion in dev mode
  if (DEBUG) {
    if (typeof teamData.meeting_time !== 'string' && teamData.meeting_time !== undefined && teamData.meeting_time !== null) {
      console.error(`❌ ERROR: Team ${teamData.name} has invalid meeting_time type: ${typeof teamData.meeting_time}. Expected string, got:`, teamData.meeting_time);
      console.error('Aborting meeting generation for this team.');
      return [];
    }
  }
  
  const now = new Date();
  
  if (DEBUG) {
    console.log(`🔍 Calculating dates for ${cadence} cadence in ${timezone}`);
    console.log(`   Anchors: dow=${teamData.meeting_anchor_dow}, week=${teamData.meeting_anchor_week_of_month}, day=${teamData.meeting_anchor_day_of_month}, month=${teamData.meeting_anchor_month}`);
    console.log(`   Time: ${meetingTime} (from team.meeting_time)`);
    console.log(`   Team ${teamData.id} (${teamData.name}): meeting_time = ${teamData.meeting_time}`);
  }
  
  // Parse meeting time
  const [hours, minutes] = meetingTime.split(':').map(Number);
  
  // Work in local timezone
  let current = new Date(from);
  current.setHours(0, 0, 0, 0);
  
  // Limit iterations to prevent infinite loops
  let iterations = 0;
  const maxIterations = 1000;
  
  
  while (current < to && iterations < maxIterations) {
    iterations++;
    
    
    let meetingDate: Date | null = null;
    
    switch (cadence) {
      case 'daily': {
        // Every day at meetingTime
        const localDate = new Date(current);
        const utcDate = toUtc(
          localDate.getFullYear(),
          localDate.getMonth() + 1,
          localDate.getDate(),
          hours,
          minutes,
          timezone
        );
        
        if (utcDate >= from && utcDate < to && utcDate >= now) {
          dates.push(utcDate);
        }
        
        current = addDays(current, 1);
        break;
      }
        
      case 'weekly': {
        // Every week on meeting_anchor_dow
        const weeklyDow = teamData.meeting_anchor_dow ?? 1; // Default Monday
        
        
        // Find next occurrence of the dow
        while (current.getDay() !== weeklyDow && current < to) {
          current = addDays(current, 1);
        }
        
        
        // Generate all weekly meetings for the period
        while (current < to) {
          const utcDate = toUtc(
            current.getFullYear(),
            current.getMonth() + 1,
            current.getDate(),
            hours,
            minutes,
            timezone
          );
          
          
          if (utcDate >= from && utcDate < to && utcDate >= now) {
            dates.push(utcDate);
          }
          
          current = addWeeks(current, 1);
        }
        break;
      }
        
      case 'bi_weekly': {
        // Every 2 weeks on meeting_anchor_dow
        const biWeeklyDow = teamData.meeting_anchor_dow ?? 1; // Default Monday
        
        // Find first occurrence of the dow on/after from
        while (current.getDay() !== biWeeklyDow && current < to) {
          current = addDays(current, 1);
        }
        
        if (current < to) {
          const utcDate = toUtc(
            current.getFullYear(),
            current.getMonth() + 1,
            current.getDate(),
            hours,
            minutes,
            timezone
          );
          
          if (utcDate >= from && utcDate < to && utcDate >= now) {
            dates.push(utcDate);
          }
          
          current = addWeeks(current, 2);
        }
        break;
      }
        
      case 'monthly': {
        // Check if using exact day or Nth weekday
        if (teamData.meeting_anchor_day_of_month) {
          // Exact day of month
          const dayOfMonth = teamData.meeting_anchor_day_of_month;
          const clampedDay = getClampedDayOfMonth(current.getFullYear(), current.getMonth(), dayOfMonth);
          
          const utcDate = toUtc(
            current.getFullYear(),
            current.getMonth() + 1,
            clampedDay,
            hours,
            minutes,
            timezone
          );
          
          if (utcDate >= from && utcDate < to && utcDate >= now) {
            dates.push(utcDate);
          }
        } else {
          // Nth weekday of month
          const weekOfMonth = teamData.meeting_anchor_week_of_month ?? 1;
          const dow = teamData.meeting_anchor_dow ?? 1;
          const nthDate = getNthWeekdayOfMonth(current.getFullYear(), current.getMonth(), weekOfMonth, dow);
          
          if (nthDate) {
            const utcDate = toUtc(
              nthDate.getFullYear(),
              nthDate.getMonth() + 1,
              nthDate.getDate(),
              hours,
              minutes,
              timezone
            );
            
            if (utcDate >= from && utcDate < to && utcDate >= now) {
              dates.push(utcDate);
            }
          }
        }
        
        current = addMonths(current, 1);
        current.setDate(1);
        break;
      }
        
      case 'quarterly': {
        // Like monthly but every 3 months from anchor month
        const quarterlyAnchorMonth = teamData.meeting_anchor_month ?? 1;
        const currentMonth = current.getMonth() + 1; // 1-based
        
        // Check if we're in a quarter month
        const monthsSinceAnchor = (currentMonth - quarterlyAnchorMonth + 12) % 12;
        if (monthsSinceAnchor % 3 === 0) {
          if (teamData.meeting_anchor_day_of_month) {
            const dayOfMonth = teamData.meeting_anchor_day_of_month;
            const clampedDay = getClampedDayOfMonth(current.getFullYear(), current.getMonth(), dayOfMonth);
            
            const utcDate = toUtc(
              current.getFullYear(),
              current.getMonth() + 1,
              clampedDay,
              hours,
              minutes,
              timezone
            );
            
            if (utcDate >= from && utcDate < to && utcDate >= now) {
              dates.push(utcDate);
            }
          } else {
            const weekOfMonth = teamData.meeting_anchor_week_of_month ?? 1;
            const dow = teamData.meeting_anchor_dow ?? 1;
            const nthDate = getNthWeekdayOfMonth(current.getFullYear(), current.getMonth(), weekOfMonth, dow);
            
            if (nthDate) {
              const utcDate = toUtc(
                nthDate.getFullYear(),
                nthDate.getMonth() + 1,
                nthDate.getDate(),
                hours,
                minutes,
                timezone
              );
              
              if (utcDate >= from && utcDate < to && utcDate >= now) {
                dates.push(utcDate);
              }
            }
          }
        }
        
        current = addMonths(current, 1);
        current.setDate(1);
        break;
      }
        
      case 'half_yearly': {
        // Like monthly but every 6 months from anchor month
        const halfYearlyAnchorMonth = teamData.meeting_anchor_month ?? 1;
        const currentMonthHalf = current.getMonth() + 1;
        
        // Check if we're in a half-year month
        const monthsSinceAnchorHalf = (currentMonthHalf - halfYearlyAnchorMonth + 12) % 12;
        if (monthsSinceAnchorHalf % 6 === 0) {
          if (teamData.meeting_anchor_day_of_month) {
            const dayOfMonth = teamData.meeting_anchor_day_of_month;
            const clampedDay = getClampedDayOfMonth(current.getFullYear(), current.getMonth(), dayOfMonth);
            
            const utcDate = toUtc(
              current.getFullYear(),
              current.getMonth() + 1,
              clampedDay,
              hours,
              minutes,
              timezone
            );
            
            if (utcDate >= from && utcDate < to && utcDate >= now) {
              dates.push(utcDate);
            }
          } else {
            const weekOfMonth = teamData.meeting_anchor_week_of_month ?? 1;
            const dow = teamData.meeting_anchor_dow ?? 1;
            const nthDate = getNthWeekdayOfMonth(current.getFullYear(), current.getMonth(), weekOfMonth, dow);
            
            if (nthDate) {
              const utcDate = toUtc(
                nthDate.getFullYear(),
                nthDate.getMonth() + 1,
                nthDate.getDate(),
                hours,
                minutes,
                timezone
              );
              
              if (utcDate >= from && utcDate < to && utcDate >= now) {
                dates.push(utcDate);
              }
            }
          }
        }
        
        current = addMonths(current, 1);
        current.setDate(1);
        break;
      }
        
      case 'annual': {
        // Like monthly but every 12 months from anchor month
        const annualAnchorMonth = teamData.meeting_anchor_month ?? 1;
        const currentMonthAnnual = current.getMonth() + 1;
        
        // Check if we're in the anchor month
        if (currentMonthAnnual === annualAnchorMonth) {
          if (teamData.meeting_anchor_day_of_month) {
            const dayOfMonth = teamData.meeting_anchor_day_of_month;
            const clampedDay = getClampedDayOfMonth(current.getFullYear(), current.getMonth(), dayOfMonth);
            
            const utcDate = toUtc(
              current.getFullYear(),
              current.getMonth() + 1,
              clampedDay,
              hours,
              minutes,
              timezone
            );
            
            if (utcDate >= from && utcDate < to && utcDate >= now) {
              dates.push(utcDate);
            }
          } else {
            const weekOfMonth = teamData.meeting_anchor_week_of_month ?? 1;
            const dow = teamData.meeting_anchor_dow ?? 1;
            const nthDate = getNthWeekdayOfMonth(current.getFullYear(), current.getMonth(), weekOfMonth, dow);
            
            if (nthDate) {
              const utcDate = toUtc(
                nthDate.getFullYear(),
                nthDate.getMonth() + 1,
                nthDate.getDate(),
                hours,
                minutes,
                timezone
              );
              
              if (utcDate >= from && utcDate < to && utcDate >= now) {
                dates.push(utcDate);
              }
            }
          }
        }
        
        current = addMonths(current, 1);
        current.setDate(1);
        break;
      }
        
      default: {
        // Fallback to weekly on Monday
        while (current.getDay() !== 1 && current < to) {
          current = addDays(current, 1);
        }
        
        if (current < to) {
          const utcDate = toUtc(
            current.getFullYear(),
            current.getMonth() + 1,
            current.getDate(),
            hours,
            minutes,
            timezone
          );
          
          if (utcDate >= from && utcDate < to && utcDate >= now) {
            dates.push(utcDate);
          }
          
          current = addWeeks(current, 1);
        }
        break;
      }
    }
  }
  
  if (DEBUG && dates.length > 0) {
    console.log(`   First 3 dates (UTC): ${dates.slice(0, 3).map(d => d.toISOString()).join(', ')}`);
  }
  
  return dates;
}

/**
 * Generate check-in meetings for a team based on their cadence and timezone
 * Idempotent: Will not create duplicates thanks to unique constraint
 * 
 * @param teamId - The team ID to generate meetings for
 * @param from - Start date for meeting generation (inclusive)
 * @param to - End date for meeting generation (exclusive)
 * @returns Object with createdCount, createdIds and preview array
 */
export async function ensureTeamMeetings(
  teamId: number, 
  from: Date, 
  to: Date
): Promise<{ createdCount: number; createdIds: number[]; preview: string[] }> {
  const now = new Date();
  
  if (DEBUG) {
    console.log(`📅 ensureTeamMeetings(teamId: ${teamId}, from: ${from.toISOString()}, to: ${to.toISOString()})`);
  }
  
  // T1 Fix #2: Future-only guard
  if (to < now) {
    if (DEBUG) {
      console.log(`⏭️ Skipping generation: {reason:"past-window", teamId:${teamId}, end:"${to.toISOString()}", now:"${now.toISOString()}"}`);
    }
    return { createdCount: 0, createdIds: [], preview: [] };
  }
  
  // Get team details with anchor fields
  const team = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
    
  if (!team.length) {
    console.log(`❌ Team ${teamId} not found`);
    return { createdCount: 0, createdIds: [], preview: [] };
  }
  
  const teamData = team[0];
  
  // T2: Use org-level timezone exclusively (no team timezone)
  // Will come from organizations.timeZone when column exists
  const timezone = getOrgTimezone();
  
  // If window straddles now, clip start to local midnight today
  let effectiveFrom = from;
  if (from < now && to > now) {
    effectiveFrom = startOfLocalDay(now, timezone);
    if (DEBUG) {
      console.log(`📅 Straddling window: clipping start from ${from.toISOString()} to ${effectiveFrom.toISOString()} (local midnight in ${timezone})`);
    }
  }
  
  if (DEBUG) {
    console.log(`🏢 Team: "${teamData.name}", Cadence: ${teamData.cadence}, Timezone: ${timezone} (org-level)`);
  }
  
  // Calculate meeting dates based on anchors (using clipped dates)
  const meetingDates = calculateMeetingDates(teamData, effectiveFrom, to, timezone);
  const preview = meetingDates.map(d => d.toISOString());
  
  if (DEBUG) {
    console.log(`📊 Calculated ${meetingDates.length} potential meeting dates`);
  }
  
  // Batch insert with UPSERT and RETURNING id
  const createdIds: number[] = [];
  const skippedDuplicates: { localDateKey: string; existing: Date; candidate: Date }[] = [];
  
  for (const scheduledDate of meetingDates) {
    try {
      // T1 Fix #3: Local-day idempotency check
      const localDateKey = getLocalDateKey(scheduledDate, timezone);
      
      // Check if a meeting already exists on this local calendar day
      const existingMeeting = await db.execute(sql`
        SELECT scheduled_date 
        FROM check_in_meetings 
        WHERE organization_id = ${teamData.organizationId}
          AND team_id = ${teamId}
          AND DATE(scheduled_date AT TIME ZONE ${timezone}) = ${localDateKey}
        LIMIT 1
      `);
      
      if (existingMeeting.rows && existingMeeting.rows.length > 0) {
        const existing = (existingMeeting.rows[0] as any).scheduled_date;
        skippedDuplicates.push({ localDateKey, existing, candidate: scheduledDate });
        if (DEBUG) {
          console.log(`⚠️ Skipping duplicate: {reason:"duplicate-local-day", localDateKey:"${localDateKey}", scheduled_date_existing:"${existing}", scheduled_date_candidate:"${scheduledDate.toISOString()}"}`);
        }
        continue;
      }
      
      // Use raw SQL for true ON CONFLICT DO NOTHING with RETURNING
      const result = await db.execute(sql`
        INSERT INTO check_in_meetings (
          organization_id,
          team_id,
          title,
          description,
          scheduled_date,
          status,
          meeting_type,
          agenda
        ) VALUES (
          ${teamData.organizationId},
          ${teamId},
          ${`${teamData.name} Check-in`},
          ${`Regular ${teamData.cadence} check-in meeting for ${teamData.name}`},
          ${scheduledDate},
          'Planning',
          'check_in',
          '[]'::jsonb
        )
        ON CONFLICT (organization_id, team_id, scheduled_date)
        DO NOTHING
        RETURNING id
      `);
      
      // If a row was returned, it was created
      if (result.rows && result.rows.length > 0) {
        const newId = (result.rows[0] as any).id;
        createdIds.push(newId);
        if (DEBUG) {
          console.log(`✅ Created meeting #${newId} on ${scheduledDate.toISOString()}`);
        }
      }
    } catch (error: any) {
      console.error(`❌ Failed to create meeting:`, error.message);
    }
  }
  
  const createdCount = createdIds.length;
  
  if (DEBUG) {
    console.log(`🎯 Generated ${createdCount} new meetings for team ${teamId} (${createdIds.length} IDs returned, ${skippedDuplicates.length} skipped as duplicates)`);
    if (skippedDuplicates.length > 0) {
      console.log(`   Skipped local-day duplicates: ${skippedDuplicates.map(d => d.localDateKey).join(', ')}`);
    }
  }
  
  return { createdCount, createdIds, preview };
}

/**
 * Dry run to preview meeting generation without database writes
 * @param teamConfig Mock team configuration for testing
 * @param from Start date
 * @param to End date
 * @returns Preview array of ISO date strings with local and UTC times
 */
export function dryRunMeetingGeneration(
  teamConfig: {
    name: string;
    cadence: string;
    timezone?: string;  // T2: Optional, will use org timezone
    meeting_time?: string;  // Fixed: snake_case to match database field
    meeting_anchor_dow?: number;
    meeting_anchor_week_of_month?: number;
    meeting_anchor_day_of_month?: number;
    meeting_anchor_month?: number;
  },
  from: Date,
  to: Date
): { local: string; utc: string }[] {
  if (DEBUG) {
    console.log(`🧪 DRY RUN: ${teamConfig.name} (${teamConfig.cadence})`);
  }
  
  // T2: Use org timezone instead of team timezone
  const timezone = getOrgTimezone();
  const dates = calculateMeetingDates(teamConfig, from, to, timezone);
  
  // Parse meeting time for local display (using snake_case field)
  const [hours, minutes] = (teamConfig.meeting_time || '09:00:00').split(':').map(Number);
  
  const preview = dates.slice(0, 3).map(utcDate => {
    // Convert UTC back to local for display
    const localFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const localStr = localFormatter.format(utcDate).replace(/[\/,]/g, '-').replace(' ', 'T');
    
    return {
      local: localStr,
      utc: utcDate.toISOString()
    };
  });
  
  if (DEBUG) {
    console.log(`   Cadence: ${teamConfig.cadence}`);
    console.log(`   Timezone: ${timezone} (org-level)`);
    console.log(`   Anchors: dow=${teamConfig.meeting_anchor_dow}, week=${teamConfig.meeting_anchor_week_of_month}, day=${teamConfig.meeting_anchor_day_of_month}, month=${teamConfig.meeting_anchor_month}`);
    console.log(`   Preview (first 3):`);
    preview.forEach(p => {
      console.log(`     Local: ${p.local}, UTC: ${p.utc}`);
    });
  }
  
  return preview;
}

/**
 * Calculate next N meeting dates for preview (client-side compatible logic)
 */
export function previewNextMeetings(
  teamData: any,
  count: number = 8
): Date[] {
  const from = new Date();
  const to = new Date(from.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year ahead
  // T2: Use org timezone exclusively
  const timezone = getOrgTimezone();
  
  const dates = calculateMeetingDates(teamData, from, to, timezone);
  return dates.slice(0, count);
}