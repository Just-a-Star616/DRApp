// Quick script to check Firestore config
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

async function checkConfig() {
  try {
    const configDoc = await db.collection('configs').doc('defaultConfig').get();

    if (!configDoc.exists) {
      console.log('❌ Config document does not exist!');
      return;
    }

    const data = configDoc.data();
    console.log('✅ Current config data:');
    console.log(JSON.stringify(data, null, 2));

    console.log('\n📊 Branding object:');
    console.log(JSON.stringify(data.branding, null, 2));

  } catch (error) {
    console.error('Error checking config:', error);
  }

  process.exit(0);
}

checkConfig();
