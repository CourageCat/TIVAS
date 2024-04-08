import express from "express";
import * as controllers from "../controllers";
const router = express.Router();

router.post(
    "/add",
    controllers.addFeedBack
)

router.get(
    "/getAll",
    controllers.getAllFeedBackByAdmin
)

router.put(
    "/update/:feedBackID",
    controllers.updateShowFeedBack
)

router.get(
    "/getAllToUser",
    controllers.showFeedBackToUser
)

router.delete(
    "/:id",
    controllers.deleteFeedBack
)
export default router;