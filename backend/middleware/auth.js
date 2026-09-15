const User = require("../models/User");
const { matchesBrowserSession } = require("../services/browserSession");

const requireAuth = async (request, response, next) => {
    try {
        if (!request.session?.userId || !matchesBrowserSession(request.session, request.get("X-Browser-Session"))) {
            return response.status(401).json({
                success: false,
                error: {
                    message: "Authentication required."
                }
            });
        }

        const user = await User.findById(request.session.userId);

        if (!user) {
            request.session.destroy(() => {});

            return response.status(401).json({
                success: false,
                error: {
                    message: "Authentication required."
                }
            });
        }

        request.user = user;

        return next();
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    requireAuth
};
