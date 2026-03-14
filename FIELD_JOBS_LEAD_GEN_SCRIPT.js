// ==========================================
// FIELD JOBS - COMPLETE AUTOMATION SYSTEM
// Lead Generation + Email Cadence Automation
// Sends from: noah.thomas@field-jobs.co
// Website: field-job.com
// ==========================================

// ⚠️ CONFIGURATION - EDIT THESE VALUES
const CLAUDE_API_KEY = "PUT_YOUR_CLAUDE_API_KEY_HERE";
const SENDER_EMAIL = "noah.thomas@field-jobs.co";
const SENDER_NAME = "Noah Thomas";
const WEBSITE_URL = "field-job.com";

// Email Verification - Get free API key at https://www.abstractapi.com/api/email-verification-validation-api
// Free tier: 100 verifications/month
const ABSTRACT_API_KEY = "PUT_YOUR_ABSTRACT_API_KEY_HERE";

const CONFIG = {
  spreadsheetId: "1-YuFe2248eba-OGiyQVowbzCB-IBwkW88CvUgSJgCK4",
  
  industries: {
    "Staffing": "Industrial Staffing Agencies & Labor Aggregators recruiting traveling tradespeople",
    "Nuclear": "Nuclear Power plants, outage services, radiation protection, nuclear engineering",
    "PowerGen": "Power Generation (Fossil) - coal, natural gas, combined cycle power plants",
    "OilGas": "Oil & Gas exploration, production, midstream, refineries, petrochemical",
    "Offshore": "Offshore oil & gas platforms, marine construction, subsea operations",
    "Renewable": "Renewable Energy - solar EPCs, wind developers, battery storage, clean energy",
    "Construction": "Heavy Construction, infrastructure, industrial construction, civil projects",
    "Aerospace": "Aerospace manufacturing, MRO, aviation maintenance, aircraft manufacturing",
    "Defense": "Defense contractors, military installations, shipyards, weapons systems",
    "ElectricTD": "Electric Transmission & Distribution, utility contractors, linemen, substations",
    "PulpPaper": "Pulp & Paper mills, forestry, paper manufacturing, mill maintenance",
    "Manufacturing": "Industrial Manufacturing, fabrication, assembly, production facilities",
    "Mining": "Mining operations, mineral extraction, mine maintenance, heavy equipment",
    "AIInfra": "AI Infrastructure - data centers, GPU compute facilities, cooling systems, power infrastructure for AI"
  },
  
  weeklyRotation: [
    "Staffing", "Nuclear", "PowerGen", "OilGas", "Offshore", 
    "Renewable", "Construction", "Aerospace", "Defense", 
    "ElectricTD", "PulpPaper", "Manufacturing", "Mining", "AIInfra"
  ]
};

// ==========================================
// 🧪 TEST FUNCTIONS - RUN THESE FIRST!
// These are safe to run and won't send emails
// ==========================================

// TEST 1: Verify spreadsheet connection
function TEST_SpreadsheetConnection() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    Logger.log("✅ SUCCESS: Connected to spreadsheet!");
    Logger.log("📄 Spreadsheet name: " + ss.getName());
    Logger.log("📋 Existing sheets: " + ss.getSheets().map(s => s.getName()).join(", "));
    return true;
  } catch (error) {
    Logger.log("❌ FAILED: " + error.toString());
    Logger.log("💡 Make sure the spreadsheetId in CONFIG is correct");
    return false;
  }
}

// TEST 2: Verify Gmail permissions
function TEST_GmailPermissions() {
  try {
    const drafts = GmailApp.getDrafts();
    Logger.log("✅ SUCCESS: Gmail access works!");
    Logger.log("📧 You have " + drafts.length + " drafts");
    Logger.log("📧 Emails will send from: " + SENDER_EMAIL);
    return true;
  } catch (error) {
    Logger.log("❌ FAILED: " + error.toString());
    Logger.log("💡 You may need to authorize Gmail access");
    return false;
  }
}

// TEST 3: Preview an email template (NO SEND)
function TEST_PreviewEmail() {
  const testCompany = "Acme Staffing Inc";
  const testContact = "John Smith";
  const testEmail = "john@example.com";
  
  const greeting = getSmartGreeting(testContact, testEmail);
  const template = getEmailTemplate("Staffing", 1);
  
  let body = template.body
    .replace(/{greeting}/g, greeting)
    .replace(/{company}/g, testCompany)
    .replace(/{firstName}/g, testContact.split(' ')[0])
    .replace(/{website}/g, WEBSITE_URL);
  
  Logger.log("📧 EMAIL PREVIEW (NOT SENT)");
  Logger.log("================================");
  Logger.log("To: " + testEmail);
  Logger.log("Subject: " + template.subject);
  Logger.log("--------------------------------");
  Logger.log(body);
  Logger.log("================================");
  Logger.log("✅ Template looks good! This was NOT sent.");
}

// TEST 4: Check which industry is scheduled this week
function TEST_CheckWeeklyIndustry() {
  const weekNumber = getWeekNumber();
  const industryKey = CONFIG.weeklyRotation[weekNumber % 14];
  const focusArea = CONFIG.industries[industryKey];
  
  Logger.log("📅 Current week number: " + weekNumber);
  Logger.log("🏭 This week's industry: " + industryKey);
  Logger.log("📝 Focus area: " + focusArea);
  Logger.log("");
  Logger.log("📆 Next 4 weeks schedule:");
  for (let i = 0; i < 4; i++) {
    const futureWeek = weekNumber + i;
    const futureIndustry = CONFIG.weeklyRotation[futureWeek % 14];
    Logger.log("   Week " + futureWeek + ": " + futureIndustry);
  }
}

// TEST 5: Verify Claude API key (makes a tiny API call)
function TEST_ClaudeAPI() {
  if (CLAUDE_API_KEY === "PUT_YOUR_CLAUDE_API_KEY_HERE") {
    Logger.log("❌ FAILED: You need to add your Claude API key!");
    Logger.log("💡 Replace 'PUT_YOUR_CLAUDE_API_KEY_HERE' with your actual key");
    return false;
  }
  
  try {
    const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      payload: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 10,
        messages: [{
          role: "user",
          content: "Say 'API works' and nothing else."
        }]
      })
    });
    
    Logger.log("✅ SUCCESS: Claude API is working!");
    return true;
  } catch (error) {
    Logger.log("❌ FAILED: " + error.toString());
    Logger.log("💡 Check your API key is correct and has credits");
    return false;
  }
}

// TEST 6: Test Email Verification
function TEST_EmailVerification() {
  Logger.log("🔍 Testing Email Verification...\n");
  
  const testEmails = [
    { email: "john.smith@gmail.com", expected: "Should pass - personal email" },
    { email: "careers@somecompany.com", expected: "Should FAIL - generic catch-all" },
    { email: "info@company.com", expected: "Should FAIL - generic" },
    { email: "hr@business.com", expected: "Should FAIL - generic" },
    { email: "mike.johnson@company.com", expected: "Should pass - name pattern" },
    { email: "mjohnson@company.com", expected: "Should pass - name pattern" },
    { email: "recruiting@corp.com", expected: "Should FAIL - generic" },
    { email: "sarah.williams@enterprise.com", expected: "Should pass - name pattern" }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testEmails) {
    const result = basicEmailValidation(test.email);
    const status = result.valid ? "✅ VALID" : "❌ REJECTED";
    Logger.log(`${status}: ${test.email}`);
    Logger.log(`   Expected: ${test.expected}`);
    Logger.log(`   Reason: ${result.reason}\n`);
    
    if (result.valid) passed++;
    else failed++;
  }
  
  Logger.log(`\n📊 Results: ${passed} passed validation, ${failed} rejected`);
  
  if (ABSTRACT_API_KEY && ABSTRACT_API_KEY !== "PUT_YOUR_ABSTRACT_API_KEY_HERE") {
    Logger.log("\n🔑 Abstract API key is configured - full verification available");
  } else {
    Logger.log("\n⚠️ No Abstract API key - using basic validation only");
    Logger.log("💡 Get free key at: https://www.abstractapi.com/api/email-verification-validation-api");
  }
}

// TEST 7: Run ALL tests at once
function TEST_RunAllTests() {
  Logger.log("🧪 RUNNING ALL TESTS...\n");
  
  Logger.log("--- Test 1: Spreadsheet Connection ---");
  TEST_SpreadsheetConnection();
  Logger.log("");
  
  Logger.log("--- Test 2: Gmail Permissions ---");
  TEST_GmailPermissions();
  Logger.log("");
  
  Logger.log("--- Test 3: Email Preview ---");
  TEST_PreviewEmail();
  Logger.log("");
  
  Logger.log("--- Test 4: Weekly Industry ---");
  TEST_CheckWeeklyIndustry();
  Logger.log("");
  
  Logger.log("--- Test 5: Claude API ---");
  TEST_ClaudeAPI();
  Logger.log("");
  
  Logger.log("--- Test 6: Email Verification ---");
  TEST_EmailVerification();
  Logger.log("");
  
  Logger.log("🏁 ALL TESTS COMPLETE!");
  Logger.log("Check the logs above for any ❌ failures");
}

// ==========================================
// CLEAN BAD EMAILS FROM SPREADSHEET
// Removes leads with generic/fake emails
// ==========================================
function CLEAN_BadEmails() {
  Logger.log("🧹 Scanning for bad emails to remove...\n");
  
  const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  let totalRemoved = 0;
  let totalKept = 0;
  
  for (let industryKey of CONFIG.weeklyRotation) {
    const sheet = ss.getSheetByName(industryKey);
    if (!sheet) continue;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailCol = headers.indexOf("Email");
    
    if (emailCol === -1) continue;
    
    Logger.log(`\n📋 Checking ${industryKey}...`);
    const rowsToDelete = [];
    
    for (let i = 1; i < data.length; i++) {
      const email = data[i][emailCol];
      if (!email) {
        rowsToDelete.push(i + 1);
        continue;
      }
      
      const result = basicEmailValidation(email);
      if (!result.valid) {
        Logger.log(`  ❌ ${email} - ${result.reason}`);
        rowsToDelete.push(i + 1);
      } else {
        totalKept++;
      }
    }
    
    // Delete rows from bottom to top to preserve row numbers
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      sheet.deleteRow(rowsToDelete[i]);
      totalRemoved++;
    }
    
    if (rowsToDelete.length > 0) {
      Logger.log(`  🗑️ Removed ${rowsToDelete.length} bad leads from ${industryKey}`);
    }
  }
  
  Logger.log(`\n🏁 COMPLETE!`);
  Logger.log(`✅ Kept: ${totalKept} leads with valid emails`);
  Logger.log(`🗑️ Removed: ${totalRemoved} leads with bad/generic emails`);
}

// ==========================================
// FIX EXISTING BAD EMAILS (Legacy - use CLEAN_BadEmails instead)
// ==========================================
function FIX_ExistingEmails() {
  Logger.log("⚠️ This function is deprecated. Use CLEAN_BadEmails() instead.");
  Logger.log("🔧 Starting email fix for all industry tabs...");
  let fixed = 0;
  let unfixable = 0;
  
  const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  
  for (let industryKey of CONFIG.weeklyRotation) {
    const sheet = ss.getSheetByName(industryKey);
    if (!sheet) continue;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailCol = headers.indexOf("Email");
    const websiteCol = headers.indexOf("Website");
    
    if (emailCol === -1) continue;
    
    for (let i = 1; i < data.length; i++) {
      const currentEmail = data[i][emailCol];
      const website = websiteCol !== -1 ? data[i][websiteCol] : "";
      
      if (!currentEmail) continue;
      
      // Check if it needs fixing (no @ symbol)
      if (!currentEmail.includes('@')) {
        const fixedEmail = validateAndFixEmail(currentEmail, website);
        if (fixedEmail) {
          sheet.getRange(i + 1, emailCol + 1).setValue(fixedEmail);
          Logger.log(`✅ Fixed: ${currentEmail} → ${fixedEmail}`);
          fixed++;
        } else {
          Logger.log(`❌ Unfixable: ${currentEmail}`);
          unfixable++;
        }
      }
    }
  }
  
  Logger.log(`\n🏁 COMPLETE! Fixed: ${fixed}, Unfixable: ${unfixable}`);
}

// ==========================================
// LEAD GENERATION (Runs Monday 8am)
// ==========================================
function generateWeeklyLeads() {
  try {
    Logger.log("🚀 Starting weekly lead generation...");
    
    setupIndustryTabs();
    
    const weekNumber = getWeekNumber();
    const industryKey = CONFIG.weeklyRotation[weekNumber % 14];
    const focusArea = CONFIG.industries[industryKey];
    
    Logger.log(`📅 Week ${weekNumber} - Industry Tab: ${industryKey}`);
    
    const existingCompanies = getAllExistingCompanies();
    const newLeads = callClaudeAPI(focusArea, existingCompanies, industryKey);
    
    addLeadsToIndustryTab(newLeads, weekNumber, industryKey);
    sendLeadGenNotification(weekNumber, industryKey, focusArea, newLeads.length);
    
    Logger.log("✅ Lead generation complete!");
    
  } catch (error) {
    Logger.log("❌ Error: " + error.toString());
    sendErrorEmail(error);
  }
}

// ==========================================
// ONE-TIME: Send Email 1 to All Existing Leads
// RUN THIS ONCE to kickstart the cadence
// ==========================================
function sendEmail1ToExistingLeads() {
  try {
    Logger.log("🚀 ONE-TIME: Sending Email 1 to existing 200 leads...");
    
    // Conservative: 100/day (Resend free tier)
    // Standard: 200/day (Resend Pro or Gmail direct)
    const MAX_TODAY = 100;
    let emailsSent = 0;
    const industries = CONFIG.weeklyRotation;
    
    for (let industryKey of industries) {
      if (emailsSent >= MAX_TODAY) break;
      
      const sheet = SpreadsheetApp.openById(CONFIG.spreadsheetId).getSheetByName(industryKey);
      if (!sheet) continue;
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      const colIndexes = {
        company: headers.indexOf("Company"),
        contactName: headers.indexOf("Contact Name"),
        email: headers.indexOf("Email"),
        email1: headers.indexOf("Email 1"),
        postedJob: headers.indexOf("Posted Job")
      };
      
      for (let i = 1; i < data.length; i++) {
        if (emailsSent >= MAX_TODAY) break;
        
        const row = data[i];
        const leadEmail = row[colIndexes.email];
        const email1Sent = row[colIndexes.email1];
        
        if (!leadEmail || email1Sent || email1Sent !== "") continue;
        if (row[colIndexes.postedJob] === "Yes") continue;
        
        try {
          sendCadenceEmail(industryKey, row, colIndexes, 1, i + 1, sheet);
          emailsSent++;
          
          // Random delay 5-12 seconds (looks more human, avoids spam triggers)
          const randomDelay = Math.floor(Math.random() * 7000) + 5000;
          Utilities.sleep(randomDelay);
          
          if (emailsSent % 10 === 0) {
            Logger.log(`✅ ${emailsSent} emails sent...`);
          }
        } catch (e) {
          Logger.log(`Error: ${e.toString()}`);
        }
      }
    }
    
    Logger.log(`\n🎉 COMPLETE! Sent ${emailsSent} emails`);
    
  } catch (error) {
    Logger.log(`❌ ${error.toString()}`);
  }
}

// ==========================================
// EMAIL CADENCE AUTOMATION (Runs 5x/day)
// Spam Prevention: 30 emails/run, 5-10 sec random delays
// ==========================================
function sendScheduledEmails() {
  try {
    Logger.log("📧 Starting scheduled email send...");
    
    // SPAM PREVENTION SETTINGS
    // Conservative: 20 emails × 5 runs = 100/day (Resend free tier)
    // Standard: 40 emails × 5 runs = 200/day (Resend Pro or Gmail direct)
    // Aggressive: 60 emails × 5 runs = 300/day (Gmail direct only)
    const MAX_EMAILS_THIS_RUN = 20;   // Conservative - Resend free tier limit
    const MIN_DELAY_MS = 5000;        // 5 seconds minimum
    const MAX_DELAY_MS = 10000;       // 10 seconds maximum
    
    let emailsSent = 0;
    
    const industries = CONFIG.weeklyRotation;
    
    for (let industryKey of industries) {
      if (emailsSent >= MAX_EMAILS_THIS_RUN) break;
      
      const sheet = SpreadsheetApp.openById(CONFIG.spreadsheetId).getSheetByName(industryKey);
      if (!sheet) continue;
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      const colIndexes = {
        company: headers.indexOf("Company"),
        contactName: headers.indexOf("Contact Name"),
        email: headers.indexOf("Email"),
        email1: headers.indexOf("Email 1"),
        email2: headers.indexOf("Email 2"),
        email3: headers.indexOf("Email 3"),
        email4: headers.indexOf("Email 4"),
        email5: headers.indexOf("Email 5"),
        clicked: headers.indexOf("Clicked"),
        postedJob: headers.indexOf("Posted Job")
      };
      
      for (let i = 1; i < data.length; i++) {
        if (emailsSent >= MAX_EMAILS_THIS_RUN) break;
        
        const row = data[i];
        const leadEmail = row[colIndexes.email];
        
        if (!leadEmail || leadEmail === "") continue;
        
        const emailToSend = determineNextEmail(row, colIndexes);
        
        if (emailToSend) {
          try {
            sendCadenceEmail(industryKey, row, colIndexes, emailToSend, i + 1, sheet);
            emailsSent++;
            
            // Random delay between 5-10 seconds (looks more human)
            const randomDelay = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
            Utilities.sleep(randomDelay);
          } catch (e) {
            Logger.log(`Error sending to ${leadEmail}: ${e.toString()}`);
          }
        }
      }
    }
    
    Logger.log(`✅ Sent ${emailsSent} emails this run`);
    
  } catch (error) {
    Logger.log(`❌ Email send error: ${error.toString()}`);
  }
}

// ==========================================
// DETERMINE NEXT EMAIL TO SEND
// ==========================================
function determineNextEmail(row, colIndexes) {
  const email1Date = row[colIndexes.email1];
  const email2Date = row[colIndexes.email2];
  const email3Date = row[colIndexes.email3];
  const email4Date = row[colIndexes.email4];
  const email5Date = row[colIndexes.email5];
  
  if (row[colIndexes.postedJob] === "Yes") return null;
  
  if (!email1Date || email1Date === "") {
    return 1;
  }
  
  if (email1Date && (!email2Date || email2Date === "")) {
    if (getDaysSince(email1Date) >= 4) return 2;
  }
  
  if (email2Date && (!email3Date || email3Date === "")) {
    if (getDaysSince(email2Date) >= 4) return 3;
  }
  
  if (email3Date && (!email4Date || email4Date === "")) {
    if (getDaysSince(email3Date) >= 7) return 4;
  }
  
  if (email4Date && (!email5Date || email5Date === "")) {
    if (getDaysSince(email4Date) >= 6) return 5;
  }
  
  return null;
}

// ==========================================
// SEND CADENCE EMAIL
// ==========================================
function sendCadenceEmail(industryKey, row, colIndexes, emailNumber, rowNumber, sheet) {
  const company = row[colIndexes.company];
  const contactName = row[colIndexes.contactName];
  let recipientEmail = row[colIndexes.email];
  
  // Validate and potentially fix the email
  recipientEmail = validateAndFixEmail(recipientEmail, row[colIndexes.website]);
  if (!recipientEmail) {
    Logger.log(`⚠️ Skipping row ${rowNumber}: Invalid email`);
    return false; // Signal that email was not sent
  }
  
  const greeting = getSmartGreeting(contactName, recipientEmail);
  const template = getEmailTemplate(industryKey, emailNumber);
  
  const subject = template.subject;
  let body = template.body
    .replace(/{greeting}/g, greeting)
    .replace(/{company}/g, company)
    .replace(/{firstName}/g, contactName.split(' ')[0])
    .replace(/{website}/g, WEBSITE_URL);
  
  // Build professional HTML email
  const htmlBody = buildProfessionalEmail(body);
  
  GmailApp.sendEmail(recipientEmail, subject, body, {
    from: SENDER_EMAIL,
    name: SENDER_NAME,
    htmlBody: htmlBody
  });
  
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/dd/yyyy");
  const emailColIndex = colIndexes[`email${emailNumber}`];
  sheet.getRange(rowNumber, emailColIndex + 1).setValue(today);
  
  Logger.log(`✅ Sent Email ${emailNumber} to ${recipientEmail} (${industryKey})`);
  return true; // Signal success
}

// ==========================================
// SMART GREETING DETECTION
// ==========================================
function getSmartGreeting(contactName, email) {
  // Generic email prefixes that should get "Hey"
  const genericEmailPrefixes = [
    'recruiting', 'careers', 'hr', 'jobs', 'hiring', 'talent', 
    'info', 'contact', 'hello', 'support', 'admin', 'office',
    'partners', 'team', 'sales', 'marketing', 'general', 'enquiries',
    'inquiries', 'apply', 'applications', 'employment', 'staffing',
    'operations', 'production', 'services', 'business', 'corporate',
    'renewable', 'renewables', 'solar', 'wind', 'energy', 'power',
    'nuclear', 'construction', 'offshore', 'oil', 'gas', 'defense',
    'aerospace', 'mining', 'industrial', 'manufacturing', 'data'
  ];
  
  // Words that are NOT first names (company/business/industry words)
  const notFirstNames = [
    // Business terms
    'skilled', 'professional', 'technical', 'industrial', 'advanced',
    'premier', 'elite', 'quality', 'precision', 'superior', 'global',
    'national', 'american', 'united', 'central', 'western', 'eastern',
    'northern', 'southern', 'gulf', 'coastal', 'atlantic', 'pacific',
    'construction', 'staffing', 'services', 'solutions', 'group',
    'industries', 'enterprises', 'resources', 'partners', 'associates',
    'contractors', 'consulting', 'management', 'systems', 'technologies',
    'hr', 'human', 'talent', 'workforce', 'employment', 'recruiting',
    'the', 'a', 'an', 'and', 'or', 'of', 'for', 'at', 'by', 'to', 'in',
    // Industry terms (ALL industries we target)
    'renewable', 'renewables', 'solar', 'wind', 'battery', 'clean',
    'nuclear', 'atomic', 'radiation', 'reactor',
    'power', 'powergen', 'generation', 'utility', 'electric', 'electrical',
    'oil', 'gas', 'petroleum', 'drilling', 'pipeline', 'refinery', 'petro',
    'offshore', 'marine', 'subsea', 'platform', 'rig',
    'construction', 'infrastructure', 'civil', 'heavy', 'builder',
    'aerospace', 'aviation', 'aircraft', 'mro', 'defense', 'defence',
    'mining', 'mineral', 'quarry', 'excavation',
    'shipbuilding', 'shipyard', 'naval', 'maritime', 'vessel',
    'data', 'datacenter', 'ai', 'infrastructure', 'compute', 'gpu',
    'semiconductor', 'chip', 'fab', 'wafer', 'cleanroom',
    'manufacturing', 'factory', 'plant', 'production', 'assembly',
    'energy', 'maintenance', 'mechanical', 'welding', 'fabrication',
    // Common generic contact names
    'mortenson', 'swinerton', 'kiewit', 'fluor', 'bechtel', 'jacobs'
  ];
  
  const emailPrefix = email ? email.split('@')[0].toLowerCase() : '';
  
  // Check if email prefix is generic
  if (genericEmailPrefixes.some(prefix => emailPrefix.includes(prefix))) {
    return "Hey";
  }
  
  // Check if contact name exists and has a valid first name
  if (!contactName || contactName.trim() === '') {
    return "Hey";
  }
  
  const firstName = contactName.split(' ')[0].trim();
  
  // Check if "first name" is actually a business/industry word, not a person's name
  if (notFirstNames.includes(firstName.toLowerCase())) {
    return "Hey";
  }
  
  // Check if first name is too short or too long (likely not a real name)
  if (firstName.length < 2 || firstName.length > 15) {
    return "Hey";
  }
  
  // Check if first name contains numbers or special characters
  if (/[0-9@#$%^&*()_+=\[\]{}|\\:";'<>?,./]/.test(firstName)) {
    return "Hey";
  }
  
  // Check if first name starts with a capital and is mostly letters (real name pattern)
  if (!/^[A-Z][a-z]+$/.test(firstName)) {
    return "Hey";
  }
  
  return `Hi ${firstName}`;
}

// ==========================================
// PROFESSIONAL HTML EMAIL BUILDER
// ==========================================
function buildProfessionalEmail(bodyText) {
  // Convert markdown-style bold **text** to HTML
  let htmlContent = bodyText
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  
  // Remove the plain text signature (we'll add HTML version)
  htmlContent = htmlContent
    .replace(/<br><br>Best,<br>Noah/g, '')
    .replace(/Best,<br>Noah/g, '');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1a1a1a;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- Email Body -->
    <div style="margin-bottom: 30px;">
      ${htmlContent}
    </div>
    
    <!-- Professional Signature -->
    <table cellpadding="0" cellspacing="0" border="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
      <tr>
        <td style="vertical-align: top;">
          <div style="font-weight: 600; font-size: 15px; color: #1a1a1a; margin-bottom: 2px;">Noah Thomas</div>
          <div style="font-size: 13px; color: #4b5563; margin-bottom: 6px;">Founder, Field-Jobs</div>
          <div style="font-size: 13px;">
            <a href="https://field-job.com?utm_source=email&utm_medium=signature" style="color: #2563eb; text-decoration: none; font-weight: 500;">🌐 field-job.com</a>
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 6px; font-style: italic;">
            4,000+ traveling workers ready for your next project
          </div>
        </td>
      </tr>
    </table>
    
    <!-- Footer -->
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af;">
      <p style="margin: 0;">
        Field-Jobs | <a href="https://field-job.com" style="color: #6b7280;">field-job.com</a>
      </p>
    </div>
    
  </div>
</body>
</html>`;
}

// ==========================================
// EMAIL VERIFICATION
// ==========================================

/**
 * Verifies if an email address is real and deliverable
 * Uses AbstractAPI for verification (100 free/month)
 * Returns: { valid: boolean, reason: string }
 */
function verifyEmail(email) {
  // Skip verification if no API key configured
  if (!ABSTRACT_API_KEY || ABSTRACT_API_KEY === "PUT_YOUR_ABSTRACT_API_KEY_HERE") {
    Logger.log(`⚠️ No Abstract API key - using basic validation for ${email}`);
    return basicEmailValidation(email);
  }
  
  try {
    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${ABSTRACT_API_KEY}&email=${encodeURIComponent(email)}`;
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const result = JSON.parse(response.getContentText());
    
    // Check deliverability
    if (result.deliverability === "DELIVERABLE") {
      Logger.log(`✅ Verified: ${email}`);
      return { valid: true, reason: "Verified deliverable" };
    }
    
    if (result.deliverability === "RISKY" && result.is_valid_format?.value) {
      Logger.log(`⚠️ Risky but valid format: ${email}`);
      return { valid: true, reason: "Risky - proceed with caution" };
    }
    
    Logger.log(`❌ Invalid: ${email} - ${result.deliverability}`);
    return { valid: false, reason: result.deliverability || "Undeliverable" };
    
  } catch (error) {
    Logger.log(`⚠️ Verification error for ${email}: ${error.toString()}`);
    // Fall back to basic validation on API error
    return basicEmailValidation(email);
  }
}

/**
 * Basic email validation without API
 * Checks format and rejects obvious fake patterns
 */
function basicEmailValidation(email) {
  if (!email || !email.includes('@') || !email.includes('.')) {
    return { valid: false, reason: "Invalid format" };
  }
  
  email = email.toLowerCase().trim();
  
  // Reject generic catch-all patterns that usually bounce
  const genericPatterns = [
    /^careers@/,
    /^info@/,
    /^hr@/,
    /^jobs@/,
    /^hiring@/,
    /^recruiting@/,
    /^talent@/,
    /^apply@/,
    /^employment@/,
    /^contact@/,
    /^hello@/,
    /^support@/,
    /^admin@/,
    /^office@/,
    /^general@/
  ];
  
  for (const pattern of genericPatterns) {
    if (pattern.test(email)) {
      return { valid: false, reason: "Generic catch-all email - likely to bounce" };
    }
  }
  
  // Must have a person's name pattern (first.last@, flast@, firstl@)
  const emailPrefix = email.split('@')[0];
  if (emailPrefix.length < 3) {
    return { valid: false, reason: "Email prefix too short" };
  }
  
  // Check for name-like patterns
  const hasNamePattern = /^[a-z]+\.[a-z]+@/.test(email) ||  // first.last@
                         /^[a-z][a-z]+[0-9]*@/.test(email);  // firstlast@ or fname@
  
  if (!hasNamePattern) {
    return { valid: false, reason: "Doesn't look like a personal email" };
  }
  
  return { valid: true, reason: "Passed basic validation" };
}

/**
 * Verify a batch of leads and return only verified ones
 */
function verifyLeadEmails(leads) {
  const verifiedLeads = [];
  let verified = 0;
  let rejected = 0;
  
  for (const lead of leads) {
    // Add delay to avoid rate limiting
    if (ABSTRACT_API_KEY && ABSTRACT_API_KEY !== "PUT_YOUR_ABSTRACT_API_KEY_HERE") {
      Utilities.sleep(500); // 500ms between API calls
    }
    
    const result = verifyEmail(lead.email);
    
    if (result.valid) {
      lead.verificationStatus = result.reason;
      verifiedLeads.push(lead);
      verified++;
    } else {
      Logger.log(`🚫 Rejected: ${lead.email} (${result.reason})`);
      rejected++;
    }
  }
  
  Logger.log(`\n📊 Verification Results: ${verified} verified, ${rejected} rejected`);
  return verifiedLeads;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getDaysSince(dateString) {
  if (!dateString || dateString === "") return 999;
  const date = new Date(dateString);
  const today = new Date();
  const diff = today - date;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.floor(diff / oneWeek);
}

// ==========================================
// LEAD GENERATION FUNCTIONS
// ==========================================

function setupIndustryTabs() {
  const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const headers = ["Company", "Contact Name", "Email", "Phone", "Website", "Location", "Notes", "Week Added", "Email 1", "Email 2", "Email 3", "Email 4", "Email 5", "Clicked", "Posted Job"];
  
  for (let industryKey of CONFIG.weeklyRotation) {
    let sheet = ss.getSheetByName(industryKey);
    
    if (!sheet) {
      sheet = ss.insertSheet(industryKey);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
      Logger.log(`📋 Created new tab: ${industryKey}`);
    }
  }
}

function callClaudeAPI(focusArea, existingCompanies, industryKey) {
  const prompt = `You are a B2B lead researcher finding REAL, VERIFIED contact information for Field-Jobs, a job board for traveling technical workers.

TASK: Find 50 companies in this industry with REAL, PUBLICLY AVAILABLE email addresses:
"${focusArea}"

⚠️ CRITICAL - ONLY REAL EMAILS:
- ONLY include leads where you can find a REAL email address that is publicly listed
- Sources: Company career pages, job postings, LinkedIn profiles, press releases, industry directories
- DO NOT GUESS or make up email addresses
- DO NOT use generic patterns like careers@, info@, hr@ unless you KNOW it's real
- If you cannot find a real email for a company, DO NOT include that company
- Quality over quantity - 20 verified leads is better than 100 fake ones

WHAT MAKES A REAL EMAIL:
✅ john.smith@company.com (specific person from LinkedIn/website)
✅ recruiting@company.com (if listed on their careers page)
✅ jsmith@company.com (found in job posting contact)
❌ careers@company.com (guessed - NOT acceptable)
❌ info@company.com (generic guess - NOT acceptable)
❌ hr@company.com (guessed - NOT acceptable)

REQUIREMENTS:
1. Companies that hire traveling/contract technical workers
2. Include ONLY leads with VERIFIED email addresses you found from real sources
3. Focus on: Recruiters, HR contacts, Hiring managers with public contact info
4. EXCLUDE: ${existingCompanies.slice(0, 50).join(', ')}

OUTPUT FORMAT (JSON array):
[
  {
    "company": "Company Name",
    "contactName": "John Smith",
    "email": "john.smith@company.com",
    "phone": "555-123-4567",
    "website": "company.com",
    "location": "Houston, TX",
    "notes": "Email found on company careers page",
    "emailSource": "careers page" 
  }
]

IMPORTANT: It's better to return 10 leads with REAL emails than 100 with guessed emails.
Return ONLY the JSON array, no other text.`;

  const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    payload: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: prompt
      }]
    })
  });
  
  const result = JSON.parse(response.getContentText());
  const content = result.content[0].text;
  
  // Extract JSON from response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    const rawLeads = JSON.parse(jsonMatch[0]);
    
    // Step 1: Basic format validation
    const formattedLeads = rawLeads.map(lead => {
      if (lead.email && lead.email.includes('@')) {
        return lead;
      }
      return null;
    }).filter(lead => lead !== null);
    
    Logger.log(`📋 Claude returned ${rawLeads.length} leads, ${formattedLeads.length} have valid email format`);
    
    // Step 2: Verify emails are real and deliverable
    Logger.log(`🔍 Verifying ${formattedLeads.length} email addresses...`);
    const verifiedLeads = verifyLeadEmails(formattedLeads);
    
    Logger.log(`✅ ${verifiedLeads.length} leads passed verification`);
    return verifiedLeads;
  }
  
  return [];
}

/**
 * Validates and attempts to fix email addresses
 * If email is just a domain, prepends "careers@"
 * Returns null for completely invalid emails
 */
function validateAndFixEmail(email, website) {
  if (!email) return null;
  
  email = email.trim().toLowerCase();
  
  // Already a valid email format
  if (email.includes('@') && email.includes('.')) {
    return email;
  }
  
  // Looks like just a domain (e.g., "company.com") - try to fix it
  if (email.includes('.') && !email.includes('@')) {
    const fixedEmail = `careers@${email}`;
    Logger.log(`📧 Fixed email: ${email} → ${fixedEmail}`);
    return fixedEmail;
  }
  
  // Try using website to construct email
  if (!email.includes('@') && website) {
    const domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    if (domain && domain.includes('.')) {
      const fixedEmail = `careers@${domain}`;
      Logger.log(`📧 Constructed email from website: ${fixedEmail}`);
      return fixedEmail;
    }
  }
  
  // Completely invalid
  Logger.log(`❌ Invalid email, skipping: ${email}`);
  return null;
}

function addLeadsToIndustryTab(leads, weekNumber, industryKey) {
  const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const sheet = ss.getSheetByName(industryKey);
  
  if (!sheet || leads.length === 0) return;
  
  const rows = leads.map(lead => [
    lead.company || "",
    lead.contactName || "",
    lead.email || "",
    lead.phone || "",
    lead.website || "",
    lead.location || "",
    lead.notes || "",
    `Week ${weekNumber}`,
    "", "", "", "", "", "", "" // Email 1-5, Clicked, Posted Job
  ]);
  
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, rows.length, rows[0].length).setValues(rows);
  
  Logger.log(`✅ Added ${leads.length} leads to ${industryKey} tab`);
}

function getAllExistingCompanies() {
  const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const companies = [];
  
  for (let industryKey of CONFIG.weeklyRotation) {
    const sheet = ss.getSheetByName(industryKey);
    if (!sheet) continue;
    
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) companies.push(data[i][0]);
    }
  }
  
  return companies;
}

function sendLeadGenNotification(weekNumber, industryKey, focusArea, leadCount) {
  const subject = `✅ Field-Jobs Lead Gen Complete - Week ${weekNumber}`;
  const body = `Lead Generation Complete!

Week: ${weekNumber}
Industry: ${industryKey}
Focus: ${focusArea}
New Leads Added: ${leadCount}

View spreadsheet: https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}`;

  GmailApp.sendEmail(SENDER_EMAIL, subject, body);
}

function sendErrorEmail(error) {
  const subject = "❌ Field-Jobs Lead Gen Error";
  const body = `An error occurred during lead generation:

${error.toString()}

Stack: ${error.stack || "N/A"}`;

  GmailApp.sendEmail(SENDER_EMAIL, subject, body);
}

// ==========================================
// EMAIL TEMPLATES - ALL 14 INDUSTRIES
// HONEST: Only claims what the platform actually delivers
// ==========================================
function getEmailTemplate(industryKey, emailNumber) {
  const templates = {
    
    // ========== STAFFING ==========
    "Staffing": {
      1: {
        subject: "Workers who actually want to travel",
        body: `{greeting},

The hardest part of staffing traveling roles? Finding people who actually want road work.

Field-Jobs is a job board built specifically for traveling tradespeople. Everyone on our platform signed up because they want project-based work with per diem.

No convincing needed. They already get it.

How long does it take {company} to fill a traveling role right now?

{website}

Best,
Noah`
      },
      2: {
        subject: "Your first job post is free",
        body: `{greeting},

Simple offer: Post your first job on Field-Jobs completely free.

See the candidate quality yourself. If it works, keep posting. If not, you spent nothing.

Our platform is built for one thing: connecting employers with workers who want to travel.

**Post free:** {website}/employers

Best,
Noah`
      },
      3: {
        subject: "Skip the 'will you travel?' conversation",
        body: `{greeting},

On Indeed, half your screening calls are explaining per diem to people who've never left town.

On Field-Jobs, everyone already wants road work. That's why they signed up.

**Try it free:** {website}/employers

Best,
Noah`
      },
      4: {
        subject: "Time-to-fill is killing margins",
        body: `{greeting},

Every day a role sits empty:
• Billable hours lost
• Client relationships strained
• Margin evaporating

Faster fills = more margin captured.

**Post free:** {website}/employers

Best,
Noah`
      },
      5: {
        subject: "Last note from me",
        body: `{greeting},

Workers who want to travel. Your first post is free. Zero risk.

**{website}/employers**

Best,
Noah`
      }
    },
    
    // ========== NUCLEAR ==========
    "Nuclear": {
      1: {
        subject: "Outage workers who want outage work",
        body: `{greeting},

The challenge with nuclear outages: everyone needs workers at the same time, and most job boards show you people who've never worked a shutdown.

Field-Jobs is built for traveling technical workers. People sign up because they want project-based work - including outage season.

How many positions does {company} need for spring outages?

{website}

Best,
Noah`
      },
      2: {
        subject: "Your first outage post is free",
        body: `{greeting},

Post your first outage role on Field-Jobs - completely free.

See who applies. Our platform attracts workers specifically looking for traveling technical work.

If the candidates fit, keep posting. If not, no cost.

**Post free:** {website}/employers

Best,
Noah`
      },
      3: {
        subject: "Built for project-based work",
        body: `{greeting},

Generic job boards attract people looking for permanent local jobs.

Field-Jobs attracts people looking for project-based technical work. Different candidate pool entirely.

**Try it free:** {website}/employers

Best,
Noah`
      },
      4: {
        subject: "Outage delays are expensive",
        body: `{greeting},

Every day of crew mobilization delay:
• Lost revenue from offline units
• Bonus targets at risk
• Schedule cascades

Faster fills matter.

**Post free:** {website}/employers

Best,
Noah`
      },
      5: {
        subject: "Spring outages are close",
        body: `{greeting},

Workers looking for outage work. First post free.

**{website}/employers**

Best,
Noah`
      }
    },
    
    // ========== POWER GENERATION ==========
    "PowerGen": {
      1: {
        subject: "Plant workers who understand shutdowns",
        body: `{greeting},

Filling maintenance roles for plant outages is tough. Most applicants have never worked inside a power plant.

Field-Jobs is a job board for traveling technical workers. People sign up because they want project-based work - including plant shutdowns.

How many maintenance positions is {company} filling right now?

{website}

Best,
Noah`
      },
      2: {
        subject: "Your first plant job post is free",
        body: `{greeting},

Post your first plant maintenance role on Field-Jobs - completely free.

Our platform attracts workers looking for traveling technical work, not people seeking permanent local jobs.

See the difference yourself.

**Post free:** {website}/employers

Best,
Noah`
      },
      3: {
        subject: "Different candidate pool",
        body: `{greeting},

Indeed attracts people looking for any job near home.

Field-Jobs attracts people specifically seeking traveling technical work. Different pool.

**Try it free:** {website}/employers

Best,
Noah`
      },
      4: {
        subject: "Outage delays add up fast",
        body: `{greeting},

Every hour offline costs money:
• Lost generation revenue
• Extended labor costs
• Schedule pressure

Faster staffing = shorter outages.

**Post free:** {website}/employers

Best,
Noah`
      },
      5: {
        subject: "Outage season approaching",
        body: `{greeting},

Workers seeking plant work. First post free.

**{website}/employers**

Best,
Noah`
      }
    },
    
    // ========== OIL & GAS ==========
    "OilGas": {
      1: {
        subject: "Turnaround workers who want the hours",
        body: `{greeting},

The hardest part of turnaround staffing? Finding people who actually want 7/12s and understand per diem.

Field-Jobs is built for traveling tradespeople. Everyone on our platform signed up because they want project-based work with big hours.

How many bodies does {company} need for spring turnarounds?

{website}

Best,
Noah`
      },
      2: {
        subject: "Your first turnaround post is free",
        body: `{greeting},

Post your first turnaround role on Field-Jobs - completely free.

Our platform attracts workers specifically looking for project-based work. They want the hours. No convincing needed.

**Post free:** {website}/employers

Best,
Noah`
      },
      3: {
        subject: "Workers who want 7/12s",
        body: `{greeting},

On Indeed, you're explaining 84-hour weeks to people who wanted 40.

On Field-Jobs, workers sign up because they want big hours and per diem.

**Try it free:** {website}/employers

Best,
Noah`
      },
      4: {
        subject: "Turnaround delays are expensive",
        body: `{greeting},

Every day of crew delay:
• Lost production revenue
• Completion bonuses at risk
• Penalty exposure

Faster mobilization matters.

**Post free:** {website}/employers

Best,
Noah`
      },
      5: {
        subject: "Turnaround season is coming",
        body: `{greeting},

Workers who want project work. First post free.

**{website}/employers**

Best,
Noah`
      }
    },
    
    // ========== OFFSHORE ==========
    "Offshore": {
      1: {
        subject: "Workers who want hitch rotations",
        body: `{greeting},

Offshore staffing challenge: finding people who actually want to work hitches, not people you have to convince.

Field-Jobs is built for traveling technical workers. People sign up because they want project-based work - including offshore rotations.

How many offshore positions is {company} trying to fill?

{website}

Best,
Noah`
      },
      2: {
        subject: "Your first offshore post is free",
        body: `{greeting},

Post your first offshore role on Field-Jobs - completely free.

Our platform attracts workers looking for traveling work. They understand what they're signing up for.

**Post free:** {website}/employers

Best,
Noah`
      },
      3: {
        subject: "Workers who understand the lifestyle",
        body: `{greeting},

Generic job boards show you people looking for 9-to-5s near home.

Field-Jobs shows you people seeking traveling technical work.

**Try it free:** {website}/employers

Best,
Noah`
      },
      4: {
        subject: "Offshore delays cost production",
        body: `{greeting},

Staffing gaps offshore:
• Lost production daily
• Mobilization scrambles
• Timeline pressure

Better candidate flow helps.

**Post free:** {website}/employers

Best,
Noah`
      },
      5: {
        subject: "Offshore crews needed",
        body: `{greeting},

Workers seeking offshore rotations. First post free.

**{website}/employers**

Best,
Noah`
      }
    },
    
    // ========== RENEWABLE ==========
    "Renewable": {
      1: {
        subject: "Solar workers who want to travel site-to-site",
        body: `{greeting},

Biggest challenge staffing solar projects? Finding workers willing to travel to remote sites.

Field-Jobs is built for traveling workers. Everyone signed up because they want project-based work - including utility-scale solar.

How many sites is {company} trying to staff right now?

{website}

Best,
Noah`
      },
      2: {
        subject: "Your first solar job post is free",
        body: `{greeting},

Post your first solar role on Field-Jobs - completely free.

Our platform attracts workers specifically looking for traveling project work. Remote sites don't scare them.

**Post free:** {website}/employers

Best,
Noah`
      },
      3: {
        subject: "Workers willing to go remote",
        body: `{greeting},

Indeed shows you people who want jobs near home.

Field-Jobs shows you people who signed up specifically for traveling work.

**Try it free:** {website}/employers

Best,
Noah`
      },
      4: {
        subject: "Project delays are expensive",
        body: `{greeting},

Late solar project completion:
• PPA revenue delays
• Penalty exposure
• ITC timing risk

Faster staffing helps.

**Post free:** {website}/employers

Best,
Noah`
      },
      5: {
        subject: "Solar projects ramping",
        body: `{greeting},

Workers who want solar project work. First post free.

**{website}/employers**

Best,
Noah`
      }
    },
    
    // ========== CONSTRUCTION ==========
    "Construction": {
      1: {
        subject: "Construction workers who want project work",
        body: `{greeting},

Heavy construction staffing challenge: finding workers who understand project-based work and per diem, not people looking for permanent local jobs.

Field-Jobs is built for traveling workers. They signed up because they want to go where the projects are.

What's {company}'s biggest staffing challenge right now?

{website}

Best,
Noah`
      },
      2: {
        subject: "Your first construction post is free",
        body: `{greeting},

Post your first construction role on Field-Jobs - completely free.

Our platform attracts workers seeking project-based work. They expect travel and per diem.

**Post free:** {website}/employers

Best,
Noah`
      },
      3: {
        subject: "Project workers, not permanent seekers",
        body: `{greeting},

Indeed attracts people looking for permanent jobs near home.

Field-Jobs attracts people looking for project-based traveling work.

**Try it free:** {website}/employers

Best,
Noah`
      },
      4: {
        subject: "Project delays hurt",
        body: `{greeting},

Staffing gaps on projects:
• Penalty clauses
• Extended overhead
• Schedule cascades

Faster fills = fewer delays.

**Post free:** {website}/employers

Best,
Noah`
      },
      5: {
        subject: "Projects need workers",
        body: `{greeting},

Workers seeking construction projects. First post free.

**{website}/employers**

Best,
Noah`
      }
    },
    
    // ========== AEROSPACE ==========
    "Aerospace": {
      1: {
        subject: "Technical workers for aerospace",
        body: `{greeting},

Aerospace staffing challenge: finding workers with relevant technical backgrounds, not just anyone with a toolbox.

Field-Jobs is built for technical workers seeking project-based roles. They select their industries when signing up.

How many technical positions is {company} trying to fill?

{website}

Best,
Noah`
      },
      2: {
        subject: "Your first aerospace post is free",
        body: `{greeting},

Post your first aerospace role on Field-Jobs - completely free.

Workers on our platform select aerospace as an industry interest. You're reaching people who want this work.

**Post free:** {website}/employers

Best,
Noah`
      },
      3: {
        subject: "Workers who selected aerospace",
        body: `{greeting},

On generic boards, you're fishing in a general pool.

On Field-Jobs, workers select their industries. You reach people who want aerospace work.

**Try it free:** {website}/employers

Best,
Noah`
      },
      4: {
        subject: "Downtime is expensive",
        body: `{greeting},

Staffing gaps in aerospace:
• Aircraft sitting idle
• Customer pressure
• Revenue loss

Better candidate flow helps.

**Post free:** {website}/employers

Best,
Noah`
      },
      5: {
        subject: "Aerospace workers available",
        body: `{greeting},

Workers interested in aerospace. First post free.

**{website}/employers**

Best,
Noah`
      }
    },
    
    // ========== DEFENSE ==========
    "Defense": {
      1: {
        subject: "Workers with security clearances",
        body: `{greeting},

Defense staffing challenge: finding workers who already have clearances.

Field-Jobs asks workers about security clearances when they sign up. You can find candidates who already have the access you need.

How many cleared positions does {company} need filled?

{website}

Best,
Noah`
      },
      2: {
        subject: "Your first defense post is free",
        body: `{greeting},

Post your first defense role on Field-Jobs - completely free.

Workers on our platform indicate their clearance status. You're not starting from zero.

**Post free:** {website}/employers

Best,
Noah`
      },
      3: {
        subject: "Filter by clearance status",
        body: `{greeting},

Generic job boards don't ask about clearances.

Field-Jobs does. Workers indicate their clearance status when signing up.

**Try it free:** {website}/employers

Best,
Noah`
      },
      4: {
        subject: "Clearance gaps slow contracts",
        body: `{greeting},

Staffing gaps on cleared work:
• Milestone delays
• Contract risk
• Customer frustration

Finding cleared workers faster helps.

**Post free:** {website}/employers

Best,
Noah`
      },
      5: {
        subject: "Cleared workers available",
        body: `{greeting},

Workers who've indicated clearances. First post free.

**{website}/employers**

Best,
Noah`
      }
    },
    
    // ========== ELECTRIC T&D ==========
    "ElectricTD": {
      1: {
        subject: "Utility workers who want to travel",
        body: `{greeting},

Utility staffing challenge: finding workers willing to travel for line work, not people looking for permanent local jobs.

Field-Jobs is built for traveling workers. They signed up because they want project-based and traveling work.

How many positions does {company} need?

{website}

Best,
Noah`
      },
      2: {
        subject: "Your first utility post is free",
        body: `{greeting},

Post your first utility role on Field-Jobs - completely free.

Our platform attracts workers looking for traveling work. Storm response, project work - they're ready.

**Post free:** {website}/employers

Best,
Noah`
      },
      3: {
        subject: "Travelers, not locals",
        body: `{greeting},

Indeed shows you people looking for permanent jobs near home.

Field-Jobs shows you people seeking traveling work.

**Try it free:** {website}/employers

Best,
Noah`
      },
      4: {
        subject: "Storm season needs prep",
        body: `{greeting},

Staffing gaps during storm response:
• Utility penalty clauses
• Customer complaints
• Reputation damage

Pre-position your candidate pipeline.

**Post free:** {website}/employers

Best,
Noah`
      },
      5: {
        subject: "Storm season approaching",
        body: `{greeting},

Workers seeking utility work. First post free.

**{website}/employers**

Best,
Noah`
      }
    },
    
    // ========== PULP & PAPER ==========
    "PulpPaper": {
      1: {
        subject: "Workers for mill shutdowns",
        body: `{greeting},

Mill shutdown staffing challenge: finding workers who understand project-based maintenance work.

Field-Jobs is built for traveling technical workers. They signed up because they want shutdown and project work.

How many maintenance positions does {company} need?

{website}

Best,
Noah`
      },
      2: {
        subject: "Your first mill post is free",
        body: `{greeting},

Post your first mill role on Field-Jobs - completely free.

Our platform attracts workers specifically looking for project-based technical work.

**Post free:** {website}/employers

Best,
Noah`
      },
      3: {
        subject: "Project workers, not permanent seekers",
        body: `{greeting},

Generic boards show you people wanting permanent jobs.

Field-Jobs shows you people seeking project and shutdown work.

**Try it free:** {website}/employers

Best,
Noah`
      },
      4: {
        subject: "Shutdown delays cost",
        body: `{greeting},

Staffing gaps during shutdowns:
• Extended downtime
• Lost production
• Delivery penalties

Faster fills = shorter shutdowns.

**Post free:** {website}/employers

Best,
Noah`
      },
      5: {
        subject: "Shutdown season coming",
        body: `{greeting},

Workers seeking shutdown work. First post free.

**{website}/employers**

Best,
Noah`
      }
    },
    
    // ========== MANUFACTURING ==========
    "Manufacturing": {
      1: {
        subject: "Maintenance techs for manufacturing",
        body: `{greeting},

Manufacturing maintenance challenge: finding workers with industrial experience, not just general handyman types.

Field-Jobs is built for technical workers. They select their industries and skills when signing up.

How many maintenance positions does {company} have open?

{website}

Best,
Noah`
      },
      2: {
        subject: "Your first manufacturing post is free",
        body: `{greeting},

Post your first manufacturing role on Field-Jobs - completely free.

Workers on our platform are technical workers who've selected their industry interests and skills.

**Post free:** {website}/employers

Best,
Noah`
      },
      3: {
        subject: "Technical workers, not generalists",
        body: `{greeting},

Indeed shows you anyone looking for any job.

Field-Jobs shows you technical workers who've indicated their skills and industries.

**Try it free:** {website}/employers

Best,
Noah`
      },
      4: {
        subject: "Downtime costs production",
        body: `{greeting},

Maintenance staffing gaps:
• Lost production hourly
• Customer delivery risk
• Equipment damage risk

Faster fills = less downtime.

**Post free:** {website}/employers

Best,
Noah`
      },
      5: {
        subject: "Maintenance techs available",
        body: `{greeting},

Technical workers seeking manufacturing roles. First post free.

**{website}/employers**

Best,
Noah`
      }
    },
    
    // ========== MINING ==========
    "Mining": {
      1: {
        subject: "Workers willing to go remote",
        body: `{greeting},

Mining staffing challenge: finding people who actually want remote site work, not people who'll quit after week one.

Field-Jobs is built for traveling workers. They signed up because they want project-based work - including remote sites.

How many remote positions does {company} need filled?

{website}

Best,
Noah`
      },
      2: {
        subject: "Your first mining post is free",
        body: `{greeting},

Post your first mining role on Field-Jobs - completely free.

Our platform attracts workers specifically looking for traveling and remote work. They know what they're signing up for.

**Post free:** {website}/employers

Best,
Noah`
      },
      3: {
        subject: "Workers who won't bail",
        body: `{greeting},

Generic boards show you city workers who don't understand remote site life.

Field-Jobs shows you people who signed up for traveling work.

**Try it free:** {website}/employers

Best,
Noah`
      },
      4: {
        subject: "Remote site turnover is expensive",
        body: `{greeting},

Every worker who quits early:
• Mobilization costs wasted
• Production disruption
• Replacement scramble

Better-fit candidates reduce turnover.

**Post free:** {website}/employers

Best,
Noah`
      },
      5: {
        subject: "Remote site workers available",
        body: `{greeting},

Workers who want remote site work. First post free.

**{website}/employers**

Best,
Noah`
      }
    },
    
    // ========== AI INFRASTRUCTURE ==========
    "AIInfra": {
      1: {
        subject: "Technical workers for data center builds",
        body: `{greeting},

Data center staffing challenge: finding technical workers who understand critical infrastructure, not just general IT.

Field-Jobs is built for technical workers seeking project-based roles. They select their industries when signing up - including data centers.

How many positions does {company} need for the build?

{website}

Best,
Noah`
      },
      2: {
        subject: "Your first data center post is free",
        body: `{greeting},

Post your first data center role on Field-Jobs - completely free.

Workers on our platform are technical workers seeking project work. See who applies.

**Post free:** {website}/employers

Best,
Noah`
      },
      3: {
        subject: "Technical workers, not IT generalists",
        body: `{greeting},

Generic boards show you anyone in IT.

Field-Jobs shows you technical workers interested in infrastructure project work.

**Try it free:** {website}/employers

Best,
Noah`
      },
      4: {
        subject: "Build delays are expensive",
        body: `{greeting},

Staffing gaps on data center builds:
• Timeline delays
• Customer pressure
• Competitive risk

Faster staffing keeps builds on track.

**Post free:** {website}/employers

Best,
Noah`
      },
      5: {
        subject: "Data center workers available",
        body: `{greeting},

Technical workers for infrastructure projects. First post free.

**{website}/employers**

Best,
Noah`
      }
    }
  };
  
  // Return template or default to Staffing
  return templates[industryKey] ? templates[industryKey][emailNumber] : templates["Staffing"][emailNumber];
}


// ==========================================
// TRIGGER SETUP INSTRUCTIONS
// ==========================================
/*
SET UP THESE TRIGGERS IN GOOGLE APPS SCRIPT:

1. generateWeeklyLeads()
   - Click "Triggers" (clock icon) in left sidebar
   - Click "+ Add Trigger"
   - Function: generateWeeklyLeads
   - Event source: Time-driven
   - Type: Week timer
   - Day: Monday
   - Time: 8am-9am

2. sendScheduledEmails()
   - Click "+ Add Trigger"
   - Function: sendScheduledEmails
   - Event source: Time-driven
   - Type: Hour timer
   - Every: 2 hours (or set specific times)
   
RECOMMENDED SCHEDULE FOR sendScheduledEmails():
- 9:00 AM (50 emails)
- 11:00 AM (50 emails)
- 1:00 PM (50 emails)
- 3:00 PM (50 emails)
- 5:00 PM (50 emails)
= 250 emails/day safely

This keeps you well under Gmail's 500/day limit and avoids spam triggers.

3. ONE-TIME SETUP:
   - Run sendEmail1ToExistingLeads() ONCE manually to kickstart
     the cadence for any existing leads in your spreadsheet
*/

