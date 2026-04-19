import "./globals.css";
import SmoothScroll from "../components/ui/SmoothScroll";
import PageTransition from "../components/ui/PageTransition";

export const metadata = {
  title: "Doctera Hospital Portal",
  description:
    "Next.js hospital frontend with a Medilo-inspired marketing experience and role-based care dashboard.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SmoothScroll>
          <PageTransition>{children}</PageTransition>
        </SmoothScroll>
      </body>
    </html>
  );
}
