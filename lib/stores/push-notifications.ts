import { create } from "zustand";
import { persist } from "zustand/middleware";

type PushNotificationState = {
  isSubscribed: boolean;
  setSubscribed: (value: boolean) => void;
};

export const usePushNotificationStore = create<PushNotificationState>()(
  persist(
    (set) => ({
      isSubscribed: false,
      setSubscribed: (value) => set({ isSubscribed: value }),
    }),
    {
      name: "push-notifications",
    },
  ),
);
