'use client';

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
import { Mail, Lock, User, Eye, EyeOff, AlertCircle } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { useAuth } from "@/contexts/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { loginWithGoogle, login, signUp, isLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Sign up form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    
    setError("");
    setIsSubmitting(true);
    
    try {
      await login(loginEmail, loginPassword);
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupUsername || !signupPassword) return;
    
    if (signupPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    setError("");
    setIsSubmitting(true);
    
    try {
      await signUp(signupEmail, signupUsername, signupPassword);
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsSubmitting(true);
    
    try {
      await loginWithGoogle();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed");
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setLoginEmail("");
    setLoginPassword("");
    setSignupEmail("");
    setSignupUsername("");
    setSignupPassword("");
    setConfirmPassword("");
    setError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-[#0F172A] to-[#1E293B] border-[#1e3a8a] text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-white">
            Welcome to Swarm
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#1e3a8a]/30">
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

          <TabsContent value="login" className="space-y-4">
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#0361DA] hover:bg-[#0361DA]/80 text-white"
                disabled={isSubmitting || !loginEmail || !loginPassword}
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSignupSubmit} className="space-y-4">
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#0361DA] hover:bg-[#0361DA]/80 text-white"
                disabled={isSubmitting || !signupEmail || !signupUsername || !signupPassword || !confirmPassword}
              >
                {isSubmitting ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[#1e3a8a]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] px-2 text-gray-400">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          onClick={handleGoogleLogin}
          variant="outline"
          className="w-full bg-white/10 border-[#1e3a8a] text-white hover:bg-white/20"
          disabled={isSubmitting}
        >
          <FcGoogle className="mr-2 h-4 w-4" />
          {isSubmitting ? "Connecting..." : "Continue with Google"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
