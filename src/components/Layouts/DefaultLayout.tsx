"use client";

import React, { useState, useLayoutEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const publicRoutes = [
    "/sign-in",
    "/sign-up",
    "/verify-email",
    "/reset-password",
  ];

  useLayoutEffect(() => {
    if (isLoaded && !userId && !publicRoutes.includes(pathname)) {
      router.push("/sign-in");
    }
  }, [isLoaded, userId, router, pathname]);

  return (
    <div className="dark:bg-boxdark-2 dark:text-bodydark">
      <div className="flex h-screen overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main>
            <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}