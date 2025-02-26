import "jsvectormap/dist/jsvectormap.css";
import "flatpickr/dist/flatpickr.min.css";
import "@/css/style.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from 'next/font/google';
import { UserProvider } from "./context/UserContext";
import { RDKitProvider } from '@/contexts/RDKitContext';

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'ProteinBind',
  description: 'Your protein binding analysis platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClerkProvider>
          <UserProvider>
            <RDKitProvider>
              <div className="font-poppins dark:bg-boxdark-2 dark:text-bodydark min-h-screen">
                {children}
              </div>
            </RDKitProvider>
          </UserProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}