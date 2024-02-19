// @ts-nocheck
import { serve } from 'https://deno.land/std@0.170.0/http/server.ts' 
import "https://deno.land/x/xhr@0.3.1/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.5.0'
import OpenAI from "https://deno.land/x/openai@v4.27.1/mod.ts"
import { stripIndent, oneLine } from 'https://esm.sh/common-tags@1.8.2'    


const openAI_Key = Deno.env.get("OPENAI_API_KEY"); 

const supaURL = Deno.env.get("SUPABASE_URL"); 

const supaKey = Deno.env.get("SUPABASE_ANON_KEY");

const openai = new OpenAI({
    apiKey: openAI_Key,
});

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}  

const supabaseClient = createClient(
    supaURL, 
    supaKey,
);

Deno.serve(async (req) => {
    if(req.method === "OPTIONS") {
        return new Response('ok',{ headers: corsHeaders})
    } 

    const { query } = await req.json();
    const input = query.replace(/\n/g, ' '); 

    const genEmbeddings = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: input, 
        encoding_format: "float",
    }); 

    const embedding  = genEmbeddings.data[0].embedding; 

    const { data: airline_reviews, error } = await supabaseClient.rpc('match_documents', {
        query_embedding: embedding,
        match_threshold: 0.73, 
        match_count: 10
    }); 

    if(error) throw error  

    let contextText = ''; 

    for (let i = 0; i < airline_reviews.length; i++) {
        const document = airline_reviews[1];
        const content = document.content; 

        contextText += `${content.trim()}\n---\n`;
    }

    const system_prompt = stripIndent `
    You are a Customer Success Manager Assistant for an airline company with access to reviews left by customers. 
    These reviews include information regarding the customer, the review they wrote, and the ratings they provided for different categories.
    Your job is to answer questions regarding customer expirience using the reviews left by customers. 
    `; 

    const user_prompt = `Question: ${query} | Customer Reviews: ${contextText}`;  

    const chatCompletion = await openai.chat.completions.create({
        messages: [
            {role: 'system', content: system_prompt},
            {role: 'user', content: user_prompt}
        ],
        model: 'gpt-4'
    }); 

    const reply = chatCompletion.choices[0].message.content;

    
    return new Response(JSON.stringify({ reply }), {
        headers: {...corsHeaders, 'Content-Type':'application/json'}
    })

})