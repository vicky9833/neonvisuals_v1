import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";

export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * Auth route group reuses the marketing chrome (header + footer visible),
 * per spec — auth forms sit on the warm-white marketing background.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
