import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { SearchCommand } from "@/components/shared/search-command";
import { WhatsAppFloat } from "@/components/shared/whatsapp-float";
import { ScrollToTop } from "@/components/shared/scroll-to-top";

/** Public marketing layout - shared header, footer, and ⌘K search. */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1 page-enter">{children}</main>
      <Footer />
      <WhatsAppFloat />
      <ScrollToTop />
      <SearchCommand />
    </>
  );
}
