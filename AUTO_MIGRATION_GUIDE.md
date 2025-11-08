# Automatic Migration System

## Overview

The application now includes an **automatic migration system** that ensures all applications have the latest fields, even if they were created with older versions of the code.

## How It Works

### 1. Automatic Migration on New Applications

When a new application is created in Firestore, the `autoMigrateOnCreate` Cloud Function automatically:
- Checks if the application is missing any required fields
- Applies default values for missing fields
- Updates the document immediately

**This means:**
- You never need to worry about old code creating incomplete applications
- All applications are automatically brought up to date
- No manual intervention required

### 2. Batch Migration for Existing Applications

For applications that already exist in the database, use the `batchMigrateAll` function:

```bash
curl "https://us-central1-drapp-426.cloudfunctions.net/batchMigrateAll?key=migrate123"
```

This will:
- Check all applications in the database
- Apply any missing fields
- Return a summary of what was updated

## Adding New Fields

When you add new fields to the Application type, follow these steps:

### Step 1: Update types.ts

Add your new field to the `Application` interface in `src/types.ts`:

```typescript
export interface Application {
  // ... existing fields ...
  newField?: string; // Your new field
}
```

### Step 2: Add Migration Rule

Open `functions/auto-migrate.js` and add a new migration rule to the `MIGRATIONS` array:

```javascript
const MIGRATIONS = [
  // ... existing migrations ...

  {
    name: 'newField',
    description: 'Add newField to all applications',
    check: (appData) => appData.newField === undefined,
    apply: (appData) => {
      // You can use existing data to compute the default value
      return { newField: 'default value' };
    }
  },
];
```

### Step 3: Deploy Functions

```bash
firebase deploy --only functions
```

### Step 4: Run Batch Migration (Optional)

If you want to update all existing applications immediately:

```bash
curl "https://us-central1-drapp-426.cloudfunctions.net/batchMigrateAll?key=migrate123"
```

**Note:** This is optional because new applications will automatically get the field, and you can let existing applications migrate gradually as they're accessed.

## Migration Rules

Each migration rule has three parts:

### 1. `name` (string)
A unique identifier for this migration. Used in logs.

### 2. `check` (function)
Returns `true` if the migration should be applied.

Example:
```javascript
check: (appData) => appData.myField === undefined
```

### 3. `apply` (function)
Returns an object with the fields to add/update.

Example:
```javascript
apply: (appData) => ({
  myField: 'default',
  anotherField: appData.someExistingField || 'fallback'
})
```

## Examples

### Example 1: Add Simple Field

```javascript
{
  name: 'preferredContact',
  description: 'Add preferred contact method',
  check: (appData) => !appData.preferredContact,
  apply: () => ({ preferredContact: 'email' })
}
```

### Example 2: Conditional Field Based on Existing Data

```javascript
{
  name: 'driverType',
  description: 'Classify driver type based on license status',
  check: (appData) => !appData.driverType,
  apply: (appData) => ({
    driverType: appData.isLicensedDriver ? 'licensed' : 'unlicensed'
  })
}
```

### Example 3: Complex Object Field

```javascript
{
  name: 'settings',
  description: 'Add user settings object',
  check: (appData) => !appData.settings,
  apply: () => ({
    settings: {
      notifications: true,
      language: 'en',
      theme: 'light'
    }
  })
}
```

## Current Migrations

The system currently includes these migrations:

1. **isLicensedDriver**: Sets based on presence of badge/license
2. **unlicensedProgress**: Adds progress tracking for unlicensed drivers
3. **documents**: Ensures documents object exists
4. **hasOwnVehicle**: Sets based on presence of vehicle details
5. **createdAt**: Adds timestamp if missing

## Monitoring

### View Migration Logs

Check Cloud Functions logs to see migration activity:

```bash
firebase functions:log --only autoMigrateOnCreate
```

Or view in Firebase Console:
https://console.firebase.google.com/project/drapp-426/functions/logs

### Test a Migration

Before deploying, you can test a migration rule:

```javascript
const { getMigrationUpdates, MIGRATIONS } = require('./auto-migrate');

const testApp = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  // ... missing fields ...
};

const updates = getMigrationUpdates(testApp);
console.log('Would apply:', updates);
```

## Benefits

✅ **Automatic**: New applications are migrated on creation
✅ **Safe**: Only adds missing fields, never overwrites existing data
✅ **Transparent**: Logs show exactly what migrations were applied
✅ **Flexible**: Easy to add new migration rules
✅ **Backward Compatible**: Old applications continue to work
✅ **Future-Proof**: New fields can be added without breaking existing apps

## Cleanup

After confirming all applications have been migrated, you can:

1. Remove old migration rules from `MIGRATIONS` array
2. Make optional fields required in types.ts
3. Remove the legacy `migrateApplicants` function

## Security

The batch migration endpoint is protected by a simple key (`migrate123`).

To change the key:

```bash
firebase functions:config:set migration.key="your-secret-key"
firebase deploy --only functions
```

Then use your new key when calling the endpoint:

```bash
curl "https://us-central1-drapp-426.cloudfunctions.net/batchMigrateAll?key=your-secret-key"
```
