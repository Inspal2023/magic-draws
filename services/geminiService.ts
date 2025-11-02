import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

// Retrieves the Gemini API key from environment variables.
const API_KEY = process.env.API_KEY;
// Hardcode the DeepSeek API key to ensure functionality.
// Note: In a production environment, this key should be managed securely,
// for example, through a backend proxy or a secure key management service.
const DEEPSEEK_API_KEY = 'sk-5247499858714f56917a537da3843a7d';

if (!API_KEY) {
  console.warn("API_KEY environment variable not set.");
}

/**
 * Creates and returns an authenticated GoogleGenAI client instance.
 * Throws an error if the API key is not available.
 * @returns {GoogleGenAI} The initialized GoogleGenAI client.
 */
const getAIClient = () => {
    if (!process.env.API_KEY) {
        throw new Error("Gemini API key not found in environment variables.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Converts a data URL string (e.g., from a canvas) into an object
 * containing the base64 data and its MIME type, suitable for the Gemini API.
 * @param {string} dataUrl The data URL to convert.
 * @returns {{ mimeType: string; data: string }} An object with the MIME type and base64 data.
 */
const dataUrlToBlob = (dataUrl: string) => {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)?.[1];
    return { mimeType: mime || 'image/png', data: base64 };
};

/**
 * Generates a creative prompt based on a user's line art drawing.
 * This function implements a two-step AI process:
 * 1. Gemini Vision analyzes the line art to identify key elements and themes.
 * 2. DeepSeek Chat uses this analysis to generate a rich, descriptive prompt.
 * @param {string} lineArt The base64 data URL of the user's drawing.
 * @returns {Promise<string>} A promise that resolves to a creative prompt.
 */
export const getInspirationFromImage = async (lineArt: string): Promise<string> => {
    // Step 1: Use Gemini for Vision Recognition to describe the image.
    const ai = getAIClient();
    const imagePart = { inlineData: dataUrlToBlob(lineArt) };
    const visionPrompt = "请详细分析这幅线稿的画面元素，包括主体形象（如人物、动物、建筑或自然景观）、构图中心与背景关系、视觉焦点及可能的情感氛围。若无法确认线稿的内容是否为具体形象，请判定其主题为“抽象画面”，并以10到20字的简洁中文短语描述一个抽象的绘画主题，体现画面的意境与艺术感。若线稿内容可辨识为具体形象，则概括出线稿所传达的核心主题，以一个10至15个字的简洁中文短语进行表达，确保短语能准确反映画面的主要意境或情感基调。";
    
    const visionResponse = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [imagePart, { text: visionPrompt }] }
    });
    const imageDescription = visionResponse.text.trim();

    // Step 2: Use DeepSeek for Creative Prompt Generation based on Gemini's description.
    const deepSeekResponse = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: '你是一位AI绘画提示词专家。请根据用户提供的中文主题描述，创作出一段富有创意、生动具体的中文AI绘画提示词。返回的提示词本身即可，不要包含任何多余的解释或引导性文字。'
                },
                {
                    role: 'user',
                    content: `根据这个描述创作提示词: "${imageDescription}"`
                }
            ]
        })
    });

    if (!deepSeekResponse.ok) {
        const errorBody = await deepSeekResponse.text();
        console.error("DeepSeek API Error:", errorBody);
        throw new Error(`DeepSeek API request failed with status ${deepSeekResponse.status}`);
    }

    const deepSeekData = await deepSeekResponse.json();
    return deepSeekData.choices[0].message.content.trim();
};

/**
 * Takes an existing user prompt and uses DeepSeek to optimize and expand upon it,
 * making it more detailed and imaginative.
 * @param {string} existingPrompt The user's current prompt.
 * @returns {Promise<string>} A promise that resolves to the optimized prompt.
 */
export const optimizePromptWithText = async (existingPrompt: string): Promise<string> => {
    const deepSeekResponse = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: '你是一位AI绘画提示词专家。请根据用户已有的中文提示词进行优化和扩展，使其更生动、更具体、更富有想象力。请保留用户的核心创意，只返回优化后的提示词本身，不要包含任何多余的解释或引导性文字。'
                },
                {
                    role: 'user',
                    content: `请优化这个提示词: "${existingPrompt}"`
                }
            ]
        })
    });
    if (!deepSeekResponse.ok) {
        const errorBody = await deepSeekResponse.text();
        console.error("DeepSeek API Error:", errorBody);
        throw new Error(`DeepSeek API request failed with status ${deepSeekResponse.status}`);
    }
    const deepSeekData = await deepSeekResponse.json();
    return deepSeekData.choices[0].message.content.trim();
}

/**
 * Fetches a short, positive, and funny joke or quote from the DeepSeek API.
 * This is used to display engaging content on the loading screen.
 * @returns {Promise<string>} A promise that resolves to a joke or quote.
 */
export const getFunnyJokeOrQuote = async (): Promise<string> => {
    const deepSeekResponse = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: '你是一个幽默大师和名言警句专家。你的任务是提供简短、积极向上的内容。'
                },
                {
                    role: 'user',
                    content: '请用中文讲一个幽默笑话或一句名人名言，要求内容积极向上，长度在30到50个汉字之间。只返回内容本身，不要任何多余的文字。'
                }
            ]
        })
    });
    if (!deepSeekResponse.ok) {
        const errorBody = await deepSeekResponse.text();
        console.error("DeepSeek API Error:", errorBody);
        throw new Error(`DeepSeek API request failed with status ${deepSeekResponse.status}`);
    }
    const deepSeekData = await deepSeekResponse.json();
    return deepSeekData.choices[0].message.content.trim();
};

/**
 * Translates a given Chinese text into English using the Gemini API.
 * This is crucial because image generation models often yield better results with English prompts.
 * @param {string} chineseText The Chinese text to translate.
 * @returns {Promise<string>} A promise that resolves to the English translation.
 */
export const translateToEnglish = async (chineseText: string): Promise<string> => {
    const ai = getAIClient();
    const translationPrompt = `Translate the following Chinese text into a concise English phrase suitable for an AI image generation model. Only return the translated text itself. Text to translate: "${chineseText}"`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: translationPrompt
    });

    return response.text.trim();
}

/**
 * Generates an image using the `gemini-2.5-flash-image` model.
 * It can accept a text prompt, a line art image, or both.
 * @param {string | null} lineArt The base64 data URL of the line art, or null.
 * @param {string} prompt The text prompt for the image generation.
 * @returns {Promise<string>} A promise that resolves to the base64 data URL of the generated image.
 */
const generateImageFromApi = async (lineArt: string | null, prompt: string): Promise<string> => {
    const ai = getAIClient();
    // Dynamically construct the `parts` array to accommodate both text and optional image inputs.
    // This is more robust than a fixed-type array.
    const parts = [];
    if (lineArt) {
        parts.push({ inlineData: dataUrlToBlob(lineArt) });
    }
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
            // Specifies that the expected response is an image.
            responseModalities: [Modality.IMAGE],
        },
    });
    
    // Extract the base64 image data from the API response.
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
    }
    throw new Error("No image generated by the API.");
};


/**
 * Implements the "AI Guess" agent workflow. This agent analyzes the user's drawing,
 * invents a creative concept for it, and generates an image without further user input.
 * @param {string} lineArt The base64 data URL of the user's drawing.
 * @returns {Promise<string>} A promise resolving to the generated image's data URL.
 */
export const runAiGuessAgent = async (lineArt: string): Promise<string> => {
    // 1. Vision recognition: Understand the drawing's theme.
    const ai = getAIClient();
    const imagePart = { inlineData: dataUrlToBlob(lineArt) };
    const visionPrompt = "请详细分析这幅线稿的画面元素，包括主体形象（如人物、动物、建筑或自然景观）、构图中心与背景关系、视觉焦点及可能的情感氛围。若无法确认线稿的内容是否为具体形象，请判定其主题为“抽象画面”，并以10到20字的简洁中文短语描述一个抽象的绘画主题，体现画面的意境与艺术感。若线稿内容可辨识为具体形象，则概括出线稿所传达的核心主题，以一个10至15个字的简洁中文短语进行表达，确保短语能准确反映画面的主要意境或情感基调。";
    
    const visionResponse = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [imagePart, { text: visionPrompt }] }
    });
    const themeDescription = visionResponse.text.trim();

    // 2. Creative description generation: Expand the theme into a full prompt.
    const deepSeekResponse = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: 'You are a creative writer. Based on a theme, write a creative and descriptive Chinese prompt for an AI painting, between 50 and 100 characters. Only return the prompt.' },
                { role: 'user', content: `Theme: "${themeDescription}"` }
            ]
        })
    });
    if (!deepSeekResponse.ok) throw new Error(`DeepSeek API request failed with status ${deepSeekResponse.status}`);
    const deepSeekData = await deepSeekResponse.json();
    const creativePrompt = deepSeekData.choices[0].message.content.trim();

    // 3. Final painting: Translate and generate the image from the creative prompt only.
    const englishCreativePrompt = await translateToEnglish(creativePrompt);
    return await generateImageFromApi(null, englishCreativePrompt);
};

/**
 * Implements the "Drawing Assistant" agent workflow. This agent uses the user's line art
 * as a structural guide and combines it with their text prompt and style choice to generate a controlled image.
 * @param {string} lineArt The base64 data URL of the user's drawing.
 * @param {string} prompt The user-provided text prompt.
 * @param {string} style The user-selected style.
 * @returns {Promise<string>} A promise resolving to the generated image's data URL.
 */
export const runDrawingAssistantAgent = async (lineArt: string, prompt: string, style: string): Promise<string> => {
    // 1. Translate prompt and style to English for better model performance.
    const englishPrompt = await translateToEnglish(prompt);
    
    // 2. Build a structured prompt for controlled image generation.
    // This prompt engineering is critical. It explicitly tells the model to use the
    // line art as a strict structural guide, ensuring the output respects the user's drawing.
    let structuredPrompt = `Critically important: Use the provided line art image as a strict structural guide for the final composition. The output must maintain over 80% structural similarity to the line art.
The subject of the artwork is: '${englishPrompt}'.`;

    // Conditionally add the style instruction if one is provided.
    if (style && style.trim() !== '') {
        const englishStyle = await translateToEnglish(style);
        structuredPrompt += `\nRender the final image in the style of: '${englishStyle}'.`;
    }

    // 3. Generate the image using the line art as a control image and the structured prompt.
    return await generateImageFromApi(lineArt, structuredPrompt);
};