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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Mock translation function - replace with actual i18n implementation
const useTranslation = () => {
  const t = (key: string) => {
    const translations: { [key: string]: string } = {
      settings: "Settings",
      language: "Language",
      currency: "Currency (Coming Soon)",
      currency_coming_soon: "Coming Soon",
      reset_password: "Reset Password",
      delete_account: "Delete Account",
      language_description: "Select your preferred language for the application interface.",
      currency_description: "Select your preferred currency for displaying values.",
      reset_password_description: "Request a OTP (One Time Password) to your email for reset password.",
      delete_warning: "This action is permanent and cannot be undone. All your data, earnings, and referrals will be permanently deleted.",
      interface_language: "Interface Language",
      display_currency: "Display Currency",
      your_email_address: "Your Email Address",
      enter_email: "Enter your email",
      send_otp: "Send OTP",
      sending: "Sending...",
      delete_my_account: "Delete My Account",
      confirm_deletion: "Confirm Deletion",
      delete_confirmation: 'Type "Delete Account" to confirm permanent deletion.',
      permanently_delete: "Permanently Delete",
      deleting_account: "Deleting Account...",
      cancel: "Cancel",
      otp_sent_to: "OTP sent to",
      enter_otp: "Enter OTP",
      new_password: "New Password",
      confirm_password: "Confirm Password",
      resetting_password: "Resetting Password...",
    };
    return translations[key] || key;
  };
  
  const i18n = {
    language: "en",
    changeLanguage: (lang: string) => {
      console.log(`Language changed to: ${lang}`);
    }
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
  <div className={`bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 ${className}`}>
    <div className="flex items-center gap-3 mb-5">
      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/50">{icon}</div>
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

  // Reset text when modal closes
  useEffect(() => {
    if (!isOpen) setDeleteConfirmText("");
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-md">
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
            className="bg-slate-800 border-red-500/30 text-white"
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

// Password Reset Modal with OTP verification
const PasswordResetModal = ({
  isOpen,
  onClose,
  email,
  isLoading,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  isLoading: boolean;
  onSubmit: (otp: string, newPassword: string) => void;
}) => {
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const { t } = useTranslation();

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = () => {
    // Validate inputs
    if (!otp.trim()) {
      setError("Please enter the OTP sent to your email");
      return;
    }
    
    if (!newPassword.trim()) {
      setError("Please enter a new password");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    // Clear any errors and submit
    setError("");
    onSubmit(otp, newPassword);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-blue-400 flex items-center gap-2">
            <Key className="w-5 h-5" />
            {t("reset_password")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/20">
            <p className="text-sm text-blue-300">
              {t("otp_sent_to")} <span className="font-medium">{email}</span>
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="otp" className="text-sm text-gray-400 block mb-1">
                {t("enter_otp")}
              </label>
              <Input
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP from email"
                className="bg-slate-800 border-slate-700 text-white"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="new-password" className="text-sm text-gray-400 block mb-1">
                {t("new_password")}
              </label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="text-sm text-gray-400 block mb-1">
                {t("confirm_password")}
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {error && (
              <div className="bg-red-900/20 p-2 rounded-lg border border-red-500/20">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t("resetting_password")}
                </>
              ) : (
                t("reset_password")
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
  // State
  const [language, setLanguage] = useState("en");
  const [currency, setCurrency] = useState("usd");
  const [email, setEmail] = useState("user@example.com");
  const [isResetPasswordLoading, setIsResetPasswordLoading] = useState(false);
  const [isDeleteAccountLoading, setIsDeleteAccountLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);

  // i18n translation hook
  const { t, i18n } = useTranslation();

  // Language options
  const languages = [
    { code: "en", name: "English" },
    { code: "hi", name: "Hindi" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "zh", name: "Chinese" },
  ];

  // Currency options (for future use)
  const currencies = [
    { code: "usd", name: "USD ($)" },
    { code: "eur", name: "EUR (€)" },
    { code: "gbp", name: "GBP (£)" },
    { code: "jpy", name: "JPY (¥)" },
  ];

  // Handle language change
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
    // Save language preference to localStorage
    localStorage.setItem("i18nextLng", newLanguage);
    console.log(`Language changed to ${languages.find(l => l.code === newLanguage)?.name}`);
  };

  // Handle currency change
  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    console.log(`Currency changed to ${currencies.find(c => c.code === newCurrency)?.name}`);
  };

  // Handle reset password
  const handleResetPassword = async () => {
    if (!email.trim()) {
      console.error("Please enter your email address");
      return;
    }

    try {
      setIsResetPasswordLoading(true);
      
      // Mock API call - replace with actual Supabase call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Instead of just showing a success message, open the OTP modal
      setShowPasswordResetModal(true);
      console.log("OTP sent to your email");
    } catch (error) {
      console.error("Password reset error:", error);
      console.error("Failed to send OTP email");
    } finally {
      setIsResetPasswordLoading(false);
    }
  };

  // Handle OTP verification and password reset
  const handleVerifyOtpAndResetPassword = async (otp: string, newPassword: string) => {
    if (!email.trim() || !otp.trim() || !newPassword.trim()) {
      console.error("Please fill all required fields");
      return;
    }

    try {
      setIsResetPasswordLoading(true);
      
      // Mock API call - replace with actual Supabase calls
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log("Password reset successfully");
      setShowPasswordResetModal(false);
    } catch (error) {
      console.error("OTP verification or password update error:", error);
      console.error("Failed to verify OTP or reset password");
    } finally {
      setIsResetPasswordLoading(false);
    }
  };

  // Handle delete account
  const handleDeleteAccount = async () => {
    if (!email) {
      console.error("User email not found");
      return;
    }

    try {
      setIsDeleteAccountLoading(true);

      // Mock API call - replace with actual Supabase calls
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log("Account deleted successfully");
      localStorage.clear();
      
      // In a real app, you would redirect to login page
      console.log("Redirecting to home page...");
    } catch (error: any) {
      console.error("Delete account error:", error);
      console.error(`Failed to delete account: ${error.message}`);
    } finally {
      setIsDeleteAccountLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6 p-6 rounded-3xl max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="w-6 h-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">{t("settings")}</h2>
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
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code} className="text-white hover:bg-slate-700">
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select value={currency} onValueChange={handleCurrencyChange} disabled>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white opacity-50">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {currencies.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code} className="text-white hover:bg-slate-700">
                      {curr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  className="bg-slate-800 border-slate-700 text-white flex-1"
                />
                <Button
                  onClick={handleResetPassword}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white whitespace-nowrap"
                  disabled={isResetPasswordLoading}
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

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
              isOpen={showDeleteConfirm}
              onClose={() => setShowDeleteConfirm(false)}
              onConfirm={handleDeleteAccount}
              isLoading={isDeleteAccountLoading}
            />
          </div>
        </SettingsCard>
      </div>

      {/* Password Reset Modal */}
      <PasswordResetModal
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
        email={email}
        isLoading={isResetPasswordLoading}
        onSubmit={handleVerifyOtpAndResetPassword}
      />
    </div>
  );
};

export default Settings;
