// index.js
import 'dotenv/config'; // Loads your API keys securely
import readline from 'readline';
import { runAgent } from './agent.js'; // Imports the brain


// Set up the terminal interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("=========================================");
console.log("🤖 GitHub Search Agent Initialized");
console.log("Type 'exit' to quit.");
console.log("=========================================\n");

// The infinite chat loop
function askQuestion() {
    rl.question('\x1b[36mYou:\x1b[0m ', async (userInput) => {
        if (userInput.toLowerCase() === 'exit') {
            console.log("Shutting down...");
            rl.close();
            return;
        }

        try {
            const response = await runAgent(userInput);
            console.log(`\n\x1b[32mAgent:\x1b[0m ${response}\n`);
        } catch (error) {
            console.error("\n\x1b[31mError:\x1b[0m", error.message, "\n");
        }

        // Loop back and ask again
        askQuestion();
    });
}

// Start the loop
askQuestion();