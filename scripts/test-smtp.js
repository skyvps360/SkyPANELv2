import nodemailer from 'nodemailer';
import 'dotenv/config';

async function testSMTP() {
  console.log('='.repeat(60));
  console.log('SMTP2GO Connection Test');
  console.log('='.repeat(60));
  
  // Check environment variables
  console.log('\n📋 Environment Variables:');
  console.log('SMTP2GO_USERNAME:', process.env.SMTP2GO_USERNAME ? '✅ Set' : '❌ Missing');
  console.log('SMTP2GO_PASSWORD:', process.env.SMTP2GO_PASSWORD ? '✅ Set' : '❌ Missing');
  console.log('FROM_EMAIL:', process.env.FROM_EMAIL || '❌ Missing');
  console.log('FROM_NAME:', process.env.FROM_NAME || 'SkyVPS360');
  console.log('CLIENT_URL:', process.env.CLIENT_URL || 'http://localhost:5173');
  
  if (!process.env.SMTP2GO_USERNAME || !process.env.SMTP2GO_PASSWORD) {
    console.error('\n❌ SMTP credentials not configured!');
    console.error('Please set SMTP2GO_USERNAME and SMTP2GO_PASSWORD in your .env file');
    process.exit(1);
  }

  if (!process.env.FROM_EMAIL) {
    console.error('\n❌ FROM_EMAIL not configured!');
    console.error('Please set FROM_EMAIL in your .env file');
    process.exit(1);
  }

  // Test email recipient
  const testEmail = process.env.TEST_EMAIL || process.env.FROM_EMAIL;
  
  console.log('\n🔧 SMTP Configuration:');
  console.log('Host:', process.env.SMTP2GO_HOST || 'mail.smtp2go.com');
  console.log('Port:', process.env.SMTP2GO_PORT || 587);
  console.log('Secure:', false);
  console.log('Require TLS:', true);
  
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP2GO_HOST || 'mail.smtp2go.com',
    port: Number(process.env.SMTP2GO_PORT || 587),
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.SMTP2GO_USERNAME,
      pass: process.env.SMTP2GO_PASSWORD
    },
    debug: true,
    logger: true
  });

  const from = `${process.env.FROM_NAME || 'SkyVPS360'} <${process.env.FROM_EMAIL}>`;
  
  console.log('\n📧 Test Email Details:');
  console.log('From:', from);
  console.log('To:', testEmail);
  console.log('Subject: SMTP2GO Test from', process.env.NODE_ENV || 'development');
  
  console.log('\n⏳ Sending test email...\n');
  
  try {
    const info = await transporter.sendMail({
      from,
      to: testEmail,
      subject: `SMTP2GO Test from ${process.env.NODE_ENV || 'development'}`,
      text: `This is a test email from your ContainerStacks application.

Environment: ${process.env.NODE_ENV || 'development'}
Timestamp: ${new Date().toISOString()}

If you received this email, SMTP2GO is configured correctly and working!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0066cc;">✅ SMTP2GO Test Successful</h2>
          <p>This is a test email from your ContainerStacks application.</p>
          <ul style="line-height: 1.8;">
            <li><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</li>
            <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
            <li><strong>SMTP Host:</strong> ${process.env.SMTP2GO_HOST || 'mail.smtp2go.com'}</li>
            <li><strong>SMTP Port:</strong> ${process.env.SMTP2GO_PORT || 587}</li>
          </ul>
          <p style="color: #28a745; font-weight: bold;">If you received this email, SMTP2GO is configured correctly and working!</p>
        </div>
      `
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ EMAIL SENT SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('\n📬 Check your inbox at:', testEmail);
    console.log('(Don\'t forget to check spam folder)\n');
    
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ EMAIL SEND FAILED');
    console.log('='.repeat(60));
    console.error('\nError Details:');
    console.error(error);
    
    console.log('\n🔍 Troubleshooting Tips:');
    console.log('1. Verify SMTP2GO credentials are correct');
    console.log('2. Check if FROM_EMAIL is verified in SMTP2GO dashboard');
    console.log('3. Ensure firewall allows outbound port 587');
    console.log('4. Verify your VPS IP is not blocked by SMTP2GO');
    console.log('5. Check SMTP2GO dashboard for sending limits\n');
    
    process.exit(1);
  }
}

testSMTP();
