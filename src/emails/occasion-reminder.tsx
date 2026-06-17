interface OccasionReminderEmailProps {
  occasion: string;
  date: string;
  employeeName: string;
  recipientName?: string;
}

/** Sent ahead of an upcoming occasion (birthday, anniversary, festival). */
export function OccasionReminderEmail({
  occasion,
  date,
  employeeName,
  recipientName,
}: OccasionReminderEmailProps) {
  return (
    <div style={{ fontFamily: "DM Sans, Arial, sans-serif", color: "#2d2d2d" }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: "#1a1a2e" }}>
        An occasion is coming up
      </h1>
      <p>Hi {recipientName ?? "there"},</p>
      <p>
        <strong>{employeeName}</strong>&apos;s {occasion} is on{" "}
        <strong>{date}</strong>. Want us to prepare something memorable?
      </p>
      <p>— The Neon Visuals team</p>
    </div>
  );
}

export default OccasionReminderEmail;
