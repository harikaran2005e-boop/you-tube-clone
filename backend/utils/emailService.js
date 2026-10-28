const nodemailer = require("nodemailer");

/**
 * Sends a rich subscription confirmation email with invoice details.
 * Falls back to console invoice logging if SMTP credentials are missing.
 */
async function sendSubscriptionConfirmationEmail({
  userEmail,
  userName,
  invoiceNumber,
  plan,
  billingCycle,
  amount,
  currency,
  paymentId,
  orderId,
  startDate,
  expiryDate,
  paymentStatus
}) {
  const formattedAmount = `${currency} ${(amount / 100).toFixed(2)}`;
  const formattedStart = new Date(startDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const formattedExpiry = expiryDate
    ? new Date(expiryDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    : "Lifetime / Custom";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
        .invoice-box { max-width: 650px; margin: auto; background: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border-top: 6px solid #990000; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; }
        .brand { font-size: 22px; font-weight: bold; color: #990000; }
        .badge { background: #e6f4ea; color: #137333; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 13px; }
        .details-table { width: 100%; border-collapse: collapse; margin-top: 25px; }
        .details-table th, .details-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #eeeeee; }
        .details-table th { background: #fafafa; color: #666; font-size: 13px; text-transform: uppercase; }
        .total-row td { font-size: 18px; font-weight: bold; color: #990000; border-top: 2px solid #990000; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #eeeeee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <div class="header">
          <div class="brand">STREAMFLIX PLATFORM</div>
          <div class="badge">Payment ${paymentStatus}</div>
        </div>
        <h2>Subscription Purchase Confirmation</h2>
        <p>Hi <strong>${userName || "Valued Customer"}</strong>,</p>
        <p>Thank you for subscribing! Your subscription to the <strong>${plan} Plan (${billingCycle})</strong> has been successfully activated.</p>
        
        <table class="details-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Invoice Number</strong></td><td>${invoiceNumber}</td></tr>
            <tr><td><strong>Payment ID</strong></td><td>${paymentId || "N/A"}</td></tr>
            <tr><td><strong>Order ID</strong></td><td>${orderId || "N/A"}</td></tr>
            <tr><td><strong>Subscription Plan</strong></td><td>${plan} Plan</td></tr>
            <tr><td><strong>Billing Cycle</strong></td><td>${billingCycle.toUpperCase()}</td></tr>
            <tr><td><strong>Activation Date</strong></td><td>${formattedStart}</td></tr>
            <tr><td><strong>Expiration Date</strong></td><td>${formattedExpiry}</td></tr>
            <tr class="total-row">
              <td><strong>Total Paid</strong></td>
              <td>${formattedAmount}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 25px; background: #fff5f5; border-left: 4px solid #990000; padding: 15px; border-radius: 4px;">
          <p style="margin: 0; font-size: 13px; color: #990000;">
            <strong>Need Help?</strong> If you have any questions regarding this invoice or your subscription features, contact our 24/7 support at <strong>support@streamflix.com</strong>.
          </p>
        </div>

        <div class="footer">
          <p>© 2026 Streamflix Platform. All rights reserved.</p>
          <p>This email serves as your official payment receipt and tax invoice.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  console.log(`\n======================================================`);
  console.log(`[EMAIL SERVICE] Sending Confirmation Email to: ${userEmail}`);
  console.log(`[EMAIL SERVICE] Invoice Number: ${invoiceNumber} | Plan: ${plan}`);
  console.log(`======================================================\n`);

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      await transporter.sendMail({
        from: '"Streamflix Billing" <no-reply@streamflix.com>',
        to: userEmail,
        subject: `Invoice & Confirmation for ${plan} Plan Subscription [${invoiceNumber}]`,
        html: emailHtml
      });

      console.log(`[EMAIL SERVICE] Email successfully dispatched to ${userEmail}`);
      return { success: true, mode: "smtp" };
    } catch (err) {
      console.error(`[EMAIL SERVICE] SMTP dispatch error: ${err.message}`);
      return { success: false, mode: "smtp_error", error: err.message, htmlPreview: emailHtml };
    }
  } else {
    console.log(`[EMAIL SERVICE] SMTP not configured. Logged HTML invoice to console.`);
    return { success: true, mode: "console_log", htmlPreview: emailHtml };
  }
}

/**
 * Sends a 6-digit OTP verification code for new device/location logins.
 */
async function sendOtpEmail({ userEmail, userName, otpCode, location, browser }) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
        .otp-box { max-width: 550px; margin: auto; background: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border-top: 6px solid #990000; text-align: center; }
        .otp-code { font-size: 36px; font-weight: 800; color: #990000; letter-spacing: 8px; margin: 20px 0; background: #fff5f5; padding: 14px; border-radius: 10px; border: 1px dashed #fecaca; display: inline-block; }
        .details-box { background: #f8fafc; padding: 15px; border-radius: 8px; font-size: 13px; text-align: left; margin: 20px 0; border: 1px solid #e2e8f0; }
        .footer { font-size: 11px; color: #888888; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="otp-box">
        <h2 style="color: #990000; margin-top: 0;">Security Verification Required</h2>
        <p>Hi <strong>${userName || "User"}</strong>,</p>
        <p>A login attempt was detected from an unrecognized device or new location. Enter the verification code below to authorize your session:</p>
        
        <div class="otp-code">${otpCode}</div>
        
        <p style="font-size: 12px; color: #666;">This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>

        <div class="details-box">
          <strong>Login Attempt Details:</strong><br />
          • Browser / OS: ${browser || "Unknown Browser"}<br />
          • Location: ${location || "Unknown Location"}<br />
          • Timestamp: ${new Date().toLocaleString()}
        </div>

        <div class="footer">
          <p>If you did not initiate this login request, please change your password immediately.</p>
          <p>© 2026 Streamflix Platform. Account Security Team.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  console.log(`\n======================================================`);
  console.log(`[SECURITY OTP] 6-Digit Verification OTP: ${otpCode}`);
  console.log(`[SECURITY OTP] Sent to: ${userEmail} | Browser: ${browser}`);
  console.log(`======================================================\n`);

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      await transporter.sendMail({
        from: '"Streamflix Security" <security@streamflix.com>',
        to: userEmail,
        subject: `Security Verification OTP Code: ${otpCode}`,
        html: emailHtml
      });

      return { success: true, mode: "smtp" };
    } catch (err) {
      return { success: false, mode: "smtp_error", error: err.message, otpCode };
    }
  } else {
    return { success: true, mode: "console_log", otpCode };
  }
}

module.exports = {
  sendSubscriptionConfirmationEmail,
  sendOtpEmail
};
