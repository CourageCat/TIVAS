import express from "express";
import * as controllers from "../controllers";
const router = express.Router();

router.post("/paymentreservation", controllers.paymentReservation);
router.post("/createTicket", controllers.createTicket);
router.put("/activeTicket/:id", controllers.activeTicket);
router.put("/checkPriority", controllers.checkPriority);
//router.get("/checkTicket", controllers.checkTicket)

router.post("/createReservation", controllers.createReservation);

//router.get("/getTimeSharePriority/:userID", controllers.getTimeSharePriority);

//router.get("/getUserTickets/:id",controllers.getUserTickets)

//router.get("/getUserFailedTickets/:id", controllers.getUserFailedTickets)

//router.get("/getUserBuyTickets/:id", controllers.getUserBuyTickets)

router.get("/getAllUserNoPriorityByAdmin/:id", controllers.getAllUserNoPriorityByAdmin)

router.get("/getAllUserPriorityByAdmin/:id", controllers.getAllUserPriorityByAdmin)

router.get("/getAllUserNoPriorityByStaff", controllers.getAllUserNoPriorityByStaff)

router.get("/getAllUserPriorityByStaff", controllers.getAllUserPriorityByStaff)

//router.get("/getAllFailedTickets/:id", controllers.getAllFailedTickets)

router.get("/getAllTicketsByUser", controllers.getAllTicketsByUser)

router.get("/getAllTicketsByAdmin", controllers.getAllTicketsByAdmin)

router.get("/dashboardInTicket/:year", controllers.dashboardInTicket)

//router.put("/refundUser/:id/:code", controllers.refundUser);

export default router;
