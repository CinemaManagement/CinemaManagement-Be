const express = require("express");
const { getAllRoles, createRole, deleteRole } = require("../../controllers/roleController");
const router = express.Router();

router.route("/").get(getAllRoles).post(createRole);
router.route("/:roleId").delete(deleteRole)

module.exports = router;
