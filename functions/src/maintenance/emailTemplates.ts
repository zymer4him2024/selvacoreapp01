export interface EmailData {
  to: string;
  message: {
    subject: string;
    html: string;
  };
}

export function reminderEmail(
  customerEmail: string,
  productName: string,
  maintenanceType: string,
  dueDate: string
): EmailData {
  return {
    to: customerEmail,
    message: {
      subject: `Maintenance Reminder — ${productName} — Selvacore`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1D1D1F;">Maintenance Reminder</h2>
          <p>Your <strong>${productName}</strong> has <strong>${maintenanceType}</strong> due on <strong>${dueDate}</strong>.</p>
          <p>Please schedule a service appointment to keep your system running optimally.</p>
          <p style="color: #86868B; font-size: 14px; margin-top: 24px;">— Selvacore Team</p>
        </div>
      `,
    },
  };
}

export function overdueEmail(
  recipientEmail: string,
  productName: string,
  maintenanceType: string,
  daysOverdue: number,
  customerName: string,
  address: string
): EmailData {
  return {
    to: recipientEmail,
    message: {
      subject: `Maintenance Overdue (${daysOverdue} days) — ${productName} — Selvacore`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #FF3B30;">Maintenance Overdue</h2>
          <p><strong>${maintenanceType}</strong> for <strong>${productName}</strong> is <strong>${daysOverdue} days overdue</strong>.</p>
          <p><strong>Customer:</strong> ${customerName}<br/>
          <strong>Location:</strong> ${address}</p>
          <p>Please take action to schedule this maintenance as soon as possible.</p>
          <p style="color: #86868B; font-size: 14px; margin-top: 24px;">— Selvacore Team</p>
        </div>
      `,
    },
  };
}

export function criticalEmail(
  adminEmail: string,
  productName: string,
  maintenanceType: string,
  daysOverdue: number,
  customerName: string,
  address: string,
  deviceId: string
): EmailData {
  return {
    to: adminEmail,
    message: {
      subject: `CRITICAL: ${productName} — ${daysOverdue} days overdue — Selvacore`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #FF3B30;">CRITICAL: Maintenance Overdue</h2>
          <p style="background: #FFF3F3; padding: 12px; border-radius: 8px; border-left: 4px solid #FF3B30;">
            <strong>${maintenanceType}</strong> for <strong>${productName}</strong> is <strong>${daysOverdue} days overdue</strong>.
          </p>
          <p><strong>Customer:</strong> ${customerName}<br/>
          <strong>Location:</strong> ${address}<br/>
          <strong>Device ID:</strong> ${deviceId}</p>
          <p>This device requires immediate attention. Consider auto-assigning a technician.</p>
          <p style="color: #86868B; font-size: 14px; margin-top: 24px;">— Selvacore System</p>
        </div>
      `,
    },
  };
}

export function completionEmail(
  customerEmail: string,
  productName: string,
  maintenanceType: string,
  technicianName: string
): EmailData {
  return {
    to: customerEmail,
    message: {
      subject: `Maintenance Completed — ${productName} — Selvacore`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #34C759;">Maintenance Completed</h2>
          <p><strong>${maintenanceType}</strong> for your <strong>${productName}</strong> has been completed by <strong>${technicianName}</strong>.</p>
          <p>Your device maintenance timer has been reset. You will be notified when the next service is due.</p>
          <p style="color: #86868B; font-size: 14px; margin-top: 24px;">— Selvacore Team</p>
        </div>
      `,
    },
  };
}
