"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { UserProvider } from "./context/UserContext";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <UserProvider>
        <div className="font-poppins dark:bg-boxdark-2 dark:text-bodydark min-h-screen">
          {children}
        </div>
      </UserProvider>
    </ClerkProvider>
  );
}