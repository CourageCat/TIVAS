import db, { Sequelize } from "../models";
const cloudinary = require("cloudinary").v2;
import "dotenv/config";
import { Model, Op, fn, col, literal, where } from "sequelize";
const nodemailer = require("nodemailer");
import ejs from "ejs";
import { log } from "console";
const fs = require("fs");
import { pagination } from "../middlewares/pagination";


function formatDate(date) {
    // Ensure 'date' is a valid Date object
    if (!(date instanceof Date)) {
        date = new Date(date);
    }

    // Get day, month, and year
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based
    const year = date.getFullYear();

    // Create the formatted date string
    const formattedDate = `${day}/${month}/${year}`;

    return formattedDate;
}

export const paymentReservation = (username) => {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await db.User.findOne({
                where: { username },
                raw: true,
            });
            resolve({
                err: res ? 0 : 1,
                mess: res ? "Successfully" : "Faile",
                data: res ? res : null,
            });
        } catch (err) {
            reject(err);
        }
    });
};

export const createTicket = ({
    userID,
    projectID
}, code) => {
    return new Promise(async (resolve, reject) => {
        try {
            let Message = [];
            let check;
            const projectResponse = await db.Project.findByPk(projectID);
            if (projectResponse.status === 1) {
                const user = await db.User.findOne({
                    where: {
                        id: userID
                    }
                })
                check = await db.ReservationTicket.create({
                    code: code,
                    status: 1,
                    userID,
                    projectID,
                    timeshareID: null,
                    refund: 0,
                })
                let transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.GOOGE_APP_EMAIL,
                        pass: process.env.GOOGLE_APP_PASSWORD,
                    },
                });
                let mailOptions = {
                    from: "Tivas",
                    to: `${user.email}`,
                    subject: "Confirm received email",
                    text: `Your reservation ticket code is ${code}`
                };
                await transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log("Email sent: " + info.response);
                    }
                });
                Message.push("Create Success")
            }
            else {
                Message.push(`Project (${projectID}) is not open for buying Reservation Ticket!`);
            }

            // const [ticket,created] = await db.ReservationTicket.findOrCreate({
            //     where : { code : 1 },
            //     default : {
            //         code : code,
            //         status : 0,
            //         userID,
            //         projectID
            //     }
            // })

            resolve({
                err: check ? 0 : 1,
                mess: check ? Message[0] : Message[0],
            })
            // resolve({
            //     err : ticket ? 0 : 1,
            //     mess : ticket ? "Success" : "Your reservation ticket create fail",
            // })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

// export const activeTicket = (id) => {
//     return new Promise(async (resolve, reject) => {
//         try {
//             const ticket = await db.ReservationTicket.findOne({
//                 where: {
//                     id: id
//                 }
//             })
//             const [check, t] = await db.ReservationTicket.update({
//                 status: 1
//             }, {
//                 where: {
//                     id: id
//                 }, returning: true
//             })
//             if (t === 1) {
//                 const user = await db.User.findOne({
//                     where: {
//                         id: ticket.userID
//                     }
//                 })
//                 let transporter = nodemailer.createTransport({
//                     service: "gmail",
//                     auth: {
//                         user: process.env.GOOGE_APP_EMAIL,
//                         pass: process.env.GOOGLE_APP_PASSWORD,
//                     },
//                 });
//                 let mailOptions = {
//                     from: "Tivas",
//                     to: `${user.email}`,
//                     subject: "Confirm received email",
//                     text: `Your ticket ${ticket.code} is active now`
//                 };
//                 await transporter.sendMail(mailOptions, function (error, info) {
//                     if (error) {
//                         console.log(error);
//                     } else {
//                         console.log("Email sent: " + info.response);
//                     }
//                 });
//             }
//             resolve({
//                 err: t ? 0 : 1,
//                 mess: t ? "Your ticket active success" : "Your ticket active fail"
//             })
//         } catch (error) {
//             console.log(error);
//             reject(error);
//         }
//     })
// }

// export const checkTicket = ({
//     code,
//     userID
// }) => {
//     return new Promise(async (resolve, reject) => {
//         try {
//             let ticketResponse;
//             let userTicketResponse;
//             const userResponse = await db.User.findByPk(userID);
//             if (userResponse) {
//                 ticketResponse = await db.ReservationTicket.findOne({
//                     where: {
//                         code,
//                     }
//                 })
//                 console.log(ticketResponse);
//                 if (ticketResponse) {
//                     if (ticketResponse.status === 1) {
//                         userTicketResponse = await db.ReservationTicket.findOne({
//                             where: {
//                                 code,
//                                 userID,
//                             }
//                         })
//                     }
//                 }
//             }
//             resolve({
//                 err: userTicketResponse ? 0 : 1,
//                 message: !userResponse ?
//                     `Can not find User (${userID})!` :
//                     !ticketResponse ?
//                         `Ticket (${code}) does not exist!`
//                         : ticketResponse.status !== 1 ?
//                             `Ticket (${code}) does not activate!`
//                             : !userTicketResponse ?
//                                 `Ticket (${code}) does not belong to User (${userID})!` :
//                                 `Valid ticket.`,
//                 data: userTicketResponse ? `Your code: ${code}` : null
//             })
//         } catch (error) {
//             console.log(error);
//             reject(error)
//         }
//     });
// }

//1 nguoi ap 1 code cho 1 TimeShare
export const createReservation = ({
    code,
    timeShareID,
    userID,
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let userTicketResponse;
            let ticketDuplicated;
            let userUsedTicket;
            let reservationResponse;
            let timeShareBelongsToProject;
            let projectResponse;
            const userResponse = await db.User.findByPk(userID);
            const ticketResponse = await db.ReservationTicket.findOne({
                where: {
                    code,
                }
            })
            const timeShareResponse = await db.TimeShare.findByPk(timeShareID);
            if (userResponse && ticketResponse && timeShareResponse) {
                projectResponse = await db.Project.findOne({
                    include: {
                        model: db.TypeOfProject,
                        required: true,
                        include: {
                            model: db.TypeRoom,
                            required: true,
                            include: {
                                model: db.TimeShare,
                                required: true,
                                where: {
                                    id: timeShareID,
                                }
                            }
                        }
                    }
                })
                if (projectResponse.status === 2) {
                    timeShareBelongsToProject = (projectResponse.id === ticketResponse.projectID);
                    if (timeShareBelongsToProject === true) {
                        //if (ticketResponse.status === 1) {
                        userTicketResponse = await db.ReservationTicket.findOne({
                            where: {
                                code,
                                userID,
                            }
                        })
                        if (userTicketResponse) {
                            ticketDuplicated = await db.ReservationTicket.findOne({
                                where: {
                                    code,
                                    timeShareID,
                                }
                            })
                            if (!ticketDuplicated) {
                                userUsedTicket = await db.ReservationTicket.findOne({
                                    where: {
                                        userID: ticketResponse.userID,
                                        timeShareID,
                                    }
                                })
                                if (!userUsedTicket) {
                                    reservationResponse = await db.ReservationTicket.update({
                                        timeShareID,
                                    }, {
                                        where: {
                                            code,
                                        }
                                    })
                                    await db.ReservationTicket.update({
                                        bookingDate: userTicketResponse.updatedAt,
                                    }, {
                                        where: {
                                            code,
                                        }
                                    })

                                }
                            }
                        }
                        //}
                    }
                }
            }

            resolve({
                err: reservationResponse ? 0 : 1,
                message: !userResponse ?
                    `Can not find User (${userID})!`
                    : !timeShareResponse ?
                        `TimeShare (${timeShareID}) does not exist!`
                        : !ticketResponse ?
                            `Ticket (${code}) does not exist!`
                            : projectResponse.status !== 2 ?
                                `Project (${projectResponse.id}) is not open for reservation!`
                                : !timeShareBelongsToProject ?
                                    `TimeShare (${timeShareID}) does not belong to Project which is registerd in Ticket (${code})`
                                    : !userTicketResponse ?
                                        `Ticket (${code}) does not belong to User (${userID})!`
                                        : ticketDuplicated ?
                                            `TimeShare (${timeShareID}) has already registerd with the ticket (${code})!`
                                            : userUsedTicket ?
                                                `Can not use two or more tickets to register one TimeShare! (User (${ticketResponse.userID}) has already used one ticket to register TimeShare(${timeShareID}))`
                                                : 'Create successfully.',
            })
        }
        catch (error) {
            console.log(error);
            reject(error);
        }
    })
}


//1 nguoi ap 2 code cho 1 TimeShare
// export const createReservation = ({
//     code,
//     timeShareID,
// }) => {
//     return new Promise(async (resolve, reject) => {
//         try {
//             let ticketDuplicated;
//             const ticketResponse = await db.ReservationTicket.findOne({
//                 where: {
//                     code,
//                 }
//             })
//             const timeShareResponse = await db.TimeShare.findByPk(timeShareID);
//             console.log(code);
//             console.log(timeShareID);
//             if (ticketResponse && timeShareResponse) {
//                 ticketDuplicated = await db.ReservationTicket.findOne({
//                     where: {
//                         code,
//                         timeShareID,
//                     }
//                 })
//                 if (!ticketDuplicated) {
//                     await db.ReservationTicket.update({
//                         timeShareID,
//                     }, {
//                         where: {
//                             code,
//                         }
//                     })
//                 }
//             }
//             resolve({
//                 err: !ticketDuplicated ? 0 : 1,
//                 message: !ticketResponse ?
//                     `Ticket (${code}) does not exist!`
//                     : !timeShareResponse ?
//                         `TimeShare (${timeShareID}) does not exist!`
//                         : ticketDuplicated ?
//                             `TimeShare (${timeShareID}) has already registerd with the ticket (${code})`
//                             : 'Create successfully.',
//             })
//         } catch (error) {
//             console.log(error);
//             reject(error);
//         }
//     })
// }

export const checkPriority = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const project = await db.Project.update({
                status: 3
            }, {
                where: {
                    id
                }
            })

            // Fetch records that need to be updated
            const timeSharesToUpdate = await db.TimeShare.findAll({
                include: [
                    {
                        model: db.TypeRoom,
                        required: true,
                        include: {
                            model: db.TypeOfProject,
                            required: true,
                            as: 'TypeOfProject',
                            where: {
                                projectID: id,
                            },
                        },
                    },
                ],
            });

            // Perform updates in memory
            timeSharesToUpdate.forEach((timeShare) => {
                timeShare.saleStatus = 0;
            });

            // Save changes back to the database
            await Promise.all(timeSharesToUpdate.map((timeShare) => timeShare.save()));

            const ticketResponse = await db.ReservationTicket.findAll({
                include: [
                    {
                        model: db.User,
                        attributes: ['id', 'username', 'email']
                    },
                    {
                        model: db.Project,
                        attributes: ['id', 'name']
                    },
                    {
                        model: db.TimeShare,
                        atributes: ['id', 'startDate', 'endDate'],
                        include: {
                            model: db.TypeRoom,
                            attributes: ['id', 'name']
                        }
                    },
                ],
                where: {
                    projectID: id,
                    timeShareID: {
                        [Op.ne]: null
                    },
                    status: 1
                }
            })
            const result = Object.groupBy(ticketResponse, ({ timeShareID }) => timeShareID)
            let count1 = 0
            for (let properties in result) {
                count1 = count1 + 1
            }
            for (let i = 0; i < count1; i++) {
                const quantityTimeshare = await db.TimeShare.findByPk(Object.getOwnPropertyNames(result)[i])
                for (let x = 0; x < quantityTimeshare.quantity; x++) {
                    const reservation = result[Object.getOwnPropertyNames(result)[i]][x]
                    if (reservation) {
                        await db.ReservationTicket.update({
                            status: 2
                        }, {
                            where: {
                                id: result[Object.getOwnPropertyNames(result)[i]][x].dataValues.id
                            }
                        })
                        await db.TimeShare.decrement({
                            quantity: 1
                        }, {
                            where: {
                                id: result[Object.getOwnPropertyNames(result)[i]][x].dataValues.timeShareID
                            }
                        })
                        const timeShare = reservation.TimeShare;
                        const user = reservation.User
                        const project = reservation.Project
                        const startDateDB = new Date(timeShare.updatedAt);
                        const endDateDB = timeShare.updatedAt;
                        endDateDB.setDate(endDateDB.getDate() + 7);
                        await db.Booking.create({
                            startDate: startDateDB,
                            endDate: endDateDB,
                            status: 0,
                            priceBooking: timeShare.price - reservation.reservationPrice,
                            reservationTicketID: reservation.id,
                        })
                        let transporter = nodemailer.createTransport({
                            service: "gmail",
                            auth: {
                                user: process.env.GOOGE_APP_EMAIL,
                                pass: process.env.GOOGLE_APP_PASSWORD,
                            },
                        });
                        const emailTemplatePath = "src/template/EmailWinner/index.ejs";
                        const emailTemplate = fs.readFileSync(emailTemplatePath, "utf-8");

                        const data = {
                            email: user.email,
                            projectName: project.name,
                            typeRoomName: timeShare.TypeRoom.name,
                            startDate: formatDate(timeShare.startDate),
                            endDate: formatDate(timeShare.endDate),
                            reservationPrice: reservation.reservationPrice,
                            timeSharePrice: timeShare.price,
                            bookingPrice: timeShare.price - reservation.reservationPrice
                        };

                        const renderedHtml = ejs.render(emailTemplate, data);

                        let mailOptions = {
                            from: "Tivas",
                            to: `${user.email}`,
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
                    }

                }
            }
            // const {count , rows} = await db.ReservationTicket.findAndCountAll({
            //     where : {
            //         status : 2
            //     }
            // })

            resolve({
                err: (ticketResponse && ticketResponse.length !== 0) ? 0 : 1,
                mess: (ticketResponse && ticketResponse.length !== 0) ? "Success" : "Fail (No ReservationTickets to check in DB)"
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getTimeSharePriority = (userID) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userResponse = await db.User.findByPk(userID);
            let timeSharePriority = [];
            let reservationTicketResponse;
            if (userResponse) {
                reservationTicketResponse = await db.ReservationTicket.findAll({
                    where: {
                        userID,
                        status: 2,
                    }
                })
                if (reservationTicketResponse && reservationTicketResponse.length !== 0) {
                    for (let i = 0; i < reservationTicketResponse.length; i++) {
                        console.log(reservationTicketResponse[i]);
                        const timeShareResponse = await db.TimeShare.findByPk(reservationTicketResponse[i].timeShareID,
                            {
                                nest: true,
                                raw: true,
                                attributes: ['id', 'price', 'startDate', 'endDate', 'saleStatus', 'createdAt'],
                                include: {
                                    model: db.TypeRoom,
                                    attributes: ['name', 'persons'],
                                    include: {
                                        model: db.TypeOfProject,
                                        attributes: ['id'],
                                        include: {
                                            model: db.Project,
                                            attributes: ['name', 'thumbnailPathUrl', 'locationID']
                                        }
                                    }
                                },
                            });
                        if (timeShareResponse) {
                            console.log(timeShareResponse);
                            const location = await db.Location.findByPk(timeShareResponse.TypeRoom.TypeOfProject.Project.locationID)
                            timeShareResponse.TypeRoom.TypeOfProject.Project.location = location.name;
                            timeSharePriority.push(timeShareResponse);
                        }
                    }
                }
            }
            resolve({
                err: timeSharePriority.length !== 0 ? 0 : 1,
                message: !userResponse ?
                    `User (${userID}) does not exist!`
                    : (!reservationTicketResponse || reservationTicketResponse.length === 0) ?
                        `User (${userID}) does not have any TimeShare Priority after checking priority in the DB!`
                        : timeSharePriority.length === 0 ?
                            'Can not find any TimeShares!'
                            : `TimeShares Priority of User (${userID}) found`,
                data: timeSharePriority.length !== 0 ? timeSharePriority : null,
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getUserTickets = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userResponse = await db.User.findByPk(id);
            let ticketResponse = [];
            if (userResponse) {
                ticketResponse = await db.ReservationTicket.findAll({
                    attributes: ['id', 'code', 'status', 'projectID', 'timeShareID'],
                    raw: true,
                    where: {
                        userID: id,
                    }
                })
                if (ticketResponse.length !== 0) {
                    for (let i = 0; i < ticketResponse.length; i++) {
                        const projectResponse = await db.Project.findByPk(ticketResponse[i].projectID);
                        ticketResponse[i].projectName = projectResponse.name;
                        const timeShareResponse = await db.TimeShare.findByPk(ticketResponse[i].timeShareID, {
                            include: {
                                model: db.TypeRoom
                            }
                        });
                        ticketResponse[i].typeRoomID = timeShareResponse.TypeRoom.id
                        ticketResponse[i].typeRoomName = timeShareResponse.TypeRoom.name
                        ticketResponse[i].startDate = timeShareResponse.startDate;
                        ticketResponse[i].endDate = timeShareResponse.endDate;
                    }
                }
            }
            resolve({
                err: (ticketResponse.length !== 0) ? 0 : 1,
                message: !userResponse ?
                    `User (${id}) does not exist!`
                    : ticketResponse.length === 0 ?
                        `User (${id}) does not have any reservation ticket!`
                        : `User (${id})'s tickets`,
                data: ticketResponse.length !== 0 ? ticketResponse : null,
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getUserBuyTickets = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const projectResponse = await db.Project.findByPk(id);
            let ticketResponse = [];
            const response = [];
            if (projectResponse) {
                ticketResponse = await db.ReservationTicket.findAll({
                    raw: true,
                    where: {
                        projectID: id,
                    }
                })
                if (ticketResponse.length !== 0) {
                    const result = Object.groupBy(ticketResponse, ({ userID }) => userID)
                    let count1 = 0
                    for (let properties in result) {
                        count1 = count1 + 1
                    }
                    for (let i = 0; i < count1; i++) {
                        const userResponse = await db.User.findByPk(Object.getOwnPropertyNames(result)[i]);
                        response.push(userResponse);
                    }
                }
            }

            resolve({
                err: response.length !== 0 ? 0 : 1,
                message: !projectResponse ?
                    `Project (${id}) does not exist!`
                    : ticketResponse.length === 0 ?
                        `Can not find any Users have the reservation with Project(${id})!`
                        : `All Users have the reservation with Project(${id}).`,
                data: response.length !== 0 ? response : 0
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getAllUserNoPriorityByAdmin = (id, {
    page,
    limit,
    orderBy,
    orderType
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = [];
            let ticketResponse = [];
            let pageInput = 1;
            let countPages = 0;
            let queries = pagination({ page, limit, orderType, orderBy });

            const projectResponse = await db.Project.findByPk(id);
            if (projectResponse) {
                if (projectResponse.status === 3) {
                    const ticketResponsePagination = await db.ReservationTicket.findAll({
                        nest: true,
                        raw: true,
                        attributes: ['id', 'userID', 'projectID', 'timeShareID', 'refund'],
                        include: [
                            {
                                model: db.User,
                                attributes: ['id', 'username']
                            },
                            {
                                model: db.Project,
                                attributes: ['id', 'name', 'thumbnailPathUrl'],
                                include: {
                                    model: db.Location,
                                    attributes: ['id', 'name'],
                                }
                            },
                            {
                                model: db.TimeShare,
                                attributes: ['id', 'startDate', 'endDate'],
                                include: {
                                    model: db.TypeRoom,
                                    atributes: ['id', 'name'],
                                }
                            },
                        ],
                        where: {
                            projectID: id,
                            status: 1,
                        }
                    })
                    countPages = ticketResponsePagination.length !== 0 ? 1 : 0;
                    if (ticketResponsePagination.length / queries.limit > 1) {
                        countPages = Math.ceil(ticketResponsePagination.length / queries.limit)
                    }
                    if (page) {
                        pageInput = page
                    }
                    if (pageInput <= countPages) {
                        console.log(123);
                        ticketResponse = await db.ReservationTicket.findAll({
                            nest: true,
                            raw: true,
                            attributes: ['id', 'userID', 'projectID', 'timeShareID', 'refund'],
                            include: [
                                {
                                    model: db.User,
                                    attributes: ['id', 'username']
                                },
                                {
                                    model: db.Project,
                                    attributes: ['id', 'name', 'thumbnailPathUrl'],
                                    include: {
                                        model: db.Location,
                                        attributes: ['id', 'name'],
                                    }
                                },
                                {
                                    model: db.TimeShare,
                                    attributes: ['id', 'startDate', 'endDate'],
                                    include: {
                                        model: db.TypeRoom,
                                        atributes: ['id', 'name'],
                                    }
                                },
                            ],
                            where: {
                                projectID: id,
                                status: 1,
                            },
                            ...queries,
                        })
                        if (ticketResponse.length !== 0) {
                            for (let i = 0; i < ticketResponse.length; i++) {
                                const ticket = {};
                                ticket.reservationID = ticketResponse[i].id
                                ticket.userID = ticketResponse[i].User.id;
                                ticket.username = ticketResponse[i].User.username;
                                ticket.projectID = ticketResponse[i].Project.id
                                ticket.projectName = ticketResponse[i].Project.name;
                                ticket.projectThumbnailPathUrl = ticketResponse[i].Project.thumbnailPathUrl;
                                ticket.location = ticketResponse[i].Project.Location.name;
                                ticket.typeRoomID = ticketResponse[i].TimeShare.TypeRoom.id
                                ticket.typeRoomName = ticketResponse[i].TimeShare.TypeRoom.name
                                ticket.timeShareID = ticketResponse[i].TimeShare.id
                                ticket.startDate = ticketResponse[i].TimeShare.startDate;
                                ticket.endDate = ticketResponse[i].TimeShare.endDate;
                                ticket.refund = ticketResponse[i].refund;
                                if (ticket.projectID) {
                                    response.push(ticket);
                                }
                            }
                        }
                    }
                }
            }
            resolve({
                err: response.length !== 0 ? 0 : 1,
                message: !projectResponse ?
                    `Project (${id}) does not exist!`
                    : projectResponse.status !== 3 ?
                        `Project (${id}) is not on checkPriority Stage!`
                        : response.length === 0 ?
                            `Can not find any Users have no Priority with Project(${id})!`
                            : `All Users have no Priority with Project(${id}).`,
                data: response,
                count: response.length,
                countPages: countPages,
                page: pageInput
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getAllUserPriorityByAdmin = (id, {
    page,
    limit,
    orderBy,
    orderType
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = [];
            let ticketResponse = [];
            let pageInput = 1;
            let countPages = 0;
            let queries = pagination({ page, limit, orderType, orderBy });
            const projectResponse = await db.Project.findByPk(id);
            if (projectResponse) {
                if (projectResponse.status === 3) {
                    const ticketResponsePagination = await db.ReservationTicket.findAll({
                        nest: true,
                        raw: true,
                        attributes: ['id', 'userID', 'projectID', 'timeShareID'],
                        include: [
                            {
                                model: db.User,
                                attributes: ['id', 'username']
                            },
                            {
                                model: db.Project,
                                attributes: ['id', 'name', 'thumbnailPathUrl'],
                                include: {
                                    model: db.Location,
                                    attributes: ['id', 'name'],
                                }
                            },
                            {
                                model: db.TimeShare,
                                attributes: ['id', 'startDate', 'endDate'],
                                include: {
                                    model: db.TypeRoom,
                                    atributes: ['id', 'name'],
                                }
                            },
                            {
                                model: db.Booking,
                                attributes: ['id', 'status'],
                            },
                        ],
                        where: {
                            projectID: id,
                            status: 2,
                        }
                    })
                    countPages = ticketResponsePagination.length !== 0 ? 1 : 0;
                    if (ticketResponsePagination.length / queries.limit > 1) {
                        countPages = Math.ceil(ticketResponsePagination.length / queries.limit)
                    }
                    if (page) {
                        pageInput = page
                    }
                    if (pageInput <= countPages) {
                        ticketResponse = await db.ReservationTicket.findAll({
                            nest: true,
                            raw: true,
                            attributes: ['id', 'userID', 'projectID', 'timeShareID'],
                            include: [
                                {
                                    model: db.User,
                                    attributes: ['id', 'username']
                                },
                                {
                                    model: db.Project,
                                    attributes: ['id', 'name', 'thumbnailPathUrl'],
                                    include: {
                                        model: db.Location,
                                        attributes: ['id', 'name'],
                                    }
                                },
                                {
                                    model: db.TimeShare,
                                    attributes: ['id', 'startDate', 'endDate'],
                                    include: {
                                        model: db.TypeRoom,
                                        atributes: ['id', 'name'],
                                    }
                                },
                                {
                                    model: db.Booking,
                                    attributes: ['id', 'status'],
                                },
                            ],
                            where: {
                                projectID: id,
                                status: 2,
                            },
                            ...queries,
                        })
                        if (ticketResponse.length !== 0) {
                            for (let i = 0; i < ticketResponse.length; i++) {
                                const ticket = {};
                                ticket.reservationID = ticketResponse[i].id
                                ticket.userID = ticketResponse[i].User.id;
                                ticket.username = ticketResponse[i].User.username;
                                ticket.projectID = ticketResponse[i].Project.id
                                ticket.projectName = ticketResponse[i].Project.name;
                                ticket.projectThumbnailPathUrl = ticketResponse[i].Project.thumbnailPathUrl;
                                ticket.location = ticketResponse[i].Project.Location.name;
                                ticket.typeRoomID = ticketResponse[i].TimeShare.TypeRoom.id
                                ticket.typeRoomName = ticketResponse[i].TimeShare.TypeRoom.name
                                ticket.timeShareID = ticketResponse[i].TimeShare.id
                                ticket.startDate = ticketResponse[i].TimeShare.startDate;
                                ticket.endDate = ticketResponse[i].TimeShare.endDate;
                                ticket.bookingStatus = ticketResponse[i].Booking.status;
                                if (ticket.projectID) {
                                    response.push(ticket);
                                }
                            }
                        }
                    }
                }
            }
            resolve({
                err: response.length !== 0 ? 0 : 1,
                message: !projectResponse ?
                    `Project (${id}) does not exist!`
                    : projectResponse.status !== 3 ?
                        `Project (${id}) is not on checkPriority Stage!`
                        : response.length === 0 ?
                            `Can not find any Users have Priority with Project(${id})!`
                            : `All Users have Priority with Project(${id}).`,
                data: response,
                count: response.length,
                countPages: countPages,
                page: pageInput
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getAllUserNoPriorityByStaff = ({ id, userID, page, limit, orderBy, orderType }) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = [];
            let ticketResponse = [];
            let pageInput = 1;
            let countPages = 0;
            let queries = pagination({ page, limit, orderType, orderBy });
            const projectResponse = await db.Project.findByPk(id);
            const userResponse = await db.User.findByPk(userID, {
                include: {
                    model: db.RoleCode,
                }
            });
            if (projectResponse && userResponse && userResponse.RoleCode.roleName === 'Staff') {
                if (projectResponse.status === 3) {
                    const ticketResponsePagination = await db.ReservationTicket.findAll({
                        nest: true,
                        raw: true,
                        attributes: ['id', 'userID', 'projectID', 'timeShareID', 'refund'],
                        include: [
                            {
                                model: db.User,
                                attributes: ['id', 'username']
                            },
                            {
                                model: db.Project,
                                attributes: ['id', 'name', 'thumbnailPathUrl'],
                                include: {
                                    model: db.Location,
                                    attributes: ['id', 'name'],
                                }
                            },
                            {
                                model: db.TimeShare,
                                attributes: ['id', 'startDate', 'endDate'],
                                include: {
                                    model: db.TypeRoom,
                                    atributes: ['id', 'name'],
                                },
                                where: {
                                    userID,
                                }
                            },
                        ],
                        where: {
                            projectID: id,
                            status: 1,
                        }
                    })
                    console.log(ticketResponsePagination);
                    countPages = ticketResponsePagination.length !== 0 ? 1 : 0;
                    if (ticketResponsePagination.length / queries.limit > 1) {
                        countPages = Math.ceil(ticketResponsePagination.length / queries.limit)
                    }
                    if (page) {
                        pageInput = page
                    }
                    if (pageInput <= countPages) {

                        ticketResponse = await db.ReservationTicket.findAll({
                            nest: true,
                            raw: true,
                            attributes: ['id', 'userID', 'projectID', 'timeShareID', 'refund'],
                            include: [
                                {
                                    model: db.User,
                                    attributes: ['id', 'username']
                                },
                                {
                                    model: db.Project,
                                    attributes: ['id', 'name', 'thumbnailPathUrl'],
                                    include: {
                                        model: db.Location,
                                        attributes: ['id', 'name'],
                                    }
                                },
                                {
                                    model: db.TimeShare,
                                    attributes: ['id', 'startDate', 'endDate'],
                                    include: {
                                        model: db.TypeRoom,
                                        atributes: ['id', 'name'],
                                    },
                                    where: {
                                        userID,
                                    }
                                },
                            ],
                            where: {
                                projectID: id,
                                status: 1,
                            }
                        })
                        if (ticketResponse.length !== 0) {
                            for (let i = 0; i < ticketResponse.length; i++) {
                                const ticket = {};
                                ticket.reservationID = ticketResponse[i].id
                                ticket.userID = ticketResponse[i].User.id;
                                ticket.username = ticketResponse[i].User.username;
                                ticket.projectID = ticketResponse[i].Project.id
                                ticket.projectName = ticketResponse[i].Project.name;
                                ticket.projectThumbnailPathUrl = ticketResponse[i].Project.thumbnailPathUrl;
                                ticket.location = ticketResponse[i].Project.Location.name;
                                ticket.typeRoomID = ticketResponse[i].TimeShare.TypeRoom.id
                                ticket.typeRoomName = ticketResponse[i].TimeShare.TypeRoom.name
                                ticket.timeShareID = ticketResponse[i].TimeShare.id
                                ticket.startDate = ticketResponse[i].TimeShare.startDate;
                                ticket.endDate = ticketResponse[i].TimeShare.endDate;
                                ticket.refund = ticketResponse[i].refund;
                                if (ticket.projectID) {
                                    response.push(ticket);
                                }
                            }
                        }
                    }
                }
            }
            resolve({
                err: response.length !== 0 ? 0 : 1,
                message: !projectResponse ?
                    `Project (${id}) does not exist!`
                    : !userResponse ?
                        `User (${userID}) does not exist!`
                        : !(userResponse.RoleCode.roleName === 'Staff') ?
                            `User (${userID}) is not a staff!`
                            : projectResponse.status !== 3 ?
                                `Project (${id}) is not on checkPriority Stage!`
                                : response.length === 0 ?
                                    `Can not find any Users have no Priority with Project(${id}) have TimeShares managed by Staff(${userID})!`
                                    : `All Users have no Priority with Project(${id}) have TimeShares managed by Staff(${userID}).`,
                data: response,
                count: response.length,
                countPages: countPages,
                page: pageInput
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getAllUserPriorityByStaff = ({ id, userID, page, limit, orderBy, orderType }) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = [];
            let ticketResponse = [];
            let pageInput = 1;
            let countPages = 0;
            let queries = pagination({ page, limit, orderType, orderBy });
            const projectResponse = await db.Project.findByPk(id);
            const userResponse = await db.User.findByPk(userID, {
                include: {
                    model: db.RoleCode,
                }
            });
            if (projectResponse && userResponse && userResponse.RoleCode.roleName === 'Staff') {
                if (projectResponse.status === 3) {
                    const ticketResponsePagination = await db.ReservationTicket.findAll({
                        nest: true,
                        raw: true,
                        attributes: ['id', 'userID', 'projectID', 'timeShareID'],
                        include: [
                            {
                                model: db.User,
                                attributes: ['id', 'username']
                            },
                            {
                                model: db.Project,
                                attributes: ['id', 'name', 'thumbnailPathUrl'],
                                include: {
                                    model: db.Location,
                                    attributes: ['id', 'name'],
                                }
                            },
                            {
                                model: db.TimeShare,
                                attributes: ['id', 'startDate', 'endDate'],
                                include: {
                                    model: db.TypeRoom,
                                    atributes: ['id', 'name'],
                                },
                                where: {
                                    userID,
                                }
                            },
                            {
                                model: db.Booking,
                                attributes: ['id', 'status'],
                            },
                        ],
                        where: {
                            projectID: id,
                            status: 2,
                        }
                    })
                    countPages = ticketResponsePagination.length !== 0 ? 1 : 0;
                    if (ticketResponsePagination.length / queries.limit > 1) {
                        countPages = Math.ceil(ticketResponsePagination.length / queries.limit)
                    }
                    if (page) {
                        pageInput = page
                    }
                    if (pageInput <= countPages) {
                        ticketResponse = await db.ReservationTicket.findAll({
                            nest: true,
                            raw: true,
                            attributes: ['id', 'userID', 'projectID', 'timeShareID'],
                            include: [
                                {
                                    model: db.User,
                                    attributes: ['id', 'username']
                                },
                                {
                                    model: db.Project,
                                    attributes: ['id', 'name', 'thumbnailPathUrl'],
                                    include: {
                                        model: db.Location,
                                        attributes: ['id', 'name'],
                                    }
                                },
                                {
                                    model: db.TimeShare,
                                    attributes: ['id', 'startDate', 'endDate'],
                                    include: {
                                        model: db.TypeRoom,
                                        atributes: ['id', 'name'],
                                    },
                                    where: {
                                        userID,
                                    }
                                },
                                {
                                    model: db.Booking,
                                    attributes: ['id', 'status'],
                                },
                            ],
                            where: {
                                projectID: id,
                                status: 2,
                            }
                        })
                        if (ticketResponse.length !== 0) {
                            for (let i = 0; i < ticketResponse.length; i++) {
                                const ticket = {};
                                ticket.reservationID = ticketResponse[i].id
                                ticket.userID = ticketResponse[i].User.id;
                                ticket.username = ticketResponse[i].User.username;
                                ticket.projectID = ticketResponse[i].Project.id
                                ticket.projectName = ticketResponse[i].Project.name;
                                ticket.projectThumbnailPathUrl = ticketResponse[i].Project.thumbnailPathUrl;
                                ticket.location = ticketResponse[i].Project.Location.name;
                                ticket.typeRoomID = ticketResponse[i].TimeShare.TypeRoom.id
                                ticket.typeRoomName = ticketResponse[i].TimeShare.TypeRoom.name
                                ticket.timeShareID = ticketResponse[i].TimeShare.id
                                ticket.startDate = ticketResponse[i].TimeShare.startDate;
                                ticket.endDate = ticketResponse[i].TimeShare.endDate;
                                ticket.bookingStatus = ticketResponse[i].Booking.status;
                                if (ticket.projectID) {
                                    response.push(ticket);
                                }
                            }
                        }
                    }
                }
            }
            resolve({
                err: response.length !== 0 ? 0 : 1,
                message: !projectResponse ?
                    `Project (${id}) does not exist!`
                    : !userResponse ?
                        `User (${userID}) does not exist!`
                        : !(userResponse.RoleCode.roleName === 'Staff') ?
                            `User (${userID}) is not a staff!`
                            : projectResponse.status !== 3 ?
                                `Project (${id}) is not on checkPriority Stage!`
                                : response.length === 0 ?
                                    `Can not find any Users have Priority with Project(${id}) have TimeShares managed by Staff(${userID})!`
                                    : `All Users have Priority with Project(${id}) have TimeShares managed by Staff(${userID}).`,
                data: response,
                count: response.length,
                countPages: countPages,
                page: pageInput
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getAllTicketsByUser = ({ id, status, page, limit, orderBy, orderType }) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = [];
            let ticketResponse = [];
            let pageInput = 1;
            let countPages = 0;
            let queries = pagination({ page, limit, orderType, orderBy });

            //const ticketResponsePagination = await db.R.findAll();
            // countPages = ticketResponsePagination.length !== 0 ? 1 : 0;
            // if (ticketResponsePagination.length / queries.limit > 1) {
            //     countPages = Math.ceil(ticketResponsePagination.length / queries.limit)
            // }
            // if (page) {
            //     pageInput = page
            // }

            const userResponse = await db.User.findByPk(id);
            let ticketAttributes = []
            if (parseInt(status) === 1) {
                ticketAttributes = ['id', 'code', 'projectID', 'refund', 'createdAt', 'refundDate']
            } else if (parseInt(status) === 2 || parseInt(status) === 4) {
                ticketAttributes = ['id', 'code', 'projectID', 'timeShareID', 'refund', 'updatedAt', 'refundDate', 'bookingDate']
            } else {
                ticketAttributes = ['id', 'code', 'projectID', 'timeShareID', 'bookingDate']
            }
            if (userResponse) {
                if (+status !== 0) {
                    const ticketResponsePagination = await db.ReservationTicket.findAll({
                        nest: true,
                        raw: true,
                        attributes: ticketAttributes,
                        where: parseInt(status) === 1 ?
                            {
                                userID: id,
                                timeShareID: {
                                    [Op.eq]: null
                                }
                            }
                            : parseInt(status) === 2 ?
                                {
                                    userID: id,
                                    status: 1,
                                    timeShareID: {
                                        [Op.ne]: null
                                    }
                                }
                                : parseInt(status) === 4 ?
                                    {
                                        userID: id,
                                        status: 1,
                                    } :
                                    {
                                        userID: id,
                                        status: 2
                                    },
                        include: [
                            {
                                model: db.User,
                                attributes: ['id', 'username']
                            },
                            {
                                model: db.Project,
                                attributes: ['id', 'name', 'thumbnailPathUrl'],
                                include: {
                                    model: db.Location,
                                    attributes: ['id', 'name'],
                                }
                            },
                            {
                                model: db.TimeShare,
                                attributes: ['id', 'startDate', 'endDate', 'price'],
                                include: {
                                    model: db.TypeRoom,
                                    atributes: ['id', 'name'],
                                }
                            },
                            (+status === 3 || +status === 5 || +status === 6) ?
                                {
                                    model: db.Booking,
                                    attributes: ['id', 'status', 'createdAt', 'updatedAt'],
                                    where: parseInt(status) === 5 ? {
                                        status: 1
                                    } : parseInt(status) === 6 ? {
                                        status: -1
                                    } : {
                                        status: 0
                                    }
                                } : {
                                    model: db.Booking,
                                    attributes: ['id', 'status'],
                                },
                        ],
                    })
                    countPages = ticketResponsePagination.length !== 0 ? 1 : 0;
                    if (ticketResponsePagination.length / queries.limit > 1) {
                        countPages = Math.ceil(ticketResponsePagination.length / queries.limit)
                    }
                    if (page) {
                        pageInput = page
                    }
                    if (pageInput <= countPages) {
                        ticketResponse = await db.ReservationTicket.findAll({
                            nest: true,
                            raw: true,
                            attributes: ticketAttributes,
                            where: parseInt(status) === 1 ?
                                {
                                    userID: id,
                                    timeShareID: {
                                        [Op.eq]: null
                                    }
                                }
                                : parseInt(status) === 2 ?
                                    {
                                        userID: id,
                                        status: 1,
                                        timeShareID: {
                                            [Op.ne]: null
                                        }
                                    }
                                    : parseInt(status) === 4 ?
                                        {
                                            userID: id,
                                            status: 1,
                                        } :
                                        {
                                            userID: id,
                                            status: 2
                                        },
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
                                    include: {
                                        model: db.TypeRoom,
                                        atributes: ['id', 'name'],
                                    }
                                },
                                (+status === 3 || +status === 5 || +status === 6) ?
                                    {
                                        model: db.Booking,
                                        attributes: ['id', 'status', 'createdAt', 'updatedAt'],
                                        where: parseInt(status) === 5 ? {
                                            status: 1
                                        } : parseInt(status) === 6 ? {
                                            status: -1
                                        } : {
                                            status: 0
                                        }
                                    } : {
                                        model: db.Booking,
                                        attributes: ['id', 'status'],
                                    },
                            ],
                            ...queries,
                        })
                        if (ticketResponse.length !== 0) {
                            for (let i = 0; i < ticketResponse.length; i++) {
                                const ticket = {};
                                ticket.reservationID = ticketResponse[i].id
                                ticket.code = ticketResponse[i].code;
                                ticket.projectID = ticketResponse[i].Project.id
                                ticket.projectName = ticketResponse[i].Project.name;
                                ticket.projectThumbnailPathUrl = ticketResponse[i].Project.thumbnailPathUrl;
                                ticket.location = ticketResponse[i].Project.Location.name
                                if (parseInt(status) !== 1) {
                                    ticket.typeRoomID = ticketResponse[i].TimeShare.TypeRoom.id
                                    ticket.typeRoomName = ticketResponse[i].TimeShare.TypeRoom.name
                                    ticket.timeShareID = ticketResponse[i].TimeShare.id
                                    ticket.startDate = ticketResponse[i].TimeShare.startDate;
                                    ticket.endDate = ticketResponse[i].TimeShare.endDate;
                                    ticket.price = ticketResponse[i].TimeShare.price;
                                    if (parseInt(status) === 2 || parseInt(status) === 4) {
                                        ticket.refund = ticketResponse[i].refund;
                                        ticket.refundDate = ticketResponse[i].refundDate;
                                        ticket.bookingTimeShareDate = ticketResponse[i].bookingDate
                                    } else {
                                        ticket.bookingStatus = ticketResponse[i].Booking.status;
                                        if (parseInt(status) === 3) {
                                            ticket.bookingSuccessDate = ticketResponse[i].Booking.createdAt
                                        } else if (parseInt(status) === 5) {
                                            ticket.purchasedSuccessDate = ticketResponse[i].Booking.updatedAt
                                        } else {
                                            ticket.purchasedFailedDate = ticketResponse[i].Booking.updatedAt
                                        }
                                    }
                                } else {
                                    ticket.refund = ticketResponse[i].refund;
                                    ticket.refundDate = ticketResponse[i].refundDate;
                                    ticket.reservatedProjectDate = ticketResponse[i].createdAt

                                }
                                if (!(ticketResponse[i].Project.status === 3 && (+status === 2 || +status === 1)) && !(ticketResponse[i].Project.status !== 3 && (+status === 4))) {
                                    response.push(ticket);
                                }
                            }
                        }
                    }
                }
                else {
                    const orderBy = 'status';
                    const orderType = 'ASC';
                    queries = pagination({ page, limit, orderType, orderBy });
                    const ticketResponsePagination = await db.ReservationTicket.findAll({
                        nest: true,
                        raw: true,
                        //attributes: ticketAttributes,
                        where: {
                            userID: id,
                        },
                        include: [
                            {
                                model: db.User,
                                attributes: ['id', 'username'],
                            },
                            {
                                model: db.Project,
                                attributes: ['id', 'name', 'thumbnailPathUrl'],
                                include: {
                                    model: db.Location,
                                    attributes: ['id', 'name'],
                                }
                            },
                            {
                                model: db.TimeShare,
                                attributes: ['id', 'startDate', 'endDate'],
                                include: {
                                    model: db.TypeRoom,
                                    atributes: ['id', 'name'],
                                }
                            },
                            {
                                model: db.Booking,
                                attributes: ['id', 'status'],
                            },
                        ],
                    })
                    countPages = ticketResponsePagination.length !== 0 ? 1 : 0;
                    if (ticketResponsePagination.length / queries.limit > 1) {
                        countPages = Math.ceil(ticketResponsePagination.length / queries.limit)
                    }
                    if (page) {
                        pageInput = page
                    }
                    if (pageInput <= countPages) {
                        const ticketResponse = await db.ReservationTicket.findAll({
                            nest: true,
                            raw: true,
                            where: {
                                userID: id,
                            },
                            //attributes: ticketAttributes,
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
                                    attributes: ['id', 'startDate', 'endDate'],
                                    include: {
                                        model: db.TypeRoom,
                                        atributes: ['id', 'name'],
                                    }
                                },
                                {
                                    model: db.Booking,
                                    attributes: ['id', 'status'],
                                },
                            ],
                            ...queries,
                        })
                        if (ticketResponse.length !== 0) {
                            for (let i = 0; i < ticketResponse.length; i++) {
                                const ticket = {};
                                ticket.reservationID = ticketResponse[i].id
                                ticket.code = ticketResponse[i].code;
                                ticket.projectID = ticketResponse[i].Project.id
                                ticket.projectName = ticketResponse[i].Project.name;
                                ticket.projectThumbnailPathUrl = ticketResponse[i].Project.thumbnailPathUrl;
                                ticket.location = ticketResponse[i].Project.Location.name
                                if ((ticketResponse[i].status === 1 || ticketResponse[i].status === 2) && ticketResponse[i].TimeShare.id) {
                                    ticket.typeRoomID = ticketResponse[i].TimeShare.TypeRoom.id
                                    ticket.typeRoomName = ticketResponse[i].TimeShare.TypeRoom.name
                                    ticket.timeShareID = ticketResponse[i].TimeShare.id
                                    ticket.startDate = ticketResponse[i].TimeShare.startDate;
                                    ticket.endDate = ticketResponse[i].TimeShare.endDate;
                                    if (!ticketResponse[i].Booking.id) {
                                        ticket.refund = ticketResponse[i].refund;
                                        ticket.refundDate = ticketResponse[i].refundDate;
                                        ticket.bookingTimeShareDate = ticketResponse[i].bookingDate
                                        if (ticketResponse[i].Project.status !== 3) {
                                            ticket.status = 'Booked';
                                        } else {
                                            ticket.status = 'Booked failed';
                                        }
                                    } else {
                                        ticket.bookingStatus = ticketResponse[i].Booking.status;
                                        if (ticketResponse[i].Booking.status === 0) {
                                            ticket.bookingSuccessDate = ticketResponse[i].Booking.createdAt
                                            ticket.status = 'Booked success';
                                        } else if (ticketResponse[i].Booking.status === 1) {
                                            ticket.purchasedSuccessDate = ticketResponse[i].Booking.updatedAt
                                            ticket.status = 'Purchased success';
                                        } else {
                                            ticket.purchasedFailedDate = ticketResponse[i].Booking.updatedAt
                                            ticket.status = 'Purchased failed';
                                        }
                                    }
                                } else {
                                    ticket.refund = ticketResponse[i].refund;
                                    ticket.refundDate = ticketResponse[i].refundDate;
                                    ticket.reservatedProjectDate = ticketResponse[i].createdAt;
                                    if (ticketResponse[i].Project.status !== 3) {
                                        ticket.status = 'Reservation';
                                    } else {
                                        ticket.status = 'Booked failed';
                                    }
                                }
                                if (ticket.projectID) {
                                    response.push(ticket);
                                }
                            }
                        }
                        //console.log(ticketResponse);
                    }
                }
            }
            resolve({
                err: response.length !== 0 ? 0 : 1,
                message: !userResponse ?
                    `User (${id}) does not exist!`
                    : response.length === 0 ?
                        `User (${id}) does not have any Ticket in Progress with status (${status})!`
                        : `User (${id}) tickets.`,
                data: response.length !== 0 ? response : null,
                count: response.length,
                countPages: countPages,
                page: pageInput
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getAllTicketsByAdmin = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = [];
            let ticketResponse = [];
            const projectResponse = await db.Project.findByPk(id);
            if (projectResponse && projectResponse.status !== 3) {
                ticketResponse = await db.ReservationTicket.findAll({
                    nest: true,
                    raw: true,
                    attributes: ['id', 'userID', 'projectID', 'timeShareID'],
                    include: [
                        {
                            model: db.User,
                            attributes: ['id', 'username']
                        },
                        {
                            model: db.Project,
                            attributes: ['id', 'name', 'thumbnailPathUrl'],
                            include: {
                                model: db.Location,
                                attributes: ['id', 'name'],
                            }
                        },
                        {
                            model: db.TimeShare,
                            attributes: ['id', 'startDate', 'endDate'],
                            include: {
                                model: db.TypeRoom,
                                atributes: ['id', 'name'],
                            }
                        },
                    ],
                    where: {
                        projectID: id,
                        status: 1,
                    }
                })
                if (ticketResponse.length !== 0) {
                    for (let i = 0; i < ticketResponse.length; i++) {
                        const ticket = {};
                        ticket.reservationID = ticketResponse[i].id
                        ticket.userID = ticketResponse[i].User.id;
                        ticket.username = ticketResponse[i].User.username;
                        ticket.projectID = ticketResponse[i].Project.id
                        ticket.projectName = ticketResponse[i].Project.name;
                        ticket.projectThumbnailPathUrl = ticketResponse[i].Project.thumbnailPathUrl;
                        ticket.location = ticketResponse[i].Project.Location.name;
                        ticket.typeRoomID = ticketResponse[i].TimeShare.TypeRoom.id
                        ticket.typeRoomName = ticketResponse[i].TimeShare.TypeRoom.name
                        ticket.timeShareID = ticketResponse[i].TimeShare.id
                        ticket.startDate = ticketResponse[i].TimeShare.startDate;
                        ticket.endDate = ticketResponse[i].TimeShare.endDate;
                        if (ticket.projectID) {
                            response.push(ticket);
                        }
                    }
                }
            }
            resolve({
                err: response.length !== 0 ? 0 : 1,
                message: !projectResponse ?
                    `Project (${id}) does not exist!`
                    : response.length === 0 ?
                        `Can not find any Users have bought Reservation Ticket of Project(${id}) before checkPrority Stage!`
                        : `All Users have bought Reservation Ticket of Project(${id}) before checkPrority Stage.`,
                data: response
            })


        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

