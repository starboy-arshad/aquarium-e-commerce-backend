const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// Create transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// POST /api/contact - Send contact form email
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required fields'
      });
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Create email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to the same email for now
      replyTo: email, // This allows replying directly to the sender
      subject: `Contact Form: ${subject || 'New Message from ' + name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">New Contact Form Submission</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Message Details</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
            ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ''}
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 15px 0;">
            <p><strong>Message:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #007bff;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          <p style="color: #6c757d; font-size: 12px;">
            This message was sent through the aquarium shop contact form on ${new Date().toLocaleString()}
          </p>
        </div>
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('Contact form email sent:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));

    res.json({
      success: true,
      message: 'Thank you for your message! We will get back to you soon.',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending contact form email:', error);
    res.status(500).json({
      success: false,
      message: 'Sorry, there was an error sending your message. Please try again later.',
      error: error.message
    });
  }
});

module.exports = router;