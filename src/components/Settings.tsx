"use client";

import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Globe,
  DollarSign,
  Key,
  Trash2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

// Mock translation function
const useTranslation = () => {
  const t = (key: string) => {
    const translations: { [key: string]: string } = {
      settings: "Settings",
      language: "Language",
      currency: "Currency (Coming Soon)",
      currency_coming_soon: "Coming Soon",
      reset_password: "Reset Password",
      delete_account: "Delete Account",
      language_description:
        "Select your preferred language for the application interface.",
      currency_description:
        "Select your preferred currency for displaying values.",
      reset_password_description:
        "Send a secure OTP to your email address to reset your password.",
      delete_warning:
        "This action is permanent and cannot be undone. All your data, earnings, and referrals will be permanently deleted.",
      interface_language: "Interface Language",
      display_currency: "Display Currency",
      your_email_address: "Your Email Address",
      enter_email: "Enter your email",
      send_otp: "Send OTP",
      sending: "Sending...",
      verify_otp: "Verify OTP",
      verifying: "Verifying...",
      new_password: "New Password",
      confirm_password: "Confirm Password",
      update_password: "Update Password",
      updating: "Updating...",
      enter_otp: "Enter OTP",
      enter_new_password: "Enter new password",
      confirm_new_password: "Confirm new password",
      resend_otp: "Resend OTP",
      otp_sent_to: "OTP sent to",
      enter_otp_sent_to: "Enter the OTP sent to your email",
      delete_my_account: "Delete My Account",
      confirm_deletion: "Confirm Deletion",
      delete_confirmation:
        'Type "Delete Account" to confirm permanent deletion.',
      permanently_delete: "Permanently Delete",
      deleting_account: "Deleting Account...",
      cancel: "Cancel",
      otp_sent: "OTP sent to your email!",
      otp_verified: "OTP verified successfully!",
      password_updated: "Password updated successfully!",
      invalid_otp: "Invalid OTP. Please try again.",
      passwords_not_match: "Passwords do not match.",
      password_too_short: "Password must be at least 6 characters long.",
      otp_expired: "OTP has expired. Please request a new one.",
    };
    return translations[key] || key;
  };

  const i18n = {
    language: "en",
    changeLanguage: (lang: string) => {
      console.log(`Language changed to: ${lang}`);
      toast.success(`Language changed to ${lang}`);
    },
  };

  return { t, i18n };
};

// Component for the settings card
const SettingsCard = ({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`bg-[#161628] rounded-2xl p-6 ${className}`}>
    <div className="flex items-center gap-3 mb-5">
      <div className="bg-[#0A1A2F] p-3 rounded-lg">{icon}</div>
      <h3 className="text-white font-medium">{title}</h3>
    </div>
    {children}
  </div>
);

// Delete Confirmation Modal
const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) => {
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) setDeleteConfirmText("");
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#161628] border border-[#112544] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {t("confirm_deletion")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/20">
            <p className="text-sm text-red-300">{t("delete_warning")}</p>
          </div>

          <div className="bg-red-950/30 p-3 rounded-lg border border-red-500/30">
            <p className="text-sm text-red-200">{t("delete_confirmation")}</p>
          </div>

          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder='Type "Delete Account"'
            className="bg-[#0A1A2F] border-red-500/30 text-white"
            autoFocus
          />

          <div className="flex flex-col gap-2">
            <Button
              onClick={onConfirm}
              className="bg-red-600 hover:bg-red-700 text-white w-full"
              disabled={isLoading || deleteConfirmText !== "Delete Account"}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t("deleting_account")}
                </>
              ) : (
                t("permanently_delete")
              )}
            </Button>

            <Button
              onClick={onClose}
              variant="outline"
              className="text-gray-400 hover:text-gray-300 border-gray-600 w-full"
              disabled={isLoading}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Settings: React.FC = () => {
  const [language, setLanguage] = useState("en");
  const [currency, setCurrency] = useState("usd");
  const [email, setEmail] = useState("");
  const [isResetPasswordLoading, setIsResetPasswordLoading] = useState(false);
  const [isDeleteAccountLoading, setIsDeleteAccountLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  
  // OTP reset password states with localStorage persistence
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");

  const { t, i18n } = useTranslation();
  const supabase = createClient();

  useEffect(() => {
    setLanguage(i18n.language);
    
    // Restore OTP dialog state from localStorage
    const savedOtpState = localStorage.getItem('otp_reset_state');
    if (savedOtpState) {
      try {
        const state = JSON.parse(savedOtpState);
        if (state.otpSent && state.email) {
          setOtpSent(true);
          setOtpEmail(state.email);
          setShowOtpModal(true);
          if (state.otpVerified) {
            setOtpVerified(true);
          }
        }
      } catch (error) {
        console.error('Error parsing saved OTP state:', error);
        localStorage.removeItem('otp_reset_state');
      }
    }
  }, []);

  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error("Error fetching user:", error);
          toast.error("Failed to fetch user information");
          return;
        }

        if (user?.email) {
          setEmail(user.email);
        } else {
          toast.error("No user email found");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        toast.error("Failed to fetch user information");
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUserEmail();
  }, [supabase]);

  const languages = [
    { code: "en", name: "English" },
    { code: "hi", name: "Hindi" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "zh", name: "Chinese" },
  ];

  const currencies = [
    { code: "usd", name: "USD ($)" },
    { code: "eur", name: "EUR (€)" },
    { code: "gbp", name: "GBP (£)" },
    { code: "jpy", name: "JPY (¥)" },
  ];

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
    localStorage.setItem("i18nextLng", newLanguage);
    toast.success(
      `Language changed to ${e.target.options[e.target.selectedIndex].text}`
    );
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrency(e.target.value);
    toast.success(
      `Currency changed to ${e.target.options[e.target.selectedIndex].text}`
    );
  };

  // Save OTP state to localStorage
  const saveOtpState = (state: any) => {
    localStorage.setItem('otp_reset_state', JSON.stringify(state));
  };

  // Clear OTP state from localStorage
  const clearOtpState = () => {
    localStorage.removeItem('otp_reset_state');
  };

  // Send OTP for password reset
  const handleSendOtp = async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    try {
      setIsResetPasswordLoading(true);

      // Send OTP using Supabase's resetPasswordForEmail with OTP template
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: undefined, // No redirect needed for OTP
      });

      if (error) {
        console.error("OTP send error:", error);
        toast.error(`Failed to send OTP: ${error.message}`);
        return;
      }

      toast.success(t("otp_sent"));
      setShowOtpModal(true);
      setOtpSent(true);
      setOtpEmail(email);
      
      // Save state to localStorage
      saveOtpState({
        otpSent: true,
        email: email,
        otpVerified: false
      });
    } catch (error) {
      console.error("OTP send error:", error);
      toast.error("Failed to send OTP");
    } finally {
      setIsResetPasswordLoading(false);
    }
  };

  // Resend OTP functionality
  const handleResendOtp = async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setOtp(""); // Clear previous OTP
    await handleSendOtp(); // Reuse the send OTP function
  };

  // Verify OTP and enable password update
  const handleVerifyOtp = async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!otp.trim()) {
      toast.error("Please enter the OTP");
      return;
    }

    try {
      setIsVerifyingOtp(true);

      // Verify OTP using Supabase's verifyOtp method
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery'
      });

      if (error) {
        console.error("OTP verification error:", error);
        if (error.message.includes('expired')) {
          toast.error(t("otp_expired"));
        } else {
          toast.error(t("invalid_otp"));
        }
        return;
      }

      toast.success(t("otp_verified"));
      setOtpVerified(true);
      
      // Update localStorage state
      saveOtpState({
        otpSent: true,
        email: otpEmail || email,
        otpVerified: true
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error(t("invalid_otp"));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Update password after OTP verification
  const handleUpdatePassword = async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!newPassword.trim()) {
      toast.error("Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t("password_too_short"));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t("passwords_not_match"));
      return;
    }

    try {
      setIsUpdatingPassword(true);

      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error("Password update error:", error);
        toast.error(`Failed to update password: ${error.message}`);
        return;
      }

      toast.success(t("password_updated"));
      
      // Reset all states and close modal
      setShowOtpModal(false);
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setOtpVerified(false);
      setOtpSent(false);
      setOtpEmail("");
      
      // Clear localStorage state
      clearOtpState();
    } catch (error) {
      console.error("Password update error:", error);
      toast.error("Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Close OTP modal and reset states
  const handleCloseOtpModal = () => {
    setShowOtpModal(false);
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setOtpVerified(false);
    setOtpSent(false);
    setOtpEmail("");
    
    // Clear localStorage state
    clearOtpState();
  };

  const handleDeleteAccount = async () => {
    if (!email) {
      toast.error("User email not found");
      return;
    }

    try {
      setIsDeleteAccountLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        toast.error("User not found");
        return;
      }

      // Note: For user deletion, you'll need to implement this on your backend
      // as admin.deleteUser() requires service key
      const response = await fetch("/api/auth/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      toast.success("Account deleted successfully");
      localStorage.clear();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (error: unknown) {
      console.error("Delete account error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to delete account: ${errorMessage}`);
    } finally {
      setIsDeleteAccountLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
        <span className="ml-2 text-gray-400">Loading user information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 rounded-3xl max-w-7xl">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="w-6 h-6 text-blue-400" />
        <h2 className="text-2xl font-bold">{t("settings")}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Language Settings */}
        <SettingsCard
          title={t("language")}
          icon={<Globe className="w-5 h-5 text-blue-400" />}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-400">{t("language_description")}</p>
            <div className="flex flex-col space-y-2">
              <label htmlFor="language" className="text-sm text-white">
                {t("interface_language")}
              </label>
              <div className="relative">
                <select
                  id="language"
                  value={language}
                  onChange={handleLanguageChange}
                  className="bg-[#0A1A2F] border border-[#112544] text-white rounded-md p-2 pr-10 w-full appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </SettingsCard>

        {/* Currency Settings */}
        <SettingsCard
          title={`${t("currency")} (${t("currency_coming_soon")})`}
          icon={<DollarSign className="w-5 h-5 text-green-400" />}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-400">
                {t("currency_description")}
              </p>
              <div className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">
                {t("currency_coming_soon")}
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <label htmlFor="currency" className="text-sm text-white">
                {t("display_currency")}
              </label>
              <div className="relative">
                <select
                  id="currency"
                  value={currency}
                  onChange={handleCurrencyChange}
                  className="bg-[#0A1A2F] border border-[#112544] text-white rounded-md p-2 pr-10 w-full appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled
                >
                  {currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </SettingsCard>

        {/* Reset Password */}
        <SettingsCard
          title={t("reset_password")}
          icon={<Key className="w-5 h-5 text-yellow-400" />}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              {t("reset_password_description")}
            </p>
            <div className="flex flex-col space-y-2">
              <label htmlFor="reset-email" className="text-sm text-white">
                {t("your_email_address")}
              </label>
              <div className="flex gap-2">
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("enter_email")}
                  className="bg-[#0A1A2F] border-[#112544] text-white flex-1"
                  disabled={isLoadingUser}
                />
                {!otpSent ? (
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white whitespace-nowrap"
                    disabled={isResetPasswordLoading || isLoadingUser}
                  >
                  {isResetPasswordLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {t("sending")}
                    </>
                  ) : (
                    t("send_otp")
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setShowOtpModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
                    disabled={isLoadingUser}
                  >
                    {t("verify_otp")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </SettingsCard>

        {/* Delete Account */}
        <SettingsCard
          title={t("delete_account")}
          icon={<Trash2 className="w-5 h-5 text-red-400" />}
          className="border border-red-500/20"
        >
          <div className="space-y-4">
            <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-300">{t("delete_warning")}</p>
              </div>
            </div>

            <Button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
              variant="destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("delete_my_account")}
            </Button>

            <DeleteConfirmModal
              isOpen={showDeleteConfirm}
              onClose={() => setShowDeleteConfirm(false)}
              onConfirm={handleDeleteAccount}
              isLoading={isDeleteAccountLoading}
            />

            {/* OTP Verification Modal */}
            <Dialog open={showOtpModal} onOpenChange={(open) => !open && handleCloseOtpModal()}>
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
                          {t("enter_otp_sent_to")} <strong>{otpEmail || email}</strong>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm text-white">
                          {t("enter_otp")}
                        </label>
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
                              {t("verifying")}
                            </>
                          ) : (
                            t("verify_otp")
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
                              {t("sending")}
                            </>
                          ) : (
                            t("resend_otp")
                          )}
                        </Button>

                        <Button
                          type="button"
                          onClick={handleCloseOtpModal}
                          variant="outline"
                          className="text-gray-400 hover:text-gray-300 border-gray-600 w-full"
                          disabled={isVerifyingOtp}
                        >
                          {t("cancel")}
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
                          <label className="text-sm text-white">
                            {t("new_password")}
                          </label>
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={t("enter_new_password")}
                            className="bg-[#0A1A2F] border-green-500/30 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm text-white">
                            {t("confirm_password")}
                          </label>
                          <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t("confirm_new_password")}
                            className="bg-[#0A1A2F] border-green-500/30 text-white"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          onClick={handleUpdatePassword}
                          className="bg-green-600 hover:bg-green-700 text-white w-full"
                          disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                        >
                          {isUpdatingPassword ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              {t("updating")}
                            </>
                          ) : (
                            t("update_password")
                          )}
                        </Button>

                        <Button
                          type="button"
                          onClick={handleCloseOtpModal}
                          variant="outline"
                          className="text-gray-400 hover:text-gray-300 border-gray-600 w-full"
                          disabled={isUpdatingPassword}
                        >
                          {t("cancel")}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </SettingsCard>
      </div>
    </div>
  );
};

export default Settings;
