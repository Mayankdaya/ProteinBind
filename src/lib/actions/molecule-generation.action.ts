"use server";

import { auth } from "@clerk/nextjs";
import { revalidatePath } from "next/cache";
import { handleError } from "../utils";

interface MoleculeGenerationHistoryType {
  prompt: string;
  generatedMolecules: string[];
  timestamp: Date;
}

interface NvidiaApiResponse {
  molecules: string[];
  status: string;
}

async function callNvidiaApi(prompt: string): Promise<NvidiaApiResponse> {
  try {
    const response = await fetch('/api/nvidia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`NVIDIA API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling NVIDIA API:', error);
    throw error;
  }
}

export async function createMoleculeGenerationHistory(data: any) {
  try {
    const { getToken } = auth();
    const token = await getToken();
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
    
    // For now, just log the history data instead of saving
    console.log('Molecule generation history:', data);
    
    // Return success without actually saving to avoid auth errors
    return { success: true, data };

    /* Uncomment when ready to implement actual API saving
    const response = await fetch(`${baseUrl}/api/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to save history: ${response.statusText}`);
    }

    return await response.json();
    */
  } catch (error: any) {
    console.error('Error saving molecule generation history:', error);
    // Return error without throwing to prevent UI disruption
    return { success: false, error: error.message };
  }
}

export async function getMoleculeGenerationHistoryByUser(userId: string) {
  try {
    // Implement local storage or caching solution here
    // For now, return empty array as we're not persisting data
    return [];
  } catch (error) {
    console.error("Error retrieving history entries:", error);
    handleError(error);
  }
}

export async function getMoleculeGenerationHistoryById(historyId: string) {
  try {
    // Implement local storage or caching solution here
    // For now, return null as we're not persisting data
    return null;
  } catch (error) {
    console.error("Error retrieving history entry:", error);
    handleError(error);
  }
}
