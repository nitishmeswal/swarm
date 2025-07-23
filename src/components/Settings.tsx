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
        "Send a secure reset link to your email address.",
      delete_warning:
        "This action is permanent and cannot be undone. All your data, earnings, and referrals will be permanently deleted.",
      interface_language: "Interface Language",
      display_currency: "Display Currency",
      your_email_address: "Your Email Address",
      enter_email: "Enter your email",
      send_reset_link: "Send Reset Link",
      sending: "Sending...",
      delete_my_account: "Delete My Account",
      confirm_deletion: "Confirm Deletion",
      delete_confirmation:
        'Type "Delete Account" to confirm permanent deletion.',
      permanently_delete: "Permanently Delete",
      deleting_account: "Deleting Account...",
      cancel: "Cancel",
      reset_link_sent: "Password reset link sent to your email!",
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

  const { t, i18n } = useTranslation();
  const supabase = createClient();

  useEffect(() => {
    setLanguage(i18n.language);
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

  // Updated reset password function - sends link instead of OTP
  const handleResetPassword = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    try {
      setIsResetPasswordLoading(true);

      // Send password reset email with link to reset-password page
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error("Password reset error:", error);
        toast.error(`Failed to send reset email: ${error.message}`);
        return;
      }

      toast.success(t("reset_link_sent"));
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("Failed to send reset email");
    } finally {
      setIsResetPasswordLoading(false);
    }
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
                <Button
                  onClick={handleResetPassword}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white whitespace-nowrap"
                  disabled={isResetPasswordLoading || isLoadingUser}
                >
                  {isResetPasswordLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {t("sending")}
                    </>
                  ) : (
                    t("send_reset_link")
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

            <DeleteConfirmModal
              isOpen={showDeleteConfirm}
              onClose={() => setShowDeleteConfirm(false)}
              onConfirm={handleDeleteAccount}
              isLoading={isDeleteAccountLoading}
            />
          </div>
        </SettingsCard>
      </div>
    </div>
  );
};

export default Settings;
