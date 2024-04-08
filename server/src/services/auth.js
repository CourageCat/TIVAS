import db from "../models";
import { Op } from "sequelize";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import { createClient } from "redis";

import ejs from "ejs";
import { log } from "console";
const fs = require("fs");

const hashPassword = (password) =>
  bcrypt.hashSync(password, bcrypt.genSaltSync(8));

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      roleID: user.roleID,
    },
    process.env.JWT_ACCESS_KEY,
    { expiresIn: "10s" }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username || null,
      roleID: user.roleID,
    },
    process.env.JWT_REFRESH_KEY,
    { expiresIn: "365d" }
  );
};

export const register = ({
  username,
  fullName,
  email,
  password,
  phoneNumber,
  refundHistoryID,
  roleID = 3,
}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await db.User.create({
        username,
        fullName,
        email,
        password: hashPassword(password),
        phoneNumber,
        refundHistoryID,
        type: "Local",
      });
      const refreshToken = user ? generateRefreshToken(user) : null;
      if (refreshToken) {
        await db.User.update(
          {
            refreshToken,
          },
          {
            where: { id: user.id },
          }
        );
      }
      resolve({
        err: refreshToken ? 0 : 1,
        mess: refreshToken
          ? "Register successfully"
          : "Username or email is already in use",
        refreshToken,
      });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

// Login
export const login = ({ username, email, password }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const object = username ? { username: username } : { email: email };
      const user = await db.User.findOne({
        where: {
          ...object,
        },
        raw: true,
      });
      if (user?.banStatus === 1) {
        resolve({
          err: 1,
          mess: user?.reasonBan,
        });
        return;
      }
      const isChecked =
        user?.type == "Local" && bcrypt.compareSync(password, user.password);
      const accessToken = isChecked ? generateAccessToken(user) : null;
      const refreshToken = isChecked ? generateRefreshToken(user) : null;

      if (refreshToken) {
        await db.User.update(
          {
            refreshToken: refreshToken,
          },
          {
            where: { id: user.id },
          }
        );
      }

      resolve({
        err: accessToken ? 0 : 1,
        mess: accessToken
          ? "Login successfully"
          : "Account or password not invalid!",
        data: accessToken
          ? {
              id: user.id,
              username: user.username,
              type: user?.type,
              roleID: user.roleID,
            }
          : null,
        accessToken: `Bearer ${accessToken}`,
        refreshToken,
      });
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
};

export const loginGoogle = ({ email, roleID = 3 }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await db.User.findOne({
        where: {
          email,
        },
        raw: true,
      });
      if (user?.banStatus === 1) {
        resolve({
          err: 1,
          mess: user?.reasonBan,
        });
        return;
      }
      const accessToken =
        user?.type === "Google" ? generateAccessToken(user) : null;
      const refreshToken =
        user?.type === "Google" ? generateRefreshToken(user) : null;

      if (refreshToken) {
        await db.User.update(
          {
            refreshToken,
          },
          {
            where: { id: user.id },
          }
        );
      }

      // Google account is not registered
      if (!user) {
        resolve({
          err: accessToken ? 0 : 1,
          mess: accessToken
            ? "Login successfully"
            : "Email was used in account of system",
          data: accessToken
            ? {
                id: user.id,
                username: user.username || null,
                roleID: user.roleID || roleID,
              }
            : null,
          accessToken: `Bearer ${accessToken}`,
          refreshToken,
          register: user ? true : false,
          registerGoogle: {
            mess: !user
              ? "Please fill in all information to register with your google account"
              : "",
            email: !user ? email : "",
          },
        });
      } else {
        resolve({
          err: accessToken ? 0 : 1,
          mess: accessToken
            ? "Login successfully"
            : "Email was used in account of system",
          data: accessToken
            ? {
                id: user.id,
                username: user.username || null,
                roleID: user.roleID || roleID,
                type: user?.type,
              }
            : null,
          accessToken: `Bearer ${accessToken}`,
          refreshToken,
          register: user ? true : false,
        });
      }
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
};

// export const registerGoogle = ({})

export const refreshToken = ({ refreshToken }) => {
  return new Promise(async (resolve, reject) => {
    try {
      jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_KEY,
        async (err, user) => {
          if (err) {
            console.log(err);
          } else {
            const res = await db.User.findOne({
              where: { id: user.id },
              raw: true,
            });
            const newAccessToken = res?.refreshToken
              ? generateAccessToken(user)
              : null;
            const newRefreshToken = res?.refreshToken
              ? generateRefreshToken(user)
              : null;
            if (res.refreshToken) {
              await db.User.update(
                {
                  refreshToken: newRefreshToken,
                },
                {
                  where: { id: user.id },
                }
              );
            }
            resolve({
              err: res.refreshToken ? 0 : 1,
              newRefreshToken,
              newAccessToken: `Bearer ${newAccessToken}`,
            });
          }
        }
      );
    } catch (err) {
      reject(err);
    }
  });
};

export const sendCodeEmail = ({ email }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const timeEmail = 300000;
      const client = createClient();
      await client.connect();

      const user = await db.User.findOne({
        where: { email },
        raw: true,
      });

      if (!user) {
        const digit1 = Math.floor(Math.random() * 10);
        const digit2 = Math.floor(Math.random() * 10);
        const digit3 = Math.floor(Math.random() * 10);
        const digit4 = Math.floor(Math.random() * 10);

        const combinedNumber =
          digit1 * 1000 + digit2 * 100 + digit3 * 10 + digit4;

        let transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.GOOGE_APP_EMAIL,
            pass: process.env.GOOGLE_APP_PASSWORD,
          },
        });

        const emailTemplatePath = "src/template/EmailRegister/index.ejs";
        const emailTemplate = fs.readFileSync(emailTemplatePath, "utf-8");

        const data = {
          email,
          digit1,
          digit2,
          digit3,
          digit4,
        };

        const renderedHtml = ejs.render(emailTemplate, data);

        let mailOptions = {
          from: "Tivas",
          to: `${email}`,
          subject: "Confirm received email",
          html: renderedHtml,
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log("Email sent: " + info.response);
          }
        });

        await client.setEx(
          email,
          timeEmail / 1000,
          JSON.stringify(combinedNumber)
        );
      }

      resolve({
        err: user ? 1 : 0,
        mess: user
          ? "This email already exists"
          : "Please check the code in the email",
        email: "",
        time: user ? null : timeEmail,
      });
    } catch (err) {
      reject(err);
    }
  });
};

export const checkRegister = ({ email, otp }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const client = createClient();
      await client.connect();

      const otpRedis = await client.get(email);
      const isChecked = otpRedis && otpRedis === otp ? true : false;
      resolve({
        err: isChecked ? 0 : 1,
        mess: isChecked ? "Successfully" : "Please check the code again!",
        email: isChecked ? email : "",
      });
    } catch (err) {
      reject(err);
    }
  });
};

export const checkUserName = ({ username }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await db.User.findOne({
        where: { username },
        raw: true,
      });
      resolve({
        err: user ? 1 : 0,
        mess: user ? "User Name already exists " : "",
      });
    } catch (err) {
      reject(err);
    }
  });
};

export const registerGoogle = ({
  username,
  email,
  fullName,
  phoneNumber,
  refundHistoryID,
}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await db.User.create({
        username,
        fullName,
        phoneNumber,
        email,
        refundHistoryID,
        type: "Google",
        roleID: 3,
      });

      const accessToken = user ? generateAccessToken(user) : null;
      const refreshToken = user ? generateRefreshToken(user) : null;
      if (refreshToken) {
        await db.User.update(
          {
            refreshToken,
          },
          {
            where: { id: user.id },
          }
        );
      }

      resolve({
        err: accessToken ? 0 : 1,
        mess: accessToken
          ? "Login successfully"
          : "Email was used in account of system",
        data: accessToken
          ? {
              id: user.id,
              username: user.username || null,
              roleID: user.roleID || roleID,
            }
          : null,
        accessToken: `Bearer ${accessToken}`,
        refreshToken,
        username: !user ? username : "",
      });
    } catch (err) {
      console.log("Error: ", err);
      reject(err);
    }
  });
};

export const sendCodeForgotPassword = ({ email }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const timeEmail = 300000;
      const client = createClient();
      await client.connect();

      const user = await db.User.findOne({
        where: { email, type: "Local" },
        raw: true,
      });

      if (user) {
        const digit1 = Math.floor(Math.random() * 10);
        const digit2 = Math.floor(Math.random() * 10);
        const digit3 = Math.floor(Math.random() * 10);
        const digit4 = Math.floor(Math.random() * 10);

        const combinedNumber =
          digit1 * 1000 + digit2 * 100 + digit3 * 10 + digit4;

        let transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.GOOGE_APP_EMAIL,
            pass: process.env.GOOGLE_APP_PASSWORD,
          },
        });

        const emailTemplatePath = "src/template/EmailRegister/index.ejs";
        const emailTemplate = fs.readFileSync(emailTemplatePath, "utf-8");

        const data = {
          email,
          digit1,
          digit2,
          digit3,
          digit4,
        };

        const renderedHtml = ejs.render(emailTemplate, data);

        let mailOptions = {
          from: "Tivas",
          to: `${email}`,
          subject: "Confirm received email",
          html: renderedHtml,
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log("Email sent: " + info.response);
          }
        });

        await client.setEx(
          `${email}_forgotPassword`,
          timeEmail / 1000,
          JSON.stringify(combinedNumber)
        );
      }

      resolve({
        err: user ? 0 : 1,
        mess: user
          ? "Please check the code in the email"
          : "This email does not exists",

        email: "",
        time: user ? null : timeEmail,
      });
    } catch (err) {
      reject(err);
    }
  });
};

export const resetPassword = ({ email, newPassword }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const password = hashPassword(newPassword);
      const res = await db.User.update(
        { password },
        {
          where: { email, type: "Local" },
        }
      );
      resolve({
        err: res[0] === 1 ? 0 : 1,
        mess: res[0] === 1 ? "Successfully" : "Please check email again!",
      });
    } catch (err) {
      reject(err);
    }
  });
};

export const checkResetPassword = ({ email, otp }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const client = createClient();
      await client.connect();

      const otpRedis = await client.get(`${email}_forgotPassword`);
      const isChecked = otpRedis && otpRedis === otp ? true : false;
      resolve({
        err: isChecked ? 0 : 1,
        mess: isChecked ? "Successfully" : "Please check the code again!",
        email: isChecked ? email : "",
      });
    } catch (err) {
      reject(err);
    }
  });
};

export const registerStaft = ({ username, password }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const [user, created] = await db.User.findOrCreate({
        where: { username },
        defaults: {
          username,
          password: hashPassword(password),
          roleID: 2,
          type: "Local",
        },
      });
      const refreshToken = created ? generateRefreshToken(user) : null;
      if (refreshToken) {
        await db.User.update(
          {
            refreshToken,
          },
          {
            where: { id: user.id },
          }
        );
      }
      resolve({
        err: refreshToken ? 0 : 1,
        mess: refreshToken
          ? "Register successfully"
          : "Username of staff exits",
        refreshToken,
      });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};
