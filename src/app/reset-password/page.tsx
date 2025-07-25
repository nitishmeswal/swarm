"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Key,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

const ResetPasswordContent: React.FC = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const blurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add blur effect to background when component mounts
    const layout = document.querySelector('[data-layout="true"]');
    if (layout) {
      layout.classList.add("blur-sm");
    }

    return () => {
      // Remove blur effect when component unmounts
      const layout = document.querySelector('[data-layout="true"]');
      if (layout) {
        layout.classList.remove("blur-sm");
      }
    };
  }, []);

  useEffect(() => {
    const validateSession = async () => {
      try {
        setIsValidating(true);

        // Check if we have a valid session after password reset flow
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session validation error:", error);
          setError("Invalid or expired reset link");
          setIsValidToken(false);
          return;
        }

        if (session?.user) {
          setIsValidToken(true);
        } else {
          setError("Invalid or expired reset link");
          setIsValidToken(false);
        }
      } catch (error) {
        console.error("Validation error:", error);
        setError("Failed to validate reset token");
        setIsValidToken(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateSession();
  }, [supabase]);

  const validatePasswords = () => {
    if (!newPassword) {
      setError("Please enter a new password");
      return false;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    setError("");
    return true;
  };

  const handlePasswordReset = async () => {
    if (!validatePasswords()) return;

    try {
      setIsLoading(true);
      setError("");

      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error("Password update error:", updateError);
        setError(`Failed to update password: ${updateError.message}`);
        return;
      }

      toast.success("Password updated successfully!");

      // Redirect to dashboard after successful password reset
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error) {
      console.error("Password reset error:", error);
      setError("Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-[#161628] rounded-2xl p-8 max-w-md w-full mx-4 border border-[#112544]">
          <div className="flex items-center justify-center space-x-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
            <span className="text-white">Validating reset token...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-[#161628] rounded-2xl p-8 max-w-md w-full mx-4 border border-[#112544]">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="w-12 h-12 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Invalid Reset Link</h2>
            <p className="text-gray-400">
              {error || "This password reset link is invalid or has expired."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#161628] rounded-2xl p-8 max-w-md w-full mx-4 border border-[#112544] shadow-2xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-[#0A1A2F] p-4 rounded-lg">
              <Key className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Reset Your Password
          </h2>
          <p className="text-gray-400">Enter your new password below</p>
        </div>

        <div className="space-y-4">
          {/* New Password */}
          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              New Password
            </label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                className="bg-[#0A1A2F] border-[#112544] text-white pr-12 focus:border-blue-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Confirm Password
            </label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                className="bg-[#0A1A2F] border-[#112544] text-white pr-12 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="bg-[#0A1A2F] p-3 rounded-lg border border-[#112544]">
            <p className="text-xs text-gray-400 mb-2">Password requirements:</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li
                className={`flex items-center space-x-2 ${
                  newPassword.length >= 6 ? "text-green-400" : ""
                }`}
              >
                <span>{newPassword.length >= 6 ? "✓" : "○"}</span>
                <span>At least 6 characters</span>
              </li>
              <li
                className={`flex items-center space-x-2 ${
                  newPassword &&
                  confirmPassword &&
                  newPassword === confirmPassword
                    ? "text-green-400"
                    : ""
                }`}
              >
                <span>
                  {newPassword &&
                  confirmPassword &&
                  newPassword === confirmPassword
                    ? "✓"
                    : "○"}
                </span>
                <span>Passwords match</span>
              </li>
            </ul>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/20">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handlePasswordReset}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium"
              disabled={isLoading || !newPassword || !confirmPassword}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ResetPasswordPage: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#161628] rounded-2xl p-8 max-w-md w-full mx-4 border border-[#112544]">
            <div className="flex items-center justify-center space-x-3">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
              <span className="text-white">Loading...</span>
            </div>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
};

export default ResetPasswordPage;
