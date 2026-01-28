const express = require("express");
const { getAllUsers, deleteUser } = require("../../controllers/userController");
const verifyRoles = require("../../middlewares/roleMiddleware");
const { ROLE } = require("../../constraints/role");
const router = express.Router();

router.route("/").get(verifyRoles(ROLE.ADMIN), getAllUsers);
router.route("/:id").delete(deleteUser);

module.exports = router;
