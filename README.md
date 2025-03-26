# Copenhagen AirTaxi Form Manager (CATFM)

A web-based application designed for aircraft maintenance form management at Copenhagen AirTaxi / CAT Flyservice.

## Project Overview

The Form Manager is a comprehensive solution for creating, managing, completing, and submitting structured forms within an aircraft maintenance environment. The application features:

- **Admin Backend**: For creating, editing, and managing form templates with revision control
- **User Frontend**: For certifying staff to complete forms on tablets or PCs in the workshop environment
- **PDF Generation**: Outputs completed forms as professionally formatted PDFs
- **Email Integration**: Automatically emails completed forms to management

## Technical Architecture

- **Frontend**: React.js with Material-UI components
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **PDF Generation**: jsPDF library
- **Form Structure**: Block-based system (Group, Field, and Signature blocks)

## Current Development Status

The project has made significant progress with many of the core features implemented:

1. **Firebase Integration**: Complete setup with authentication, Firestore database, and necessary indices
2. **User Authentication System**: Implemented with role-based access control (Employee, Manager, Admin)
3. **Admin Dashboard**: Fully functional with form management capabilities
4. **Form Editor**: Complete with support for hierarchical group blocks, fields, and signature blocks
5. **Signature Manager**: Fully implemented with Base64 image storage
6. **Company Settings**: Complete with company information and logo management
7. **User Dashboard**: Functional with display of available forms and drafts
8. **Form Viewer**: Enhanced with tab-based navigation for sections/group blocks

Recent enhancements include:
- Hierarchical group block functionality for better form organization
- Tab-based navigation in the form viewer for improved user experience on complex forms
- Visual indicators for form section completion status

## Next Steps for Development

The following areas are targeted for future development:

1. **Testing and Refinement**:
   - Thorough testing of the group block functionality
   - Ensure proper validation across form sections
   - Test the form submission workflow end-to-end

2. **PDF Generation Enhancement**:
   - Improve PDF template design
   - Ensure proper data mapping from form sections
   - Add company branding to generated PDFs

3. **Reporting and Analytics**:
   - Add form submission analytics
   - Create management reporting features
   - Implement submission history and tracking

4. **User Experience Improvements**:
   - Add progress indicators for form completion
   - Improve mobile responsiveness
   - Implement offline capabilities for workshop environments

5. **Additional Features**:
   - Form templates for commonly used forms
   - Bulk operations for form management
   - Enhanced search and filtering capabilities

## Project Structure

- **src/** - Root source directory
  - **components/** - UI components
    - **admin/** - Admin interface components
    - **user/** - User interface components
    - **common/** - Shared components (including Navigation)
    - **auth/** - Authentication components
  - **contexts/** - React contexts
  - **services/** - Firebase and utility services
  - **firebase.js** - Firebase configuration

## About

Developed for Copenhagen AirTaxi / CAT Flyservice to streamline aircraft maintenance documentation processes and ensure regulatory compliance.
