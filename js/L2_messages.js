import * as setup from "./setup.ts";
import { createAgent } from "langchain";

// const provider = "anthropic"
const provider = "gemini"

let llmModel;
if (provider === "gemini") {
    llmModel = "google-vertexai:gemini-2.5-flash"
} else {
    llmModel = "anthropic:claude-sonnet-4-5-20250929"
}

let agent = await createAgent({
    model: llmModel,
    systemPrompt: "You are a full-stack comedian",
});

import { HumanMessage } from "langchain";

const humanMessage = new HumanMessage("Hello, how are you?");
let result = await agent.invoke({ messages: [humanMessage] });


console.log(result.messages.at(-1).content)

const print = (msg) => console.log(`\n==>> ${msg}`);

print("\n==>> We can iterate through all messages to see the full conversation history:")

for (const message of result.messages) {
    displayMessage(message)
}

print("Alternate agent with system as sports poet")
agent = createAgent({
    model: llmModel,
    systemPrompt: "You are a terse sports poet.",
})

result = await agent.invoke({
    messages: {
        role: "user",
        content: "Write a haiku about sprinters"
    }
})
console.log(result.messages.at(-1).content)
for (const message of result.messages) {
    displayMessage(message)
}


print("Using message classes for explicit type control");
result = await agent.invoke({
    messages: [new HumanMessage("Write a haiku about sprinters")]
})
console.log(result.messages.at(-1).content)
for (const message of result.messages) {
    displayMessage(message)
}


print("First, let's define a tool that checks if a haiku has the correct number of lines:")

import { z } from "zod";
import { tool } from "langchain";

const checkHaikuLines = tool(
    ({ text }) => {
        const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
        console.log(`checking haiku, it has ${lines.length} lines:\n ${text}`);
        if (lines.length !== 3) {
            return `Incorrect! This haiku has ${lines.length} lines. A haiku must have exactly 3 lines.`;
        }
        return "Correct, This haiku has 3 lines.";
    },
    {
        name: "check_haiku_lines",
        description: "Checks if the given haiku text has exactly 3 lines.",
        schema: z.object({
            text: z.string().describe("The haiku text to check"),
        }),
    }
);

print("Now we'll create an agent that uses this tool to validate its haikus:")

agent = createAgent({
    model: llmModel,
    systemPrompt: "You are a sports poet who only write Haiku. You always check you work.",
    tools: [checkHaikuLines]
})


print("Let's ask the agent to write a poem (which it will write as a haiku and check):")
result = await agent.invoke({
    messages: "Plese write me a poem"
})

console.log("printing the last message");
console.log(result.messages.at(-1).content)

print("The agent wrote a valid haiku! Now let's check the message count:")
console.log(result["messages"].length)


print("Four messages total! Let's see them all:")
for (const message of result.messages) {
    displayMessage(message)
}


print("Doing a final check with manually invoking the tool");
const finalHaiku = result.messages.at(-1).content;

const finalCheck = await checkHaikuLines.invoke({ text: finalHaiku });
console.log(`Final Check Result: ${finalCheck}`);