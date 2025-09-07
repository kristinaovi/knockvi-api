// validators/user.validator.js
const { body } = require("express-validator");

exports.createUser = [
  body("userName")
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 3 }).withMessage("Name must be at least 3 characters"),
  body("userEmail")
    .isEmail().withMessage("Valid email is required"),
  body("userBadge")
    .notEmpty().withMessage("Badge number is required"),
  body("userDepartment")
    .notEmpty().withMessage("Department is required"),
  body("userRole")
    .notEmpty().withMessage("Role is required"),
  body("userStatus")
    .isIn(["Active", "Inactive"])
    .withMessage("Status must be Active or Inactive"),
];
