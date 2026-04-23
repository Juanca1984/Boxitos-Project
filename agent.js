// agent.js
import OpenAI from "openai";
import searchGithub, { getFolderStructure, getReadme } from "./github.js"; 

const openai = new OpenAI();

// 1. System Prompt updated for "OR" searching and MULTIPLE recommendations
const conversationHistory = [
    { 
        role: "system", 
        content: `You are an expert Salesforce Developer Assistant. Your primary job is to find high-quality open-source Salesforce projects and explain their architecture.

When a user asks for an implementation, pastes documentation, or asks for code examples, you MUST follow this exact execution sequence. Do not ask for permission to proceed to the next step:

1. ANALYZE: Before searching, evaluate the user's input. Extract 2 to 3 unique technical identifiers (e.g., 'commerce/einsteinAPI', 'ProductRecommendationsAdapter').
2. SEARCH: Automatically use the \`search_github\` tool. Combine your extracted keywords using the capitalized 'OR' operator to cast a wider net and find multiple approaches (e.g., 'einsteinAPI OR ProductRecommendationsAdapter').
3. FALLBACK (If necessary): If the search returns "No results found", brainstorm broader concepts or synonyms and call \`search_github\` again.
4. EVALUATE CANDIDATES: Look at the search results. You MUST use the \`get_readme\` tool on the top 2 or 3 most promising repositories to verify they contain robust implementations.
5. INVESTIGATE: Use the \`get_folder_structure\` tool on ALL the valid candidate repositories you evaluated to map out their individual architectures.
6. REPORT: After gathering the README and folder data, provide a comprehensive final response to the user comparing the options.

Your final response MUST include a distinct section for EACH recommended repository containing:
- The name and URL of the repository.
- A summary of how to install/use it (derived from the README).
- A brief overview of the architecture (e.g., "The main logic is located in the force-app/main/default/classes folder...").` 
    }
];

const tools = [
    {
        type: "function",
        function: {
            name: "search_github",
            description: "Searches GitHub for repositories. Supports multiple keywords joined by ' OR '.",
            parameters: {
                type: "object",
                properties: {
                    keyword: {
                        type: "string",
                        description: "The keywords extracted from the user's prompt, concatenated with ' OR ' (e.g., 'B2B Commerce OR ProductRecommendationsAdapter')"
                    },
                    language: {
                        type: "string",
                        description: "The programming language (e.g., 'apex', 'javascript'). Leave empty if not specified."
                    }
                },
                required: ["keyword"]
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

    while (!isAgentFinished) {
        const response = await openai.chat.completions.create({
            model: "gpt-4o", 
            temperature: 0.8, 
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

                if (toolCall.function.name === "search_github") {
                    console.log(`\x1b[33m[Agent is thinking...] Executing GitHub Search for: ${args.keyword}\x1b[0m`);
                    toolResult = await searchGithub(args.keyword, args.language);
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