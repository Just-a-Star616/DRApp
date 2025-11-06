
export interface BrandingConfig {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  tagline?: string;
}

// Checklist item for unlicensed driver journey
export interface ChecklistItem {
  id: string;
  checked: boolean;
  documentUrl?: string; // Optional upload for items like DBS certificate
}

// Unlicensed driver progress tracking
export interface UnlicensedProgress {
  eligibilityChecked: boolean;
  dbsApplied: boolean;
  dbsDocumentUrl?: string;
  medicalBooked: boolean;
  medicalDocumentUrl?: string;
  knowledgeTestPassed: boolean;
  knowledgeTestDocumentUrl?: string;
  councilApplicationSubmitted: boolean;
  badgeReceived: boolean; // This triggers conversion to licensed flow
}

export interface Application {
  id: string; // Corresponds to Firebase Auth UID
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  area: string;
  isLicensedDriver: boolean;

  // Unlicensed driver progress (only populated if isLicensedDriver = false)
  unlicensedProgress?: UnlicensedProgress;

  // Licensed driver details
  badgeNumber?: string;
  badgeExpiry?: string;
  issuingCouncil?: string;
  drivingLicenseNumber?: string;
  licenseExpiry?: string;
  dbsCheckNumber?: string; // DBS check number for validation by companies/councils

  // Vehicle ownership
  hasOwnVehicle?: boolean; // true = own vehicle, false = fleet/no vehicle

  vehicleMake?: string;
  vehicleModel?: string;
  vehicleReg?: string;
  insuranceExpiry?: string;

  documents: {
    badgeDocumentUrl?: string;
    drivingLicenseDocumentUrl?: string;
    insuranceDocumentUrl?: string;
    v5cDocumentUrl?: string; // Vehicle logbook (optional)
    phvLicenceDocumentUrl?: string; // PHV licence (optional)
  };

  status: ApplicationStatus;
  createdAt: number; // Store timestamp for sorting/tracking
  isPartial?: boolean; // Flag to identify incomplete, auto-saved applications
  currentStep?: number; // Track which step user is on in the wizard
}

export enum ApplicationStatus {
  Submitted = 'Submitted',
  UnderReview = 'Under Review',
  Contacted = 'Contacted',
  MeetingScheduled = 'Meeting Scheduled',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

// Activity Log Types
export enum ActivityType {
  // Staff actions
  StatusUpdate = 'Status Update',
  NotificationSent = 'Notification Sent',
  DocumentUploadedByStaff = 'Document Uploaded by Staff',

  // Applicant actions
  ApplicationSubmitted = 'Application Submitted',
  DocumentUploadedByApplicant = 'Document Uploaded by Applicant',
  InformationUpdated = 'Information Updated',
  VehicleAdded = 'Vehicle Added',
  DBSNumberAdded = 'DBS Number Added',
  UnlicensedProgressUpdated = 'Unlicensed Progress Updated',
}

export enum ActivityActor {
  Staff = 'Staff',
  Applicant = 'Applicant',
  System = 'System',
}

export interface ActivityLog {
  id: string; // Auto-generated document ID
  applicationId: string; // UID of the application this activity relates to
  applicantName: string; // Full name for easy display
  applicantEmail: string; // Email for easy display
  timestamp: number; // Unix timestamp
  activityType: ActivityType;
  actor: ActivityActor;
  actorId: string; // UID of staff member or applicant
  actorName: string; // Name of person who performed action
  details: string; // Human-readable description of what happened
  metadata?: {
    oldValue?: string; // For updates, what was the old value
    newValue?: string; // For updates, what is the new value
    documentType?: string; // For document uploads, what type of document
    notificationTitle?: string; // For notifications, the title
    [key: string]: any; // Allow additional metadata
  };
}