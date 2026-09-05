import './setup';
import { MultiServerMCPClient } from '@langchain/mcp-adapters'
import { createAgent } from 'langchain';
import { getLlmModel, print } from './Utility';


// Connects to the mcp time server for timezone aware operations
// This go based server provides tools for current time, relative time parsing,
// timezone conversion, duration arithmetic and time comparison
const mcpClient = new MultiServerMCPClient({
    mcpServers: {
        time: {
            transport: "stdio",
            command: "npx",
            args: ["-y", "@theo.foobar/mcp-time"],
        }
    },
    useStandardContentBlocks: true
})

const mcpTools = await mcpClient.getTools();
console.log(`Loaded ${mcpTools.length} MCP Tools:`, mcpTools.map((t) => t.name))


let agent;
agent = createAgent({
    model: getLlmModel("gemini"),
    tools: mcpTools,
    systemPrompt: 'You are a helpful assistant'
})

print("Asking about the current time in Dubai")
const result = await agent.invoke({
    messages: "What is the current time in Dubai right now ?"
});

for (const message of result.messages) {
    displayMessage(message);
}

process.exit(0);