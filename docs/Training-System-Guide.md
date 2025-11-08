# Training System Guide

## Overview

The Training System in aimee.works is a comprehensive knowledge management and team training platform. It allows administrators to create training documents, assign them to team members, and track completion progress across the organization.

## Key Features

- **Document Management**: Create, edit, and organize training documents with rich text formatting
- **User Assignments**: Assign specific training documents to team members
- **Progress Tracking**: Monitor which team members have completed their assigned training
- **Due Dates**: Set deadlines for training completion
- **Status Tracking**: Track pending and completed assignments

## System Components

### 1. Training Documents

Training documents are created in the **Knowledge Base** section. These documents support:

- Rich text editing with formatting options
- Categories and tags for organization
- Status control (Draft, Published, Archived)
- Visibility settings (Public, Internal, Private)
- Estimated reading time
- Author tracking

### 2. Document Assignments

Administrators can assign training documents to specific users with:

- Due date setting
- Status tracking (Pending → Completed)
- Assignment notes
- Completion date recording

### 3. Team Progress Tracking

The Team Progress tab provides a comprehensive view of:

- All training assignments across the organization
- Per-user completion statistics
- Document-specific progress
- Overdue assignments
- Filtering by status and document

## How to Use the Training System

### For Administrators

#### Creating Training Documents

1. Navigate to **Knowledge Base** from the main menu
2. Click on the **Documents** tab
3. Click the **Create Document** button
4. Fill in the document details:
   - **Title**: Clear, descriptive title for the training
   - **Content**: Use the rich text editor to create your training material
   - **Categories**: Add relevant categories (e.g., "Onboarding", "Safety", "Procedures")
   - **Tags**: Add searchable tags
   - **Status**: Set to "Draft" while editing, "Published" when ready
   - **Visibility**: Choose who can see the document
5. Click **Save** to create the document

#### Assigning Training to Users

1. In the **Documents** tab, find the document you want to assign
2. Click the **Assign** button (person icon) on the document card
3. In the assignment dialog:
   - Select the user(s) to assign the training to
   - Set a due date (optional)
   - Add any assignment notes
4. Click **Assign Training** to create the assignment

#### Monitoring Team Progress

1. Navigate to the **Team Progress** tab (visible to admins only)
2. View all training assignments in your organization
3. Use filters to focus on:
   - **Status**: View pending or completed assignments
   - **Document**: Filter by specific training document
4. Review assignment details:
   - User name and email
   - Document title
   - Assignment status
   - Due date (if set)
   - Completion date (if completed)
5. Click on a document to view its full details

#### Managing Documents

**Editing Documents:**
- Click on any document card to open the editor
- Make your changes
- Save to update the document

**Deleting Documents:**
- Click the delete icon on a document card
- Confirm deletion (Note: This will also delete all assignments)

**Publishing Workflow:**
- Create documents in "Draft" status
- Review and finalize content
- Change status to "Published" when ready
- Published documents can still be edited

### For Team Members

#### Viewing Assigned Training

1. Navigate to **My Training** or **Training Personal**
2. View all training documents assigned to you
3. See assignment details:
   - Document title and description
   - Due date
   - Status (Pending/Completed)
   - Estimated reading time

#### Completing Training

1. Click on an assigned document to open it
2. Read through the training material
3. Mark the training as complete:
   - Click the **Mark as Complete** button
   - Confirm completion
4. The system records:
   - Completion timestamp
   - Your user ID
   - Updates your training progress

## Best Practices

### For Creating Effective Training Documents

1. **Clear Titles**: Use descriptive, searchable titles
2. **Structured Content**: Break content into logical sections with headings
3. **Visual Elements**: Use bullet points, numbered lists, and formatting for readability
4. **Categories**: Use consistent category names across related documents
5. **Estimated Time**: Set realistic reading time estimates
6. **Regular Updates**: Review and update documents periodically

### For Training Assignments

1. **Appropriate Due Dates**: Give team members adequate time to complete training
2. **Logical Grouping**: Assign related documents together
3. **Priority Setting**: Use due dates to indicate priority
4. **Follow-up**: Check Team Progress regularly for overdue assignments
5. **Communication**: Notify team members when new training is assigned

### For Document Organization

1. **Status Management**:
   - Use "Draft" for work-in-progress documents
   - Use "Published" for active training materials
   - Use "Archived" for outdated content (keeps history)

2. **Visibility Levels**:
   - **Public**: Available to all organization members
   - **Internal**: Restricted to specific roles
   - **Private**: Only visible to assigned users and admins

3. **Categories**:
   - Create a consistent category structure
   - Use categories like: "Onboarding", "Safety", "Compliance", "Skills", "Procedures"
   - Limit to 1-3 categories per document

## Integration with Other Systems

The Training System integrates with:

- **Onboarding System**: Training documents can be part of onboarding plans
- **Work Management**: Link training to specific objectives or tasks
- **User Management**: Leverages organization user directory
- **Activity Logs**: Tracks all document interactions

## API Endpoints (For Developers)

The Training System uses the following API structure:

```
GET    /api/knowledge-base/documents          # List all documents
POST   /api/knowledge-base/documents          # Create document
GET    /api/knowledge-base/documents/:id      # Get single document
PUT    /api/knowledge-base/documents/:id      # Update document
DELETE /api/knowledge-base/documents/:id      # Delete document

POST   /api/knowledge-base/documents/:id/assignments        # Assign to user
GET    /api/knowledge-base/documents/:id/assignments        # Get document assignments
PATCH  /api/knowledge-base/documents/:id/assignments/:aid   # Update assignment
DELETE /api/knowledge-base/documents/:id/assignments/:aid   # Remove assignment

GET    /api/knowledge-base/assignments        # Get all assignments
GET    /api/knowledge-base/team-progress      # Get team progress data
```

## Database Schema

Key tables:
- `knowledge_documents`: Stores training document content
- `document_assignments`: Tracks user assignments
- `knowledge_document_activity`: Logs document interactions
- `knowledge_document_versions`: Version history

## Troubleshooting

### Common Issues

**Documents not appearing:**
- Check the status filter (ensure it's not hiding your documents)
- Verify the document status is "Published"
- Check visibility settings

**Can't assign training:**
- Ensure you have admin role
- Verify the user exists in the organization
- Check that the document is published

**Team Progress tab not visible:**
- This tab is only visible to admin users
- Check your user role

**Assignments not tracking completion:**
- Ensure users are clicking "Mark as Complete"
- Verify the assignment exists in the database
- Check browser console for errors

## Future Enhancements

Planned features include:
- Training completion certificates
- Quiz/assessment integration
- Training paths and sequences
- Automated assignment based on role
- Email notifications for assignments
- Progress reports and analytics
- Training compliance tracking

## Support

For technical support or feature requests:
- Contact your system administrator
- Check the Developer Documentation
- Review system logs for error details
