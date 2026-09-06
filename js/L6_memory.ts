import { SqlDatabase } from '@langchain/classic/sql_db'
import { createAgent, tool, type ToolRuntime } from 'langchain'
import { DataSource } from 'typeorm'
import z from 'zod'
import './setup';   // Loads the env variables
import { getLlmModel } from './Utility';

// Connect to the sqlite database containing music data
const datasource: DataSource = new DataSource({
    type: 'sqlite',
    database: './Chinook.db'
})

const db = await SqlDatabase.fromDataSourceParams({
    appDataSource: datasource,
})

// Define a context schema to hold customer information (first and last name) that will be available throughout the agent's execution.
const contextSchema = z.object({
    db: z.custom<SqlDatabase>((val) => val instanceof SqlDatabase, {
        message: "Must be a valid SqlDatabase instance"
    }),
})

type Context = z.infer<typeof contextSchema>;

// Create a tool to execute a SQL queries. It supports named parameters (:first, :last) that gets replaced with values from the runtime context.
const executeSQL = tool(
    async ({ query }, runtime: ToolRuntime<unknown, Context>) => {   // Getting warning
        return await runtime.context.db.run(query);
    },
    {
        name: "execute_sql",
        description: "Execute a SQLite command and return results.",
        // Schema
        schema: z.object({
            query: z.string()
        })
    }
)

// Define the system prompt that instructs the agent how to interact with the database safely and use named parameters
export const SYSTEM = `
You are a careful sqlite analyst.

Rules:
- Think step-by-step.
- When you need data, call the tool \`execute_sql\` with one select query.
- Read-only only; no INSERT/CREATE/UPDATE/DELETE/REPLACE/TRUNCATE/ALTER/DROP.
- Limit to 5 rows unless the user explicitly asks otherwise.
- If the tool returns "Error:", revise the SQL and try again.
- Prefer explicit column lists, avoid SELECT *.
`

// Create a agent with our tools and system prompt. No Checkpointer yet, so the agent won't remember previous conversations.
const agent = createAgent({
    model: getLlmModel("gemini"),
    tools: [executeSQL],
    systemPrompt: SYSTEM,
    contextSchema,
})