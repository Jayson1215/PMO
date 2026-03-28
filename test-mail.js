const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

async function testGmail() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log('--- SMTP Test Diagnostic ---');
  console.log('User:', user);
  console.log('Password Length:', pass ? pass.length : 0);
  console.log('---------------------------');

  if (!user || !pass) {
    console.error('Error: SMTP_USER or SMTP_PASS missing in .env.local');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  console.log('Attempting to verify connection...');
  try {
    await transporter.verify();
    console.log('✅ SUCCESS: Connection verified! Your credentials are correct.');
  } catch (error) {
    console.error('❌ FAILED: Connection error:');
    console.error(error.message);
    if (user.endsWith('@urios.edu.ph')) {
      console.log('\nNOTE: Your school domain (@urios.edu.ph) may be blocking SMTP access.');
      console.log('Please try a personal @gmail.com account to confirm.');
    }
  }
}

testGmail();
