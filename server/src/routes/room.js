import express from "express";
import uploadCloud from "../middlewares/uploader";
import * as controllers from "../controllers";

const router = express.Router();
router.post(
    "/test",
    uploadCloud.array('images'),
    controllers.test
)

export default router;
