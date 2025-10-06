const { body } = require("express-validator");

exports.validateInventory = [
  body("part_code").notEmpty().withMessage("Part Code wajib diisi"),
  body("part_name").notEmpty().withMessage("Part Name wajib diisi"),
  body("total_stock")
    .notEmpty().withMessage("Total Stock wajib diisi")
    .isNumeric().withMessage("Total Stock harus berupa angka"),
  body("finish_good")
    .notEmpty().withMessage("Finish Good wajib diisi")
    .isNumeric().withMessage("Finish Good harus berupa angka"),
];
