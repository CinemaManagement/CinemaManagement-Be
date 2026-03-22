const express = require("express");
const router = express.Router();
const discountController = require("../../controllers/discount.controller");
const verifyRoles = require("../../middlewares/roleMiddleware");
const { ROLE } = require("../../constraints/role");
const verifyJwt = require("../../middlewares/authMiddleware");
const { checkRequiredFields } = require("../../middlewares/checkRequiredFields");

// Public endpoint: view active discounts
router.get(
    "/",
    // #swagger.tags = ['Discounts']
    // #swagger.summary = 'Get active discounts (public)'
    discountController.getAllDiscounts
);

router.use(verifyJwt);

router.post(
    "/",
    verifyRoles(ROLE.MANAGER),
    checkRequiredFields(
        "name",
        "type",
        "discountType",
        "value",
        "startDate",
        "endDate"
    ),
    // #swagger.tags = ['Discounts']
    // #swagger.summary = 'Create new discount (manager)'
    // #swagger.security = [{ "bearerAuth": [] }]
    discountController.addDiscount
);

router.patch(
    "/:id",
    verifyRoles(ROLE.MANAGER),
    // #swagger.tags = ['Discounts']
    // #swagger.summary = 'Update discount (manager)'
    // #swagger.security = [{ "bearerAuth": [] }]
    discountController.updateDiscount
);

module.exports = router;
