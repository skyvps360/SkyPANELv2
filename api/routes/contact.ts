import express from 'express';
import { sendContactEmail } from '../services/emailService.js';
import { logActivity } from '../services/activityLogger.js';
import { config } from '../config/index.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { name, email, message } = req.body;
  // Basic validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  // Simple sanitization
  const safeName = String(name).trim().slice(0, 100);
  const safeEmail = String(email).trim().slice(0, 100);
  const safeMessage = String(message).trim().slice(0, 2000);
  const recipient = config.CONTACT_FORM_RECIPIENT || config.FROM_EMAIL;
  if (!recipient) {
    return res.status(500).json({ error: 'Contact form recipient is not configured.' });
  }

  try {
    await sendContactEmail({
      to: recipient,
      from: safeEmail,
      subject: `Contact Form Submission from ${safeName}`,
      text: safeMessage,
    });
    await logActivity({
      userId: 'contact-form',
      eventType: 'contact_form_submission',
      entityType: 'contact_form',
      message: `Contact form submitted by ${safeName} <${safeEmail}>`,
      metadata: { name: safeName, email: safeEmail, message: safeMessage }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to process contact form submission:', error);
    res.status(500).json({ error: 'Failed to send email.' });
  }
});

export default router;
