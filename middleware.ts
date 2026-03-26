export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/((?!api/auth|login|forgot-password|reset-password|_next/static|_next/image|favicon.ico|images).*)"],
};
