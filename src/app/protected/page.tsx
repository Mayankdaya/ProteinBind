"use client";

import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default function ProtectedPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return null;

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div>
      <h1>Protected Page</h1>
      <p>Hello {user.firstName}</p>
    </div>
  );
}
