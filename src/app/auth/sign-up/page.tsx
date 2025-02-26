import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-boxdark px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <SignUp 
          appearance={{
            elements: {
              rootBox: "mx-auto w-full",
              card: "bg-white dark:bg-boxdark shadow-xl rounded-xl p-8",
              formButtonPrimary: "bg-primary hover:bg-opacity-90"
            }
          }}
          redirectUrl="/dashboard"
          signInUrl="/auth/sign-in"
        />
      </div>
    </div>
  );
}
