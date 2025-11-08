/**
 * Automatic Migration System
 *
 * This function runs automatically when applications are read and applies
 * any missing fields to ensure backward compatibility.
 *
 * Define all field migrations here - they will be applied automatically
 * to any application that is missing the fields.
 */

const admin = require('firebase-admin');

/**
 * Migration rules - add new field migrations here
 * Each migration has a check function and an apply function
 */
const MIGRATIONS = [
  {
    name: 'isLicensedDriver',
    description: 'Ensure isLicensedDriver field exists',
    check: (appData) => appData.isLicensedDriver === undefined,
    apply: (appData) => ({
      isLicensedDriver: !!(appData.badgeNumber || appData.drivingLicenseNumber)
    })
  },
  {
    name: 'unlicensedProgress',
    description: 'Add unlicensedProgress for unlicensed drivers',
    check: (appData) => appData.isLicensedDriver === false && !appData.unlicensedProgress,
    apply: () => ({
      unlicensedProgress: {
        eligibilityChecked: false,
        dbsApplied: false,
        medicalBooked: false,
        knowledgeTestPassed: false,
        councilApplicationSubmitted: false,
        badgeReceived: false,
      }
    })
  },
  {
    name: 'documents',
    description: 'Ensure documents object exists',
    check: (appData) => !appData.documents,
    apply: () => ({ documents: {} })
  },
  {
    name: 'hasOwnVehicle',
    description: 'Set hasOwnVehicle if vehicle details exist',
    check: (appData) =>
      appData.hasOwnVehicle === undefined &&
      (appData.vehicleMake || appData.vehicleModel || appData.vehicleReg),
    apply: () => ({ hasOwnVehicle: true })
  },
  {
    name: 'createdAt',
    description: 'Ensure createdAt timestamp exists',
    check: (appData) => !appData.createdAt,
    apply: () => ({ createdAt: Date.now() })
  },

  // ADD NEW MIGRATIONS HERE
  // Example:
  // {
  //   name: 'newField',
  //   description: 'Add new field to all applications',
  //   check: (appData) => appData.newField === undefined,
  //   apply: (appData) => ({ newField: 'defaultValue' })
  // },
];

/**
 * Apply all necessary migrations to an application
 * @param {Object} appData - The application data
 * @returns {Object|null} - Updates to apply, or null if no updates needed
 */
function getMigrationUpdates(appData) {
  const updates = {};
  let needsUpdate = false;

  for (const migration of MIGRATIONS) {
    if (migration.check(appData)) {
      const migrationUpdates = migration.apply(appData);
      Object.assign(updates, migrationUpdates);
      needsUpdate = true;
      console.log(`  Migration needed: ${migration.name}`);
    }
  }

  return needsUpdate ? updates : null;
}

/**
 * Firestore onCreate trigger - automatically migrate new applications
 * This ensures any application created via legacy code gets migrated immediately
 */
exports.autoMigrateOnCreate = require('firebase-functions').firestore
  .document('applications/{applicationId}')
  .onCreate(async (snap, context) => {
    const appData = snap.data();
    const appId = context.params.applicationId;

    console.log(`Checking new application for migrations: ${appId}`);

    const updates = getMigrationUpdates(appData);

    if (updates) {
      console.log(`Applying migrations to ${appId}:`, Object.keys(updates));
      await snap.ref.update(updates);
      console.log(`Migrations applied successfully to ${appId}`);
    } else {
      console.log(`No migrations needed for ${appId}`);
    }
  });

/**
 * Batch migration function - run this to migrate all existing applications
 * Can be called manually or scheduled
 */
exports.batchMigrateAll = require('firebase-functions').https.onRequest(async (req, res) => {
  // Simple authentication
  const authKey = req.query.key || req.body?.key;
  const expectedKey = require('firebase-functions').config().migration?.key || 'migrate123';

  if (authKey !== expectedKey) {
    return res.status(403).send('Unauthorized');
  }

  const db = admin.firestore();

  try {
    console.log('Starting batch migration...');

    const applicationsRef = db.collection('applications');
    const snapshot = await applicationsRef.get();

    if (snapshot.empty) {
      return res.status(200).json({
        success: true,
        message: 'No applications found in database.'
      });
    }

    console.log(`Found ${snapshot.size} applications to check.`);

    let updateCount = 0;
    let skipCount = 0;
    const results = [];

    for (const doc of snapshot.docs) {
      const appData = doc.data();
      const appId = doc.id;

      const updates = getMigrationUpdates(appData);

      if (updates) {
        await applicationsRef.doc(appId).update(updates);
        updateCount++;
        results.push({
          id: appId,
          name: `${appData.firstName} ${appData.lastName}`,
          migrations: Object.keys(updates)
        });
      } else {
        skipCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Migration complete!',
      updated: updateCount,
      skipped: skipCount,
      details: results
    });

  } catch (error) {
    console.error('Error during migration:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = {
  getMigrationUpdates,
  MIGRATIONS
};
