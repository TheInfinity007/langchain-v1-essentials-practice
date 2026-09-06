export const print = (msg: string) => console.log(`\n==>> ${msg}`);

const PROVIDER = {
    GEMINI: 'gemini',
    ANTHROPIC: 'anthropic'
}

const providerModelMap = {
    [PROVIDER.GEMINI]: "google-vertexai:gemini-2.5-flash",
    // [PROVIDER.GEMINI]: "google-vertexai:gemini-3.1-pro-preview", // Not working
    [PROVIDER.ANTHROPIC]: "anthropic:claude-sonnet-4-5-20250929"
}

export const getLlmModel = (provider: string) => {
    return providerModelMap[provider];
} 
