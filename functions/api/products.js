export async function onRequestGet(context) {
    try {
        const result = await context.env.PRODUCT_DB
            .prepare(`
                SELECT
                    YD_sku,
                    category,
                    product_name,
                    title,
                    feature,
                    img_1,
                    img_2
                FROM product_card
            `)
            .all();

        return Response.json({
            success: true,
            products: result.results
        });
    } catch (error) {
        console.error("Failed to load products:", error);

        return Response.json(
            {
                success: false,
                error: error.message
            },
            {
                status: 500
            }
        );
    }
}