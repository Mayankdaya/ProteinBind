import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-boxdark px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto w-full",
              card: "bg-white dark:bg-boxdark shadow-xl rounded-xl p-8 border border-gray-100 dark:border-gray-700",
              headerTitle: "text-3xl font-bold text-gray-900 dark:text-white text-center mb-2",
              headerSubtitle: "text-gray-500 dark:text-gray-400 text-center text-lg mb-8",
              formButtonPrimary: "w-full bg-primary hover:bg-opacity-90 text-white py-3.5 rounded-lg font-semibold transition-all duration-200 shadow-sm hover:shadow-md",
              footerAction: "text-gray-600 dark:text-gray-400 text-center mt-6 text-sm",
              formFieldLabel: "text-gray-700 dark:text-gray-300 font-medium block mb-2 text-sm",
              formFieldInput: "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 transition-all duration-200",
              socialButtonsBlockButton: "w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 mt-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 flex items-center justify-center gap-3 font-medium",
              dividerLine: "bg-gray-200 dark:bg-gray-700",
              dividerText: "text-gray-500 dark:text-gray-400 px-3 text-sm",
              formFieldError: "text-red-500 text-sm mt-1.5 font-medium",
              alert: "rounded-lg p-4 mb-6 border",
              alertText: "text-sm font-medium",
              card__background: "bg-white dark:bg-boxdark",
              identityPreview: "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg",
              identityPreviewText: "text-gray-700 dark:text-gray-300",
              identityPreviewEditButton: "text-primary hover:text-primary-dark"
            },
            layout: {
              socialButtonsPlacement: "bottom",
              showOptionalFields: false,
              shimmer: true
            }
          }}
          routing={{
            afterSignInUrl: "/dashboard",
            afterSignUpUrl: "/dashboard",
            signUpUrl: "/auth-page/signup"
          }}
          redirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}