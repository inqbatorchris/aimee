/**
 * Text Comparison Utilities
 * 
 * Provides functions for comparing text strings and calculating edit percentages.
 * Used for measuring how much AI-generated drafts were edited before being sent.
 */

/**
 * Calculates the Levenshtein distance between two strings
 * (the minimum number of single-character edits required to change one string into the other)
 * 
 * @param str1 - First string
 * @param str2 - Second string
 * @returns The Levenshtein distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create a 2D array for dynamic programming
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));
  
  // Initialize first column and row
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill in the rest of the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Calculates the percentage of text that was edited between two versions
 * 
 * @param original - Original text
 * @param edited - Edited text
 * @returns Edit percentage (0-100)
 */
export function calculateEditPercentage(original: string, edited: string): number {
  // Normalize whitespace and trim
  const normalizedOriginal = original.trim().replace(/\s+/g, ' ');
  const normalizedEdited = edited.trim().replace(/\s+/g, ' ');
  
  // If both are empty or identical, no edits were made
  if (normalizedOriginal === normalizedEdited) {
    return 0;
  }
  
  // If original is empty but edited has content, 100% edit
  if (normalizedOriginal.length === 0 && normalizedEdited.length > 0) {
    return 100;
  }
  
  // If edited is empty but original had content, 100% edit
  if (normalizedEdited.length === 0 && normalizedOriginal.length > 0) {
    return 100;
  }
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(normalizedOriginal, normalizedEdited);
  
  // Calculate edit percentage based on the longer string
  const maxLength = Math.max(normalizedOriginal.length, normalizedEdited.length);
  const editPercentage = (distance / maxLength) * 100;
  
  // Cap at 100% and round to 2 decimal places
  return Math.min(100, Math.round(editPercentage * 100) / 100);
}

/**
 * Calculates similarity percentage between two strings
 * 
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity percentage (0-100)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const editPercentage = calculateEditPercentage(str1, str2);
  return 100 - editPercentage;
}

/**
 * Categorizes the edit level based on edit percentage
 * 
 * @param editPercentage - The edit percentage (0-100)
 * @returns Edit level category
 */
export function categorizeEditLevel(editPercentage: number): 'minimal' | 'light' | 'moderate' | 'heavy' | 'complete' {
  if (editPercentage < 5) return 'minimal';
  if (editPercentage < 20) return 'light';
  if (editPercentage < 50) return 'moderate';
  if (editPercentage < 80) return 'heavy';
  return 'complete';
}

/**
 * Analyzes text differences and returns detailed metrics
 * 
 * @param original - Original text
 * @param edited - Edited text
 * @returns Detailed comparison metrics
 */
export function analyzeTextDifferences(original: string, edited: string) {
  const editPercentage = calculateEditPercentage(original, edited);
  const similarity = calculateSimilarity(original, edited);
  const editLevel = categorizeEditLevel(editPercentage);
  
  const originalWords = original.trim().split(/\s+/).length;
  const editedWords = edited.trim().split(/\s+/).length;
  const wordDifference = editedWords - originalWords;
  
  return {
    editPercentage,
    similarity,
    editLevel,
    originalLength: original.length,
    editedLength: edited.length,
    lengthDifference: edited.length - original.length,
    originalWords,
    editedWords,
    wordDifference,
    wasAccepted: editPercentage < 80, // Consider accepted if less than 80% edited
  };
}
