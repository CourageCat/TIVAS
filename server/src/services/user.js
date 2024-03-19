import nodemailer from "nodemailer";
import ejs from "ejs";
import db from "../models";
import { pagination } from "../middlewares/pagination";
import { use } from "passport";
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

export const addWishlist = ({ id, projectID }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const [wishlist, created] = await db.WishList.findOrCreate({
        where: {
          userID: id,
          projectID: projectID,
        },
        defaults: {
          userID: id,
          projectID: projectID
        }
      })
      resolve({
        err: created ? 0 : 1,
        mess: created ? "Add to wishlist success." : "You have already added this project to wishlist!",
        data: created ? wishlist : ""
      })
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

export const viewwishlist = ({ id, page, limit, orderBy, orderType }) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = [];
      let wishListResponse = [];
      let pageInput = 1;
      let countPages = 0;
      let queries = pagination({ page, limit, orderType, orderBy });
      const userResponse = await db.User.findByPk(id);
      if (userResponse) {
        const wistListResponsePagination = await db.WishList.findAll({
          where: {
            userID: id,
          }
        })
        countPages = wistListResponsePagination.length !== 0 ? 1 : 0;
        if (wistListResponsePagination.length / queries.limit > 1) {
          countPages = Math.ceil(wistListResponsePagination.length / queries.limit)
        }
        if (page) {
          pageInput = page
        }
        if (pageInput <= countPages) {
          wishListResponse = await db.WishList.findAll({
            nest: true,
            where: {
              userID: id,
            },
            include: {
              model: db.Project,
              include: {
                model: db.Location,
                attributes: ['id', 'name']
              }
            },
            ...queries,
          })
          if (wishListResponse.length !== 0) {
            for (let i = 0; i < wishListResponse.length; i++) {
              const wishList = {};
              wishList.id = wishListResponse[i].Project.id;
              wishList.name = wishListResponse[i].Project.name;
              wishList.thumbnailPathUrl = wishListResponse[i].Project.thumbnailPathUrl;
              wishList.status = wishListResponse[i].Project.status;
              wishList.buildingStatus = wishListResponse[i].Project.buildingStatus;
              wishList.reservationDate = wishListResponse[i].Project.reservationDate;
              wishList.reservationPrice = wishListResponse[i].Project.reservationPrice;
              wishList.openDate = wishListResponse[i].Project.openDate;
              wishList.closeDate = wishListResponse[i].Project.closeDate;
              wishList.features = wishListResponse[i].Project.features.split(',');
              wishList.attractions = wishListResponse[i].Project.attractions.split(',');
              wishList.locationID = wishListResponse[i].Project.Location.id;
              wishList.location = wishListResponse[i].Project.Location.name;
              if (wishList.id) {
                response.push(wishList);
              }
            }
          }
        }
      }
      resolve({
        err: response.length !== 0 ? 0 : 1,
        mess: !userResponse ?
          `User (${id}) does not exist!`
          : response.length === 0 ? `Can not find any Project of User (${id})'s WishList`
            : `All Projects of User (${id})'s WishList`,
        data: response,
        count: response.length,
        countPages: countPages,
        page: pageInput
      })
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

export const deletewishlist = ({ id, projectID }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const wishList = await db.WishList.destroy({
        where: {
          userID: id,
          projectID: projectID
        }
      })
      resolve({
        err: wishList ? 0 : 1,
        mess: !wishList ? `Project (${projectID}) does not belong to User (${id})!` : "Delete project from wishlist successfully."
      })
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

export const checkProjectWishlist = ({ id, projectID }) => {
  return new Promise(async (resolve, reject) => {
    try {
      let wishListResponse;
      const userResponse = await db.User.findByPk(id);
      const projectResponse = await db.Project.findByPk(projectID);
      if (userResponse && projectResponse) {
        wishListResponse = await db.WishList.findOne({
          where: {
            userID: id,
            projectID,
          }
        })
      }
      resolve({
        err: wishListResponse ? 0 : 1,
        message: !userResponse ?
          `User (${id}) does not exist!`
          : !projectResponse ?
            `Project (${projectID}) does not exist!`
            : !wishListResponse ?
              `Project (${projectID}) does not belong to User (${id})'s wishlist`
              : `Project (${projectID}) belongs to User (${id})'s wishlist`,
        data: !wishListResponse ? false : true
      })
    } catch (error) {
      console.log(error);
      reject(error);
    }
  })
}

export const getHistory = ({
  id,
  status,
  page,
  limit,
  orderBy,
  orderType
}) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = [];
      let pageInput = 1;
      let countPages = 0;
      let queries = pagination({ page, limit, orderType, orderBy });
      const userResponse = await db.User.findByPk(id);
      if (userResponse) {
        const ticketResponsePagination = await db.ReservationTicket.findAll({
          attributes: { exclude: ['createdAt', 'updatedAt'] },
          include: [
            {
              model: db.User,
              attributes: ['id', 'username']
            },
            {
              model: db.Project,
              attributes: ['id', 'name', 'thumbnailPathUrl', 'status'],
              include: {
                model: db.Location,
                attributes: ['id', 'name'],
              }
            },
            {
              model: db.TimeShare,
              attributes: ['id', 'startDate', 'endDate', 'price'],
              include: [
                {
                  model: db.TypeRoom,
                  atributes: ['id', 'name'],
                },

              ]
            },
            (+status === 2 || +status === 3) ?
              {
                model: db.Booking,
                attributes: ['id', 'status', 'createdAt', 'updatedAt'],
                where: parseInt(status) === 2 ? {
                  status: 1
                } : {
                  status: -1
                }
              } : {
                model: db.Booking,
                attributes: ['id', 'status'],
              },
          ],
          where: (+status === 1) ? {
            userID: id,
            status: 1,
            refund: 1,
          } : {
            userID: id,
            status: 2
          }
        })

        countPages = ticketResponsePagination.length !== 0 ? 1 : 0;
        if (ticketResponsePagination.length / queries.limit > 1) {
          countPages = Math.ceil(
            ticketResponsePagination.length / queries.limit
          );
        }
        if (page) {
          pageInput = page;
        }
        if (pageInput <= countPages) {
          const ticketResponse = await db.ReservationTicket.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
              {
                model: db.User,
                attributes: ['id', 'username']
              },
              {
                model: db.Project,
                attributes: ['id', 'name', 'thumbnailPathUrl', 'status'],
                include: {
                  model: db.Location,
                  attributes: ['id', 'name'],
                }
              },
              {
                model: db.TimeShare,
                attributes: ['id', 'startDate', 'endDate', 'price'],
                include: [
                  {
                    model: db.TypeRoom,
                    atributes: ['id', 'name'],
                  },

                ]
              },
              (+status === 2 || +status === 3) ?
                {
                  model: db.Booking,
                  attributes: ['id', 'status', 'createdAt', 'updatedAt'],
                  where: parseInt(status) === 2 ? {
                    status: 1
                  } : {
                    status: -1
                  }
                } : {
                  model: db.Booking,
                  attributes: ['id', 'status'],
                },
            ],
            where: (+status === 1) ? {
              userID: id,
              status: 1,
              refund: 1,
            } : {
              userID: id,
              status: 2
            }
          })
          for (let i = 0; i < ticketResponse.length; i++) {
            const ticket = {}
            ticket.reservationID = ticketResponse[i].id
            ticket.code = ticketResponse[i].code;
            ticket.projectID = ticketResponse[i].Project.id
            ticket.projectName = ticketResponse[i].Project.name;
            ticket.projectThumbnailPathUrl = ticketResponse[i].Project.thumbnailPathUrl;
            ticket.location = ticketResponse[i].Project.Location.name
            if (ticketResponse[i].TimeShare) {
              ticket.typeRoomID = ticketResponse[i].TimeShare.TypeRoom.id
              ticket.typeRoomName = ticketResponse[i].TimeShare.TypeRoom.name
              ticket.timeShareID = ticketResponse[i].TimeShare.id
              ticket.startDate = ticketResponse[i].TimeShare.startDate;
              ticket.endDate = ticketResponse[i].TimeShare.endDate;
              ticket.price = ticketResponse[i].TimeShare.price;
              if (+status === 1) {
                ticket.refund = ticketResponse[i].refund;
                ticket.refundDate = ticketResponse[i].refundDate;
                ticket.bookingTimeShareDate = ticketResponse[i].bookingDate
              }
            } else {
              if (+status === 1) {
                ticket.refund = ticketResponse[i].refund;
                ticket.refundDate = ticketResponse[i].refundDate;
                ticket.reservatedProjectDate = ticketResponse[i].createdAt
              }
            }
            if (+status === 2 || +status === 3) {
              ticket.bookingStatus = ticketResponse[i].Booking.status;
              if (+status === 2) {
                ticket.purchasedSuccessDate = ticketResponse[i].Booking.updatedAt
              }
              if (+status === 3) {
                ticket.purchasedFailedDate = ticketResponse[i].Booking.updatedAt
              }
            }
            response.push(ticket);
          }
        }
      }
      resolve({
        err: (response.length !== 0) ? 0 : 1,
        message: !userResponse ?
          `User (${id}) does not exist!` :
          (response.length === 0) ?
            `Can not find any history of User (${id})!`
            : `User (${id})'s purchased history`,
        data: response,
        count: response.length,
        countPages: countPages,
        page: pageInput
      })
    } catch (error) {
      console.log(error);
      reject(error)
    }
  })
}