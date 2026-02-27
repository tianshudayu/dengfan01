export interface Env {
    DB: D1Database;
    GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const body = await context.request.json() as { image: string };
        const { image } = body;

        if (!image) throw new Error("Image data is required");
        if (!context.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

        // The image is expected to be a base64 string (e.g., data:image/jpeg;base64,...).
        // Let's extract the raw base64 data and mime type.
        const match = image.match(/^data:(image\/[a-z]+);base64,(.+)$/);
        if (!match) {
            throw new Error("Invalid image format. Expected data URI.");
        }

        const mimeType = match[1];
        const base64Data = match[2];

        const prompt = `你是一个赛博朋克风格的厨房AI助手。分析这张图片中的食材。
        任务：识别出了哪些主要食材，以及它们各自的估计数量。
        注意：直接返回一个纯JSON数组，无任何markdown代码块，无多余文本。格式要求：
        [{"name": "鸡蛋", "quantity": "2", "unit": "个", "category": "蛋奶", "notes": "表皮有少许污渍"}]`;

        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${context.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }]
            })
        });

        if (!aiRes.ok) {
            const errBody = await aiRes.text();
            throw new Error(`AI provider error: ${errBody}`);
        }

        const aiData = await aiRes.json();
        const text = aiData.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
        const ingredients = JSON.parse(text);

        // 如果识别出食材，把它们存入 D1
        const results = [];
        for (const item of ingredients) {
            if (!item.name) continue;
            const res = await context.env.DB.prepare(`
                INSERT INTO ingredients (name, quantity, unit, category, notes, updated_at) 
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(name) DO UPDATE SET
                    quantity = excluded.quantity,
                    unit = excluded.unit,
                    category = excluded.category,
                    notes = excluded.notes,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `).bind(
                item.name, item.quantity || "", item.unit || "", item.category || "", item.notes || ""
            ).first();
            results.push(res);
        }

        return new Response(JSON.stringify({ success: true, count: results.length, data: results }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
    }
};
