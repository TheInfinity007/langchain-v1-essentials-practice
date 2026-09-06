import { SqlDatabase } from '@langchain/classic/sql_db'
import { createAgent, Decision, HITLRequest, HITLResponse, humanInTheLoopMiddleware, tool, type ToolRuntime } from 'langchain'
import { DataSource } from 'typeorm'
import z from 'zod'
import './setup';   // Loads the env variables
import { getLlmModel, print } from './Utility';
import { Command, MemorySaver } from '@langchain/langgraph';
import { red } from 'ansis'
import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

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

// Create a tool to execute a SQL queries.
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

const checkpointer = new MemorySaver();

// Create a agent with our tools and system prompt. No Checkpointer yet, so the agent won't remember previous conversations.
let agent = createAgent({
    model: getLlmModel("gemini"),
    tools: [executeSQL],
    systemPrompt: SYSTEM,
    contextSchema,
    checkpointer,
    middleware: [humanInTheLoopMiddleware({
        interruptOn: {
            execute_sql: {
                allowedDecisions: ["approve", "reject"]
            }
        }
    })]
});

const config = {
    configurable: { thread_id: "t3" },
    context: { db }
}

let result = await agent.invoke(
    { messages: "What are the names of all the employees?" },
    config
)

const rl = readline.createInterface({ input: stdin, output: stdout })
while ('__interrupt__' in result) {
    console.log(red("-".repeat(80)))

    // Access the HITL (Human in the Loop) Request from the interrupt
    const hitlRequest = result.__interrupt__?.[0].value as HITLRequest;

    // Display the action requests
    hitlRequest.actionRequests.forEach((actionRequest) => {
        // console.log(red(actionRequest.description))
        console.log(`AGENT wants to run: ${actionRequest.description}`);
    })

    console.log(red("-".repeat(80)));

    // Pause and ask the human for input
    const answer = await rl.question("Do you approve ? (y/n or provide rejection reason): ");

    let decisions = [] as Decision[];

    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        // Approved
        decisions = hitlRequest.actionRequests.map((_actionRequest) => ({
            type: "approve"
        }));
    } else {
        // Rejected. If they typed a reason (e.g., "table is wrong"), pass it back to the agent!
        const rejectReason = answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no'
            ? "Human denied the request without providing a reason."
            : answer;

        decisions = hitlRequest.actionRequests.map((_actionRequest) => ({
            type: "reject",
            message: rejectReason // The agent will read this and try to fix its mistake
        }));
    }

    // Create decisions for each action request
    const resume: HITLResponse = {
        // decisions: hitlRequest.actionRequests.map((_actionRequest) => ({
        //     type: "approve"
        // }))
        // or to reject
        // decisions: hitlRequest.actionRequests.map((_actionRequest) => ({
        //     type: "reject",
        //     message: "the database is offline"
        // }))
        decisions
    }

    result = await agent.invoke(
        new Command({ resume }),
        config,
    )
}

console.log(result.messages.at(-1)?.content);