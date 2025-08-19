import React from "react";
import { Box } from "lucide-react";
import { LoginSection } from "@/components/login-section";
import { DashboardSection } from "@/components/dashboard-section";
import { useAuth } from "@/contexts/auth-context";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Box className="text-white text-sm w-4 h-4" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                ZeroDev dApp
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500 font-medium hidden sm:block">
                Gasless Transactions Demo
              </div>
              {user && (
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {user ? <DashboardSection /> : <LoginSection />}
      </main>
    </div>
  );
}
