"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fragrancesRouter = void 0;
const express_1 = __importDefault(require("express"));
const fragrances_controller_1 = require("../controllers/fragrances.controller");
const router = express_1.default.Router();
router.get('/', fragrances_controller_1.selectAllFragrances);
router.post('/', fragrances_controller_1.addFragrance);
router.put('/:id', fragrances_controller_1.updateFragrance);
router.delete('/:id', fragrances_controller_1.deleteFragrance);
exports.fragrancesRouter = router;
