import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-100 antialiased transition-colors duration-500">
        <header className="flex justify-between items-center p-4 shadow-md bg-white dark:bg-gray-800">
          <h1 className="text-xl font-bold">⚡ Veille Énergie</h1>
          <ThemeToggle />
        </header>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
