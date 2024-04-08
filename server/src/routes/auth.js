import express from "express";
import passport from "passport";
import passportConfig from "../middlewares/passport";
import * as controllers from "../controllers";

const router = express.Router();

//Verify by email register OTP
router.post("/sendmail", controllers.sendCodeEmail);
router.post("/sendmailforgotpassword", controllers.sendCodeForgotPassword);

//
router.post("/registerbyemail", controllers.checkRegister);
router.post("/checkusernameregister", controllers.checkUserName);
router.post("/resetpasswordbyemail", controllers.checkResetPassword);

// Local
router.post("/register", controllers.register);
router.post("/login", controllers.login);
router.post("/resetpassword", controllers.resetPassword);

// Google
router.post(
  "/google",
  passport.authenticate("google-oauth-token", { session: false }),
  controllers.loginGoogle
);

//Register google
router.post("/registergoogle", controllers.registerGoogle);

// Refresh token
router.post("/refreshtoken", controllers.refreshToken);

//Logout
router.post("/logout", controllers.logout);

// =======
router.post("/registerstaff", controllers.registerStaff);

export default router;
