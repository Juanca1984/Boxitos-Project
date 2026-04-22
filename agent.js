// agent.js
import OpenAI from "openai";
// 1. Updated import to grab all three functions
import searchGithub, { getFolderStructure, getReadme } from "./github.js"; 

const openai = new OpenAI();

const conversationHistory = [
    { 
        role: "system", 
        content: `You are an expert Salesforce Developer Assistant. Your primary job is to find high-quality open-source Salesforce projects and explain their architecture.

When a user asks for an implementation, integration, or code example, you MUST follow this exact execution sequence. Do not ask for permission to proceed to the next step:

1. SEARCH: Automatically use the \`search_github\` tool to find relevant repositories.
2. SELECT: Analyze the results and pick the SINGLE best repository based on relevance and stars.
3. INVESTIGATE: Immediately use the \`get_readme\` AND \`get_folder_structure\` tools on that specific chosen repository to understand how it works.
4. REPORT: Only after you have gathered the README and folder data, provide your final response to the user.

Your final response must include:
- The name and URL of the recommended repository.
- A summary of how to install/use it (derived from the README).
- A brief overview of the architecture (e.g., "The main logic is located in the force-app/main/default/classes folder...").` 
    }
];

// 2. Add the two new tools to the array
const tools = [
    {
        type: "function",
        function: {
            name: "search_github",
            description: "Searches GitHub for entire repositories related to a specific topic.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The formatted GitHub search query (e.g., 'B2B Commerce language:apex')"
                    }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_folder_structure",
            description: "Gets the files and folders inside a specific GitHub repository path.",
            parameters: {
                type: "object",
                properties: {
                    repoFullName: {
                        type: "string",
                        description: "The full name of the repo (e.g., 'forcedotcom/lwc-recipes')"
                    },
                    path: {
                        type: "string",
                        description: "The folder path to look inside. Leave empty ('') for the root directory."
                    }
                },
                required: ["repoFullName"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_readme",
            description: "Fetches the README.md file of a repository to understand how to use it.",
            parameters: {
                type: "object",
                properties: {
                    repoFullName: {
                        type: "string",
                        description: "The full name of the repo (e.g., 'forcedotcom/lwc-recipes')"
                    }
                },
                required: ["repoFullName"]
            }
        }
    }
];

export async function runAgent(userMessage) {
    conversationHistory.push({ role: "user", content: userMessage });

    let isAgentFinished = false;

    // 3. The Agentic Loop
    while (!isAgentFinished) {
        const response = await openai.chat.completions.create({
            model: "gpt-4o", 
            messages: conversationHistory,
            tools: tools,
            tool_choice: "auto"
        });

        const message = response.choices[0].message;
        conversationHistory.push(message);

        if (message.tool_calls) {
            for (const toolCall of message.tool_calls) {
                const args = JSON.parse(toolCall.function.arguments);
                let toolResult = "";

                // 4. Route the AI's request to the correct function
                if (toolCall.function.name === "search_github") {
                    console.log(`\x1b[33m[Agent is thinking...] Executing GitHub Search for: ${args.query}\x1b[0m`);
                    toolResult = await searchGithub(args.query);
                } 
                else if (toolCall.function.name === "get_folder_structure") {
                    console.log(`\x1b[33m[Agent is thinking...] Reading folder structure for: ${args.repoFullName}\x1b[0m`);
                    toolResult = await getFolderStructure(args.repoFullName, args.path || "");
                }
                else if (toolCall.function.name === "get_readme") {
                    console.log(`\x1b[33m[Agent is thinking...] Reading README for: ${args.repoFullName}\x1b[0m`);
                    toolResult = await getReadme(args.repoFullName);
                }

                conversationHistory.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: String(toolResult)
                });
            }
        } else {
            isAgentFinished = true;
            return message.content;
        }
    }
}