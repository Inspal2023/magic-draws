import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;
// Hardcode the DeepSeek API key to ensure functionality
const DEEPSEEK_API_KEY = 'sk-5247499858714f56917a537da3843a7d';

if (!API_KEY) {
  console.warn("API_KEY environment variable not set.");
}

const getAIClient = () => {
    if (!process.env.API_KEY) {
        throw new Error("Gemini API key not found in environment variables.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const dataUrlToBlob = (dataUrl: string) => {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)?.[1];
    return { mimeType: mime || 'image/png', data: base64 };
};

export const getInspirationFromImage = async (lineArt: string): Promise<string> => {
    // Step 1: Use Gemini for Vision Recognition
    const ai = getAIClient();
    const imagePart = { inlineData: dataUrlToBlob(lineArt) };
    const visionPrompt = "请详细分析这幅线稿的画面元素，包括主体形象（如人物、动物、建筑或自然景观）、构图中心与背景关系、视觉焦点及可能的情感氛围。若无法确认线稿的内容是否为具体形象，请判定其主题为“抽象画面”，并以10到20字的简洁中文短语描述一个抽象的绘画主题，体现画面的意境与艺术感。若线稿内容可辨识为具体形象，则概括出线稿所传达的核心主题，以一个10至15个字的简洁中文短语进行表达，确保短语能准确反映画面的主要意境或情感基调。";
    
    const visionResponse = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [imagePart, { text: visionPrompt }] }
    });
    const imageDescription = visionResponse.text.trim();

    // Step 2: Use DeepSeek for Creative Prompt Generation (in Chinese)
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

export const translateToEnglish = async (chineseText: string): Promise<string> => {
    const ai = getAIClient();
    const translationPrompt = `Translate the following Chinese text into a concise English phrase suitable for an AI image generation model. Only return the translated text itself. Text to translate: "${chineseText}"`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: translationPrompt
    });

    return response.text.trim();
}

const generateImageFromApi = async (lineArt: string | null, prompt: string): Promise<string> => {
    const ai = getAIClient();
    // FIX: The original `parts` array initialization caused a TypeScript error
    // because its type was inferred as `({ text: string; })[]`, which doesn't
    // allow adding an image part. This new approach constructs the array
    // dynamically and correctly to accommodate both text and image parts.
    const parts = [];
    if (lineArt) {
        parts.push({ inlineData: dataUrlToBlob(lineArt) });
    }
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
    }
    throw new Error("No image generated by the API.");
};


// --- AI Guess Agent ---
export const runAiGuessAgent = async (lineArt: string): Promise<string> => {
    // 1. Vision recognition
    const ai = getAIClient();
    const imagePart = { inlineData: dataUrlToBlob(lineArt) };
    const visionPrompt = "请详细分析这幅线稿的画面元素，包括主体形象（如人物、动物、建筑或自然景观）、构图中心与背景关系、视觉焦点及可能的情感氛围。若无法确认线稿的内容是否为具体形象，请判定其主题为“抽象画面”，并以10到20字的简洁中文短语描述一个抽象的绘画主题，体现画面的意境与艺术感。若线稿内容可辨识为具体形象，则概括出线稿所传达的核心主题，以一个10至15个字的简洁中文短语进行表达，确保短语能准确反映画面的主要意境或情感基调。";
    
    const visionResponse = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [imagePart, { text: visionPrompt }] }
    });
    const themeDescription = visionResponse.text.trim();

    // 2. Creative description generation
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

    // 3. Final painting
    const englishCreativePrompt = await translateToEnglish(creativePrompt);
    return await generateImageFromApi(null, englishCreativePrompt);
};

// --- AI Drawing Assistant Agent ---
export const runDrawingAssistantAgent = async (lineArt: string, prompt: string, style: string): Promise<string> => {
    // 1. Translate prompt to English
    const englishPrompt = await translateToEnglish(prompt);
    
    // 2. Build structured prompt
    // A more robust prompt structure is implemented to handle cases
    // where a style is not provided. The style instruction is now added
    // conditionally, ensuring the model focuses solely on the user's prompt when
    // no style is selected.
    let structuredPrompt = `Critically important: Use the provided line art image as a strict structural guide for the final composition. The output must maintain over 80% structural similarity to the line art.
The subject of the artwork is: '${englishPrompt}'.`;

    if (style && style.trim() !== '') {
        const englishStyle = await translateToEnglish(style);
        structuredPrompt += `\nRender the final image in the style of: '${englishStyle}'.`;
    }

    // 3. Generate image with line art as control
    return await generateImageFromApi(lineArt, structuredPrompt);
};