"use client";
import React, { ReactNode, createContext, useContext, useState } from "react";

export enum SignInSegment {
  PhoneNumber = "Phone Number",
  Email = "Email",
}

interface SignInContextType {
  email: string;
  phone: string;
  segment: SignInSegment;
  setEmail: (email: string) => void;
  setSegment: (segment: SignInSegment) => void;
  setPhone: (phone: string) => void;
  updateEmail: string;
  updatePhone: string;
  setUpdateEmail: (email: string) => void;
  setUpdatePhone: (phone: string) => void;
}

const SignInContext = createContext<SignInContextType | undefined>(undefined);

export const SignInProvider: React.FC<{
  children: ReactNode | ReactNode[];
}> = ({ children }) => {
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  const [updateEmail, setUpdateEmail] = useState<string>("");
  const [updatePhone, setUpdatePhone] = useState<string>("");

  const [segment, setSegment] = useState<SignInSegment>(
    SignInSegment.PhoneNumber
  );

  return (
    <SignInContext.Provider
      value={{
        email,
        phone,
        segment,
        setEmail,
        setPhone,
        setSegment,
        updateEmail,
        updatePhone,
        setUpdateEmail,
        setUpdatePhone,
      }}
    >
      {children}
    </SignInContext.Provider>
  );
};

export const useSignIn = (): SignInContextType => {
  const context = useContext(SignInContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
