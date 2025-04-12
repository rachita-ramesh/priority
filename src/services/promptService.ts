import { supabase } from '../lib/supabase';
import { OPENAI_API_KEY, hasOpenAIKey } from '../lib/env';

type PromptGenerationParams = {
  previousPrompts?: string[];  // List of previously used prompts to avoid repetition
  userId?: string;  // Optional user ID for customization
};

/**
 * Generates a relationship reflection prompt using OpenAI's GPT-4o
 */
export async function generateWeeklyPrompt(params?: PromptGenerationParams): Promise<string> {
  try {
    // Check if we have an API key in the environment
    if (!hasOpenAIKey) {
      console.warn('OpenAI API key not found, using fallback prompt');
      return getRandomFallbackPrompt();
    }
    
    // Prepare previously used prompts to avoid repetition
    const previousPromptsText = params?.previousPrompts?.length 
      ? `Previously used prompts (avoid repetition): ${params.previousPrompts.join(', ')}` 
      : '';
    
    // Make the API call to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a thoughtful coach who creates weekly reflection prompts for personal growth and relationships.
            
            Create ONE thought-provoking prompt that encourages meaningful reflection. The prompt can focus on:
            1. Individual growth (e.g., "What was the toughest decision you made this week?", "What made you proud of yourself?")
            2. Personal happiness (e.g., "What moment brought you the most joy this week?", "What made your soul happy?")
            3. Relationship dynamics (e.g., "How did you and your partner support each other?", "What new thing did you learn about your partner?")
            
            The prompt should be specific, deep but not too personal, and encourage meaningful reflection. 
            The prompt should be a single question, be brief (under 80 characters if possible), 
            and should NOT include any quotation marks or prefixes like "Prompt:".
            
            ${previousPromptsText}`
          },
          {
            role: 'user',
            content: 'Generate a new weekly reflection prompt.'
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });
    
    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      console.error('Unexpected response from OpenAI:', data);
      return getRandomFallbackPrompt();
    }
    
    // Extract just the prompt text
    const generatedPrompt = data.choices[0].message.content.trim()
      .replace(/^["']|["']$/g, '')  // Remove any quotes at the beginning or end
      .replace(/^Prompt: /i, '');   // Remove "Prompt:" prefix if it exists
    
    // Log for debugging
    console.log('Generated prompt:', generatedPrompt);
    
    return generatedPrompt;
  } catch (error) {
    console.error('Error generating prompt with GPT-4o:', error);
    return getRandomFallbackPrompt();
  }
}

/**
 * Fetches previously used prompts for a user
 */
export async function getPreviousPrompts(userId: string, limit: number = 10): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('reflections')
      .select('prompt_question')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching previous prompts:', error);
      return [];
    }
    
    return data.map(item => item.prompt_question);
  } catch (error) {
    console.error('Error in getPreviousPrompts:', error);
    return [];
  }
}

/**
 * Gets a random fallback prompt if the API call fails
 */
function getRandomFallbackPrompt(): string {
  const fallbackPrompts = [
    // Individual reflection prompts
    "What was the toughest decision you made this week?",
    "What made you proud of yourself recently?",
    "What brought you the most joy this week?",
    "What personal boundary did you maintain well?",
    "What made your soul happy this week?",
    "What did you learn about yourself recently?",
    "How did you practice self-care this week?",
    "What personal growth have you noticed in yourself?",
    "What have you been grateful for in your own journey?",
    
    // Relationship reflection prompts
    "What made you feel appreciated this week?",
    "What small gesture from your partner meant the most to you?",
    "Which moment together this week would you like to relive?",
    "What has your partner done this week that made you smile?",
    "How did you and your partner grow closer this week?",
    "What's something new you learned about your partner?",
    "What challenge did you overcome together this week?",
    "In what ways did you prioritize your relationship this week?",
    "What conversation with your partner was most meaningful?",
    "How did your partner support you when you needed it?",
    "What is one strength of your relationship that showed this week?"
  ];
  
  return fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
} 