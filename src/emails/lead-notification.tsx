interface LeadNotificationEmailProps {
  company: string;
  name: string;
  email: string;
  occasion?: string;
  message?: string;
}

/** Internal notification sent to the Neon Visuals team for a new lead. */
export function LeadNotificationEmail({
  company,
  name,
  email,
  occasion,
  message,
}: LeadNotificationEmailProps) {
  return (
    <div style={{ fontFamily: "DM Sans, Arial, sans-serif", color: "#2d2d2d" }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: "#1a1a2e" }}>
        New lead: {company}
      </h1>
      <p>
        <strong>{name}</strong> ({email}) just reached out.
      </p>
      {occasion ? <p>Occasion: {occasion}</p> : null}
      {message ? <p>Message: {message}</p> : null}
    </div>
  );
}

export default LeadNotificationEmail;
