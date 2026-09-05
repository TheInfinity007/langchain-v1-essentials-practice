import { MultiServerMCPClient } from '@langchain/mcp-adapters'


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
