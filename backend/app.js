import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import multer from "multer";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_ENDPOINT = process.env.OPENROUTER_ENDPOINT;

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

const systemPrompt = {
    "role": "system",
    "content": `You are a Project Planner and a Code-copilot. Your task is to provide a Plan Specification structured as follows in JSON format given at end (required objects' title represented by asterisk in order; infer from the user query what type of task this is: new task, refactoring task, error fixes task; refer to specific cases if any additional information needed in task type requirements) following the guidelines given below:

    * Summary (summary object)
    Provide a clear, concise overview of the plan in a single paragraph of what the problem describes and how are we going to solve this.
    Include the following if applicable:
    1. Core technologies/frameworks used
    2. Major files and components involved
    3. Additional information as mentioned in the notes below

    * Files Required (as an array of objects (each object representing a file))
    For each file, specify:
    1. [filepath/filename] [NEW/MODIFIED/DELETED]
    2. Content: Detailed explanation of the file's components, configurations, dependencies, functionality and implementation details. Every minute thing should be included in this explanation.
    3. The content paragraph's first line should be the file purpose.
    4. References to files if any attached or referenced from in the solution.


    ADDITIONAL NOTES:
    - Return error if user has mentioned something in the query about specific file(s) but forgot to attach the file(s).
    - Work out your own plan before rushing to a conclusion.
    - The plan will be later given to an LLM/assistant like you. Thus, the plan must produce a working output, even if implemented with most basic functionality.
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
    3. Extremely detailed explanation of functionality
    4. Reference to another file if required (appended as a json object with the file object which is referencing another file)
    5. Required dependencies and versions
    6. Configuration details
    7. Code implementation guidelines
    8. Integration points with other files
    9. Command(s) should be included as text (no formatting) in the file specs if needed.
    10. In the file references, it should be an array of strings, with only filenames/filepaths as the strings, nothing else.

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
            "references": [...filepaths]
        }
        ]
    }`
}

const codeGenPrompt = {
    role: "system",
    content: `You are a Code-copilot specialized in generating code changes based on a provided plan specification. Your task is to produce a complete, fully functional codebase for the files described in the plan. Follow these guidelines strictly:

        1. Generate Full, Complete Code:
        - For each file, generate all necessary code so that the file is fully implemented and ready to run. Do not provide partial snippets or summaries.
        - Include complete class definitions, function implementations, configuration settings, error handling, and any other necessary components.
        - Do not truncate any file's content, even if the resulting codebase is large.

        2. Generate Clean, Accurate Code:
        - Write syntactically correct code that adheres to best practices and coding conventions for the target language.
        - Do not include any extra commentary or unnecessary comments in the code—only include inline comments when absolutely necessary for clarity.

        3. File-Based Output Format:
        - Return your response as a valid JSON object.
        - Each key in the JSON object must be the filename (including its relative path if needed) and the corresponding value must be an object with 2 keys.
            - code: the entire code content for that file.
            - status: the status of the file [NEW/MODIFIED/DELETED].
            - purpose: what purpose the file serves in maximum of 5 words.
        - For example:
        {
            "src/index.js": { "code": "// JavaScript code here...", "status": "NEW", "purpose": "..." },
            "src/styles.css": { "code": "/* CSS code here... */", "status": "NEW", "purpose": "..." },
            "README.md": { "code": "# Project Documentation...", "status": "NEW", "purpose": "..." }
        }

        4. Plan Specification Input:
        - The plan will be provided as a JSON object with two keys: "summary" and "files".
        - The "files" key is an array of objects. Each object includes:
            - "path": the file path and name.
            - "status": the file status (e.g., NEW, MODIFIED, DELETED).
            - "content": a detailed description of the required code changes.
            - "references": an array containing the files referenced in the current file.
        - Use this information to generate the appropriate code for each file.

        5. Do Not Include Extra Explanations:
        - Your entire response must be a valid JSON object following the above structure.
        - Do not insert any additional text, explanation, or commentary outside of the JSON structure or even in the code.

        Your response must strictly adhere to the following JSON format:
        {
            "filename1": "complete code content for file 1",
            "filename2": "complete code content for file 2",
            ...
        }

        Generate only the code files as specified.`
}


// Helper function to stream responses from OpenAI
async function getLLMResponse(conversationHistory) {
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
        console.log('Response recieved: ', completion?.id, " and task terminated due to finish_reason: ", completion?.choices[0]?.finish_reason);

        return JSON.parse(completion?.choices[0]?.message?.content);
    } catch (error) {
        console.error('Error streaming response:', error);
        return null;
    }
}

// infer_title route
app.get('/infer_title', async (req, res) => {
    console.log('Accessed Title Inference API');
    const summary = req.query.summary;
    if (!summary) {
        return res.status(400).json({ error: 'summary is required' });
    }

    // Build conversation history for a new chat
    const conversationHistory = [
        { role: 'system', content: 'Please suggest an appropriate and short title for this problem statement or summary. Do not exceed the tile length more than 3 words. Return the title as strictly a json object like { "title": "" }, nothing else.' },
        { role: 'user', content: summary }
    ];

    try {
        res.status(200).json(await getLLMResponse(conversationHistory));
    } catch (error) {
        console.error('Error in getLLMResponse:', error.toString());
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route: Start a new chat
app.post('/new_chat', upload.array('attachments'), async (req, res) => {
    console.log('Accessed New Chat API');
    const userPrompt = req.body.userPrompt;
    const messages = req.body.messages;
    if (!userPrompt) {
        return res.status(400).json({ error: 'userPrompt is required' });
    }

    // process attachments
    let attachmentContent = "";
    if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
            attachmentContent += `\nFilename: ${file.originalname}\nContent: ${file.buffer.toString('utf8')}`;
        });
    }
    const combinedContent = attachmentContent ? `${userPrompt}\nAttachments:\n${attachmentContent}` : userPrompt;

    // Build conversation history for a new chat
    const conversationHistory = [
        systemPrompt,
        { role: 'user', content: combinedContent }
    ];
    if (messages && Array.isArray(messages)) {
        conversationHistory.push(...messages);
    }

    try {
        const llmResponse = await getLLMResponse(conversationHistory);
        const resObj = {
            ...llmResponse,
            attachments: attachmentContent
        };
        res.status(200).json(resObj);
    } catch (error) {
        console.error('Error in getLLMResponse:', error.toString());
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route: Continue a chat (chain_chat)
app.post('/chain_chat', upload.array('attachments'), async (req, res) => {
    console.log('Accessed Chain Chat API');
    // Expecting a payload with a 'messages' array containing the conversation history.
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
    }

    // process attachments
    let attachmentContent = "";
    if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
            attachmentContent += `\nFilename: ${file.originalname}\nContent: ${file.buffer.toString('utf8')}`;
        });
    }
    const combinedContent = attachmentContent ? `${messages}\nAttachments:\n${attachmentContent}` : messages;

    const conversationHistory = [
        systemPrompt,
        ...messages
    ];
    if (combinedContent && Array.isArray(combinedContent)) {
        conversationHistory.push(...combinedContent);
    }
    try {
        const llmResponse = await getLLMResponse(conversationHistory);
        res.status(200).json(llmResponse);
    } catch (error) {
        console.error('Error in chain_chat getLLMResponse:', error.toString());
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route: Generate Code (generate_code)
app.post('/generate_code', async (req, res) => {
    console.log('Accessed Generate Code API');
    const planSpec = req.body.plan;
    if (!planSpec) {
        return res.status(400).json({ error: 'Plan specification is required' });
    }

    const conversationHistory = [
        codeGenPrompt,
        { role: 'user', content: JSON.stringify(planSpec) }
    ];
    try {
        const codeGenResponse = await getLLMResponse(conversationHistory);
        res.json(codeGenResponse);
    } catch (error) {
        console.error('Error generating code:', error.toString());
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
