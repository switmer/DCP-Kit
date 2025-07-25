"use client";
import { AppProgressBar } from "next-nprogress-bar";

export const ProgressBar = () => {
  return (
    <AppProgressBar
      color="#D6FE50"
      options={{ showSpinner: false, speed: 250 }}
      shallowRouting
      height={"1px"}
    />
  );
};
