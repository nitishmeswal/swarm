"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, User, Eye, EyeOff, Key, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, username: string, password: string) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
  isLoading?: boolean;
}

export function LoginModal({
  isOpen,
  onClose,
  onLogin,
  onSignUp,
  onGoogleLogin,
  isLoading = false,
}: LoginModalProps) {
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [showEmailConfirmBanner, setShowEmailConfirmBanner] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  
  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [isResetPasswordLoading, setIsResetPasswordLoading] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Sign up form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const supabase = createClient();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    
    try {
      await onLogin(loginEmail, loginPassword);
      // Reset form on success
      setLoginEmail("");
      setLoginPassword("");
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupUsername || !signupPassword || !confirmPassword) return;
    
    if (signupPassword !== confirmPassword) {
      setError("Passwords don't match!");
      return;
    }
    
    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    setError("");
    
    try {
      await onSignUp(signupEmail, signupUsername, signupPassword);
      
      // Show email confirmation banner
      setConfirmationEmail(signupEmail);
      setShowEmailConfirmBanner(true);
      
      // Reset signup form but don't close modal
      setSignupEmail("");
      setSignupUsername("");
      setSignupPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Sign up error:", error);
      setError("Signup failed. Please try again.");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await onGoogleLogin();
    } catch (error) {
      console.error("Google login error:", error);
    }
  };

  const resetForms = () => {
    setLoginEmail("");
    setLoginPassword("");
    setSignupEmail("");
    setSignupUsername("");
    setSignupPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError("");
    setShowEmailConfirmBanner(false);
    setConfirmationEmail("");
    setShowForgotPassword(false);
    resetForgotPasswordStates();
  };

  const resetForgotPasswordStates = () => {
    setForgotPasswordEmail("");
    setShowOtpModal(false);
    setOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
    setOtpVerified(false);
  };

  const handleClose = () => {
    resetForms();
    onClose();
  };

  // Forgot password functions
  const handleForgotPasswordClick = () => {
    setShowForgotPassword(true);
    setForgotPasswordEmail(loginEmail);
    setError("");
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!forgotPasswordEmail.trim()) {
      setError("Please enter your email address");
      return;
    }

    try {
      setIsResetPasswordLoading(true);
      setError("");

      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: undefined,
      });

      if (error) {
        console.error("OTP send error:", error);
        setError(`Failed to send OTP: ${error.message}`);
        return;
      }

      toast.success("OTP sent to your email!");
      setShowOtpModal(true);
    } catch (error) {
      console.error("OTP send error:", error);
      setError("Failed to send OTP");
    } finally {
      setIsResetPasswordLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!otp.trim()) {
      setError("Please enter the OTP");
      return;
    }

    try {
      setIsVerifyingOtp(true);
      setError("");

      const { error } = await supabase.auth.verifyOtp({
        email: forgotPasswordEmail,
        token: otp,
        type: 'recovery'
      });

      if (error) {
        console.error("OTP verification error:", error);
        if (error.message.includes('expired')) {
          setError("OTP has expired. Please request a new one.");
        } else {
          setError("Invalid OTP. Please try again.");
        }
        return;
      }

      toast.success("OTP verified successfully!");
      setOtpVerified(true);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("Invalid OTP. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleUpdatePassword = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!newPassword.trim()) {
      setError("Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsUpdatingPassword(true);
      setError("");

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error("Password update error:", error);
        setError(`Failed to update password: ${error.message}`);
        return;
      }

      toast.success("Password updated successfully!");
      
      // Reset all states and close modals
      setShowOtpModal(false);
      setShowForgotPassword(false);
      resetForgotPasswordStates();
      setActiveTab("login");
    } catch (error) {
      console.error("Password update error:", error);
      setError("Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleResendOtp = async () => {
    setOtp("");
    await handleSendOtp();
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
    setShowOtpModal(false);
    resetForgotPasswordStates();
    setError("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px] bg-[#0a1628] border-[#1e3a8a] text-white">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold text-white">
            Welcome to NeuroSwarm
          </DialogTitle>
          <p className="text-center text-sm text-gray-400 mt-2">
            Join the swarm and start earning rewards!
          </p>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg mb-4">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}

        {showEmailConfirmBanner && (
          <div className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/30 rounded-lg mb-4">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <div className="flex-1">
              <p className="text-sm text-green-400 font-medium">Check your email!</p>
              <p className="text-xs text-green-300">We sent a confirmation email to <strong>{confirmationEmail}</strong>. Please check your inbox and click the confirmation link.</p>
            </div>
            <button
              onClick={() => setShowEmailConfirmBanner(false)}
              className="text-green-400 hover:text-green-300"
            >
              ×
            </button>
          </div>
        )}

        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#1e3a8a]/20">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-[#0361DA] data-[state=active]:text-white"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="data-[state=active]:bg-[#0361DA] data-[state=active]:text-white"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              {!showForgotPassword ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium text-gray-300">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10 bg-[#1e3a8a]/20 border-[#1e3a8a] text-white placeholder-gray-400 focus:border-[#0361DA]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium text-gray-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 pr-10 bg-[#1e3a8a]/20 border-[#1e3a8a] text-white placeholder-gray-400 focus:border-[#0361DA]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#0361DA] to-[#20A5EF] hover:from-[#0361DA]/90 hover:to-[#20A5EF]/90 text-white font-medium py-2.5"
                  disabled={isLoading || !loginEmail || !loginPassword}
                >
                  {isLoading ? "Signing In..." : "Sign In"}
                </Button>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleForgotPasswordClick}
                    className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
                    disabled={isLoading}
                  >
                    Forgot Password?
                  </button>
                </div>
              </form>
              ) : (
                // Forgot Password Form
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Key className="h-5 w-5 text-yellow-400" />
                    <h3 className="text-lg font-medium text-white">Reset Password</h3>
                  </div>
                  
                  <p className="text-sm text-gray-400 mb-4">
                    Enter your email address and we'll send you an OTP to reset your password.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-sm font-medium text-gray-300">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="your@example.com"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        className="pl-10 bg-[#1e3a8a]/20 border-[#1e3a8a] text-white placeholder-gray-400 focus:border-[#0361DA]"
                        required
                        disabled={isResetPasswordLoading}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                      disabled={isResetPasswordLoading || !forgotPasswordEmail}
                    >
                      {isResetPasswordLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send OTP"
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      onClick={handleCloseForgotPassword}
                      variant="outline"
                      className="border-gray-600 text-gray-400 hover:text-gray-300"
                      disabled={isResetPasswordLoading}
                    >
                      Back
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium text-gray-300">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pl-10 bg-[#1e3a8a]/20 border-[#1e3a8a] text-white placeholder-gray-400 focus:border-[#0361DA]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="text-sm font-medium text-gray-300">
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="username123"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      className="pl-10 bg-[#1e3a8a]/20 border-[#1e3a8a] text-white placeholder-gray-400 focus:border-[#0361DA]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium text-gray-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pl-10 pr-10 bg-[#1e3a8a]/20 border-[#1e3a8a] text-white placeholder-gray-400 focus:border-[#0361DA]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-300">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 bg-[#1e3a8a]/20 border-[#1e3a8a] text-white placeholder-gray-400 focus:border-[#0361DA]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#0361DA] to-[#20A5EF] hover:from-[#0361DA]/90 hover:to-[#20A5EF]/90 text-white font-medium py-2.5"
                  disabled={isLoading || !signupEmail || !signupUsername || !signupPassword || !confirmPassword}
                >
                  {isLoading ? "Creating Account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#1e3a8a]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0a1628] px-2 text-gray-400">Or</span>
              </div>
            </div>

            <Button
              onClick={handleGoogleLogin}
              variant="outline"
              className="w-full mt-4 bg-white hover:bg-gray-50 text-gray-900 border-gray-300 font-medium py-2.5"
              disabled={isLoading}
            >
              <FcGoogle className="mr-2 h-4 w-4" />
              Continue with Google
            </Button>
          </div>

          <p className="text-xs text-center text-gray-400 mt-6">
            {activeTab === "login" ? (
              <>
                First, create an account or log in with your email. After
                authentication, you&apos;ll be able to connect your wallet to
                earn rewards!
              </>
            ) : (
              <>
                By creating an account, you agree to our Terms of Service and
                Privacy Policy.
              </>
            )}
          </p>
        </div>
        
        {/* OTP Verification Modal */}
        <Dialog open={showOtpModal} onOpenChange={(open) => !open && setShowOtpModal(false)}>
          <DialogContent className="bg-[#161628] border border-[#112544] text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-yellow-400 flex items-center gap-2">
                <Key className="w-5 h-5" />
                {otpVerified ? "Set New Password" : "Verify OTP"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {!otpVerified ? (
                // OTP Verification Step
                <>
                  <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-500/20">
                    <p className="text-sm text-yellow-300">
                      Enter the OTP sent to <strong>{forgotPasswordEmail}</strong>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-white">Enter OTP</Label>
                    <Input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="bg-[#0A1A2F] border-yellow-500/30 text-white text-center text-lg tracking-widest"
                      maxLength={6}
                      autoFocus
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      onClick={handleVerifyOtp}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white w-full"
                      disabled={isVerifyingOtp || otp.length !== 6}
                    >
                      {isVerifyingOtp ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify OTP"
                      )}
                    </Button>

                    <Button
                      type="button"
                      onClick={handleResendOtp}
                      variant="outline"
                      className="text-yellow-400 hover:text-yellow-300 border-yellow-600 w-full"
                      disabled={isResetPasswordLoading}
                    >
                      {isResetPasswordLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Resend OTP"
                      )}
                    </Button>

                    <Button
                      type="button"
                      onClick={() => setShowOtpModal(false)}
                      variant="outline"
                      className="text-gray-400 hover:text-gray-300 border-gray-600 w-full"
                      disabled={isVerifyingOtp}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                // Password Update Step
                <>
                  <div className="bg-green-900/20 p-3 rounded-lg border border-green-500/20">
                    <p className="text-sm text-green-300">
                      OTP verified! Now set your new password.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-white">New Password</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="bg-[#0A1A2F] border-green-500/30 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm text-white">Confirm Password</Label>
                      <Input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="bg-[#0A1A2F] border-green-500/30 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      onClick={handleUpdatePassword}
                      className="bg-green-600 hover:bg-green-700 text-white w-full"
                      disabled={isUpdatingPassword || !newPassword || !confirmNewPassword}
                    >
                      {isUpdatingPassword ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </Button>

                    <Button
                      type="button"
                      onClick={() => setShowOtpModal(false)}
                      variant="outline"
                      className="text-gray-400 hover:text-gray-300 border-gray-600 w-full"
                      disabled={isUpdatingPassword}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
