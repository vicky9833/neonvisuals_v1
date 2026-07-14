interface WelcomeEmailProps {
  name: string;
}

/** Sent when a new client account is created. */
export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <div style={{ fontFamily: "DM Sans, Arial, sans-serif", color: "#2d2d2d" }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: "#1a1a2e" }}>
        Welcome to Neon Visuals
      </h1>
      <p>Hi {name},</p>
      <p>
        We design premium recognition experiences that make your people feel
        seen. Let&apos;s create something memorable together.
      </p>
      <p>- The Neon Visuals team</p>
    </div>
  );
}

export default WelcomeEmail;
