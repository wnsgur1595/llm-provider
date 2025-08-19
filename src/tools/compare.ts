import { LLMProvider, QueryOptions, ComparisonResult } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { analyzeResponses } from "../utils/formatter.js";

interface CompareArgs {
  prompt: string;
  providers?: string[];
  analyzeConsensus?: boolean;
  systemPrompt?: string;
}

export async function compareTool(allProviders: LLMProvider[], args: CompareArgs) {
  try {
    const providers = args.providers 
      ? allProviders.filter(p => args.providers!.includes(p.name.toLowerCase()))
      : allProviders;

    logger.info(`Comparing responses from ${providers.length} LLMs...`);
    
    const options: QueryOptions = {
      systemPrompt: args.systemPrompt
    };

    const promises = providers.map(provider => 
      provider.query(args.prompt, options).catch(error => ({
        provider: provider.name,
        model: "",
        content: "",
        error: error.message,
        latency: 0,
        timestamp: new Date().toISOString()
      }))
    );

    const responses = await Promise.all(promises);
    
    const comparison: ComparisonResult = {
      query: args.prompt,
      responses,
      summary: args.analyzeConsensus ? analyzeResponses(responses) : {},
      timestamp: new Date().toISOString()
    };

    return {
      content: [
        {
          type: "text",
          text: formatComparison(comparison)
        }
      ]
    };
    
  } catch (error) {
    logger.error("Error in compareTool:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error comparing LLM responses: ${error instanceof Error ? error.message : "Unknown error"}`
        }
      ],
      isError: true
    };
  }
}

function formatComparison(comparison: ComparisonResult): string {
  let output = `## LLM Response Comparison\n\n`;
  output += `**Query:** ${comparison.query}\n\n`;
  
  if (comparison.summary.consensus) {
    output += `### 📊 Analysis\n\n`;
    output += `**Consensus:** ${comparison.summary.consensus}\n\n`;
    
    if (comparison.summary.differences && comparison.summary.differences.length > 0) {
      output += `**Key Differences:**\n`;
      comparison.summary.differences.forEach(diff => {
        output += `- ${diff}\n`;
      });
      output += `\n`;
    }
    
    if (comparison.summary.bestResponse) {
      output += `**Most Comprehensive:** ${comparison.summary.bestResponse}\n\n`;
    }
  }
  
  output += `### 💬 Individual Responses\n\n`;
  
  comparison.responses.forEach(response => {
    if (response.error) {
      output += `#### ❌ ${response.provider}\n`;
      output += `Error: ${response.error}\n\n`;
    } else {
      output += `#### ✅ ${response.provider} (${response.model})\n`;
      output += `*Latency: ${response.latency}ms*\n\n`;
      output += `${response.content}\n\n`;
      if (response.usage) {
        output += `*Tokens: ${response.usage.totalTokens} (prompt: ${response.usage.promptTokens}, completion: ${response.usage.completionTokens})*\n\n`;
      }
    }
    output += `---\n\n`;
  });
  
  return output;
}