import { notFound } from "../middlewares/handle_errors";
import auth from "./auth";
import user from "./user";
import project from "./project";
import room from "./room";
import typeroom from "./typeroom";
import timeshare from "./timeshare";
import reservationticket from "./reservationticket";
import booking from "./booking";
import location from "./location";

const initRoutes = (app) => {
  app.use("/api/v1/auth", auth);
  app.use("/api/v1/user", user);
  app.use("/api/v1/project", project);
  app.use("/api/v1/typeroom", typeroom);
  app.use("/api/v1/room", room);
  app.use("/api/v1/timeshare", timeshare);
  app.use("/api/v1/reservationticket", reservationticket);
  app.use("/api/v1/booking", booking);
  app.use("/api/v1/location", location);

  app.use(notFound);
};

export default initRoutes;
