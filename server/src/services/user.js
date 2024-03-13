import nodemailer from "nodemailer";
import ejs from "ejs";
import db from "../models";
import { pagination } from "../middlewares/pagination";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const fs = require("fs");

const deleteAvatarImage = (fileData) => {
  if (fileData?.avatar) {
    for (let i = 0; i < fileData.avatar.length; i++) {
      cloudinary.uploader.destroy(fileData.avatar[i].filename);
    }
  }
};

export const sendMail = () => {
  return new Promise(async (resolve, reject) => {
    try {
      let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GOOGE_APP_EMAIL,
          pass: process.env.GOOGLE_APP_PASSWORD,
        },
      });

      const emailTemplatePath = "src/template/EmailRegister/index.ejs";
      const emailTemplate = fs.readFileSync(emailTemplatePath, "utf-8");

      const compiledTemplate = ejs.compile(emailTemplate);

      const data = {
        subject: "Test Email",
        title: "Hello World",
        content: "This is a test email using Nodemailer and EJS.",
      };

      // Tạo nội dung email từ template
      const html = compiledTemplate(data);

      let mailOptions = {
        from: "Tivas",
        to: `vynmvse170255@fpt.edu.vn`,
        subject: "Confirm received email",
        html: html,
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });

      resolve({
        err: 0,
        mess: "Okk",
      });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

export const getUser = ({ username }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await db.User.findOne({
        where: { username },
        attributes: {
          exclude: ["password", "banStatus", "roleID", "refreshToken"],
        },
        raw: true,
      });
      resolve({
        err: res ? 0 : 1,
        mess: res ? "Successully" : "No user data",
        data: res ? res : null,
      });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

export const getAvatarUser = ({ username }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await db.User.findOne({
        where: { username },
        attributes: {
          exclude: [
            "username",
            "fullName",
            "email",
            "password",
            "phoneNumber",
            "banStatus",
            "roleID",
            "refreshToken",
            "refundHistoryID",
            "avatarPathName",
            "type",
          ],
        },
        raw: true,
      });

      resolve({
        err: res ? 0 : 1,
        mess: res ? "Successully" : "No user data",
        data: res ? res : null,
      });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

export const editUser = ({ username, fullName, numberPhone }, fileData) => {
  return new Promise(async (resolve, reject) => {
    try {
      const userResponse = await db.User.findOne({
        where: {
          username,
        },
      });
      const isEmpty = Object.keys(fileData).length === 0;
      if (userResponse) {
        await db.User.update(
          {
            username,
            fullName,
            numberPhone,
            avatarURL: isEmpty
              ? userResponse.avatarURL
              : fileData?.avatar[0]?.path,
            avatarPathName: isEmpty
              ? userResponse.avatarPathName
              : fileData?.avatar[0]?.filename,
          },
          {
            where: {
              username,
            },
          }
        );
      }
      resolve({
        err: userResponse ? 0 : 1,
        mess: userResponse
          ? "Update successfully."
          : `Can not find User(${username})`,
        // username,
        // fullName,
        // image,
        // numberPhone,
        // avatarURL: fileData.avatar? fileData.avatar[0].path :
        // avatarPathName
      });

      if (!userResponse && fileData) {
        deleteAvatarImage(fileData);
      }
    } catch (err) {
      reject(err);
      console.log(err);
      if (fileData) {
        deleteAvatarImage(fileData);
      }
    }
  });
};

export const getAllUsers = ({ page, limit, orderBy, orderType }) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = [];
      let pageInput = 1;
      const queries = pagination({ page, limit, orderType, orderBy });
      const userResponse = await db.User.findAll({
        where: { roleID: 3 },
        raw: true,
      });
      let countPages = userResponse.length !== 0 ? 1 : 0;
      if (userResponse.length / queries.limit > 1) {
        countPages = Math.ceil(userResponse.length / queries.limit);
      }
      if (page) {
        pageInput = page;
      }
      queries.raw = true;
      queries.nest = true;
      if (pageInput <= countPages) {
        response = await db.User.findAll({
          where: { roleID: 3 },
          attributes: { exclude: ["password"] },
          ...queries,
        });
      }
      resolve({
        err: response.length !== 0 ? 0 : 1,
        message:
          pageInput > countPages
            ? `Can not find any Users in Page (${pageInput}) because there are only (${countPages}) Pages of Users!`
            : response.length === 0
            ? "Can not find any Users!"
            : "Users found.",
        data: response.length !== 0 ? response : null,
        count: response.length !== 0 ? response.length : 0,
        countPages: countPages,
        page: pageInput,
      });
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
};

export const getBankingUser = ({ username }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await db.User.findOne({
        where: { username },
        attributes: {
          exclude: ["password", "banStatus", "roleID", "refreshToken"],
        },
        raw: true,
      });

      const customer = res
        ? await stripe.paymentMethods.list({
            customer: res.refundHistoryID,
            type: "card",
          })
        : null;
      const brand = customer.data[0].card.brand;
      const last4 = customer.data[0].card.last4;
      const exp_month = customer.data[0].card.exp_month;
      const exp_year = customer.data[0].card.exp_year;
      resolve({
        err: res ? 0 : 1,
        mess: res ? "Successfully" : "Failure",
        data: res
          ? {
              username,
              brand,
              last4,
              exp_month,
              exp_year,
            }
          : null,
      });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

export const banUser = ({ id, reasonBan }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await db.User.update(
        { reasonBan, banStatus: 1 },
        { where: { id } }
      );
      resolve({
        err: res ? 0 : 1,
        mess: res ? "Ban this user successfully" : "This user ban failed",
      });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

export const unBanUser = ({ id }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await db.User.update(
        { reasonBan: "", banStatus: 0 },
        { where: { id } }
      );
      resolve({
        err: res ? 0 : 1,
        mess: res ? "Unban this user successfully" : "This user unban failed",
      });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};
