import { handleError } from "@/lib/utils";

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  photo: string;
  jobTitle: string;
  userBio: string;
}

export async function getUserByEmail(email: string): Promise<User> {
  try {
    // Return a mock user object with _id
    const mockUser: User = {
      _id: "mock-user-id", // Added _id field
      firstName: "John",
      lastName: "Doe",
      email: email,
      photo: "/images/user/user-01.png",
      jobTitle: "Drug Researcher",
      userBio: ""
    };

    return mockUser;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw handleError(error);
  }
}