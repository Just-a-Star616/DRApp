// Script to update Firestore config with proper branding
const admin = require('firebase-admin');

// Initialize Firebase Admin with project ID
admin.initializeApp({
  projectId: 'drapp-426'
});

const db = admin.firestore();

async function updateConfig() {
  try {
    const config = {
      branding: {
        companyName: 'Darthstar Drivers',
        logoUrl: 'https://lv426dev.co.uk/wp-content/uploads/2025/11/HeroVillianYoda.png',  // Updated to HTTPS
        primaryColor: 'papaya'
      },
      statusSteps: [
        {
          status: 'Submitted',
          title: 'Application Submitted',
          description: 'Your application has been received and is being reviewed.'
        },
        {
          status: 'Under Review',
          title: 'Under Review',
          description: 'We are currently reviewing your application.'
        },
        {
          status: 'Contacted',
          title: 'Contacted',
          description: 'We have reached out to you regarding your application.'
        },
        {
          status: 'Meeting Scheduled',
          title: 'Meeting Scheduled',
          description: 'A meeting has been scheduled to discuss your application.'
        },
        {
          status: 'Approved',
          title: 'Approved',
          description: 'Congratulations! Your application has been approved.'
        },
        {
          status: 'Rejected',
          title: 'Not Accepted',
          description: 'Unfortunately, we are unable to proceed with your application at this time.'
        }
      ]
    };

    await db.collection('configs').doc('defaultConfig').set(config);

    console.log('✅ Config updated successfully!');
    console.log(JSON.stringify(config, null, 2));

  } catch (error) {
    console.error('Error updating config:', error);
  }

  process.exit(0);
}

updateConfig();
