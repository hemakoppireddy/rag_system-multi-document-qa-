import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Document, Paragraph, HeadingLevel, Packer } from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = __dirname;

if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

export async function createSamplePdf(filePath, pagesData) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const pageData of pagesData) {
    const page = pdfDoc.addPage([600, 400]);
    const { title, lines } = pageData;

    page.drawText(title, {
      x: 50,
      y: 350,
      size: 16,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.2),
    });

    let yPos = 310;
    for (const line of lines) {
      page.drawText(line, {
        x: 50,
        y: yPos,
        size: 11,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      yPos -= 20;
    }
  }

  // Save with standard compression compatible with all PDF engines
  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  fs.writeFileSync(filePath, pdfBytes);
  return filePath;
}

export async function createSampleDocx(filePath, sections) {
  const docChildren = [];

  for (const sec of sections) {
    docChildren.push(
      new Paragraph({
        text: sec.title,
        heading: HeadingLevel.HEADING_1,
      })
    );
    for (const para of sec.paragraphs) {
      docChildren.push(
        new Paragraph({
          text: para,
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export async function generateAllFixtures() {
  // 1. Employee Handbook PDF (2 Pages)
  const employeeHandbookPath = path.join(fixturesDir, 'employee_handbook.pdf');
  await createSamplePdf(employeeHandbookPath, [
    {
      title: 'Company Employee Handbook - Page 1: Leave Policy',
      lines: [
        'Welcome to Acme Global Technologies employee guidelines.',
        'Full-time employees are entitled to 20 days of paid time off (PTO) per calendar year.',
        'PTO accrues on a monthly basis at the rate of 1.67 days per month.',
        'Employees may carry over up to 5 days of unused PTO into the following calendar year.',
        'Sick leave is provided separately at 10 days per year with full pay.',
      ],
    },
    {
      title: 'Company Employee Handbook - Page 2: Remote Work Policy',
      lines: [
        'Acme Global offers a flexible hybrid working model for all core departments.',
        'Engineering and product teams are eligible to work remotely up to 3 days per week.',
        'All remote days must be coordinated with your direct engineering manager.',
        'Home office stipends of $500 are provided once upon successful onboarding.',
      ],
    },
  ]);

  // 2. Contractor Guidelines DOCX (2 Sections)
  const contractorGuidelinesPath = path.join(fixturesDir, 'contractor_guidelines.docx');
  await createSampleDocx(contractorGuidelinesPath, [
    {
      title: 'Contractor Compensation and Guidelines',
      paragraphs: [
        'Contractors operate on hourly billing and do not receive corporate benefits or paid time off (PTO).',
        'Invoices must be submitted bi-weekly through the contractor billing portal by Friday 5:00 PM EST.',
        'Payment terms for verified contractor invoices are Net 15 business days.',
      ],
    },
    {
      title: 'Security and Access Protocol',
      paragraphs: [
        'All external contractors must authenticate via corporate VPN and multi-factor authentication.',
        'External contractors are prohibited from downloading source code to personal unencrypted laptops.',
        'Contractor access credentials expire automatically every 90 days unless renewed by a sponsor.',
      ],
    },
  ]);

  // 3. Company Security PDF (2 Pages)
  const securityPolicyPath = path.join(fixturesDir, 'security_policy.pdf');
  await createSamplePdf(securityPolicyPath, [
    {
      title: 'Enterprise Security Manual - Page 1: Access Controls',
      lines: [
        'Level 3 security clearance requires annual biometric authentication and background screening.',
        'All cryptographic API keys must be rotated every 60 days using the central secrets manager.',
      ],
    },
    {
      title: 'Enterprise Security Manual - Page 2: Incident Reporting',
      lines: [
        'All confirmed cybersecurity incidents must be reported to secops@acme.com within 1 hour.',
        'Critical vulnerability disclosures must follow responsible disclosure protocol.',
      ],
    },
  ]);

  return {
    employeeHandbookPath,
    contractorGuidelinesPath,
    securityPolicyPath,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAllFixtures().then((res) => {
    console.log('✅ Test fixtures regenerated successfully');
  });
}

export default generateAllFixtures;
