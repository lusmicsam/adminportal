import { NextResponse } from 'next/server';

export function middleware(request) {
    // Get the pathname of the request (e.g. /, /admin/dashboard)
    const path = request.nextUrl.pathname;

    // 1. Define Public Paths (No Login Required)
    // - /admin/login: The login page itself
    // - /_next: Next.js internals (static files, etc.)
    // - /static: Static folder
    // - /favicon.ico: Browser icon
    // - /api: API routes (handle their own auth usually, or exclude if needed)
    const isPublicPath = path === '/admin/login' ||
        path === '/' ||
        path.startsWith('/_next') ||
        path.startsWith('/static') ||
        path.includes('.'); // Exclude files with extensions (images, css, etc.)

    // 2. Get the token from the cookies
    const token = request.cookies.get('admin_token')?.value || '';

    console.log(`[Middleware] Path: ${path}, Token found: ${!!token}`); // DEBUG LOG

    // 3. Redirection Logic

    // A. CASE: User is PUBLIC (No Token) but tries to access PROTECTED route
    if (!isPublicPath && !token) {
        console.log(`[Middleware] Redirecting to Login`);
        // Redirect to login
        return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // B. CASE: User is LOGGED IN (Has Token) but tries to access LOGIN page
    if (path === '/admin/login' && token) {
        // Redirect to dashboard
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    // C. CASE: Root Path handling
    // If accessing root '/' and logged in -> Dashboard
    if (path === '/' && token) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    // If accessing root '/' and NOT logged in -> Login (Covered by Logic A if '/' wasn't public, 
    // but since '/' IS public, we need explicit check or just let it redirect to Login if we want '/' to be strictly login)
    if (path === '/' && !token) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Continue for all other cases
    return NextResponse.next();
}

// Ensure middleware runs on relevant paths
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
