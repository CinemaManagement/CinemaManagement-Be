const express = require("express");
const router = express.Router();
const verifyJwt = require("../../middlewares/authMiddleware");
const verifyRoles = require("../../middlewares/roleMiddleware");
const { ROLE } = require("../../constraints/role");
const { createExpense, getHistory } = require("../../controllers/expense.controller");

router.use(verifyJwt);

router
    .route("/")
    .post(
        verifyRoles(ROLE.MANAGER),
        // #swagger.tags = ['Expenses']
        // #swagger.security = [{ "bearerAuth": [] }]
        createExpense,
    )
    .get(
        verifyRoles(ROLE.MANAGER),
        // #swagger.tags = ['Expenses']
        // #swagger.security = [{ "bearerAuth": [] }]
        getHistory,
    );

module.exports = router;
