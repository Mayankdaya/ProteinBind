"use client";
import { createContext, useContext, ReactNode, useState } from "react";

interface UserData {
  firstName: string;
  lastName: string;
  photo: string;
  jobTitle: string;
  userBio: string;
}

const defaultUserData: UserData = {
  firstName: "Mayank Dayal",
  lastName: "User",
  photo: "/images/user/user-01.png",
  jobTitle: "Researcher",
  userBio: "Drug Researcher specializing in protein binding analysis",
};

const UserContext = createContext<UserData>(defaultUserData);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [userData] = useState<UserData>(defaultUserData);

  return (
    <UserContext.Provider value={userData}>
      {children}
    </UserContext.Provider>
  );
};