import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Consistent number formatting functions to avoid SSR hydration issues
export const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export const formatCurrency = (num: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }): string => {
  const { minimumFractionDigits = 2, maximumFractionDigits = 2 } = options || {};
  const formatted = num.toFixed(maximumFractionDigits);
  const [integer, decimal] = formatted.split('.');
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimal ? `${formattedInteger}.${decimal}` : formattedInteger;
};
