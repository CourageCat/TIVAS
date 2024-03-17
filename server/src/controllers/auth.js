import * as services from "../services";
import { missValue, notAuth } from "../middlewares/handle_errors";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Register
export const sendCodeEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return missValue("Missing value!", res);
  }

  const response = await services.sendCodeEmail(req.body);

  return res.status(200).json(response);
};

// Check otp
export const checkRegister = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return missValue("Missing value!", res);
  const response = await services.checkRegister(req.body);
  return res.status(200).json(response);
};

export const sendCodeForgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return missValue("Missing value!", res);
  }

  const response = await services.sendCodeForgotPassword(req.body);

  return res.status(200).json(response);
};

export const checkResetPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return missValue("Missing value!", res);
  }

  const response = await services.checkResetPassword(req.body);

  return res.status(200).json(response);
};

export const checkUserName = async (req, res) => {
  const { username } = req.body;
  if (!username) return missValue("Missing value!", res);
  const response = await services.checkUserName(req.body);
  return res.status(200).json(response);
};

export const register = async (req, res) => {
  const { email, username, fullName, password, phoneNumber, paymentMethod } =
    req.body;

  try {
    if (
      !email ||
      !username ||
      !fullName ||
      !password ||
      !phoneNumber ||
      !paymentMethod
    ) {
      return missValue("Missing value!", res);
    }

    const setupIntent = await stripe.setupIntents.create({
      payment_method: paymentMethod,
    });

    const paymentMethodId = setupIntent.payment_method;
    console.log(paymentMethod);
    const customer = await stripe.customers.create({
      email: email,
      name: fullName,
      payment_method: paymentMethodId,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    if (customer) {
      const reponses = await services.register({
        email,
        username,
        fullName,
        password,
        phoneNumber,
        refundHistoryID: customer.id,
      });
      const { refreshToken, ...rest } = reponses;
      return res.status(200).json(rest);
    } else {
      return res.status(500).json({
        err: 1,
        mess: "Error register",
      });
    }
  } catch (error) {
    console.error("Error creating customer:", error);
    return res.status(500).json({
      error: 1,
      message: "Failed to create customer",
      success: false,
    });
  }
};

// Login local
export const login = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username && !email) {
    return missValue("Missing value", res);
  }
  if (!password) {
    return missValue("Missing value", res);
  }

  const response = await services.login(req.body);
  const { refreshToken, ...rest } = response;
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    path: "/",
    sameSite: "strict",
  });

  return res.status(200).json(rest);
};

// Login google
export const loginGoogle = async (req, res) => {
  const email = req.user.emails[0].value;

  const response = await services.loginGoogle({ email });
  const { refreshToken, ...rest } = response;
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    path: "/",
    sameSite: "strict",
  });
  return res.status(200).json(rest);
};

// Register google
export const registerGoogle = async (req, res) => {
  const { username, fullName, email, phoneNumber, paymentMethod } = req.body;

  try {
    if (!username || !fullName || !email || !phoneNumber || !paymentMethod) {
      return missValue("Missing value!", res);
    }

    const setupIntent = await stripe.setupIntents.create({
      payment_method: paymentMethod,
    });

    const paymentMethodId = setupIntent.payment_method;

    const customer = await stripe.customers.create({
      email: email,
      name: fullName,
      payment_method: paymentMethodId,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    if (customer) {
      const reponses = await services.registerGoogle({
        username,
        email,
        fullName,
        phoneNumber,
        refundHistoryID: customer.id,
      });
      const { refreshToken, ...rest } = reponses;
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        path: "/",
        sameSite: "strict",
      });
      return res.status(200).json(rest);
    } else {
      return res.status(500).json({
        err: 1,
        mess: "Error register",
      });
    }
  } catch (error) {
    console.error("Error creating customer:", error);
    return res.status(500).json({
      error: 1,
      message: "Failed to create customer",
      success: false,
    });
  }
};

// Refresh token
export const refreshToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  console.log("refreshToken: ", refreshToken);
  if (!refreshToken)
    return notAuth("Access token may be expired or invalid", res);

  const response = await services.refreshToken({ refreshToken });
  const { newRefreshToken, ...rest } = response;
  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: false,
    path: "/",
    sameSite: "strict",
  });
  return res.status(200).json(rest);
};

// Reset password
export const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  const response = await services.resetPassword(req.body);
  return res.status(200).json(response);
};

//Logout
export const logout = async (req, res) => {
  res.clearCookie("refreshToken");
  return res.status(200).json({
    err: 0,
    mess: "Logout successfully",
  });
};

export const registerStaff = async (req, res) => {
  const { username, password } = req.body;
  const response = await services.registerStaft(req.body);
  return res.status(200).json(response);
};
