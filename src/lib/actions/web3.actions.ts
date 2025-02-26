import { connectToDatabase } from "../database";
import { handleError } from "../utils";
import { ethers } from "ethers";

interface Web3User {
  email?: string;
  walletAddress: string;
  nonce: string;
  signature?: string;
}

export async function verifyWalletSignature(message: string, signature: string, address: string): Promise<boolean> {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error("Error verifying wallet signature:", error);
    handleError(error);
    return false;
  }
}

export async function linkWalletToUser(email: string, walletAddress: string) {
  try {
    await connectToDatabase();
    // TODO: Implement database update to link wallet address to user
    // For now, just log the action
    console.log(`Linking wallet ${walletAddress} to user ${email}`);
    return true;
  } catch (error) {
    console.error("Error linking wallet to user:", error);
    handleError(error);
    return false;
  }
}

export async function getUserByWalletAddress(walletAddress: string) {
  try {
    await connectToDatabase();
    // TODO: Implement database query to get user by wallet address
    // For now, return a mock user
    return {
      email: `wallet-${walletAddress.slice(0, 6)}@example.com`,
      walletAddress,
      firstName: "Wallet",
      lastName: "User",
      photo: "/images/user/user-01.png",
      jobTitle: "Web3 User",
      userBio: ""
    };
  } catch (error) {
    console.error("Error getting user by wallet address:", error);
    handleError(error);
    return null;
  }
}

export async function generateNonce(): Promise<string> {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}