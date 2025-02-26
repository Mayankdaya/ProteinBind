"use server";

import { revalidatePath } from "next/cache";
import MoleculeGenerationHistory from "../database/models/molecule-generation.model";
import { connectToDatabase } from "../database/mongoose";
import { handleError } from "../utils";
import mongoose from "mongoose";

// Define response type for better type safety
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Type for molecule generation history
type MoleculeGenerationHistoryType = {
  prompt: string;
  generatedMolecules: Array<{
    smiles: string;
    score?: number;
  }>;
  parameters?: Record<string, any>;
  status: 'completed' | 'failed' | 'processing';
  error?: string;
};

export async function createMoleculeGenerationHistory(
  payload: MoleculeGenerationHistoryType,
  userId: string,
): Promise<ApiResponse<any>> {
  try {
    await connectToDatabase();

    if (!payload || !userId) {
      throw new Error('Missing required parameters');
    }

    const newHistoryEntry = await MoleculeGenerationHistory.create({
      ...payload,
      user: new mongoose.Types.ObjectId(userId),
    });

    revalidatePath('/molecule-bank');

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newHistoryEntry))
    };
  } catch (error) {
    console.error("Error creating history entry:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create history entry'
    };
  }
}

export async function getMoleculeGenerationHistoryByUser(
  userId: string
): Promise<ApiResponse<any[]>> {
  try {
    await connectToDatabase();

    if (!userId) {
      throw new Error('User ID is required');
    }

    const historyEntries = await MoleculeGenerationHistory.find({
      user: userId,
    }).sort({ createdAt: -1 });

    return {
      success: true,
      data: JSON.parse(JSON.stringify(historyEntries))
    };
  } catch (error) {
    console.error("Error retrieving history entries:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve history entries'
    };
  }
}

export async function getMoleculeGenerationHistoryById(
  historyId: string
): Promise<ApiResponse<any>> {
  try {
    await connectToDatabase();

    if (!historyId) {
      throw new Error('History ID is required');
    }

    const historyEntry = await MoleculeGenerationHistory.findById(historyId);
    if (!historyEntry) {
      return {
        success: false,
        error: 'History entry not found'
      };
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(historyEntry))
    };
  } catch (error) {
    console.error("Error retrieving history entry by ID:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve history entry'
    };
  }
}

export async function deleteMoleculeGenerationHistory(
  entryId: string
): Promise<ApiResponse<any>> {
  try {
    await connectToDatabase();

    if (!entryId) {
      throw new Error('Entry ID is required');
    }

    const deletedEntry = await MoleculeGenerationHistory.findByIdAndDelete(entryId);
    
    if (!deletedEntry) {
      return {
        success: false,
        error: 'History entry not found'
      };
    }

    revalidatePath('/molecule-bank');

    return {
      success: true,
      data: JSON.parse(JSON.stringify(deletedEntry))
    };
  } catch (error) {
    console.error("Error deleting history entry:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete history entry'
    };
  }
}