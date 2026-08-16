import { KIRA_TOOLS } from "./systemPrompt";

export function getGoogleAiApiKey(): string | undefined {
  return (
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    undefined
  );
}

/** Convert OpenAI-style tool defs to Gemini functionDeclarations. */
export function getGeminiFunctionDeclarations() {
  return KIRA_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

export function buildGeminiLiveSetup(pathname: string, instructions: string) {
  const model =
    process.env.KIRA_LIVE_MODEL ||
    "gemini-2.5-flash-native-audio-preview-12-2025";
  const voice = process.env.KIRA_VOICE || "Aoede";

  return {
    model: model.startsWith("models/") ? model : `models/${model}`,
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
    systemInstruction: {
      parts: [{ text: instructions }],
    },
    tools: [{ functionDeclarations: getGeminiFunctionDeclarations() }],
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  };
}
