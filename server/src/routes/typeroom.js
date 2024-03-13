import express from "express";
import * as controllers from "../controllers";
import uploadCloud from "../middlewares/uploader";
const router = express.Router();

// router.post(
//     "/create",
//     uploadCloud.single('images'),
//     controllers.createNewProperty
//   );

router.post(
  "/create/:projectID",
  uploadCloud.array('images'),
  controllers.createNewTypeRoom
)

router.put(
  "/update/:id",
  uploadCloud.array('images'),
  controllers.updateTypeRoom
)

router.delete(
  "/delete/:id",
  controllers.deleteTypeRoom
)

router.get(
  "/getAll/:projectID",
  controllers.getAllTypeRoom
)

router.get(
  "/:id",
  controllers.getDetailsTypeRoom
)

export default router;
