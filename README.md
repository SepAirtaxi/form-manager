# Copenhagen AirTaxi Form Manager (CATFM)

A comprehensive web-based application designed for aircraft maintenance form management at Copenhagen AirTaxi / CAT Flyservice.

## Project Overview

The Form Manager is a robust solution for creating, managing, completing, and submitting structured forms within an aircraft maintenance environment. The application features:

- **Role-Based Access Control**: Different permissions for employees, managers, and administrators
- **Admin Backend**: For creating, editing, and managing form templates with revision control
- **User Frontend**: For certifying staff to complete forms on tablets or PCs in the workshop
- **Draft Functionality**: Users can save incomplete forms and continue later
- **PDF Generation**: Outputs completed forms as professionally formatted PDFs
- **Email Integration**: Automatically emails completed forms to management

## Key Features

### User Management
- Role-based access control (Employee, Manager, Admin)
- Secure authentication using Firebase
- Admin user management interface

### Form Creation and Management
- Intuitive form builder with block-based system:
  - Group Blocks (sections)
  - Field Blocks (various input types)
  - Signature Blocks
- Form versioning with major/minor revisions
- Draft saving for form templates
- Department/metadata tagging for organization

### Form Completion
- User-friendly interface optimized for workshop environments
- Save-as-draft functionality for users
- Digital signature integration
- Form validation
- Professional PDF output

### Dashboard Interfaces
- **Admin Dashboard**: Manage forms, signatures, users, and company settings
- **User Dashboard**: View available forms, drafts, and submission history

## Technical Architecture

- **Frontend**: React.js with Material-UI components
- **Authentication**: Firebase Authentication with custom role management
- **Database**: Firebase Firestore
- **Storage**: Base64 encoding for signatures and images
- **PDF Generation**: jsPDF library
- **Forms Structure**: Block-based system with hierarchical organization

## Implementation Details

### Authentication System
The application uses Firebase Authentication with a custom role management system stored in Firestore. Three roles are supported:
- **Employee**: Can fill out forms and save drafts
- **Manager**: Can create/edit forms and manage signatures
- **Admin**: Full access, including user management

### Form Editor
The form editor allows managers and admins to:
- Create new forms with various field types
- Organize forms using group blocks
- Add digital signature fields
- Control form versioning with major/minor revisions
- Save drafts during form design

### User Interface
- Clean, modern Material-UI design
- Responsive layout for both desktop and tablet use
- Clear navigation between components
- Intuitive form completion process

### Data Storage
- All form templates, submissions, user roles, and company settings stored in Firestore
- Signatures stored as Base64-encoded images directly in the database
- Proper indexing for efficient queries


## Project Status: Copenhagen AirTaxi Form Manager
### Current Implementation Progress

Authentication & User Management

Enhanced authentication system with role-based access (employee/manager/admin)
Login is now the entry point for all users
Required components created: AuthContext, RoleProtectedRoute, Login, UserManager


### Admin Features

Admin dashboard with role-based interface
Only admins can access user management
Only managers and admins can access signature and company settings


### User Features

User dashboard showing available forms, drafts, and recent submissions
Form viewer supports saving drafts and resuming work later


### Database Structure

Firestore collections set up for forms, users, submissions, and signatures
Security rules updated to require authentication


### Current Issues

Some Firestore queries require additional composite indexes (error messages with index creation links appear)
Users need proper role assignment in the Firestore "users" collection to access appropriate features

### Next Steps

- Complete any missing composite indexes for Firestore queries

### Test the complete form lifecycle:
- Create a form as an admin/manager
- Fill out the form as a user
- Save it as a draft
- Resume and submit the form

### Verify role-based permissions work correctly
- Test form PDF generation and email functionality.

All core components for the enhanced user role system have been implemented. The application now supports a streamlined workflow with draft functionality and proper role-based access control.


## Setup and Deployment

### Prerequisites
- Node.js and npm
- Firebase account

### Installation
1. Clone the repository
2. Install dependencies:
   ```
   npm install react-router-dom@6.3.0 --legacy-peer-deps
   npm install firebase@11.5.0 @material-ui/core@4.12.4 @material-ui/icons@4.11.3 @material-ui/lab@4.0.0-alpha.61 jspdf@3.0.1 jspdf-autotable@5.0.2 --legacy-peer-deps
   ```
3. Configure Firebase settings in `src/firebase.js`
4. Start the development server:
   ```
   npm start
   ```

## About

Developed for Copenhagen AirTaxi / CAT Flyservice to streamline aircraft maintenance documentation processes and ensure regulatory compliance. The application helps maintain industry standards while significantly reducing paperwork and improving operational efficiency.


