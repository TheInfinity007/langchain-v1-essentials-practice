import { createAgent } from "langchain";
import "./setup";
import { getLlmModel, print } from "./Utility";
import z from "zod";


const contactInfo = z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
})

// Let's extract the structured information from a messy conversation transcript. We'll define a contactInfo schema and have the agent parse out the name, email and phone number automatically.
const agent = createAgent({
    model: getLlmModel("gemini"),
    tools: [],
    responseFormat: contactInfo
});

const recordedConveration = `
We talked with John Doe. He works over at Example. His number is, let's see, five, five, five, one, two, three, four, five, six, seven. Did you get that ? And his email was john at example.com. He wanted to order 50 boxes of Captain Crunch.
`

const result = await agent.invoke({
    messages: recordedConveration,
})

console.log(result.structuredResponse)

print("Printing each message")
result.messages.forEach(displayMessage)


