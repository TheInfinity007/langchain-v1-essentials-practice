import { SqlDatabase } from '@langchain/classic/sql_db'
import { type Runtime, tool } from 'langchain'
import { DataSource } from 'typeorm'
import z from 'zod'


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
    async ({ query }, runtime: Runtime<Context>) => {   // Getting warning
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


