import { SqlDatabase } from '@langchain/classic/sql_db'
import { createAgent, dynamicSystemPromptMiddleware, tool } from 'langchain'

import { DataSource } from 'typeorm'
import z from 'zod'
import './setup';   // Loads the env variables
import { getLlmModel, print } from './Utility';
import { format } from 'node:util';

// Connect to the sqlite database containing music data
const datasource: DataSource = new DataSource({
    type: 'sqlite',
    database: './Chinook.db'
})

const db = await SqlDatabase.fromDataSourceParams({
    appDataSource: datasource,
})

const runtimeContext = z.object({
    isEmployee: z.boolean(),
})

type RuntimeContext = z.infer<typeof runtimeContext>;

// Create a tool to execute a SQL queries.
const executeSQL = tool(
    async ({ query }) => {
        return db.run(query);
    },
    {
        name: "execute_sql",
        description: "Execute a SQLite command and return results.",
        schema: z.object({
            query: z.string()
        })
    }
)

// Define the system prompt with a placeholder %s
export const SYSTEM = `
You are a careful sqlite analyst.

Rules:
- Think step-by-step.
- When you need data, call the tool \`execute_sql\` with one select query.
- Read-only only; no INSERT/CREATE/UPDATE/DELETE/REPLACE/TRUNCATE/ALTER/DROP.
- Limit to 5 rows unless the user explicitly asks otherwise.
%s
- If the tool returns "Error:", revise the SQL and try again.
- Prefer explicit column lists, avoid SELECT *.
`

// Create the dynamicSystemPromptMiddleware
const dynamicSystemPrompt = dynamicSystemPromptMiddleware<RuntimeContext>((state, runtime) => {
    return !runtime.context.isEmployee ?
        format(SYSTEM, "- Limit access to these tables: Album, Artists, Genre, Track, Playlist, PlaylistTrack") :
        format(SYSTEM, "")
})

const agent = createAgent({
    model: getLlmModel("gemini"),
    tools: [executeSQL],
    // systemPrompt: SYSTEM,    // System prompt will be passed from the dynamicSystemprompt middleware. It's built-in middleware that can be used to change the system prompt
    contextSchema: runtimeContext,
    middleware: [dynamicSystemPrompt]
})

print("Testing with the isEmployee as false")

let stream = await agent.stream(
    {
        messages: "What is the most costly purchase by the Frank Harris?"
    },
    {
        streamMode: "values",
        context: {
            isEmployee: false
        }
    }
)

for await (const step of stream) {
    displayMessage(step.messages.at(-1));
}

print("Testing with an employee")
stream = await agent.stream(
    {
        messages: "What is the most costly purchase by the Frank Harris?"
    },
    {
        streamMode: "values",
        context: {
            isEmployee: true
        }
    }
)

for await (const step of stream) {
    displayMessage(step.messages.at(-1));
}