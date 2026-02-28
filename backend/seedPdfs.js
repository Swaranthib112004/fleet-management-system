const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Upload = require('./models/uploadModel');
const User = require('./models/userModel');

async function seedRealPdfs() {
    const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/fleet-management';
    await mongoose.connect(mongoUri);

    const users = await User.find();
    if (users.length === 0) {
        console.log('No users found. Exiting.');
        process.exit(1);
    }

    const admin = users[0];
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir);
    }

    const generateMinimalPDF = (title) => {
        return `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <<>> /Contents 4 0 R>> endobj
4 0 obj <</Length 51>> stream
BT /F1 24 Tf 100 700 Td (${title}) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000111 00000 n
0000000212 00000 n
trailer <</Size 5 /Root 1 0 R>>
startxref
314
%%EOF`;
    };

    // Clear existing uploads to switch to REAL physical files
    await Upload.deleteMany({});

    const sampleDocs = [
        // Insurance
        { filename: 'Geico_Policy_2026.pdf', category: 'Insurance' },
        { filename: 'Allstate_Fleet_Renewal.pdf', category: 'Insurance' },
        // License
        { filename: 'Driver_License_JohnD.pdf', category: 'License' },
        { filename: 'DL_Renewal_SarahM.pdf', category: 'License' },
        // Report
        { filename: 'Q1_Accident_Report.pdf', category: 'Report' },
        { filename: 'Annual_Vehicle_Audit.pdf', category: 'Report' },
        // Registration
        { filename: 'Reg_Texas_Fleet.pdf', category: 'Registration' },
        { filename: 'DMV_Tags_Invoice.pdf', category: 'Registration' },
        // Compliance
        { filename: 'DOT_Inspection_Log.pdf', category: 'Compliance' },
        { filename: 'Emissions_Cert_2026.pdf', category: 'Compliance' },
        // Other
        { filename: 'New_Office_Lease.pdf', category: 'Other' },
        { filename: 'Corporate_Tax_Summary.pdf', category: 'Other' },
    ];

    for (const doc of sampleDocs) {
        const filePath = path.join(uploadsDir, doc.filename);
        const pdfStr = generateMinimalPDF(`Sample Data: ${doc.filename}`);
        fs.writeFileSync(filePath, Buffer.from(pdfStr, 'utf8'));

        // Compute size matching file so it's realistic
        const stat = fs.statSync(filePath);

        await Upload.create({
            filename: doc.filename,
            url: `/uploads/${doc.filename}`,
            mimetype: 'application/pdf',
            size: stat.size,
            category: doc.category,
            isManual: false,
            uploadedBy: admin._id
        });
    }

    console.log('Sample real minimal PDF files seeded.');
    await mongoose.disconnect();
}

seedRealPdfs();
