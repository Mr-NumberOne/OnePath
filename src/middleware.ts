import { auth } from "@/auth"

export default auth((req) => {
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isLoggedIn = !!req.auth;

  // Redirect to login if trying to access any page while logged out
  if (!isLoggedIn && !isLoginPage) {
    const newUrl = new URL("/login", req.nextUrl.origin);
    return Response.redirect(newUrl);
  }

  // Redirect to home if trying to access the login page while already logged in
  if (isLoggedIn && isLoginPage) {
    const newUrl = new URL("/", req.nextUrl.origin);
    return Response.redirect(newUrl);
  }
})

export const config = {
  // Exclude api routes, next static files, and public images so they can load without auth
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
}
