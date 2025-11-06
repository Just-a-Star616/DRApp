# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a white-label, mobile-first driver recruitment application built with React, TypeScript, Vite, and Firebase. It supports two distinct applicant journeys:
- **Licensed drivers**: Already have taxi/PHV license - submit details, documents, and vehicle information
- **Unlicensed drivers**: Working towards license - track 5-step licensing progress with document uploads

The application includes real-time application tracking, optional document uploads (staff validation before dispatch system entry), vehicle management, and an admin dashboard for managing applications and sending notifications.

## Development Commands

**Frontend:**
```bash
npm run dev      # Start development server on http://0.0.0.0:3000
npm run build    # Build for production
npm run preview  # Preview production build
```

**Firebase Functions:**
```bash
cd functions
npm run serve    # Start Firebase emulators (functions only)
npm run shell    # Interactive functions shell
npm run deploy   # Deploy functions to Firebase
npm run logs     # View function logs
```

**Firebase Deployment:**
```bash
firebase deploy --only hosting  # Deploy hosting only
firebase deploy --only functions  # Deploy functions only
firebase deploy  # Deploy everything
```

## Architecture

### Authentication Flow
- Uses Firebase Auth with a hybrid approach:
  - **Anonymous authentication** for partial application saving (users can start applications without logging in)
  - **Email/password authentication** created when application is submitted
  - Anonymous accounts are linked to email/password credentials upon submission using `linkWithCredential`
- Authentication state managed in `App.tsx` via `onAuthStateChanged`
- `isAuthenticated` = logged in AND not anonymous

### Application Flow
The application supports two distinct user journeys:

**Licensed Driver Flow** (src/pages/ApplyWizard.tsx):
- 7-step wizard for drivers with existing taxi/PHV licenses
- Step 1: Personal details + license status check
- Step 2: Badge details (number, expiry, issuing council)
- Step 3: Driving license details
- Step 4: Document uploads (badge, license, insurance - all optional)
- Step 5: Vehicle ownership question (own vehicle vs fleet)
- Step 6: Vehicle details (conditional - only if own vehicle)
- Step 7: Review and submit
- All documents optional - validated by staff before dispatch system entry

**Unlicensed Driver Flow** (initially via ApplyWizard, then Status page):
- Initial signup captures basic details
- Status page (`src/pages/Status.tsx`) shows 5-step licensing checklist:
  1. Eligibility Check
  2. Enhanced DBS Check (with optional document upload)
  3. Medical Examination (with optional document upload)
  4. Knowledge & Safeguarding Test (with optional certificate upload)
  5. Council Application Submitted
- Progress tracked with visual indicators and percentage completion
- Can add vehicle details later if purchased after initial "fleet vehicle" selection

### Application State Management
- **Real-time sync**: Application data stored in Firestore (`applications` collection, keyed by user UID)
- **Multi-step wizard**: Licensed drivers use `ApplyWizard.tsx` with step tracking via `currentStep` field
- **Context**: Global state via `AppContext` defined in `src/contexts/AppContext.tsx`
  - Provides: `branding`, `statusSteps`, `application`, `isAuthenticated`, `currentUser`
  - Computed in `src/App.tsx` using `useMemo`
- **Firestore listeners**: Real-time updates using `onSnapshot` in `src/App.tsx`
  - Branding loaded via `getDocFromServer` (bypasses cache) on mount
  - Application synced in real-time per user

### White-Label Configuration
- Branding and status steps stored in Firestore `configs` collection (default document: `defaultConfig`)
- Configuration loaded via `getDocFromServer` (bypasses cache) in `src/App.tsx:29-54`
- Admin dashboard (`src/pages/AdminDashboard.tsx`) allows updating branding in real-time
- Branding cache issue: Uses server fetch to ensure latest branding is always loaded

### Document Upload Flow
**All documents are optional** - applicants can provide via platform, email, or in-person at face-to-face meetings. Staff validate all documents before entering details into dispatch system.

**Initial Upload (ApplyWizard.tsx)**:
1. Files selected via `FileUpload` component during application wizard
2. Uploaded to Firebase Storage on form submission
3. Download URLs stored in Firestore `documents` field

**Post-Submission Upload (Status.tsx)**:
1. Both licensed and unlicensed applicants can upload/update documents after submission
2. Upload handler in `Status.tsx:handleSaveChanges()` processes multiple files
3. Supports uploading:
   - Badge documents
   - Driving license
   - Insurance certificate
   - V5C logbook (optional)
   - PHV licence (optional)
   - DBS certificate (unlicensed)
   - Medical examination certificate (unlicensed)
   - Knowledge test certificate (unlicensed)
4. File naming pattern: `documents/{userId}/{timestamp}-{fileName}`
5. Real-time visibility to staff in AdminDashboard

### Routing
- Uses `HashRouter` for compatibility with static hosting
- Route protection logic in `src/App.tsx:166-179`:
  - Unauthenticated users redirected to `/home` or `/login`
  - Authenticated users redirected to `/status` when accessing public routes
  - Admin routes protected by `isAdmin` state (checks `admins` collection)
- Routes:
  - Public: `/home`, `/apply`, `/login`, `/forgot-password`, `/reset-password`
  - Protected: `/confirmation`, `/status`
  - Admin: `/admin/login`, `/admin/dashboard`

### Data Model
Key types in `src/types.ts`:

**Application Interface**:
- Personal details: firstName, lastName, email, phone, area
- License status: `isLicensedDriver` (boolean)
- Licensed driver fields:
  - Badge: badgeNumber, badgeExpiry, issuingCouncil
  - Driving license: drivingLicenseNumber, licenseExpiry
  - DBS: dbsCheckNumber (optional, for validation by staff)
- Unlicensed driver fields:
  - `unlicensedProgress`: Object tracking 5-step licensing journey
    - eligibilityChecked, dbsApplied, medicalBooked, knowledgeTestPassed, councilApplicationSubmitted
    - Document URLs: dbsDocumentUrl, medicalDocumentUrl, knowledgeTestDocumentUrl
- Vehicle ownership:
  - `hasOwnVehicle`: true (own), false (fleet), undefined (not specified)
  - vehicleMake, vehicleModel, vehicleReg, insuranceExpiry
- Documents object:
  - badgeDocumentUrl, drivingLicenseDocumentUrl, insuranceDocumentUrl
  - v5cDocumentUrl (optional), phvLicenceDocumentUrl (optional)
- Application tracking:
  - status: ApplicationStatus enum
  - currentStep: wizard step number (for licensed flow)
  - isPartial: boolean flag for incomplete applications
  - createdAt: timestamp

**ApplicationStatus Enum**:
Tracks administrative progress (separate from licensing progress for unlicensed):
- Submitted, Under Review, Contacted, Meeting Scheduled, Approved, Rejected

**BrandingConfig Interface**:
- companyName, logoUrl, primaryColor, tagline (optional)

### Firebase Cloud Functions
Located in `functions/index.js`:

**notifyNewApplication**: Firestore trigger that sends Google Chat notifications when new applications are submitted
- Only triggers for newly completed (non-partial) applications
- Requires `googlechat.webhook` environment config
- Configure via: `firebase functions:config:set googlechat.webhook="https://..."`

**sendPushNotification**: Firestore trigger that sends FCM push notifications when application status changes
- Looks up FCM tokens in `fcmTokens` collection
- Includes branding from `configs/defaultConfig`
- Runs automatically on status updates

**sendCustomNotification**: HTTP function for sending custom notifications to applicants
- Endpoint for admin dashboard to send immediate or scheduled notifications
- Supports multiple recipients
- Body: `{ recipients: string[], title: string, message: string, sendNow: boolean, scheduledFor?: number }`

**processScheduledNotifications**: Scheduled function (runs every minute) to send scheduled notifications
- Processes notifications stored in `scheduledNotifications` collection

### Service Worker
- Implementation in `service-worker.js` at project root
- Currently disabled in `src/App.tsx:119-131` (commented out)
- Enables push notifications for PWA capabilities
- Uses dynamic branding from push notification payload
- When re-enabled, ensure push notifications include branding data from Firestore config

### Project Structure
- **Source directory**: All application code is in `src/` directory
- **Path alias**: `@` resolves to `src/` directory (configured in `vite.config.ts`)
- **Subdirectories**: `src/pages/`, `src/components/`, `src/hooks/`, `src/services/`, `src/contexts/`
- **Entry point**: `src/index.tsx` referenced from `index.html`

## Important Files

**Configuration:**
- `src/services/firebase.ts`: Firebase initialization and exports
- `vite.config.ts`: Vite configuration with path alias (`@` -> `src/`) and GEMINI_API_KEY
- `.env.local`: Environment variables (GEMINI_API_KEY for Gemini API integration)
- `firebase.json`: Firebase project configuration (hosting, functions, firestore, storage)
- `functions/package.json`: Cloud Functions dependencies (Node 20)

**Utility Scripts:**
- `check-config.js` / `check-config.cjs`: Configuration validation scripts
- `functions/check-config.js`: Validates Firebase Functions configuration
- `functions/update-config.js`: Updates Firebase Functions configuration

**Reference Data:**
- `Licence Issuing Authorities.txt`: Complete list of 359 UK licensing authorities
  - Used in ApplyWizard.tsx for "Issuing Council" dropdown
  - Includes all UK councils that issue taxi/PHV licenses

## Firebase Setup Requirements

**Project Configuration:**
Update `src/services/firebase.ts` with Firebase project credentials before deployment.

**Firestore Collections:**
- `configs`: Document `defaultConfig` with structure:
  ```typescript
  {
    branding: { companyName: string, logoUrl: string, primaryColor: string, tagline?: string },
    statusSteps: [{ status: ApplicationStatus, title: string, description: string }]
  }
  ```
- `applications`: Auto-created when users submit applications (keyed by user UID)
- `admins`: Documents keyed by admin UID for admin access control
- `fcmTokens`: Stores FCM tokens for push notifications (keyed by user UID)
- `scheduledNotifications`: Stores scheduled notifications for later delivery

**Firebase Functions Config:**
```bash
firebase functions:config:set googlechat.webhook="https://chat.googleapis.com/v1/spaces/..."
```

**Security Rules:**
- `firestore.rules`: Database security rules
- `storage.rules`: Storage bucket rules for document uploads

## Key Implementation Details

**Password Validation:**
- Custom hook `usePasswordValidation` checks strength requirements
- Visual feedback via `PasswordStrength` component
- Validation enforced before submission in `Apply.tsx`

**Form State Persistence:**
- Multi-step wizard tracks progress via `currentStep` field in Firestore
- Passwords never saved in Firestore (excluded when pre-filling form data)
- Step validation ensures data integrity before progression
- Vehicle ownership decision impacts form flow (step 6 conditional on hasOwnVehicle)

**Vehicle Management:**
- Applicants can initially select "Own Vehicle" or "Fleet Vehicle"
- Those who select "Fleet Vehicle" can later add their own vehicle via Status page
- When adding vehicle, applicants provide:
  - Vehicle make, model, registration
  - Insurance expiry date
  - Optional documents: Insurance certificate, V5C logbook, PHV licence
- Vehicle details visible to staff in AdminDashboard for validation
- Supports transition from fleet to owned vehicle mid-process

**File Upload Pattern:**
- Files stored temporarily in component state
- Uploaded to Firebase Storage only on form submission
- Upload path: `documents/{userId}/{timestamp}-{fileName}`
- Download URLs stored in application document's `documents` field

**Admin Features (src/pages/AdminDashboard.tsx):**
- Comprehensive application management at `/admin/dashboard`
- **View all applicant details**:
  - Licensed drivers: Badge details, driving license, DBS number, vehicle ownership, vehicle details (if provided), all documents
  - Unlicensed drivers: 5-step licensing progress with visual indicators, vehicle details (if added), licensing documents
- **Status management**: Change application status (Submitted → Under Review → Contacted → Meeting Scheduled → Approved/Rejected)
- **Notifications**:
  - Send custom notifications to individual or multiple applicants
  - Schedule notifications for later delivery
  - Status change notifications sent automatically via FCM
- **Complete field visibility**: All fields and documents visible to staff for validation before dispatch system entry
- **Real-time updates**: Application list updates in real-time via Firestore listeners

**Applicant Status Page (src/pages/Status.tsx):**
- **Licensed drivers**:
  - View submitted application details
  - Upload/update missing documents (badge, license, insurance, V5C, PHV)
  - Add DBS check number for staff validation
  - Add vehicle details if initially selected "fleet vehicle"
- **Unlicensed drivers**:
  - Track 5-step licensing progress with visual checklist
  - Upload licensing documents as received (DBS, medical, knowledge test)
  - Add vehicle details if initially selected "fleet vehicle"
  - View personal information
- All document uploads optional with clear messaging about staff validation
