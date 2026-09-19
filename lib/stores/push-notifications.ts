import { create } from "zustand";

// Browser storage is not evidence of a valid push subscription.
export const usePushNotificationStore = create<{
  isSubscribed: boolean;
  setSubscribed: (value: boolean) => void;
}>((set) => ({
  isSubscribed: false,
  setSubscribed: (value) => set({ isSubscribed: value }),
}));
