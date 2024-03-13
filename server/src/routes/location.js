import express from "express";
import * as controllers from "../controllers";
import uploadCloud from "../middlewares/uploader";
const router = express.Router();

router.get(
    "/getAll",
    controllers.getAllLocation,
)

export default router;