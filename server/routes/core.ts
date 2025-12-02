import { Router, Request, Response } from 'express';
import { authenticateToken } from '../auth.js';
import { storage } from '../storage.js';
import { ObjectStorageService, ObjectNotFoundError } from '../objectStorage.js';
import { z } from 'zod';

const router = Router();
console.log('🎯 Core.ts router created');

console.log('🔧 Core routes module loaded');

// Add route-level debugging
router.use('*', (req, res, next) => {
  console.log('📍 Core route hit:', req.method, req.originalUrl, req.path);
  next();
});

// Test route to verify routes are working
router.get('/test', (req, res) => {
  console.log('🧪 Test route hit');
  res.json({ message: 'Core routes are working!' });
});

// Using any for request type to avoid tsx compilation issues

console.log('🚨🚨🚨 CORE ROUTES FILE LOADED - TIMESTAMP:', new Date().toISOString());

// Helper function to check if user is admin
const isAdmin = (role: string): boolean => {
  return ['super_admin', 'admin'].includes(role);
};

// Helper function to get user's teams for visibility filtering
const getUserTeamIds = async (userId: number): Promise<number[]> => {
  const userTeams = await storage.getUserTeams(userId);
  return userTeams.map(t => t.id);
};

// =====================================
// PEOPLE (USERS) ENDPOINTS
// =====================================

// GET /api/core/users - List users with visibility controls
router.get('/users', authenticateToken, async (req: any, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const userRole = req.user?.role || 'team_member';
    const userId = req.user?.id;
    const { q: search, teamId } = req.query;

    let users = await storage.getUsers(organizationId);

    // Apply search filter if provided
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      users = users.filter(user => 
        user.fullName?.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      );
    }

    // Apply team filter if provided
    if (teamId) {
      const teamMembers = await storage.getTeamMembers(parseInt(teamId as string));
      const teamUserIds = teamMembers.map(tm => tm.userId);
      users = users.filter(user => teamUserIds.includes(user.id));
    }

    // Fetch team memberships for each user
    const allTeams = await storage.getTeams(organizationId);
    const usersWithTeams = await Promise.all(users.map(async (user) => {
      const userTeamMemberships = [];
      
      for (const team of allTeams) {
        const members = await storage.getTeamMembers(team.id);
        const membership = members.find(m => m.userId === user.id);
        if (membership) {
          userTeamMemberships.push({
            id: team.id,
            name: team.name,
            role: membership.role
          });
        }
      }
      
      return {
        ...user,
        teams: userTeamMemberships
      };
    }));

    res.json(usersWithTeams);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/core/users - Create new user (admin only)
router.post('/users', authenticateToken, async (req: any, res: Response) => {
  try {
    const userRole = req.user?.role || 'team_member';
    const organizationId = req.user?.organizationId;
    
    // Check permissions
    if (!isAdmin(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to create users' });
    }
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }
    
    // Validate input
    const createUserSchema = z.object({
      email: z.string().email('Invalid email format'),
      fullName: z.string().min(1, 'Full name is required').max(255),
      password: z.string().min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
      role: z.enum(['admin', 'manager', 'team_member']).default('team_member'),
      userType: z.enum(['human', 'agent']).default('human'),
      organizationId: z.number().optional(), // Allow super admins to specify org
      teamIds: z.array(z.number()).optional(),
      teamRoles: z.record(z.string(), z.enum(['Leader', 'Member', 'Watcher'])).optional()
    });
    
    const validatedData = createUserSchema.parse(req.body);
    
    // Determine which organization to use
    let targetOrgId = organizationId;
    if (userRole === 'super_admin' && validatedData.organizationId) {
      targetOrgId = validatedData.organizationId;
    }
    
    // Check if email already exists in organization
    const existingUsers = await storage.getUsers(targetOrgId);
    const emailExists = existingUsers.some(u => u.email.toLowerCase() === validatedData.email.toLowerCase());
    
    if (emailExists) {
      return res.status(409).json({ error: 'A user with this email already exists in this organization' });
    }
    
    // Import bcrypt for password hashing
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(validatedData.password, 12);
    
    // Create the user
    const newUser = await storage.createUser({
      email: validatedData.email,
      fullName: validatedData.fullName,
      username: validatedData.email, // Use email as username
      passwordHash,
      role: validatedData.role,
      userType: validatedData.userType,
      organizationId: targetOrgId,
      isActive: true,
      isEmailVerified: false,
      invitationAccepted: true, // Admin-created users are considered accepted
    });
    
    // Add team memberships if provided
    if (validatedData.teamIds && validatedData.teamIds.length > 0) {
      for (const teamId of validatedData.teamIds) {
        const role = validatedData.teamRoles?.[teamId.toString()] || 'Member';
        try {
          await storage.addTeamMember({ teamId, userId: newUser.id, role });
        } catch (err) {
          console.error(`Failed to add user to team ${teamId}:`, err);
          // Continue with other teams even if one fails
        }
      }
    }
    
    // Return created user (without sensitive data)
    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
      organizationId: newUser.organizationId,
      isActive: newUser.isActive,
      teams: validatedData.teamIds || []
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PATCH /api/core/users/:id - Update user (admin only)
router.patch('/users/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const userRole = req.user?.role || 'team_member';
    const organizationId = req.user?.organizationId;
    
    // Check permissions
    if (!isAdmin(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to update users' });
    }
    
    const userId = parseInt(req.params.id);
    
    // Validate input
    const updateUserSchema = z.object({
      fullName: z.string().min(1, 'Full name is required').max(255).optional(),
      role: z.enum(['super_admin', 'admin', 'manager', 'team_member']).optional(),
      userType: z.enum(['human', 'agent']).optional(),
      canAssignTickets: z.boolean().optional(),
      splynxAdminId: z.number().nullable().optional(),
      isActive: z.boolean().optional(),
      newPassword: z.string().min(8, 'Password must be at least 8 characters long').optional()
    });
    
    const validatedData = updateUserSchema.parse(req.body);
    
    // Check if user exists and is in same organization
    const targetUser = await storage.getUser(userId);
    if (!targetUser || targetUser.organizationId !== organizationId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent regular admins from updating super admins
    if (targetUser.role === 'super_admin' && userRole !== 'super_admin') {
      return res.status(403).json({ error: 'Cannot update super admin' });
    }
    
    // Prepare update data
    const updateData: any = {};
    if (validatedData.fullName !== undefined) updateData.fullName = validatedData.fullName;
    if (validatedData.role !== undefined) updateData.role = validatedData.role;
    if (validatedData.userType !== undefined) updateData.userType = validatedData.userType;
    if (validatedData.canAssignTickets !== undefined) updateData.canAssignTickets = validatedData.canAssignTickets;
    if (validatedData.splynxAdminId !== undefined) updateData.splynxAdminId = validatedData.splynxAdminId;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
    
    // Handle password update if provided
    if (validatedData.newPassword) {
      const bcrypt = await import('bcrypt');
      updateData.passwordHash = await bcrypt.hash(validatedData.newPassword, 12);
    }
    
    // Update the user
    const updatedUser = await storage.updateUser(userId, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return updated user (without sensitive data)
    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      role: updatedUser.role,
      userType: updatedUser.userType,
      organizationId: updatedUser.organizationId,
      isActive: updatedUser.isActive,
      canAssignTickets: updatedUser.canAssignTickets
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// PATCH /api/core/users/:id/role - Update user role (admin only)
router.patch('/users/:id/role', authenticateToken, async (req: any, res: Response) => {
  try {
    const userRole = req.user?.role || 'team_member';
    
    if (!isAdmin(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const userId = parseInt(req.params.id);
    const { role } = z.object({
      role: z.enum(['super_admin', 'admin', 'manager', 'team_member', 'customer'])
    }).parse(req.body);

    const updatedUser = await storage.updateUser(userId, { role });
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ id: updatedUser.id, role: updatedUser.role });
  } catch (error) {
    console.error('Error updating user role:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid role', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// PATCH /api/core/users/:id/organization - Update user organization (super admin only)
router.patch('/users/:id/organization', authenticateToken, async (req: any, res: Response) => {
  try {
    const userRole = req.user?.role || 'team_member';
    
    if (userRole !== 'super_admin') {
      return res.status(403).json({ error: 'Only super admins can change user organizations' });
    }

    const userId = parseInt(req.params.id);
    const { organizationId } = z.object({
      organizationId: z.number()
    }).parse(req.body);

    // Verify the organization exists
    const organization = await storage.getOrganization(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Update the user's organization
    const updatedUser = await storage.updateUser(userId, { organizationId });
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove user from teams in old organization (teams are org-specific)
    const teams = await storage.getTeams(updatedUser.organizationId || 0);
    for (const team of teams) {
      await storage.removeTeamMember(team.id, userId);
    }

    res.json({ 
      id: updatedUser.id, 
      organizationId: updatedUser.organizationId,
      organizationName: organization.name 
    });
  } catch (error) {
    console.error('Error updating user organization:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid organization ID', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update user organization' });
  }
});

// DELETE /api/core/users/:id - Delete user (admin only)
router.delete('/users/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const userRole = req.user?.role || 'team_member';
    const targetUserId = parseInt(req.params.id);
    const requestingUserId = req.user?.id;
    const organizationId = req.user?.organizationId;
    
    // Check permissions - only admins can delete users
    if (!isAdmin(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to delete users' });
    }
    
    // Prevent users from deleting themselves
    if (targetUserId === requestingUserId) {
      return res.status(400).json({ error: 'Cannot delete your own user account' });
    }
    
    // Check if target user exists and is in same organization (unless super admin)
    const targetUser = await storage.getUser(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (userRole !== 'super_admin' && targetUser.organizationId !== organizationId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent regular admins from deleting super admins
    if (userRole !== 'super_admin' && targetUser.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot delete super admin users' });
    }
    
    // Delete the user
    const success = await storage.deleteUser(targetUserId);
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`User ${targetUserId} "${targetUser.fullName}" deleted by user ${requestingUserId}`);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// POST /api/core/users/:id/reset-password - Reset user password (admin only)
router.post('/users/:id/reset-password', authenticateToken, async (req: any, res: Response) => {
  try {
    const userRole = req.user?.role || 'team_member';
    const targetUserId = parseInt(req.params.id);
    const requestingUserId = req.user?.id;
    const organizationId = req.user?.organizationId;
    
    // Check permissions - only admins can reset passwords
    if (!isAdmin(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to reset passwords' });
    }
    
    // Validate input
    const { password } = z.object({
      password: z.string().min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
    }).parse(req.body);
    
    // Check if target user exists and is in same organization
    const targetUser = await storage.getUser(targetUserId);
    if (!targetUser || targetUser.organizationId !== organizationId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent regular admins from resetting super admin passwords
    if (targetUser.role === 'super_admin' && userRole !== 'super_admin') {
      return res.status(403).json({ error: 'Cannot reset super admin password' });
    }
    
    // Import bcrypt for password hashing
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Update the user's password
    const updatedUser = await storage.updateUser(targetUserId, { passwordHash });
    
    if (!updatedUser) {
      return res.status(500).json({ error: 'Failed to update password' });
    }
    
    // Log the password reset action
    await storage.logActivity({
      organizationId,
      userId: requestingUserId,
      actionType: 'status_change' as const,
      entityType: 'user',
      entityId: targetUserId,
      description: `Password reset for user ${targetUser.email}`,
      metadata: { 
        targetUserId,
        targetEmail: targetUser.email,
        performedBy: req.user?.email 
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Password has been reset successfully' 
    });
  } catch (error) {
    console.error('Error resetting user password:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid password', 
        details: error.errors.map(e => e.message).join(', ')
      });
    }
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// =====================================
// TEAMS ENDPOINTS
// =====================================

// GET /api/core/teams - List teams with visibility controls
router.get('/teams', authenticateToken, async (req: any, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const userRole = req.user?.role || 'team_member';
    const userId = req.user?.id;
    const { q: search, orgId } = req.query;

    let teams;
    
    // Super admins can see all teams or filter by organization
    if (userRole === 'super_admin') {
      if (orgId && orgId !== 'all') {
        teams = await storage.getTeamsWithOrganizations(parseInt(orgId as string));
      } else {
        teams = await storage.getTeamsWithOrganizations();
      }
    } else {
      // Regular users only see their organization's teams
      teams = await storage.getTeamsWithOrganizations(organizationId);
    }

    // Apply search filter if provided
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      teams = teams.filter(team => 
        team.name.toLowerCase().includes(searchTerm) ||
        team.organizationName?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply visibility rules for non-admins
    if (!isAdmin(userRole) && userId) {
      const userTeamIds = await getUserTeamIds(userId);
      teams = teams.filter(team => userTeamIds.includes(team.id));
    }

    // Add member count to each team
    const teamsWithCounts = await Promise.all(teams.map(async (team) => {
      const members = await storage.getTeamMembers(team.id);
      return {
        ...team,
        memberCount: members.length
      };
    }));

    res.json(teamsWithCounts);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// POST /api/core/teams - Create team (admin only)
router.post('/teams', authenticateToken, async (req: any, res: Response) => {
  const userRole = req.user?.role || 'team_member';
  const userOrgId = req.user?.organizationId || 3;
  
  if (!isAdmin(userRole)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  try {
    const createTeamSchema = z.object({
      organizationId: z.number().optional(),
      name: z.string().min(1).max(120),
      cadence: z.enum(['daily', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'half_yearly', 'annual']).default('weekly')
    });

    const validatedData = createTeamSchema.parse(req.body);
    
    // Determine which organization to use
    let targetOrgId = userOrgId;
    if (userRole === 'super_admin' && validatedData.organizationId) {
      targetOrgId = validatedData.organizationId;
    }

    const team = await storage.createTeam({
      organizationId: targetOrgId,
      name: validatedData.name,
      cadence: validatedData.cadence
    });

    res.json(team);
  } catch (error) {
    console.error('Error creating team:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    // Handle duplicate team name error
    if ((error as any).code === '23505' && (error as any).constraint === 'uq_teams_org_name') {
      const teamName = req.body.name || 'This team';
      return res.status(409).json({ 
        error: `A team named "${teamName}" already exists in this organisation. Please choose a different name.` 
      });
    }
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// PATCH /api/core/teams/:id - Update team (admin only)
router.patch('/teams/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const userRole = req.user?.role || 'team_member';
    
    if (!isAdmin(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const teamId = parseInt(req.params.id);
    const updateData = z.object({
      name: z.string().min(1).max(120).optional(),
      cadence: z.enum(['daily', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'half_yearly', 'annual']).optional(),
      timezone: z.string().optional(),
      meetingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      weeklyWeekday: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).optional(),
      monthlyRuleType: z.enum(['nth_weekday', 'day_of_month']).optional(),
      monthlyNth: z.enum(['1', '2', '3', '4', 'last']).optional(),
      monthlyWeekday: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).optional(),
      monthlyDayOfMonth: z.number().min(1).max(31).optional(),
      periodRuleType: z.enum(['nth_weekday']).optional(),
      periodNth: z.enum(['1', '2', '3', '4', 'last']).optional(),
      periodWeekday: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).optional(),
      defaultMeetingLengthMinutes: z.enum(['15', '30', '45', '60']).optional()
    }).parse(req.body);

    console.log('📝 Update data after Zod parsing:', updateData);
    const team = await storage.updateTeam(teamId, updateData);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(team);
  } catch (error) {
    console.error('Error updating team:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// DELETE /api/core/teams/:id - Delete team (admin only)
router.delete('/teams/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const userRole = req.user?.role || 'team_member';
    
    if (!isAdmin(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const teamId = parseInt(req.params.id);
    const success = await storage.deleteTeam(teamId);
    
    if (!success) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// PATCH /api/core/teams/:id/organization - Update team organization (super admin only)
router.patch('/teams/:id/organization', authenticateToken, async (req: any, res: Response) => {
  try {
    const userRole = req.user?.role || 'team_member';
    
    if (userRole !== 'super_admin') {
      return res.status(403).json({ error: 'Only super admins can change team organisations' });
    }

    const teamId = parseInt(req.params.id);
    const { organizationId } = z.object({
      organizationId: z.number()
    }).parse(req.body);

    // Get the current team details
    const currentTeam = await storage.getTeam(teamId);
    if (!currentTeam) {
      console.error('Team not found with ID:', teamId);
      return res.status(404).json({ error: 'Team not found' });
    }
    
    console.log('Current team:', currentTeam.name, 'Org:', currentTeam.organizationId, '→', organizationId);

    // If organization isn't changing, just return success
    if (currentTeam.organizationId === organizationId) {
      console.log('Organization not changing, returning success');
      return res.json({ 
        id: currentTeam.id, 
        organizationId: currentTeam.organizationId,
        organizationName: currentTeam.organizationName 
      });
    }

    // Verify the organization exists
    const organization = await storage.getOrganization(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organisation not found' });
    }

    // Check if a team with the same name exists in the target organization
    const existingTeams = await storage.getTeamsWithOrganizations(organizationId);
    const duplicateTeam = existingTeams.find(t => 
      t.name.toLowerCase() === currentTeam.name.toLowerCase() && t.id !== teamId
    );
    
    if (duplicateTeam) {
      return res.status(409).json({ 
        error: `A team named "${currentTeam.name}" already exists in ${organization.name}. Please rename the team before moving it.` 
      });
    }

    // Update the team's organization
    const updatedTeam = await storage.updateTeam(teamId, { organizationId });
    
    if (!updatedTeam) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Remove all team members when changing organization
    const members = await storage.getTeamMembers(teamId);
    for (const member of members) {
      await storage.removeTeamMember(teamId, member.userId);
    }

    res.json({ 
      id: updatedTeam.id, 
      organizationId: updatedTeam.organizationId,
      organizationName: organization.name 
    });
  } catch (error) {
    console.error('Error updating team organization:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid organisation ID', details: error.errors });
    }
    // Handle database constraint errors
    if ((error as any).code === '23505' && (error as any).constraint === 'uq_teams_org_name') {
      return res.status(409).json({ 
        error: 'A team with this name already exists in the target organisation' 
      });
    }
    res.status(500).json({ error: 'Failed to update team organisation' });
  }
});

// =====================================
// TEAM MEMBERS ENDPOINTS
// =====================================

// GET /api/core/teams/:id/members - Get team members
router.get('/teams/:id/members', authenticateToken, async (req: any, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    const userRole = req.user?.role || 'team_member';
    const userId = req.user?.id;
    const organizationId = req.user?.organizationId || 3;

    // Check visibility - admins can see all teams, non-admins only their teams
    if (!isAdmin(userRole) && userId) {
      const userTeamIds = await getUserTeamIds(userId);
      if (!userTeamIds.includes(teamId)) {
        return res.status(403).json({ error: 'Access denied to this team' });
      }
    }

    const members = await storage.getTeamMembers(teamId);
    
    // Fetch user details for each member
    const allUsers = await storage.getUsers(organizationId);
    const membersWithDetails = members.map(member => {
      const user = allUsers.find(u => u.id === member.userId);
      return {
        userId: member.userId,
        role: member.role,
        fullName: user?.fullName || 'Unknown User',
        email: user?.email || 'unknown@email.com'
      };
    });
    
    res.json(membersWithDetails);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// POST /api/core/teams/:id/members - Add team member (admin only)
router.post('/teams/:id/members', authenticateToken, async (req: any, res: Response) => {
  try {
    const userRole = req.user?.role || 'team_member';
    
    if (!isAdmin(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const teamId = parseInt(req.params.id);
    const { userId, role } = z.object({
      userId: z.number(),
      role: z.enum(['Leader', 'Member', 'Watcher'])
    }).parse(req.body);

    const member = await storage.addTeamMember({ teamId, userId, role });

    res.json(member);
  } catch (error) {
    console.error('Error adding team member:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

// PATCH /api/core/teams/:id/members/:userId - Update member role (admin only)
router.patch('/teams/:id/members/:userId', authenticateToken, async (req: any, res: Response) => {
  try {
    const userRole = req.user?.role || 'team_member';
    
    if (!isAdmin(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const teamId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    const { role } = z.object({
      role: z.enum(['Leader', 'Member', 'Watcher'])
    }).parse(req.body);

    const member = await storage.updateTeamMember(teamId, userId, { role });
    
    if (!member) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    res.json(member);
  } catch (error) {
    console.error('Error updating team member:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

// DELETE /api/core/teams/:id/members/:userId - Remove team member (admin only)
router.delete('/teams/:id/members/:userId', authenticateToken, async (req: any, res: Response) => {
  try {
    const userRole = req.user?.role || 'team_member';
    
    if (!isAdmin(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const teamId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    
    const success = await storage.removeTeamMember(teamId, userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

// =====================================
// ORGANIZATION ENDPOINTS
// =====================================

// GET /api/core/organizations/list - Get list of all organizations (super admin only)
router.get('/organizations/list', authenticateToken, async (req: any, res: Response) => {
  try {
    const userRole = req.user?.role || 'team_member';
    
    // Only super admins can see all organizations
    if (userRole !== 'super_admin') {
      // Regular users only see their own organization
      const userOrg = await storage.getOrganization(req.user.organizationId);
      if (userOrg) {
        return res.json([{
          id: userOrg.id,
          name: userOrg.name
        }]);
      }
      return res.json([]);
    }
    
    // Super admins see all organizations
    const organizations = await storage.getOrganizations();
    const simplifiedOrgs = organizations.map(org => ({
      id: org.id,
      name: org.name,
      isActive: org.isActive
    }));
    
    res.json(simplifiedOrgs);
  } catch (error) {
    console.error('Error fetching organizations list:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// =====================================
// FILE UPLOAD ENDPOINTS
// =====================================

// GET /api/core/objects/* - Serve uploaded objects
router.get('/objects/*', async (req: any, res: Response) => {
  try {
    const objectPath = `/objects/${req.params[0]}`;
    console.log('📸 Serving object:', objectPath);
    const objectStorageService = new ObjectStorageService();
    
    // Get the object file
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    console.log('📸 Found object file:', objectFile.name);
    
    // Download the file to the response
    await objectStorageService.downloadObject(objectFile, res);
  } catch (error) {
    console.error('📸 Error serving object:', req.params[0], error);
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: 'Object not found' });
    } else {
      res.status(500).json({ error: 'Failed to serve object' });
    }
  }
});

// POST /api/core/objects/upload - Get presigned URL for avatar uploads
router.post('/objects/upload', authenticateToken, async (req: any, res: Response) => {
  try {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  } catch (error) {
    console.error('Error getting upload URL:', error);
    res.status(500).json({ error: 'Failed to get upload URL' });
  }
});

// PUT /api/core/user/avatar - Update user avatar URL
router.put('/user/avatar', authenticateToken, async (req: any, res: Response) => {
  const { avatarURL } = req.body;
  
  if (!avatarURL) {
    return res.status(400).json({ error: 'avatarURL is required' });
  }

  try {
    console.log('📸 Updating avatar for user:', req.user.id);
    console.log('📸 Raw avatar URL:', avatarURL);
    
    const objectStorageService = new ObjectStorageService();
    let objectPath: string;
    
    try {
      objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        avatarURL,
        {
          owner: req.user.id.toString(),
          visibility: "public", // Avatar images should be publicly accessible
        }
      );
    } catch (aclError) {
      console.error('📸 ACL policy error (non-fatal):', aclError);
      // If ACL fails, still try to extract the path
      objectPath = objectStorageService.normalizeObjectEntityPath(avatarURL);
    }
    
    console.log('📸 Normalized object path:', objectPath);
    
    // Ensure the path is valid before saving
    if (!objectPath || objectPath === avatarURL) {
      console.error('📸 Path normalization failed, using fallback extraction');
      // Fallback: Extract the UUID from the URL manually
      const match = avatarURL.match(/uploads\/([a-f0-9-]+)/);
      if (match) {
        objectPath = `/objects/uploads/${match[1]}`;
        console.log('📸 Fallback extracted path:', objectPath);
      } else {
        throw new Error('Could not extract valid object path from URL');
      }
    }

    // Update user avatar in database with explicit verification
    const updatedUser = await storage.updateUser(req.user.id, { avatarUrl: objectPath });
    
    if (!updatedUser || updatedUser.avatarUrl !== objectPath) {
      console.error('📸 Database update failed - avatar not saved correctly');
      throw new Error('Database update failed');
    }
    
    console.log('📸 Avatar successfully saved to database for user:', req.user.id);
    console.log('📸 Verified saved URL:', updatedUser.avatarUrl);

    res.json({ success: true, avatarUrl: objectPath });
  } catch (error) {
    console.error('📸 Error updating avatar:', error);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// =====================================
// USER PROFILE ENDPOINTS
// =====================================

// PATCH /api/core/user/profile - Update user profile
router.patch('/user/profile', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { fullName, email, avatarUrl, splynxAdminId, emailNotifications, pushNotifications, securityAlerts } = req.body;
    
    // Build update object with only provided fields
    const updateData: any = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (splynxAdminId !== undefined) updateData.splynxAdminId = splynxAdminId;
    
    // Update user in database
    const updatedUser = await storage.updateUser(userId, updateData);
    
    res.json({ 
      success: true,
      user: updatedUser 
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/core/user/activity - Get user activity logs
router.get('/user/activity', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.organizationId;
    
    const activities = await storage.getActivityLogs(
      organizationId,
      { 
        userId: userId,
        limit: 50 
      }
    );
    
    res.json(activities);
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

// GET /api/core/organizations/:id - Get organization details
router.get('/organizations/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const organizationId = parseInt(req.params.id);
    console.log(`📊 Fetching organization ${organizationId}`);
    
    // Fetch actual organization data from database
    const organization = await storage.getOrganization(organizationId);
    console.log(`📊 Organization data:`, organization);
    
    if (!organization) {
      console.log(`❌ Organization ${organizationId} not found`);
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    const response = {
      organization: {
        id: organization.id,
        name: organization.name
      }
    };
    console.log(`✅ Sending organization response:`, response);
    
    res.json(response);
  } catch (error) {
    console.error('❌ Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

export default router;