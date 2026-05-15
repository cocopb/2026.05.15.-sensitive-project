const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// 1. Setup Environment
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 2. Initialize Clients
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'placeholder',
});

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_URL.startsWith('http')) {
    supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
    );
} else {
    console.warn('Supabase URL is missing or invalid. Database logging will be disabled.');
}

// 3. Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 4. API Endpoints
app.post('/api/analyze', async (req, res) => {
    const { text } = req.body;

    // Validation
    if (!text || typeof text !== 'string' || text.trim() === '') {
        return res.status(400).json({ error: '분석할 텍스트를 입력해주세요.' });
    }

    if (text.length > 1000) {
        return res.status(400).json({ error: '텍스트는 최대 1000자까지 입력 가능합니다.' });
    }

    try {
        // OpenAI Analysis
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "너는 한국어 텍스트 감성 분석기다. 사용자 텍스트를 positive, negative, neutral 중 하나로 분류한다. confidence는 0부터 100 사이의 정수로 작성한다. reason은 한국어로 한 문장만 작성한다. 과장하지 말고 텍스트 근거만 사용한다. JSON 형식으로 응답하라."
                },
                {
                    role: "user",
                    content: text
                }
            ],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(completion.choices[0].message.content);
        
        // Normalize values
        const finalResult = {
            sentiment: result.sentiment || 'neutral',
            confidence: parseInt(result.confidence) || 0,
            reason: result.reason || '분석 결과가 없습니다.'
        };

        // Log to Supabase (Non-blocking)
        logToSupabase(text, finalResult);

        res.json(finalResult);
    } catch (error) {
        console.error('OpenAI API Error:', error);
        res.status(500).json({ error: '분석 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    }
});

async function logToSupabase(inputText, result) {
    try {
        if (!supabase) {
            console.log('Supabase client not initialized, skipping log.');
            return;
        }

        const { error } = await supabase
            .from('sentiment_logs')
            .insert([
                {
                    input_text: inputText,
                    sentiment: result.sentiment,
                    confidence: result.confidence,
                    reason: result.reason
                }
            ]);

        if (error) throw error;
    } catch (error) {
        console.error('Supabase Logging Error:', error.message);
    }
}

// 5. Start Server
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
