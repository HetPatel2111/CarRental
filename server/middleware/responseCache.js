import { getCache, hashCacheKeyPart, setCache } from "../configs/cache.js";

export const cacheJsonResponse = ({ keyPrefix, ttlSeconds = 60, getPayload = null } = {}) => async (req, res, next) => {
    try {
        const payload = getPayload
            ? getPayload(req)
            : {
                  path: req.originalUrl,
                  params: req.params,
                  query: req.query,
                  body: req.body,
                  userId: req.user?._id || "guest"
              };

        const cacheKey = `${keyPrefix}:${hashCacheKeyPart(payload)}`;
        const cached = await getCache(cacheKey);

        if (cached) {
            return res.json(cached);
        }

        const originalJson = res.json.bind(res);
        res.json = async (body) => {
            if (res.statusCode < 400 && body?.success !== false) {
                await setCache(cacheKey, body, ttlSeconds);
            }

            return originalJson(body);
        };

        next();
    } catch (error) {
        next();
    }
};
