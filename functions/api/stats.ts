export interface Env {
    DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const countRes = await context.env.DB.prepare("SELECT COUNT(*) as count FROM ingredients").first();
        const recentRes = await context.env.DB.prepare("SELECT * FROM ingredients ORDER BY updated_at DESC LIMIT 2").all();

        return new Response(JSON.stringify({
            success: true,
            data: {
                totalIngredients: countRes?.count || 0,
                recentItems: recentRes.results || []
            }
        }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
    }
};
