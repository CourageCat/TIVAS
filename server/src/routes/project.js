import express from "express";
import * as controllers from "../controllers";
import uploadCloud from "../middlewares/uploader";
const router = express.Router();

router.post(
  "/create",
  uploadCloud.fields([
    {
      name: 'thumbnail', maxCount: 1
    },
    {
      name: 'images'
    },
  ]),
  controllers.createNewProject
)
router.get("/getAll",controllers.getAllProject)
router.get("/getAllWithType", controllers.getAllWithType);
router.get("/getAllByLocation/:id", controllers.getAllByLocation)
router.delete("/delete/:id",controllers.deleteProjects)
router.put(
  "/update/:id",
  uploadCloud.fields([
    {
      name: 'thumbnail', maxCount: 1
    },
    {
      name: 'images',
    },
  ]),
  controllers.updateProjects
)


router.get(
  "/search",
  controllers.searchProject
)

router.get(
  "/searchNameAndLocationProject",
  controllers.searchNameAndLocationProject,
)

router.get(
  "/top10",
  controllers.getTop10
)

router.get(
  "/getTypeOfProject/:id",
  controllers.getTypeOfProject,
)

//thay doi openDate va closeDate
router.put("/updateBooking/:id",controllers.updateBooking)
//thay doi reservationPrice va reservationDate
router.put("/changeReservationInfo/:id",controllers.updateReservation)
//mo ban reservation ticket (status=2)
router.put("/openReservationTicket/:id",controllers.openReservationTicket)
//mo booking
router.put("/openBooking/:id",controllers.openBooking)

router.get("/getReservation/:id", controllers.getReservation)

router.put("/updateReservationInfo/:id", controllers.updateReservationInfo)

router.put("/getAllProjectReservation", controllers.getAllProjectReservation)

router.put("/updateOrdering", controllers.updateOrdering)

router.get("/getAllInReservation", controllers.getAllInReservation)

router.get(
  "/getAllSoldReservationStageOfProject",
  controllers.getAllSoldReservationStageOfProject
)

router.get(
  "/getAllSold",
  controllers.getAllProjectSold
)

router.get("/statisticOnStage/:id", controllers.statisticOnStage)

router.get(
  "/:id",
  controllers.getDetailsProject
)

export default router;