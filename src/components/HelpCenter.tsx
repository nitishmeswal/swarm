"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  Mail,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Book,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

// Mock translation function - replace with actual i18n implementation
const useTranslation = () => {
  const t = (key: string) => {
    const translations: { [key: string]: string } = {
      "helpCenter.title": "Help Center",
      "helpCenter.contactSupport": "Contact Support",
      "helpCenter.contactSupportDesc":
        "Get in touch with our support team for personalized assistance",
      "helpCenter.userGuides": "User Guides",
      "helpCenter.userGuidesDesc":
        "Step-by-step guides to help you navigate the platform",
      "helpCenter.documentation": "Documentation",
      "helpCenter.documentationDesc":
        "Detailed documentation about features and processes",
      "helpCenter.faq": "Frequently Asked Questions",
      "helpCenter.faqs.getStarted.question":
        "How do I get started with NeuroSwarm?",
      "helpCenter.faqs.getStarted.answer":
        "Getting started with NeuroSwarm is easy! Follow these steps:",
      "helpCenter.faqs.getStarted.steps.0":
        "Create your account and complete verification",
      "helpCenter.faqs.getStarted.steps.1":
        "Connect your wallet to receive payments",
      "helpCenter.faqs.getStarted.steps.2":
        "Download and install the NeuroSwarm client",
      "helpCenter.faqs.getStarted.steps.3":
        "Start contributing compute power and earn rewards",
      "helpCenter.faqs.earnings.question": "How do earnings and payments work?",
      "helpCenter.faqs.earnings.answer":
        "You earn rewards based on the compute power you contribute to the network. Payments are processed automatically and sent to your connected wallet.",
      "helpCenter.faqs.skills.question":
        "What skills do I need to participate?",
      "helpCenter.faqs.skills.answer":
        "No special skills are required! Simply install our client software and let your computer contribute to the network while you're not using it.",
      "helpCenter.faqs.security.question":
        "How secure is my data on NeuroSwarm?",
      "helpCenter.faqs.security.answer":
        "We use enterprise-grade encryption and security protocols. Your personal data is never shared, and all compute tasks are sandboxed for maximum security.",
      "helpCenter.faqs.global.question":
        "Can I participate from anywhere in the world?",
      "helpCenter.faqs.global.answer":
        "Yes! NeuroSwarm is a global network. You can participate from anywhere with a stable internet connection.",
      "helpCenter.contactForm.title": "Contact Support",
      "helpCenter.contactForm.sendMessage": "Send us a message",
      "helpCenter.contactForm.responseTime":
        "Our support team typically responds within 24 hours during business days.",
      "helpCenter.contactForm.name": "Your Name",
      "helpCenter.contactForm.namePlaceholder": "Enter your name",
      "helpCenter.contactForm.email": "Email Address",
      "helpCenter.contactForm.emailPlaceholder": "Enter your email",
      "helpCenter.contactForm.message": "Message",
      "helpCenter.contactForm.messagePlaceholder":
        "Describe your issue or question",
      "helpCenter.contactForm.submit": "Submit Request",
      "helpCenter.emailSupport.title": "Email Support",
      "helpCenter.emailSupport.email": "SUPPORT@NEUROSWARM.AI",
      "helpCenter.emailSupport.description":
        "For general inquiries and support",
      "helpCenter.supportHours.title": "Support Hours",
      "helpCenter.supportHours.days": "Monday - Friday",
      "helpCenter.supportHours.hours": "9:00 AM - 6:00 PM UTC",
      "helpCenter.resources.title": "Additional Resources",
      "helpCenter.resources.guides.title": "User Guides",
      "helpCenter.resources.guides.description":
        "Step-by-step guides to help you navigate the platform effectively",
      "helpCenter.resources.guides.button": "Browse Guides",
      "helpCenter.resources.community.title": "Community Forum",
      "helpCenter.resources.community.description":
        "Connect with other users, share tips, and get community support",
      "helpCenter.resources.community.button": "Visit Forum",
    };
    return translations[key] || key;
  };

  return { t };
};

const FAQItem = ({
  question,
  answer,
}: {
  question: string;
  answer: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-[#112544] last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full py-4 text-left hover:bg-[#0A1A2F]/30 px-2 rounded-lg transition-colors"
      >
        <span className="font-medium text-white">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-blue-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-blue-400 flex-shrink-0" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-4 px-2 text-gray-300 text-sm space-y-2">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const HelpCategoryCard = ({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="bg-[#161628] rounded-xl p-5 text-left transition-all hover:bg-[#1c1c30] hover:scale-[1.02] border border-[#112544]/50 group"
  >
    <div className="flex items-center gap-3 mb-2">
      <div className="icon-bg icon-container flex items-center justify-center rounded-md p-2 group-hover:border-blue-500/30 transition-colors">
        {icon}
      </div>
      <h3 className="text-white font-medium">{title}</h3>
    </div>
    <p className="text-gray-400 text-sm">{description}</p>
  </button>
);

export default function HelpCenter() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const faqs = [
    {
      question: t("helpCenter.faqs.getStarted.question"),
      answer: (
        <>
          <p>{t("helpCenter.faqs.getStarted.answer")}</p>
          <ol className="list-decimal ml-5 mt-2 space-y-1">
            <li>{t("helpCenter.faqs.getStarted.steps.0")}</li>
            <li>{t("helpCenter.faqs.getStarted.steps.1")}</li>
            <li>{t("helpCenter.faqs.getStarted.steps.2")}</li>
            <li>{t("helpCenter.faqs.getStarted.steps.3")}</li>
          </ol>
        </>
      ),
    },
    {
      question: t("helpCenter.faqs.earnings.question"),
      answer: (
        <>
          <p>{t("helpCenter.faqs.earnings.answer")}</p>
        </>
      ),
    },
    {
      question: t("helpCenter.faqs.skills.question"),
      answer: (
        <>
          <p>{t("helpCenter.faqs.skills.answer")}</p>
        </>
      ),
    },
    {
      question: t("helpCenter.faqs.security.question"),
      answer: (
        <>
          <p>{t("helpCenter.faqs.security.answer")}</p>
        </>
      ),
    },
    {
      question: t("helpCenter.faqs.global.question"),
      answer: (
        <>
          <p>{t("helpCenter.faqs.global.answer")}</p>
        </>
      ),
    },
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    // Handle form submission here
    alert("Thank you for your message! We'll get back to you soon.");
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <div className="space-y-6 p-4 rounded-3xl max-w-7xl ">
      <div className="flex items-center gap-3 mb-6">
        <HelpCircle className="w-6 h-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">
          {t("helpCenter.title")}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HelpCategoryCard
          icon={<MessageSquare className="w-5 h-5 text-blue-400" />}
          title={t("helpCenter.contactSupport")}
          description={t("helpCenter.contactSupportDesc")}
          onClick={() =>
            document
              .getElementById("contact-section")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        />
        <HelpCategoryCard
          icon={<Book className="w-5 h-5 text-green-400" />}
          title={t("helpCenter.userGuides")}
          description={t("helpCenter.userGuidesDesc")}
          onClick={() =>
            document
              .getElementById("faq-section")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        />
        <HelpCategoryCard
          icon={<FileText className="w-5 h-5 text-yellow-400" />}
          title={t("helpCenter.documentation")}
          description={t("helpCenter.documentationDesc")}
          onClick={() =>
            document
              .getElementById("resources-section")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        />
      </div>

      <div id="faq-section" className="mt-10">
        <h3 className="text-xl font-semibold mb-4 text-white">
          {t("helpCenter.faq")}
        </h3>
        <div className="bg-[#161628] rounded-xl p-5 border border-[#112544]/50 shadow-lg">
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>

      <div id="contact-section" className="mt-10">
        <h3 className="text-xl font-semibold mb-4 text-white">
          {t("helpCenter.contactForm.title")}
        </h3>
        <div className="bg-[#161628] rounded-xl p-6 border border-[#112544]/50 shadow-lg">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <h4 className="font-medium text-white mb-2">
                {t("helpCenter.contactForm.sendMessage")}
              </h4>
              <p className="text-gray-400 text-sm mb-4">
                {t("helpCenter.contactForm.responseTime")}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm text-gray-300 mb-1"
                  >
                    {t("helpCenter.contactForm.name")}
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={t("helpCenter.contactForm.namePlaceholder")}
                    className="bg-[#0A1A2F] border-[#112544] text-white w-full"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm text-gray-300 mb-1"
                  >
                    {t("helpCenter.contactForm.email")}
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder={t("helpCenter.contactForm.emailPlaceholder")}
                    className="bg-[#0A1A2F] border-[#112544] text-white w-full"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm text-gray-300 mb-1"
                  >
                    {t("helpCenter.contactForm.message")}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder={t("helpCenter.contactForm.messagePlaceholder")}
                    rows={4}
                    className="bg-[#0A1A2F] border border-[#112544] text-white rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                >
                  {t("helpCenter.contactForm.submit")}
                </Button>
              </form>
            </div>

            <div className="lg:w-80 space-y-4">
              <div className="bg-[#0A1A2F] p-4 rounded-lg border border-[#112544]/50">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="font-medium text-white">
                      {t("helpCenter.emailSupport.title")}
                    </h5>
                    <p className="text-blue-400 text-sm break-all">
                      {t("helpCenter.emailSupport.email")}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      {t("helpCenter.emailSupport.description")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#0A1A2F] p-4 rounded-lg border border-[#112544]/50">
                <h5 className="font-medium text-white mb-2">
                  {t("helpCenter.supportHours.title")}
                </h5>
                <div className="text-sm text-gray-300 space-y-1">
                  <p>{t("helpCenter.supportHours.days")}</p>
                  <p>{t("helpCenter.supportHours.hours")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="resources-section" className="mt-10">
        <h3 className="text-xl font-semibold mb-4 text-white">
          {t("helpCenter.resources.title")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#161628] rounded-xl p-5 border border-[#112544]/50 shadow-lg">
            <h4 className="font-medium text-white mb-2">
              {t("helpCenter.resources.guides.title")}
            </h4>
            <p className="text-gray-400 text-sm mb-3">
              {t("helpCenter.resources.guides.description")}
            </p>
            <Button
              variant="outline"
              className="text-blue-400 border-blue-400/30 hover:bg-blue-400/10 bg-transparent"
            >
              <Book className="w-4 h-4 mr-2" />
              {t("helpCenter.resources.guides.button")}
            </Button>
          </div>

          <div className="bg-[#161628] rounded-xl p-5 border border-[#112544]/50 shadow-lg">
            <h4 className="font-medium text-white mb-2">
              {t("helpCenter.resources.community.title")}
            </h4>
            <p className="text-gray-400 text-sm mb-3">
              {t("helpCenter.resources.community.description")}
            </p>
            <Button
              variant="outline"
              className="text-green-400 border-green-400/30 hover:bg-green-400/10 bg-transparent"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {t("helpCenter.resources.community.button")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
