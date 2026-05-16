const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const NewRequestEmailHTML = (data: {
  customerName: string;
  customerEmail: string;
  fileName: string;
  quantity: number;
  material: string;
  dateNeeded: string;
  notes?: string;
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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Part Request</h1>
    </div>
    <div class="content">
      <p>A new part request has been submitted to TakomoCo.</p>
      
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
