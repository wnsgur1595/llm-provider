import { LLMResponse, ComparisonResult } from "../types/index.js";
import chalk from "chalk";

export function formatResponse(response: LLMResponse): string {
  if (response.error) {
    return `❌ **${response.provider} Error:**\n${response.error}`;
  }
  
  let output = `### ${response.provider} Response\n\n`;
  output += `**Model:** ${response.model}\n`;
  output += `**Latency:** ${response.latency}ms\n`;
  
  if (response.usage) {
    output += `**Tokens:** ${response.usage.totalTokens} `;
    output += `(prompt: ${response.usage.promptTokens}, completion: ${response.usage.completionTokens})\n`;
  }
  
  output += `\n${response.content}\n`;
  
  return output;
}

export function formatResponses(responses: LLMResponse[]): string {
  let output = `# LLM Responses (${responses.length} providers)\n\n`;
  
  const successful = responses.filter(r => !r.error);
  const failed = responses.filter(r => r.error);
  
  if (successful.length > 0) {
    output += `## ✅ Successful Responses (${successful.length})\n\n`;
    successful.forEach(response => {
      output += formatResponse(response) + "\n---\n\n";
    });
  }
  
  if (failed.length > 0) {
    output += `## ❌ Failed Responses (${failed.length})\n\n`;
    failed.forEach(response => {
      output += `- **${response.provider}:** ${response.error}\n`;
    });
  }
  
  return output;
}

export function analyzeResponses(responses: LLMResponse[]): ComparisonResult["summary"] {
  const validResponses = responses.filter(r => !r.error && r.content);
  
  if (validResponses.length < 2) {
    return {};
  }
  
  // Simple consensus analysis (can be enhanced with NLP)
  const commonWords = findCommonKeywords(validResponses.map(r => r.content));
  const differences = findKeyDifferences(validResponses);
  const bestResponse = findMostComprehensive(validResponses);
  
  return {
    consensus: commonWords.length > 0 
      ? `Common themes: ${commonWords.slice(0, 5).join(", ")}`
      : "No clear consensus found",
    differences,
    bestResponse: bestResponse?.provider
  };
}

function findCommonKeywords(contents: string[]): string[] {
  const wordFrequency = new Map<string, number>();
  
  contents.forEach(content => {
    const words = content.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 4 && !isStopWord(word));
    
    words.forEach(word => {
      wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
    });
  });
  
  return Array.from(wordFrequency.entries())
    .filter(([_, count]) => count >= contents.length * 0.6)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

function findKeyDifferences(responses: LLMResponse[]): string[] {
  const differences: string[] = [];
  
  // Compare response lengths
  const lengths = responses.map(r => r.content.length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = Math.sqrt(lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length);
  
  if (variance > avgLength * 0.3) {
    differences.push("Significant variation in response lengths");
  }
  
  // Check for unique providers mentioning specific topics
  responses.forEach(response => {
    const uniqueTopics = extractUniqueTopics(response.content, responses);
    if (uniqueTopics.length > 0) {
      differences.push(`${response.provider} uniquely mentions: ${uniqueTopics.slice(0, 3).join(", ")}`);
    }
  });
  
  return differences;
}

function extractUniqueTopics(content: string, allResponses: LLMResponse[]): string[] {
  // This is a simplified implementation
  // In production, you'd use NLP libraries for better topic extraction
  const topics = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  
  return topics.filter(topic => {
    const mentions = allResponses.filter(r => r.content.includes(topic)).length;
    return mentions === 1;
  });
}

function findMostComprehensive(responses: LLMResponse[]): LLMResponse | undefined {
  if (responses.length === 0) return undefined;
  
  return responses.reduce((best, current) => {
    const currentScore = scoreResponse(current);
    const bestScore = scoreResponse(best);
    return currentScore > bestScore ? current : best;
  });
}

function scoreResponse(response: LLMResponse): number {
  let score = 0;
  
  // Length (but not too long)
  const length = response.content.length;
  if (length > 100 && length < 5000) {
    score += Math.min(length / 100, 30);
  }
  
  // Structure indicators
  if (response.content.includes("\n\n")) score += 5;
  if (response.content.match(/^\d+\.|^-\s|^\*/m)) score += 10;
  if (response.content.match(/#{1,6}\s/)) score += 5;
  
  // Code blocks
  if (response.content.includes("```")) score += 15;
  
  // Examples
  if (response.content.toLowerCase().includes("example")) score += 10;
  if (response.content.toLowerCase().includes("for instance")) score += 5;
  
  return score;
}

function isStopWord(word: string): boolean {
  const stopWords = new Set([
    "the", "is", "at", "which", "on", "and", "a", "an", "as", "are", "was",
    "been", "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "must", "can", "shall", "to", "of", "in",
    "for", "with", "by", "from", "about", "into", "through", "during", "before",
    "after", "above", "below", "between", "under", "again", "further", "then"
  ]);
  
  return stopWords.has(word.toLowerCase());
}