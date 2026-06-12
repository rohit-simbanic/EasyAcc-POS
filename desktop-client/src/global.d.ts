export {};

declare global {
  interface Window {
    electronAPI?: {
      printReceipt: (receiptData: any) => Promise<{ success: boolean; printedAt: Date }>;
    };
  }
}
