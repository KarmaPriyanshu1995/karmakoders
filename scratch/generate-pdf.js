const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const targetPdf = path.join(__dirname, '..', 'SEO_Intelligence_Guide.pdf');
console.log('Target PDF Path:', targetPdf);

// Step 1: Install pdfkit dynamically if not present
try {
  require.resolve('pdfkit');
  console.log('pdfkit is already installed.');
} catch (e) {
  console.log('Installing pdfkit locally via npm...');
  execSync('npm install pdfkit --no-save', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
}

const PDFDocument = require('pdfkit');

// Step 2: Create a new PDF document
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  bufferPages: true
});

// Stream PDF to a file
const writeStream = fs.createWriteStream(targetPdf);
doc.pipe(writeStream);

// Colors
const primaryColor = '#FFC300'; // Karmakoder Yellow
const darkBgColor = '#1C1B1A'; // Sidebar dark
const textColor = '#252422'; // Dark body text
const mutedTextColor = '#555555'; // Grey text
const accentColor = '#3b82f6'; // Blue accent for subheadings

// Add a Header Banner
doc.rect(0, 0, 595.28, 120).fill(darkBgColor);

// Title text on Dark Background
doc.fillColor('#FFFFFF')
   .fontSize(24)
   .font('Helvetica-Bold')
   .text('KARMAKODERS', 50, 35, { characterSpacing: 1.5 });

doc.fillColor(primaryColor)
   .fontSize(14)
   .font('Helvetica-Bold')
   .text('SEO Intelligence Center Guide', 50, 68);

doc.fillColor('#A9A9A9')
   .fontSize(10)
   .font('Helvetica')
   .text('Actionable Roadmap & System Reference', 50, 88);

// Restore default position
doc.text('', 50, 150);

// Helper for Section Headings
function writeSectionHeader(title) {
  doc.moveDown(1.5);
  doc.fillColor(textColor)
     .fontSize(16)
     .font('Helvetica-Bold')
     .text(title);
  
  // Underline
  const currentY = doc.y;
  doc.moveTo(50, currentY + 3)
     .lineTo(545, currentY + 3)
     .strokeColor(primaryColor)
     .lineWidth(2)
     .stroke();
  doc.moveDown(0.8);
}

// Helper for Sub-Headings
function writeSubHeader(title) {
  doc.moveDown(0.8);
  doc.fillColor(accentColor)
     .fontSize(12)
     .font('Helvetica-Bold')
     .text(title);
  doc.moveDown(0.4);
}

// Helper for Body Text
function writeBodyText(text, isMuted = false) {
  doc.fillColor(isMuted ? mutedTextColor : textColor)
     .fontSize(10)
     .font('Helvetica')
     .text(text, { align: 'justify', lineGap: 3 });
  doc.moveDown(0.5);
}

// Helper for Bullet Points
function writeBullet(title, description) {
  const currentY = doc.y;
  // Draw bullet dot
  doc.circle(55, currentY + 6, 2.5)
     .fillColor(primaryColor)
     .fill();

  doc.fillColor(textColor)
     .fontSize(10)
     .font('Helvetica-Bold')
     .text(`  ${title}: `, 65, currentY, { continued: true });
     
  doc.font('Helvetica')
     .text(description, { lineGap: 3 });
  
  doc.moveDown(0.4);
}

// Page 1 Content
writeSectionHeader('1. Understanding the 10 Macro SEO Dimensions');
writeBodyText('The SEO Intelligence Center calculates an Overall Health Score using a weighted multi-dimensional algorithm:');

// Formula box
const formulaY = doc.y;
doc.rect(50, formulaY, 495, 35).fill('#F4F4F5');
doc.fillColor('#1C1B1A')
   .font('Helvetica-Bold')
   .fontSize(9.5)
   .text('Overall Score = (0.25 × Tech) + (0.25 × Content) + (0.15 × Entity) + (0.15 × Link) + (0.10 × Schema) + (0.10 × CTR)', 65, formulaY + 12);

doc.y = formulaY + 45; // Move past formula box

writeBullet('Technical SEO', 'Analyzes header hierarchy, flags broken links, tests image load compression weights, and tracks page metadata integrity.');
writeBullet('Content Quality', 'Inspects copy length, keyword density ratios, reading level statistics, and semantic E-E-A-T trust factors.');
writeBullet('Entity Coverage', 'Indexes key business entities (brand, location, staff) inside pages to align with Google\'s semantic Knowledge Graph.');
writeBullet('Internal Linking', 'Maps source-target anchor structures to eliminate orphan nodes and evenly route ranking equity.');
writeBullet('Schema Markup', 'Validates structural schema types like Article, FAQ, and Organization to prompt rich Google snippets.');
writeBullet('CTR Metrics', 'Correlates organic impressions with click rates to spotlight low-performing titles.');
writeBullet('Keyword Score', 'Unveils high-opportunity queries ranking on pages 2-3 of search results that are primed for optimization.');
writeBullet('Indexation Rate', 'Monitors the ratio of published pages vs. indexed ones to confirm crawlers can access content.');
writeBullet('Automation Health', 'Keeps historical logs of automated background optimizations, tracking worker success.');

// Page Break
doc.addPage();

// Page 2 Header Banner
doc.rect(0, 0, 595.28, 40).fill(darkBgColor);
doc.fillColor('#FFFFFF')
   .fontSize(10)
   .font('Helvetica-Bold')
   .text('KARMAKODERS . SEO INTELLIGENCE CENTER GUIDE', 50, 15, { characterSpacing: 1 });
doc.text('', 50, 60);

writeSectionHeader('2. Running and Exporting SEO Reports');
writeSubHeader('Generating Automated Weekly Health Reports');
writeBodyText('The system integrates a background reporting cron engine (runWeeklyHealthReport) that automatically audits the application and aggregates key performance metrics.');
writeBullet('Configuration', 'Enable the "Weekly SEO Reports" toggle inside Settings to permit automated weekly summaries.');
writeBullet('Manual Execution', 'Go to the Automation Center, check the "Weekly SEO Health Reports" option, and hit "Run Automation" to instantly save a new historical report.');

writeSubHeader('Exporting Reports as PDF');
writeBodyText('Every report and dashboard pane supports native browser printing. Press Ctrl + P (Windows) or Cmd + P (Mac) while viewing any dashboard page. The dashboard employs custom CSS print wrappers that format layout tables, scorecards, and charts into a clean, multi-page PDF report automatically.');

writeSectionHeader('3. Step-by-Step Roadmap to Rank on Page 1');
writeBodyText('Follow this targeted execution strategy to systematically enhance visibility and rank at the top of search listings:');

writeSubHeader('Step 1: Tackle Quick Wins (First 48 Hours)');
writeBodyText('Scan the "Quick Win Priority Matrix" on the dashboard. Resolve critical technical errors immediately—such as missing page titles, multiple H1 headings, or broken anchor links. These errors block crawler paths and drag down baseline authority.');

writeSubHeader('Step 2: Connect Google Search Console & Triage CTR');
writeBodyText('Navigate to the CTR Optimization tab. Filter search queries with high impressions but low click-through rates. Use the Page SEO Analyzer sidebar to generate click-worthy, AI-optimized page titles and descriptions that stand out on SERPs.');

writeSubHeader('Step 3: Establish Topical Clusters & Link Hierarchies');
writeBodyText('Group your posts around central topical pillars. Review the "Internal Links" suggestions in the sidebar and insert contextually relevant links pointing from supporting articles to your main service pages to build a strong topical silhouette.');

writeSubHeader('Step 4: Deploy Rich Schemas & Entity Mappings');
writeBodyText('Ensure Organization schema is active on the homepage and FAQ schema is active on sub-pages containing question elements. Register key brand details in the Entity Center. This feeds search bots clean structured data, enabling rich search snippet integrations.');

// Page footer helper (adds page numbers to all pages)
const pages = doc.bufferedPageRange();
for (let i = 0; i < pages.count; i++) {
  doc.switchToPage(i);
  doc.fillColor(mutedTextColor)
     .fontSize(8)
     .font('Helvetica')
     .text(`Page ${i + 1} of ${pages.count}`, 50, 750, { align: 'center' });
}

// End document
doc.end();

writeStream.on('finish', () => {
  console.log('PDF generated successfully!');
  process.exit(0);
});

writeStream.on('error', (err) => {
  console.error('Error writing PDF stream:', err);
  process.exit(1);
});
