// github.js
export default async function searchGithub(keyword, language) {
    // 1. Build the query using the OR-concatenated keywords and exclude dead repos
    let query = `${keyword} archived:false`;
    
    // 2. Append language if the agent decided to use it
    if (language) {
        query += ` language:${language}`;
    }

    const endpoint = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}`;
    
    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Salesforce-Hackathon-Agent', 
                'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
            }
        });

        if (!response.ok) return `GitHub API Error: ${response.status} ${response.statusText}`;

        const data = await response.json();
        if (!data.items || data.items.length === 0) {
            return "No results found for this query. Trigger FALLBACK step and try broader keywords.";
        }

        const cleanResults = data.items.slice(0, 5).map(item => ({
            repo_name: item.full_name,
            description: item.description || "No description provided",
            html_url: item.html_url,
            stars: item.stargazers_count
        }));

        return JSON.stringify(cleanResults, null, 2);
    } catch (error) {
        return `Execution Error: ${error.message}`;
    }
}

export async function getFolderStructure(repoFullName, path = "") {
    const endpoint = `https://api.github.com/repos/${repoFullName}/contents/${path}`;
    try {
        const response = await fetch(endpoint, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Salesforce-Hackathon-Agent',
                'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
            }
        });

        if (!response.ok) return `Error reading folder: ${response.status}`;
        const data = await response.json();

        if (!Array.isArray(data)) return `This is a file, not a folder. File name: ${data.name}`;

        const structure = data.map(item => ({
            name: item.name,
            type: item.type,
            path: item.path
        }));

        return JSON.stringify(structure, null, 2);
    } catch (error) {
        return `Execution Error: ${error.message}`;
    }
}

export async function getReadme(repoFullName) {
    const endpoint = `https://api.github.com/repos/${repoFullName}/readme`;
    try {
        const response = await fetch(endpoint, {
            headers: {
                'Accept': 'application/vnd.github.v3.raw', 
                'User-Agent': 'Salesforce-Hackathon-Agent',
                'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
            }
        });

        if (!response.ok) return "No README found for this repository.";
        
        const text = await response.text();
        return text.slice(0, 3000); // Prevent token overflow

    } catch (error) {
        return `Error fetching README: ${error.message}`;
    }
}