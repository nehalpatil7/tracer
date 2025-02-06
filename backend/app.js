import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_ENDPOINT = process.env.OPENROUTER_ENDPOINT;

app.use(cors());
app.use(express.json());

const systemPrompt = {
    "role": "system",
    "content": `Please provide a Plan Specification structured as follows in JSON format given at end (required objects' title represented by asterisk in order; infer from the user query what type of task this is: new task, refactoring task, error fixes task; refer to specific cases if any additional information needed in task type requirements):

    * Summary (summary object)
    Provide a clear, concise overview of the plan in a single paragraph of what the problem describes and how are we going to solve this.
    Include the following if applicable:
    1. Core technologies/frameworks used
    2. Major files and components involved
    3. Additional information as mentioned in the notes below

    * Files Required (as an array of objects (each object representing a file))
    For each file, specify:
    1. [filepath/filename] [NEW/MODIFIED/DELETED]
    2. Content: Extremely detailed explanation in a single paragraph of the file's components, configurations, dependencies, functionality and implementation details.
    3. The content paragraph's first line should be the file purpose.


    ADDITIONAL NOTES:
    - Return error if user has mentioned something in the query about specific file(s) but forgot to attach the file(s)
    - Files should be listed in order of importance:
    1. Core configuration files (package.json, config files)
    2. Main application files (app.js, index.js)
    3. Route handlers and controllers
    4. Middleware files
    5. Model definitions
    6. Utility/Helper files
    7. Test files
    8. Documentation files

    - Each file specification may include:
    1. Complete relative path with filename formatted as path
    2. Tag indicating file status (NEW/MODIFIED/DELETED)
    3. Detailed explanation of functionality
    4. Reference to another file if required (appended as a json object with the file object which is referencing another file)
    5. Required dependencies and versions
    6. Configuration details
    7. Code implementation guidelines
    8. Integration points with other files
    9. Command(s) should be included as text (no formatting) in the file specs if needed.

    - The plan should not include:
    1. Code examples/snippets
    2. Step-by-step numbered instructions where applicable


    SPECIFIC CASES:
    1. New Application requirements (but everything should follow the above instructions):
    - Complete project scaffolding
    - All necessary configuration files
    - Brief development environment setup mentioned in the summary
    - Brief build/deployment scripts mentioned in the summary
    - Documentation templates such as README.md should be included as a file, rest everything should only be a tiny mention in the summary

    2. Code Refactoring requirements:
    - Current code analysis should be performed before refactoring
    - Impact assessment on existing features should be performed before refactoring
    - Migration steps should be mentioned if any in the summary
    - Backward compatibility notes should be mentioned if any in the summary

    3. Error Fixing requirements:
    - Root cause analysis should be performed before refactoring and mentioned in the summary
    - Regression testing plan should be mentioned in the summary
    - Suggested fixes should be mentioned in the file content which is causing the error


    FORMAT - JSON (for reference, do not go beyond this structure):
    {
        "summary": "",
        "files": [
        {
            "path": "filepath/filename",
            "status": "[NEW/MODIFIED/DELETED]",
            "content": ""
        }
        ]
    }`
}


// Helper function to stream responses from OpenAI
async function getLLMResponse(res, conversationHistory) {
    try {
        const openai = new OpenAI({
            baseURL: OPENROUTER_ENDPOINT,
            apiKey: OPENROUTER_API_KEY,
        });

        const completion = await openai.chat.completions.create({
            messages: conversationHistory,
            model: 'gpt-4o-mini',
            response_format: { type: "json_object" }
        });
        console.log('Response recieved: ', completion?.id, " due to ", completion?.choices[0]?.finish_reason);

        res.json(JSON.parse(completion?.choices[0]?.message?.content));
    } catch (error) {
        console.error('Error streaming response:', error);
        res.status(500).json({ error: error.toString() });
    }
}

// test route
app.get('/', async (req, res) => {
    console.log('Accessed test API');
    return res.status(200).json({ message: 'OH HELLO!' });
});

// Route: Start a new chat
app.post('/new_chat', async (req, res) => {
    console.log('Accessed New Chat API');
    const { userPrompt, messages } = req.body;
    if (!userPrompt) {
        return res.status(400).json({ error: 'userPrompt is required' });
    }

    // Build conversation history for a new chat
    const conversationHistory = [
        systemPrompt,
        { role: 'user', content: userPrompt }
    ];
    if (messages && Array.isArray(messages)) {
        conversationHistory.push(...messages);
    }

    await getLLMResponse(res, conversationHistory);
});

// Route: Continue a chat (chain_chat)
app.post('/chain_chat', async (req, res) => {
    console.log('Accessed Chain Chat API');
    // Expecting a payload with a 'messages' array containing the conversation history.
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
    }

    const conversationHistory = [
        systemPrompt,
    ];
    if (messages && Array.isArray(messages)) {
        conversationHistory.push(...messages);
    }

    await getLLMResponse(res, conversationHistory);
});

// Route: Generate Code (generate_code)
app.post('/generate_code', async (req, res) => {
    console.log('Accessed Generate Code API');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
