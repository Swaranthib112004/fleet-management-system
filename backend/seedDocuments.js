const mongoose = require('mongoose');
const Upload = require('./models/uploadModel');
const User = require('./models/userModel');

async function seedDocuments() {
    const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/fleet-management';
    await mongoose.connect(mongoUri);

    const users = await User.find();
    if (users.length === 0) {
        console.log('No users found. Exiting.');
        process.exit(1);
    }

    const admin = users[0];

    const sampleDocs = [
        // Insurance
        { filename: 'Geico_Policy_2026.pdf', url: 'manual_entry', mimetype: 'PDF', size: '2.4 MB', category: 'Insurance', isManual: true, uploadedBy: admin._id },
        { filename: 'Allstate_Fleet_Renewal.pdf', url: 'manual_entry', mimetype: 'PDF', size: '1.8 MB', category: 'Insurance', isManual: true, uploadedBy: admin._id },

        // License
        { filename: 'Driver_License_JohnD.jpg', url: 'manual_entry', mimetype: 'JPG', size: '1.1 MB', category: 'License', isManual: true, uploadedBy: admin._id },
        { filename: 'DL_Renewal_SarahM.png', url: 'manual_entry', mimetype: 'PNG', size: '890 KB', category: 'License', isManual: true, uploadedBy: admin._id },

        // Report
        { filename: 'Q1_Accident_Report.docx', url: 'manual_entry', mimetype: 'DOCX', size: '4.2 MB', category: 'Report', isManual: true, uploadedBy: admin._id },
        { filename: 'Annual_Vehicle_Audit.xlsx', url: 'manual_entry', mimetype: 'CSV', size: '320 KB', category: 'Report', isManual: true, uploadedBy: admin._id },

        // Registration
        { filename: 'Reg_Texas_Fleet.pdf', url: 'manual_entry', mimetype: 'PDF', size: '1.9 MB', category: 'Registration', isManual: true, uploadedBy: admin._id },
        { filename: 'DMV_Tags_Invoice.pdf', url: 'manual_entry', mimetype: 'PDF', size: '1.2 MB', category: 'Registration', isManual: true, uploadedBy: admin._id },

        // Compliance
        { filename: 'DOT_Inspection_Log.pdf', url: 'manual_entry', mimetype: 'PDF', size: '500 KB', category: 'Compliance', isManual: true, uploadedBy: admin._id },
        { filename: 'Emissions_Cert_2026.png', url: 'manual_entry', mimetype: 'JPG', size: '2.8 MB', category: 'Compliance', isManual: true, uploadedBy: admin._id },

        // Other
        { filename: 'New_Office_Lease.pdf', url: 'manual_entry', mimetype: 'PDF', size: '12 MB', category: 'Other', isManual: true, uploadedBy: admin._id },
        { filename: 'Corporate_Tax_Summary.docx', url: 'manual_entry', mimetype: 'DOCX', size: '5.1 MB', category: 'Other', isManual: true, uploadedBy: admin._id },
    ];

    await Upload.create(sampleDocs);

    console.log('Sample documents seeded.');
    await mongoose.disconnect();
}

seedDocuments();
