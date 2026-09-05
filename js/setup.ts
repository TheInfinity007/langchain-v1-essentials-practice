import "dotenv/config";
import process from "node:process";
// import { BaseMessage } from "langchain";


// Issues running in the Deno kernel prevent tracing in some cases.
// Commented out 2026-04-04 — tracing appears to work with current packages.
// Deno.env.set("LANGSMITH_TRACING", "false");
// Deno.env.set("LANGCHAIN_TRACING", "false");
// console.log("Disabling LANGSMITH_TRACING in Deno kernel.")

/**
 * Little setup file to provide helper functions for the notebooks.
 */

/**
 * Loose shape actually used by displayMessage/displayStream, rather than the
 * full BaseMessage class — lets plain objects (e.g. custom stream events) be
 * passed in too, not just real BaseMessage instances.
 */
interface DisplayableMessage {
    type: string;
    content: unknown;
    tool_calls?: { name: string; args: unknown }[];
}

declare global {
    function displayMessage(message: DisplayableMessage|string|undefined): void;
    function displayStream(stream: AsyncIterable<[DisplayableMessage, never]>, isConsole?: boolean): Promise<void>;
}

/**
 * Display a message in a nice format.
 * @param message The message to display.
 * @returns void
 */
globalThis.displayMessage = (message: DisplayableMessage) => {
    const icons: Record<string, string> = {
        human: "👤",
        ai: "🤖",
        tool: "🔧",
        custom: "💡"
    };

    const colors: Record<string, string> = {
        human: "\x1b[36m",  // Cyan
        ai: "\x1b[35m",      // Magenta
        tool: "\x1b[33m",    // Yellow
        custom: "\x1b[31m",    // Red
        reset: "\x1b[0m"
    };

    const icon = icons[message.type] || "💬";
    const color = colors[message.type] || "";
    const reset = colors.reset;

    // Header
    console.log(`\n${color}┌${"─".repeat(60)}┐${reset}`);
    console.log(`${color}│ ${icon} ${message.type.toUpperCase()} MESSAGE${" ".repeat(60 - message.type.length - 12)}│${reset}`);
    console.log(`${color}└${"─".repeat(60)}┘${reset}`);

    // Content
    if (message.content) {
        console.log(message.content);
    } else if (message.tool_calls && message.tool_calls.length > 0) {
        console.log("Tool Calls:");
        message.tool_calls.forEach((call, idx) => {
            console.log(`  ${idx + 1}. ${call.name}()`);
            console.log(`     ${JSON.stringify(call.args, null, 2).split('\n').join('\n     ')}`);
        });
    }
}

/**
 * A helper function to stream a message.
 * @param message The message to stream.
 * @returns void
 */
// globalThis.displayStream = async (stream: AsyncIterable<[BaseMessage, never]>, isConsole = false) => {
globalThis.displayStream = async (stream: AsyncIterable<[DisplayableMessage, never]>, isConsole = false) => {
    let content = "";
    console.log(`\n┌${"─".repeat(60)}┐`);
    console.log("Displaying Stream")
    console.log(`└${"─".repeat(60)}┘`);

    // Only defined inside the Deno Jupyter kernel — falls back to plain
    // stdout when run standalone via tsx/Node.
    const denoJupyter = (globalThis as any).Deno?.jupyter;

    if (isConsole || !denoJupyter) {
        for await (const [message] of stream) {
            process.stdout.write(String(message.content));
        }
    } else {
        for await (const [message] of stream) {
            content += String(message.content);
            await denoJupyter.broadcast("update_display_data", {
                data: { "text/html": `<b>${content}</b>` },
                metadata: {},
                transient: { display_id: "progress" }
            });
        }
    }
}