import express from "express";
import passport from "passport";
import passportConfig from "../middlewares/passport";
import * as controllers from "../controllers";
import uploadCloud from "../middlewares/uploader";

const router = express.Router();

// User is logged in
// router.use(passport.authenticate("jwt", { session: false }));
router.get("/getuser/:username", controllers.getUser);
router.get("/getavtuser/:username", controllers.getAvatarUser);

router.put(
  "/edituser",
  uploadCloud.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
  ]),
  controllers.editUser
);

router.get("/getallusers", controllers.getAllUsers);

router.get("/getbankinguser/:username", controllers.getBankingUser);
router.post("/banuser/", controllers.banUser);
router.post("/unbanuser/", controllers.unBanUser);
router.post("/addwishlist", controllers.addWishlist)
router.get("/viewwishlist", controllers.viewwishlist)
router.delete("/deletewishlist", controllers.deletewishlist)
router.get("/checkprojectwishlist", controllers.checkProjectWishlist)
router.get("/getHistory", controllers.getHistory)
export default router;
