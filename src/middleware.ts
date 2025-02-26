import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: [
    "/",
    "/auth-page/(.*)",
    "/api/protected/public/(.*)",
    "/api/nvidia/public/(.*)",
    "/api/generate-molecules/public/(.*)"
  ],
  ignoredRoutes: [
    "/api/socket",
    "/api/ws"
  ]
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};