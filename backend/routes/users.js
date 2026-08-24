const express = require("express");

const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/me", requireAuth, (request, response) => {
    response.json({
        success: true,
        data: {
            id: request.user._id,
            username: request.user.username,
            mobile: request.user.mobile,
            xp: request.user.xp,
            favorites: request.user.favorites
        }
    });
});

module.exports = router;
