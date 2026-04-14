import "./globals.css";

export const metadata = {
  title: "ABC Hospital Portal",
  description:
    "Next.js hospital frontend with a Medilo-inspired marketing experience and role-based care dashboard."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
