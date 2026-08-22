// Helper to prevent HTML injection in emails
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const NewRequestEmailHTML = (data: {
  customerName: string;
  customerEmail: string;
  fileName: string;
  quantity: number;
  material: string;
  dateNeeded: string;
  notes?: string;
  printSettings?: string;
  quoteRequested?: boolean;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .header { background-color: #4f46e5; color: white; padding: 20px; border-radius: 6px 6px 0 0; text-align: center; }
    .content { padding: 20px; }
    .footer { font-size: 12px; color: #718096; text-align: center; padding: 20px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #4a5568; font-size: 12px; text-transform: uppercase; }
    .value { font-size: 16px; color: #1a202c; }
    .notes-box { background-color: #f7fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #4f46e5; margin-top: 20px; }
    .quote-box { background-color: #fffaf0; padding: 12px 15px; border-radius: 6px; border-left: 4px solid #dd6b20; margin-bottom: 20px; color: #7b341e; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Part Request</h1>
    </div>
    <div class="content">
      <p>A new part request has been submitted to TakomoCo.</p>

      ${data.quoteRequested ? `
      <div class="quote-box">Quote requested — the customer wants a price before the build starts.</div>
      ` : ''}
      
      <div class="field">
        <div class="label">Customer</div>
        <div class="value">${escapeHtml(data.customerName)} (${escapeHtml(data.customerEmail)})</div>
      </div>

      <div class="field">
        <div class="label">File Name</div>
        <div class="value">${escapeHtml(data.fileName)}</div>
      </div>

      <div class="field">
        <div class="label">Material</div>
        <div class="value">${escapeHtml(data.material)}</div>
      </div>

      <div class="field">
        <div class="label">Quantity</div>
        <div class="value">${data.quantity}</div>
      </div>

      <div class="field">
        <div class="label">Date Needed</div>
        <div class="value">${escapeHtml(data.dateNeeded)}</div>
      </div>

      ${data.printSettings ? `
      <div class="field">
        <div class="label">Print Settings</div>
        <div class="value">${escapeHtml(data.printSettings)}</div>
      </div>
      ` : ''}

      ${data.notes ? `
      <div class="notes-box">
        <div class="label">Notes</div>
        <div class="value">${escapeHtml(data.notes)}</div>
      </div>
      ` : ''}

      <div style="margin-top: 30px;">
        <a href="${process.env.NEXTAUTH_URL}/admin" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
          View Request in Admin Console
        </a>
      </div>
    </div>
    <div class="footer">
      This is an automated notification from your TakomoCo application.
    </div>
  </div>
</body>
</html>
`;

export const InvoiceSentEmailHTML = (data: {
  customerName: string;
  fileName: string;
  invoiceNumber: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .header { background-color: #4f46e5; color: white; padding: 20px; border-radius: 6px 6px 0 0; text-align: center; }
    .content { padding: 20px; }
    .footer { font-size: 12px; color: #718096; text-align: center; padding: 20px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #4a5568; font-size: 12px; text-transform: uppercase; }
    .value { font-size: 16px; color: #1a202c; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invoice Sent</h1>
    </div>
    <div class="content">
      <p>Hello ${escapeHtml(data.customerName)},</p>
      <p>Your invoice for the requested part has been sent.</p>
      
      <div class="field">
        <div class="label">File Name</div>
        <div class="value">${escapeHtml(data.fileName)}</div>
      </div>

      <div class="field">
        <div class="label">Invoice Number</div>
        <div class="value">${escapeHtml(data.invoiceNumber)}</div>
      </div>

      <p>Please review and complete the payment at your earliest convenience.</p>

      <div style="margin-top: 30px;">
        <a href="${process.env.NEXTAUTH_URL}/dashboard" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
          View Dashboard
        </a>
      </div>
    </div>
    <div class="footer">
      This is an automated notification from your TakomoCo application.
    </div>
  </div>
</body>
</html>
`;

export const StatusUpdateEmailHTML = (data: {
  customerName: string;
  fileName: string;
  status: string;
  message: string;
  trackingNumber?: string | null;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .header { background-color: #4f46e5; color: white; padding: 20px; border-radius: 6px 6px 0 0; text-align: center; }
    .content { padding: 20px; }
    .footer { font-size: 12px; color: #718096; text-align: center; padding: 20px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #4a5568; font-size: 12px; text-transform: uppercase; }
    .value { font-size: 16px; color: #1a202c; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Status Update: ${escapeHtml(data.status)}</h1>
    </div>
    <div class="content">
      <p>Hello ${escapeHtml(data.customerName)},</p>
      <p>${escapeHtml(data.message)}</p>
      
      <div class="field">
        <div class="label">File Name</div>
        <div class="value">${escapeHtml(data.fileName)}</div>
      </div>

      ${data.trackingNumber ? `
      <div class="field">
        <div class="label">Tracking Number</div>
        <div class="value">${escapeHtml(data.trackingNumber)}</div>
      </div>
      ` : ''}

      <div style="margin-top: 30px;">
        <a href="${process.env.NEXTAUTH_URL}/dashboard" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
          View Dashboard
        </a>
      </div>
    </div>
    <div class="footer">
      This is an automated notification from your TakomoCo application.
    </div>
  </div>
</body>
</html>
`;

export const NewUserAdminNotificationEmailHTML = (data: {
  name: string;
  email: string;
  phone: string;
  shippingAddress: string;
  billingAddress: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .header { background-color: #4f46e5; color: white; padding: 20px; border-radius: 6px 6px 0 0; text-align: center; }
    .content { padding: 20px; }
    .footer { font-size: 12px; color: #718096; text-align: center; padding: 20px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #4a5568; font-size: 12px; text-transform: uppercase; }
    .value { font-size: 16px; color: #1a202c; }
    .address-box { background-color: #f7fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New User Registered</h1>
    </div>
    <div class="content">
      <p>A new user account has been registered on the TakomoCo platform.</p>
      
      <div class="field">
        <div class="label">Full Name</div>
        <div class="value">${escapeHtml(data.name)}</div>
      </div>

      <div class="field">
        <div class="label">Email Address</div>
        <div class="value">${escapeHtml(data.email)}</div>
      </div>

      <div class="field">
        <div class="label">Phone Number</div>
        <div class="value">${escapeHtml(data.phone)}</div>
      </div>

      <div class="field">
        <div class="label">Shipping Address</div>
        <div class="address-box">${escapeHtml(data.shippingAddress)}</div>
      </div>

      <div class="field">
        <div class="label">Billing Address</div>
        <div class="address-box">${escapeHtml(data.billingAddress)}</div>
      </div>

      <div style="margin-top: 30px;">
        <a href="${process.env.NEXTAUTH_URL}/admin/users" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
          Manage Users in Admin Console
        </a>
      </div>
    </div>
    <div class="footer">
      This is an automated notification from your TakomoCo application.
    </div>
  </div>
</body>
</html>
`;

export const WelcomeUserEmailHTML = (data: {
  name: string;
  email: string;
  phone: string;
  shippingAddress: string;
  billingAddress: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .header { background-color: #4f46e5; color: white; padding: 20px; border-radius: 6px 6px 0 0; text-align: center; }
    .content { padding: 20px; }
    .footer { font-size: 12px; color: #718096; text-align: center; padding: 20px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #4a5568; font-size: 12px; text-transform: uppercase; }
    .value { font-size: 16px; color: #1a202c; }
    .address-box { background-color: #f7fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to TakomoCo!</h1>
    </div>
    <div class="content">
      <p>Hello ${escapeHtml(data.name)},</p>
      <p>Your account has been successfully created. Here is a summary of the registration information you provided:</p>
      
      <div class="field">
        <div class="label">Full Name</div>
        <div class="value">${escapeHtml(data.name)}</div>
      </div>

      <div class="field">
        <div class="label">Email Address</div>
        <div class="value">${escapeHtml(data.email)}</div>
      </div>

      <div class="field">
        <div class="label">Phone Number</div>
        <div class="value">${escapeHtml(data.phone)}</div>
      </div>

      <div class="field">
        <div class="label">Shipping Address</div>
        <div class="address-box">${escapeHtml(data.shippingAddress)}</div>
      </div>

      <div class="field">
        <div class="label">Billing Address</div>
        <div class="address-box">${escapeHtml(data.billingAddress)}</div>
      </div>

      <p>You can now sign in to your dashboard to submit part requests, track your existing orders, and manage invoices.</p>

      <div style="margin-top: 30px;">
        <a href="${process.env.NEXTAUTH_URL}/dashboard" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
          Go to Dashboard
        </a>
      </div>
    </div>
    <div class="footer">
      This is an automated notification from your TakomoCo application.
    </div>
  </div>
</body>
</html>
`;
