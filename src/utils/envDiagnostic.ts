import { logger } from "./logger.js";
import fs from "fs";
import path from "path";

export interface EnvDiagnostic {
  source: 'system' | 'dotenv' | 'not_set';
  value?: string;
  isValid: boolean;
  provider: string;
}

export interface EnvDiagnosticReport {
  [key: string]: EnvDiagnostic;
}

const API_KEYS = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_API_KEY',
  'PERPLEXITY_API_KEY'
];

const KEY_PATTERNS = {
  OPENAI_API_KEY: /^sk-[a-zA-Z0-9]{40,}$/,
  ANTHROPIC_API_KEY: /^sk-ant-[a-zA-Z0-9\-_]{40,}$/,
  GOOGLE_API_KEY: /^[a-zA-Z0-9\-_]{30,}$/,
  PERPLEXITY_API_KEY: /^pplx-[a-zA-Z0-9]{40,}$/
};

function isValidApiKey(key: string, value: string): boolean {
  const pattern = KEY_PATTERNS[key as keyof typeof KEY_PATTERNS];
  return pattern ? pattern.test(value) : value.length > 20;
}

function getProviderName(key: string): string {
  return key.replace('_API_KEY', '').toLowerCase();
}

export function diagnoseEnvironmentVariables(): EnvDiagnosticReport {
  const report: EnvDiagnosticReport = {};
  
  // 먼저 현재 process.env의 상태 확인
  const currentEnv = { ...process.env };
  
  // .env 파일이 있는지 확인
  const envPath = path.resolve(process.cwd(), '.env');
  const hasEnvFile = fs.existsSync(envPath);
  
  logger.info(`Environment diagnostic - .env file: ${hasEnvFile ? 'found' : 'not found'}`);
  
  for (const key of API_KEYS) {
    const value = currentEnv[key];
    const provider = getProviderName(key);
    
    if (!value) {
      report[key] = {
        source: 'not_set',
        isValid: false,
        provider
      };
    } else {
      // 값이 존재하는 경우, 소스 확인
      const isSystemEnv = process.env[key] === value;
      const isValid = isValidApiKey(key, value);
      
      // placeholder 값 체크
      const isPlaceholder = value.includes('your-') || value.includes('sk-your-') || value.includes('pplx-your-') || value.includes('gsk_your-');
      
      report[key] = {
        source: isSystemEnv ? 'system' : 'dotenv',
        value: isPlaceholder ? 'placeholder' : value.substring(0, 10) + '...', 
        isValid: isValid && !isPlaceholder,
        provider
      };
    }
  }
  
  return report;
}

export function printEnvironmentDiagnostic(): void {
  const report = diagnoseEnvironmentVariables();
  
  console.log('\n🔍 Environment Variables Diagnostic Report\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  for (const [key, diagnostic] of Object.entries(report)) {
    const status = diagnostic.isValid ? '✅' : diagnostic.source === 'not_set' ? '❌' : '⚠️';
    const sourceInfo = diagnostic.source === 'not_set' ? 'Not set' : 
                      diagnostic.source === 'system' ? 'System env' : '.env file';
    
    console.log(`${status} ${diagnostic.provider.toUpperCase().padEnd(12)} | ${sourceInfo.padEnd(12)} | ${diagnostic.isValid ? 'Valid' : 'Invalid/Missing'}`);
    
    if (diagnostic.value && diagnostic.value !== 'placeholder') {
      console.log(`    Value: ${diagnostic.value}`);
    }
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const validKeys = Object.values(report).filter(d => d.isValid).length;
  const totalKeys = Object.keys(report).length;
  
  console.log(`\n📊 Summary: ${validKeys}/${totalKeys} API keys configured correctly\n`);
  
  if (validKeys === 0) {
    console.log('⚠️  No valid API keys found. Please set up at least one API key:');
    console.log('   1. Set system environment variables (recommended)');
    console.log('   2. Create/update .env file in project directory');
    console.log('   3. Configure in Claude Desktop settings');
  } else if (validKeys < totalKeys) {
    console.log('💡 Tip: Add more API keys to access additional LLM providers');
  } else {
    console.log('🎉 All API keys configured! You can access all supported LLM providers.');
  }
}