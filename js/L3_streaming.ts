import "./setup.ts";
import { createAgent, tool, type Runtime } from "langchain";
import { HumanMessage } from "langchain";
import z from "zod";

const print = (msg: string) => console.log(`\n==>> ${msg}`);

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

const agent = createAgent({
    model: llmModel,
    systemPrompt: "You are a full-stack comedian",
})

const result = await agent.invoke({
    messages: [new HumanMessage("Tell me a joke")]
})



console.log(result.messages.at(-1)?.content)
let stream;
let counter;


print("\n==>> Streams start with mode values:")
stream = await agent.stream(
    {
        messages: [new HumanMessage("Tell me a joke")]
    },
    {
        streamMode: "values"
    }
)


counter = 1;
for await(const step of stream) {
    console.log(`Counter: ${counter++}, Step.Message Size: ${step.messages.length}, Time: ${new Date().toISOString()}`)
    console.log(step.messages.at(-1).content)
}
// */


print("\n==>> Streams start with mode 'messages':")

stream = await agent.stream(
    {
        messages: [new HumanMessage("Tell me a joke")]
    },
    {
        streamMode: "messages"
    }
)


counter = 1;
for await (const [message, metadata] of stream) {
    console.log(`${counter++} [${metadata.langgraph_node}]: ${message.content}`)
}

// */


print("\n==>> Streams start with typewriter effect \n")
stream = await agent.stream(
    {
        messages: [new HumanMessage("Write me a poem.")]
    },
    {
        streamMode: "messages"
    }
)

for await (const [message] of stream) {
    if(message.content) {
        process.stdout.write(message.content);
    }
}

console.log();  // Add a final newline

// */

print("\n==>> Streams from the tool calls, delivering information to the user before the final result is ready \n")

const getWeather = tool(
    ({ city }, runtime: Runtime) => {
        runtime.writer?.(`Looking up data for city ${city}`);
        runtime.writer?.(`Acquired data for city ${city}`);
        return `It's always cold and breezy in ${city}`
    },
    {
        name: 'get_weather',
        description: "Get weather for a given city",
        schema: z.object({
            city: z.string(),
        })
    }
)

const toolCallingAgent = createAgent({
    model: llmModel,
    tools: [getWeather]
})

stream = await toolCallingAgent.stream(
    {
        messages: [new HumanMessage("What is the weather in Chandigarh, India")]
    },
    {
        streamMode: ["values", "custom"]
    }
)

for await (const [type, stateOrCustomEvent] of stream) {
    if (type === "values") {
        const latestMessage = stateOrCustomEvent.messages.at(-1);
        displayMessage(latestMessage)
    } else if (type === "custom") {
        displayMessage({ type, content: stateOrCustomEvent })
    }
}
