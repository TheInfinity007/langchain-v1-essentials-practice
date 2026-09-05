import './setup.ts'
import { createAgent, tool } from "langchain";
import z from "zod";
import { print } from './Utility.ts';

const PROVIDER = {
    GEMINI: 'gemini',
    ANTHROPIC: 'anthropic'
}

const provider = PROVIDER.GEMINI;

let llmModel;
if (provider === PROVIDER.GEMINI) {
    llmModel = "google-vertexai:gemini-2.5-flash"
} else {
    llmModel = "anthropic:claude-sonnet-4-5-20250929"
}

let agent;

const OPERATION = {
    ADD: 'add',
    SUBTRACT: 'subtract',
    MULTIPLY: 'multiply',
    DIVIDE: 'divide'
}

const realNumberCalculator = tool(
    ({ a, b, operation }) => {
        console.log("🧮 Invoking calculator tool");
        switch (operation) {
            case OPERATION.ADD: return a + b;
            case OPERATION.SUBTRACT: return a - b;
            case OPERATION.MULTIPLY: return a * b;
            case OPERATION.DIVIDE: if (b == 0) {
                throw new Error("Division by zero is not allowed.")
            }
                return a / b;
            default:
                throw new Error(`Invalid operation: ${operation}`)
        }
    },
    {
        name: "real_number_calculator",
        description: "Perform basic arithmetic operations on two real numbers.",
        schema: z.object({
            a: z.number(),
            b: z.number(),
            operation: z.enum(Object.values(OPERATION))
        })
    }
)

agent = createAgent({
    model: llmModel,
    tools: [realNumberCalculator],
    systemPrompt: "You are a helpfule assistant"
})

print("Doing a substraction")
const result = await agent.invoke({
    messages: "What is 3 - 2 ?"
})


// displayMessage(result.messages?.at(-1))
for (const message of result.messages) {
    displayMessage(message)
}
