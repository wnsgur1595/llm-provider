# LLM Provider MCP Server

여러 LLM을 동시에 쿼리하여 비교하고 검증할 수 있는 MCP (Model Context Protocol) 서버입니다.

## 기능

- **다중 LLM 지원**: OpenAI, Anthropic, Google Gemini, Perplexity
- **병렬 처리**: 모든 LLM을 동시에 쿼리하여 즉시 비교
- **스트리밍 지원**: 실시간 응답 스트리밍
- **자동 재시도**: 지수 백오프를 통한 자동 재시도 로직

## 설치 및 설정

### 1단계: 패키지 설치

```bash
npm install -g @wnsgur1595/llm-provider-mcp
```

### 2단계: MCP 클라이언트 설정

#### MCP 클라이언트
```json
{
  "mcpServers": {
    "llm-provider": {
      "command": "npx",
      "args": ["@wnsgur1595/llm-provider-mcp"],
      "env": {
        "OPENAI_API_KEY": "your-openai-key",
        "ANTHROPIC_API_KEY": "your-anthropic-key",
        "GOOGLE_API_KEY": "your-google-key",
        "PERPLEXITY_API_KEY": "your-perplexity-key",
        
        "OPENAI_MODEL": "gpt-4o",
        "ANTHROPIC_MODEL": "claude-3-5-sonnet-20241022",
        "GOOGLE_MODEL": "gemini-1.5-pro",
        "PERPLEXITY_MODEL": "llama-3.1-sonar-small-128k-online"
      }
    }
  }
}
```

**참고**: 모든 API 키와 모델 설정은 선택사항입니다. 필요한 것만 설정하세요.

### 3단계: API 키 설정

각 서비스에서 API 키를 발급받으세요:
- [OpenAI](https://platform.openai.com/api-keys)
- [Anthropic](https://console.anthropic.com/keys)
- [Google AI](https://makersuite.google.com/app/apikey)
- [Perplexity](https://www.perplexity.ai/settings/api)

### 4단계: 클라이언트 재시작

MCP 클라이언트를 재시작하여 설정을 적용하세요.

## 사용법

```
"GPT에게 파이썬 학습 방법을 물어봐"
"모든 LLM에게 이 코드를 개선하는 방법을 물어봐"
"Claude와 GPT의 답변을 비교해줘"
```

## 도구

- `ask_openai` - OpenAI 모델 쿼리
- `ask_anthropic` - Anthropic Claude 모델 쿼리
- `ask_google` - Google Gemini 모델 쿼리
- `ask_perplexity` - Perplexity 모델 쿼리
- `ask_all_llms` - 모든 LLM을 병렬로 쿼리
- `compare_llm_responses` - 응답 비교 분석

## 디버깅

환경 설정 확인:
```bash
npx @wnsgur1595/llm-provider-mcp --env-check
```

MCP Inspector로 테스트:
```bash
npx @modelcontextprotocol/inspector npx @wnsgur1595/llm-provider-mcp
```

## 연락처

- GitHub: [https://github.com/wnsgur1595/llm-provider](https://github.com/wnsgur1595/llm-provider)
- 이메일: wnsgur1595@naver.com