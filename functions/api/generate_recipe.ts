export interface Env {
    DB: D1Database;
    GEMINI_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        if (!context.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

        // 获取所有食材
        const { results: ingredients } = await context.env.DB.prepare("SELECT name, quantity FROM ingredients").all();

        if (!ingredients || ingredients.length === 0) {
            return new Response(JSON.stringify({ success: false, error: "Empty ingredients" }), { status: 400 });
        }

        const ingredientsText = ingredients.map(i => `${i.name}(${i.quantity})`).join(', ');

        const prompt = `你是一个米其林主厨AI。基于以下现有食材，想出一道创新且容易烹饪的菜谱。
        现有食材：${ingredientsText}
        请输出一个纯JSON对象，格式如下，不要任何Markdown：
        {
            "name": "菜肴名称",
            "time": "15 分钟",
            "calories": "300",
            "tags": ["快手", "健康"],
            "steps": [
                {
                    "title": "准备",
                    "content": "切好食材...",
                    "timer": "02:00",
                    "temp": "常温"
                },
                {
                    "title": "翻炒",
                    "content": "热锅倒油...",
                    "timer": "05:00",
                    "temp": "大火"
                }
            ]
        }`;

        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${context.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!aiRes.ok) throw new Error("AI provider error");

        const aiData = await aiRes.json();
        const text = aiData.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
        const recipe = JSON.parse(text);

        return new Response(JSON.stringify({ success: true, recipe }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
    }
};
