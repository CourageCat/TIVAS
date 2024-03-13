import express from "express";
import * as controllers from "../controllers";
const router = express.Router();

router.post("/paymentreservation", controllers.paymentReservation);
router.post("/createTicket", controllers.createTicket);
router.put("/activeTicket/:id", controllers.activeTicket);
router.get("/checkPriority/:id", controllers.checkPriority);
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

router.get("/getAllTicketsByAdmin/:id", controllers.getAllTicketsByAdmin)

//router.put("/refundUser/:id/:code", controllers.refundUser);

export default router;
