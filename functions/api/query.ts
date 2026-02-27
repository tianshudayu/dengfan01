export interface Env {
    GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const body = await context.request.json() as { query: string };
        const { query } = body;

        if (!query) throw new Error("Query is required");
        if (!context.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

        const prompt = `You are a cyberpunk kitchen assistant (Antigravity OS). Answer the user's cooking query concisely.
        Query: ${query}
        Please output a pure JSON object without markdown formatting. The JSON should match this interface:
        {
          "title": "Short descriptive title (e.g. 牛肉_内部_温度)",
          "ref": "A short ref code (e.g. USDA, EGG_01)",
          "content": "The concise answer to the query.",
          "stats": [{"label": "Name of stat (e.g. 目标内部温度, 总时间)", "value": "Number or string (e.g. 54, 06:30)", "unit": "Optional unit (e.g. °C, m)"}],
          "action": {"label": "Action label if applicable (e.g. 开始 (06:30))", "icon": "timer"} // action is optional
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
        const parsedResponse = JSON.parse(text);

        return new Response(JSON.stringify({ success: true, data: parsedResponse }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
    }
};
