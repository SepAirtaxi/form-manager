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

This project is currently in early development stage. The foundational code has been written for all key components, but we're still working on:

1. Setting up the development environment
2. Resolving dependency and syntax issues
3. Connecting to Firebase services
4. Testing core functionality

## Project Structure

- **src/** - Root source directory
  - **components/** - UI components
    - **admin/** - Admin interface components
      - AdminDashboard.js
      - FormEditor.js
      - BlockEditor.js
      - SignatureManager.js
      - CompanySettings.js
    - **user/** - User interface components
      - FormList.js
      - FormViewer.js
    - **common/** - Shared components
    - **auth/** - Authentication components
      - Login.js
      - ProtectedRoute.js
  - **contexts/** - React contexts
    - AuthContext.js
  - **services/** - Firebase and utility services
    - formService.js
    - pdfService.js
    - emailService.js
  - **firebase.js** - Firebase configuration
  - **App.js** - Main application component
  - **routes.js** - Application routing

## Core Functionality

- **Form Creation**: Build forms with hierarchical blocks (sections, fields, signatures)
- **Form Management**: Version control with major/minor revisions
- **Signature Management**: Manage authorized signatories with signature images
- **Form Completion**: User-friendly interface for completing forms in the workshop
- **PDF Output**: Professional formatting of completed forms
- **Email Delivery**: Automatic delivery to management

## Setup Instructions (Coming Soon)

Detailed setup instructions will be provided once the development environment issues are resolved.

## Future Features

- Offline functionality for workshop environments
- Form submission history and reporting
- More field types and validation options
- Mobile optimizations for tablet usage

## About

Developed for Copenhagen AirTaxi / CAT Flyservice to streamline aircraft maintenance documentation processes and ensure regulatory compliance.
