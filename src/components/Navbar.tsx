"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  // Hide the global Navbar on the homepage to allow the original design's glassy navbar to show
  if (pathname === "/") {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="font-heading text-2xl text-primary font-bold mr-6">
                KICK<span className="text-cta">OFF</span>
              </Link>
              <Link
                  href="/tournaments"
                  className={`${
                    pathname === "/tournaments"
                      ? "border-primary text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-16`}
                >
                  Tournaments
              </Link>
            </div>
            {status === "authenticated" && (
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className={`${
                    pathname === "/dashboard"
                      ? "border-primary text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Dashboard
                </Link>
                {session?.user?.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className={`${
                      pathname === "/admin"
                        ? "border-primary text-gray-900"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    Admin Area
                  </Link>
                )}
              </div>
            )}
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {status === "authenticated" ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Welcome, {session.user?.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  Logout
                </button>
              </div>
            ) : status === "unauthenticated" ? (
              <div className="flex space-x-4">
                <Link href="/login" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                  Login
                </Link>
                <Link href="/register" className="btn-primary px-4 py-2 text-sm">
                  Register
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
