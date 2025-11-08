import { Router, Response } from 'express';
import { authenticateToken } from '../auth.js';
import { storage } from '../storage.js';

const router = Router();

// Custom request type with user property
interface AuthRequest {
  user?: {
    id: number;
    organizationId: number;
    role: string;
  };
  params: any;
  body: any;
  query: any;
}

// GET /api/teams - List teams for organization
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const teams = await storage.getTeams(organizationId);
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// PATCH /api/teams/:id - Update team including cadence settings
router.patch('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    
    // Verify team belongs to organization
    const teams = await storage.getTeams(organizationId);
    const team = teams.find((t: any) => t.id === teamId);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Transform cadenceSettings to individual fields if provided
    const updateData = { ...req.body };
    if (req.body.cadenceSettings) {
      const cs = req.body.cadenceSettings;
      updateData.cadence = cs.meetingFrequency || cs.cadence || 'weekly';
      updateData.meetingTime = cs.timeOfDay || cs.meetingTime || '10:00';
      if (cs.dayOfWeek !== undefined) {
        const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        updateData.weeklyWeekday = days[cs.dayOfWeek] || 'mon';
      }
      updateData.defaultMeetingLengthMinutes = String(cs.duration || 60);
      delete updateData.cadenceSettings;
    }
    
    // Update team
    const updated = await storage.updateTeam(teamId, updateData);
    
    // Transform back to include cadenceSettings for response
    const response = {
      ...updated,
      cadenceSettings: {
        enabled: true,
        meetingFrequency: updated.cadence,
        timeOfDay: updated.meetingTime,
        dayOfWeek: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(updated.weeklyWeekday),
        duration: parseInt(updated.defaultMeetingLengthMinutes || '60')
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// POST /api/teams/:id/generate-meetings - Generate meetings for a team
router.post('/:id/generate-meetings', authenticateToken, async (req: any, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    
    // Verify team belongs to organization
    const teams = await storage.getTeams(organizationId);
    const team = teams.find((t: any) => t.id === teamId);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Construct cadence settings from team fields
    const cadenceSettings = {
      enabled: true,
      meetingFrequency: team.cadence || 'weekly',
      timeOfDay: team.meetingTime || '10:00',
      dayOfWeek: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(team.weeklyWeekday || 'mon'),
      duration: parseInt(team.defaultMeetingLengthMinutes || '60'),
      monthlyRuleType: team.monthlyRuleType,
      monthlyNth: team.monthlyNth,
      monthlyWeekday: team.monthlyWeekday,
      monthlyDayOfMonth: team.monthlyDayOfMonth,
      periodRuleType: team.periodRuleType,
      periodNth: team.periodNth,
      periodWeekday: team.periodWeekday
    };
    
    // Generate meetings based on cadence settings
    const meetings = await storage.generateMeetingsForTeam(teamId, cadenceSettings);
    res.json({ message: 'Meetings generated successfully', count: meetings.length });
  } catch (error) {
    console.error('Error generating meetings:', error);
    res.status(500).json({ error: 'Failed to generate meetings' });
  }
});

export default router;