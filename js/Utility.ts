export const print = (msg: string) => console.log(`\n==>> ${msg}`);

const PROVIDER = {
    GEMINI: 'gemini',
    ANTHROPIC: 'anthropic'
}
const provider = PROVIDER.GEMINI;

const providerModelMap = {
    [PROVIDER.GEMINI]: "google-vertexai:gemini-2.5-flash",
    [PROVIDER.ANTHROPIC]: "anthropic:claude-sonnet-4-5-20250929"
}

export const getLlmModel = () => {
    return providerModelMap[provider];
} 
