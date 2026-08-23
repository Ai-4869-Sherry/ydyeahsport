export async function onRequestGet(context) {
    const responseHeaders = {
        "Cache-Control": "no-store"
    };

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
                ORDER BY rowid ASC
            `)
            .all();

        return Response.json(
            {
                success: true,
                products: result.results
            },
            {
                headers: responseHeaders
            }
        );
    } catch (error) {
        console.error("Failed to load products from D1:", error);

        return Response.json(
            {
                success: false,
                message: "Failed to load products"
            },
            {
                status: 500,
                headers: responseHeaders
            }
        );
    }
}
