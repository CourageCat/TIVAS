import db, { Sequelize } from "../models";
const cloudinary = require("cloudinary").v2;
import "dotenv/config";
import { Model, Op, fn, col, literal, where } from "sequelize";
const nodemailer = require("nodemailer");
import ejs from "ejs";
const fs = require("fs");
import { pagination } from "../middlewares/pagination";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

function formatDate(date) {
    // Ensure 'date' is a valid Date object
    if (!(date instanceof Date)) {
        date = new Date(date);
    }

    // Get day, month, and year
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are zero-based
    const year = date.getFullYear();

    // Create the formatted date string
    const formattedDate = `${day}/${month}/${year}`;

    return formattedDate;
}

const convertDate = (dateString) => {
    const parts = dateString.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    const date = new Date(year, month, day);
    return date;
}

const refundLatestPayment = async (customerId) => {
    try {
        const charges = await stripe.charges.list({ customer: customerId });

        const latestCharge = charges.data[0];

        if (latestCharge) {
            const refund = await stripe.refunds.create({
                charge: latestCharge.id,
            });
            console.log(
                "Success refunds",
                latestCharge.id + " của khách hàng",
                customerId + ":",
                refund
            );
        } else {
            console.log("No charge found for customer", customerId);
        }
    } catch (error) {
        console.error("Error refunds:", error);
        throw error;
    }
};
const refundForMultipleCustomers = async (customers) => {
    for (const customer of customers) {
        await refundLatestPayment(customer?.refundHistoryID);
    }
};

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
                let timeShareOnSale = await db.TimeShareDate.findOne({
                    where: {
                        projectID,
                    },
                    order: [['id', 'DESC']]
                })
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
                    reservationPrice: timeShareOnSale.reservationPrice,
                    reservationDate: timeShareOnSale.reservationDate,
                    openDate: timeShareOnSale.openDate,
                    closeDate: timeShareOnSale.closeDate,
                    timeshareID: null,
                    refund: 0,
                    completed: 0,
                })
                let transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.GOOGE_APP_EMAIL,
                        pass: process.env.GOOGLE_APP_PASSWORD,
                    },
                });
                const emailTemplatePath = "src/template/EmailTicket/index.ejs";
                const emailTemplate = fs.readFileSync(emailTemplatePath, "utf-8");

                const data = {
                    email: user.email,
                    projectName: projectResponse.name,
                    code: code
                };

                const renderedHtml = ejs.render(emailTemplate, data);
                let mailOptions = {
                    from: "Tivas",
                    to: `${user.email}`,
                    subject: "Confirm received email",
                    html: renderedHtml
                };
                transporter.sendMail(mailOptions, function (error, info) {
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
            });
            // resolve({
            //     err : ticket ? 0 : 1,
            //     mess : ticket ? "Success" : "Your reservation ticket create fail",
            // })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    });
};

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
            let ticketRegisterAnother;
            let projectResponse;
            const userResponse = await db.User.findByPk(userID);
            const ticketResponse = await db.ReservationTicket.findOne({
                where: {
                    code,
                }
            })
            const timeShareResponse = await db.TimeShare.findByPk(timeShareID);
            if (userResponse && ticketResponse && timeShareResponse) {
                if (!ticketResponse.refundDate && ticketResponse.status !== 2) {
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
                                    ticketRegisterAnother = await db.ReservationTicket.findOne({
                                        where: {
                                            code,
                                            timeShareID: {
                                                [Op.ne]: null,
                                            }
                                        }
                                    })
                                    if (!ticketRegisterAnother) {
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
                                            const reservationTicket = await db.ReservationTicket.findOne({
                                                where: {
                                                    code,
                                                }
                                            })
                                            await db.ReservationTicket.update({
                                                bookingDate: reservationTicket.updatedAt,
                                            }, {
                                                where: {
                                                    code,
                                                }
                                            })

                                        }
                                    }
                                }
                            }
                            //}
                        }
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
                            : ticketResponse.refundDate || ticketResponse.status === 2 ?
                                `Ticket (${code}) has been used in another open sale!`
                                : projectResponse.status !== 2 ?
                                    `Project (${projectResponse.id}) is not open for booking!`
                                    : !timeShareBelongsToProject ?
                                        `TimeShare (${timeShareID}) does not belong to Project which is registerd in Ticket (${code})`
                                        : !userTicketResponse ?
                                            `Ticket (${code}) does not belong to User (${userID})!`
                                            : ticketDuplicated ?
                                                `TimeShare (${timeShareID}) has already registerd with the ticket (${code})!`
                                                : ticketRegisterAnother ?
                                                    `Ticket (${code}) has already registerd with another TimeShare`
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

export const checkPriority = ({ id, type }) => {
    return new Promise(async (resolve, reject) => {
        try {
            let reservationInProject = [];
            let ticketResponse = [];
            const userNoPriority = [];
            const projectResponse = await db.Project.findByPk(id);
            if (projectResponse && projectResponse?.status !== 3) {
                const timeShareDatesResponse = await db.TimeShareDate.findOne({
                    where: {
                        projectID: id,
                        status: 0,
                    }
                })
                if (timeShareDatesResponse) {
                    reservationInProject = await db.ReservationTicket.findAll({
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
                                include: [
                                    {
                                        model: db.TypeRoom,
                                        attributes: ['id', 'name']
                                    },
                                ]
                            },
                        ],
                        where: {
                            projectID: id,
                            status: 1,
                            reservationDate: timeShareDatesResponse.reservationDate,
                            //closeDate: timeShareDatesResponse.closeDate

                        }
                    })
                    //Have User buy ticket
                    if (reservationInProject.length !== 0) {
                        //Update status for Project, TimeShare and TimeShareDate
                        //Update Project Status to 3
                        await db.Project.update({
                            status: 3
                        }, {
                            where: {
                                id
                            }
                        })

                        //Update TimeShare status to 0
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
                                {
                                    model: db.TimeShareDate,
                                    where: {
                                        id: timeShareDatesResponse.id
                                    }
                                }
                            ],
                        });
                        if (timeSharesToUpdate.length !== 0) {
                            // Perform updates in memory
                            timeSharesToUpdate.forEach((timeShare) => {
                                timeShare.saleStatus = 0;
                            });

                            // Save changes back to the database
                            await Promise.all(timeSharesToUpdate.map((timeShare) => timeShare.save()));
                        }

                        ticketResponse = await db.ReservationTicket.findAll({
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
                                    include: [
                                        {
                                            model: db.TypeRoom,
                                            attributes: ['id', 'name']
                                        },
                                    ]
                                },
                            ],
                            where: {
                                projectID: id,
                                timeShareID: {
                                    [Op.ne]: null
                                },
                                status: 1,
                                reservationDate: timeShareDatesResponse.reservationDate,
                                //closeDate: timeShareDatesResponse.closeDate
                            }
                        })
                        //Have at least 1 User booking 
                        if (ticketResponse.length !== 0) {
                            const result = Object.groupBy(ticketResponse, ({ timeShareID }) => timeShareID)
                            let count1 = 0
                            for (let properties in result) {
                                count1 = count1 + 1
                            }
                            // let random = []
                            // let chooseRandom = []
                            for (let i = 0; i < count1; i++) {
                                const quantityTimeshare = await db.TimeShare.findByPk(Object.getOwnPropertyNames(result)[i])
                                //choose random
                                if (type == "random") {
                                    let random = [];
                                    let chooseRandom = [];
                                    const code = await db.ReservationTicket.findAll({
                                        where: {
                                            timeShareID: quantityTimeshare.id
                                        }
                                    })
                                    code.forEach((item) => {
                                        random.push(item.code)
                                    })

                                    //chooseRandom is array userchoose
                                    for (let i = 0; i < quantityTimeshare.quantity; i++) {
                                        var item = random[Math.floor(Math.random() * random.length)];
                                        if (item) {
                                            let index = random.indexOf(item)
                                            random.splice(index, 1)
                                            chooseRandom.push(item)
                                        }
                                    }
                                    for (let i = 0; i < chooseRandom.length; i++) {
                                        console.log(`TimeShare (${quantityTimeshare.id}) : ${chooseRandom[i]}`);
                                        const reservation = await db.ReservationTicket.findOne({
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
                                                    include: [
                                                        {
                                                            model: db.TypeRoom,
                                                            attributes: ['id', 'name']
                                                        },
                                                    ]
                                                },
                                            ],
                                            where: {
                                                code: chooseRandom[i]
                                            }
                                        })
                                        await db.ReservationTicket.update({
                                            status: 2
                                        }, {
                                            where: {
                                                code: chooseRandom[i]
                                            }
                                        })
                                        await db.TimeShare.decrement({
                                            quantity: 1
                                        }, {
                                            where: {
                                                id: quantityTimeshare.id
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

                                    // const codeUser = await db.ReservationTicket.findAll({
                                    //     where: {
                                    //         code: chooseRandom
                                    //     }
                                    // })
                                    //console.log(codeUser);
                                    // let arrUser = []
                                    // codeUser.forEach((item) => {
                                    //     arrUser.push(item.userID)
                                    // })
                                    // //user is all user is choose
                                    // const user = await db.User.findAll({
                                    //     where: {
                                    //         id: arrUser
                                    //     }
                                    // })
                                }
                                //choose normal
                                else {
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
                            }


                            const timeShareOnSale = await db.TimeShareDate.findOne({
                                where: {
                                    projectID: id,
                                },
                                order: [['id', 'DESC']]
                            })

                            //Update refund: 1
                            await db.ReservationTicket.update(
                                {
                                    refund: 1,
                                    //completed: 1,
                                },
                                {
                                    where: {
                                        status: 1,
                                        projectID: id,
                                        reservationDate: timeShareOnSale?.reservationDate,
                                        //closeDate: timeShareOnSale?.closeDate,
                                    }
                                })

                            const ticketFailedResponse = await db.ReservationTicket.findAll({
                                nest: true,
                                raw: true,
                                attributes: ['id', 'userID', 'projectID', 'timeShareID', 'refund', 'reservationPrice', 'updatedAt'],
                                include: [
                                    {
                                        model: db.User,
                                        attributes: ['id', 'username', 'email', 'refundHistoryID']
                                    },
                                    {
                                        model: db.Project,
                                        attributes: ['id', 'name']
                                    },
                                    {
                                        model: db.TimeShare,
                                        atributes: ['id', 'startDate', 'endDate'],
                                        include: [
                                            {
                                                model: db.TypeRoom,
                                                attributes: ['id', 'name']
                                            },
                                        ]
                                    },
                                ],
                                where: {
                                    projectID: id,
                                    status: 1,
                                    reservationDate: timeShareOnSale?.reservationDate,
                                    //closeDate: timeShareOnSale?.closeDate,
                                }
                            })

                            for (let i = 0; i < ticketFailedResponse.length; i++) {
                                //Update refundDate
                                const check = await db.ReservationTicket.update({
                                    refundDate: ticketFailedResponse[i].updatedAt
                                }, {
                                    where: {
                                        id: ticketFailedResponse[i].id
                                    }
                                })
                                console.log(check);

                                //Send mail to failed User
                                let transporter = nodemailer.createTransport({
                                    service: "gmail",
                                    auth: {
                                        user: process.env.GOOGE_APP_EMAIL,
                                        pass: process.env.GOOGLE_APP_PASSWORD,
                                    },
                                });
                                let emailTemplatePath;
                                let data;
                                if (ticketFailedResponse[i].TimeShare.id) {
                                    emailTemplatePath = "src/template/EmailFailed/index.ejs";
                                    data = {
                                        email: ticketFailedResponse[i].User.email,
                                        projectName: ticketFailedResponse[i].Project.name,
                                        typeRoomName: ticketFailedResponse[i].TimeShare?.TypeRoom.name,
                                        startDate: formatDate(ticketFailedResponse[i].TimeShare?.startDate),
                                        endDate: formatDate(ticketFailedResponse[i].TimeShare?.endDate),
                                        reservationPrice: ticketFailedResponse[i].reservationPrice,
                                    };
                                } else {
                                    emailTemplatePath = "src/template/EmailFailedNoTimeShare/index.ejs";
                                    data = {
                                        email: ticketFailedResponse[i].User.email,
                                        projectName: ticketFailedResponse[i].Project.name,
                                        reservationPrice: ticketFailedResponse[i].reservationPrice,
                                    };
                                }
                                const emailTemplate = fs.readFileSync(emailTemplatePath, "utf-8");
                                const renderedHtml = ejs.render(emailTemplate, data);

                                let mailOptions = {
                                    from: "Tivas",
                                    to: `${ticketFailedResponse[i].User.email}`,
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
                                const user = {};
                                user.id = ticketFailedResponse[i].User.id;
                                user.username = ticketFailedResponse[i].User.username;
                                user.refundHistoryID = ticketFailedResponse[i].User.refundHistoryID;
                                userNoPriority.push(user);
                            }
                            //No User Booking
                        } else {
                            await db.TimeShareDate.update({
                                status: 1
                            }, {
                                where: {
                                    id: timeShareDatesResponse.id
                                }
                            })

                            //update completedDate
                            const timeShareDateUpdated = await db.TimeShareDate.findOne({
                                where: {
                                    id: timeShareDatesResponse.id
                                }
                            })
                            await db.TimeShareDate.update({
                                completedDate: timeShareDateUpdated.updatedAt
                            }, {
                                where: {
                                    id: timeShareDatesResponse.id
                                }
                            })
                            const timeShareOnSale = await db.TimeShareDate.findOne({
                                where: {
                                    projectID: id,
                                },
                                order: [['id', 'DESC']]
                            })

                            //Update refund: 1
                            await db.ReservationTicket.update(
                                {
                                    refund: 1,
                                    //completed: 1
                                },
                                {
                                    where: {
                                        status: 1,
                                        projectID: id,
                                        reservationDate: timeShareOnSale?.reservationDate,
                                        //closeDate: timeShareOnSale?.closeDate,
                                    }
                                })

                            //Update RefundDate

                            const ticketFailedResponse = await db.ReservationTicket.findAll({
                                nest: true,
                                raw: true,
                                attributes: ['id', 'userID', 'projectID', 'timeShareID', 'refund', 'reservationPrice', 'updatedAt'],
                                include: [
                                    {
                                        model: db.User,
                                        attributes: ['id', 'username', 'email', 'refundHistoryID']
                                    },
                                    {
                                        model: db.Project,
                                        attributes: ['id', 'name']
                                    },
                                    {
                                        model: db.TimeShare,
                                        atributes: ['id', 'startDate', 'endDate'],
                                        include: [
                                            {
                                                model: db.TypeRoom,
                                                attributes: ['id', 'name']
                                            },
                                        ]
                                    },
                                ],
                                where: {
                                    projectID: id,
                                    status: 1,
                                    reservationDate: timeShareOnSale?.reservationDate,
                                    //closeDate: timeShareOnSale?.closeDate,
                                }
                            })

                            for (let i = 0; i < ticketFailedResponse.length; i++) {
                                //Update refundDate
                                const check = await db.ReservationTicket.update({
                                    refundDate: ticketFailedResponse[i].updatedAt
                                }, {
                                    where: {
                                        id: ticketFailedResponse[i].id
                                    }
                                })
                                //Send mail to failed User
                                let transporter = nodemailer.createTransport({
                                    service: "gmail",
                                    auth: {
                                        user: process.env.GOOGE_APP_EMAIL,
                                        pass: process.env.GOOGLE_APP_PASSWORD,
                                    },
                                });
                                let emailTemplatePath;
                                let data;
                                if (ticketFailedResponse[i].TimeShare.id) {
                                    emailTemplatePath = "src/template/EmailFailed/index.ejs";
                                    data = {
                                        email: ticketFailedResponse[i].User.email,
                                        projectName: ticketFailedResponse[i].Project.name,
                                        typeRoomName: ticketFailedResponse[i].TimeShare?.TypeRoom.name,
                                        startDate: formatDate(ticketFailedResponse[i].TimeShare?.startDate),
                                        endDate: formatDate(ticketFailedResponse[i].TimeShare?.endDate),
                                        reservationPrice: ticketFailedResponse[i].reservationPrice,
                                    };
                                } else {
                                    emailTemplatePath = "src/template/EmailFailedNoTimeShare/index.ejs";
                                    data = {
                                        email: ticketFailedResponse[i].User.email,
                                        projectName: ticketFailedResponse[i].Project.name,
                                        reservationPrice: ticketFailedResponse[i].reservationPrice,
                                    };
                                }
                                const emailTemplate = fs.readFileSync(emailTemplatePath, "utf-8");
                                const renderedHtml = ejs.render(emailTemplate, data);

                                let mailOptions = {
                                    from: "Tivas",
                                    to: `${ticketFailedResponse[i].User.email}`,
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

                                //Update completed = 1
                                await db.ReservationTicket.update({
                                    completed: 1
                                }, {
                                    where: {
                                        id: ticketFailedResponse[i].id
                                    }
                                })
                                const user = {};
                                user.id = ticketFailedResponse[i].User.id;
                                user.username = ticketFailedResponse[i].User.username;
                                user.refundHistoryID = ticketFailedResponse[i].User.refundHistoryID;
                                userNoPriority.push(user);
                            }
                        }
                        await refundForMultipleCustomers(userNoPriority);
                    }
                }
            }
            // const {count , rows} = await db.ReservationTicket.findAndCountAll({
            //     where : {
            //         status : 2
            //     }
            // })

            resolve({
                err: (reservationInProject.length !== 0) ? 0 : 1,
                mess: !projectResponse ?
                    `Project (${id}) does not exist!`
                    : projectResponse.status === 3 ?
                        `Project (${id}) has already closed booking!`
                        : (reservationInProject.length !== 0) ? "Success" : "Fail (No ReservationTickets to check in DB)"
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
                    },
                });
                if (
                    reservationTicketResponse &&
                    reservationTicketResponse.length !== 0
                ) {
                    for (let i = 0; i < reservationTicketResponse.length; i++) {
                        console.log(reservationTicketResponse[i]);
                        const timeShareResponse = await db.TimeShare.findByPk(
                            reservationTicketResponse[i].timeShareID,
                            {
                                nest: true,
                                raw: true,
                                attributes: [
                                    "id",
                                    "price",
                                    "startDate",
                                    "endDate",
                                    "saleStatus",
                                    "createdAt",
                                ],
                                include: {
                                    model: db.TypeRoom,
                                    attributes: ["name", "persons"],
                                    include: {
                                        model: db.TypeOfProject,
                                        attributes: ["id"],
                                        include: {
                                            model: db.Project,
                                            attributes: ["name", "thumbnailPathUrl", "locationID"],
                                        },
                                    },
                                },
                            }
                        );
                        if (timeShareResponse) {
                            console.log(timeShareResponse);
                            const location = await db.Location.findByPk(
                                timeShareResponse.TypeRoom.TypeOfProject.Project.locationID
                            );
                            timeShareResponse.TypeRoom.TypeOfProject.Project.location =
                                location.name;
                            timeSharePriority.push(timeShareResponse);
                        }
                    }
                }
            }
            resolve({
                err: timeSharePriority.length !== 0 ? 0 : 1,
                message: !userResponse
                    ? `User (${userID}) does not exist!`
                    : !reservationTicketResponse || reservationTicketResponse.length === 0
                        ? `User (${userID}) does not have any TimeShare Priority after checking priority in the DB!`
                        : timeSharePriority.length === 0
                            ? "Can not find any TimeShares!"
                            : `TimeShares Priority of User (${userID}) found`,
                data: timeSharePriority.length !== 0 ? timeSharePriority : null,
            });
        } catch (error) {
            console.log(error);
            reject(error);
        }
    });
};

export const getUserTickets = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userResponse = await db.User.findByPk(id);
            let ticketResponse = [];
            if (userResponse) {
                ticketResponse = await db.ReservationTicket.findAll({
                    attributes: ["id", "code", "status", "projectID", "timeShareID"],
                    raw: true,
                    where: {
                        userID: id,
                    },
                });
                if (ticketResponse.length !== 0) {
                    for (let i = 0; i < ticketResponse.length; i++) {
                        const projectResponse = await db.Project.findByPk(
                            ticketResponse[i].projectID
                        );
                        ticketResponse[i].projectName = projectResponse.name;
                        const timeShareResponse = await db.TimeShare.findByPk(
                            ticketResponse[i].timeShareID,
                            {
                                include: {
                                    model: db.TypeRoom,
                                },
                            }
                        );
                        ticketResponse[i].typeRoomID = timeShareResponse.TypeRoom.id;
                        ticketResponse[i].typeRoomName = timeShareResponse.TypeRoom.name;
                        ticketResponse[i].startDate = timeShareResponse.startDate;
                        ticketResponse[i].endDate = timeShareResponse.endDate;
                    }
                }
            }
            resolve({
                err: ticketResponse.length !== 0 ? 0 : 1,
                message: !userResponse
                    ? `User (${id}) does not exist!`
                    : ticketResponse.length === 0
                        ? `User (${id}) does not have any reservation ticket!`
                        : `User (${id})'s tickets`,
                data: ticketResponse.length !== 0 ? ticketResponse : null,
            });
        } catch (error) {
            console.log(error);
            reject(error);
        }
    });
};

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
                    },
                });
                if (ticketResponse.length !== 0) {
                    const result = Object.groupBy(ticketResponse, ({ userID }) => userID);
                    let count1 = 0;
                    for (let properties in result) {
                        count1 = count1 + 1;
                    }
                    for (let i = 0; i < count1; i++) {
                        const userResponse = await db.User.findByPk(
                            Object.getOwnPropertyNames(result)[i]
                        );
                        response.push(userResponse);
                    }
                }
            }

            resolve({
                err: response.length !== 0 ? 0 : 1,
                message: !projectResponse
                    ? `Project (${id}) does not exist!`
                    : ticketResponse.length === 0
                        ? `Can not find any Users have the reservation with Project(${id})!`
                        : `All Users have the reservation with Project(${id}).`,
                data: response.length !== 0 ? response : 0,
            });
        } catch (error) {
            console.log(error);
            reject(error);
        }
    });
};

export const getAllUserNoPriorityByAdmin = (
    id,
    { page, limit, orderBy, orderType }
) => {
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
                    const timeShareOnSale = await db.TimeShareDate.findOne({
                        where: {
                            projectID: id,
                        },
                        order: [['id', 'DESC']]
                    })
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
                            reservationDate: timeShareOnSale?.reservationDate,
                            closeDate: timeShareOnSale?.closeDate,
                            completed: 0
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
                                reservationDate: timeShareOnSale?.reservationDate,
                                closeDate: timeShareOnSale?.closeDate,
                                completed: 0
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
                    const timeShareOnSale = await db.TimeShareDate.findOne({
                        where: {
                            projectID: id,
                        },
                        order: [['id', 'DESC']]
                    })
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
                            reservationDate: timeShareOnSale?.reservationDate,
                            closeDate: timeShareOnSale?.closeDate,
                            completed: 0
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
                                reservationDate: timeShareOnSale?.reservationDate,
                                closeDate: timeShareOnSale?.closeDate,
                                completed: 0
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
                    const timeShareOnSale = await db.TimeShareDate.findOne({
                        where: {
                            projectID: id,
                        },
                        order: [['id', 'DESC']]
                    })
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
                            reservationDate: timeShareOnSale?.reservationDate,
                            closeDate: timeShareOnSale?.closeDate,
                            completed: 0
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
                                reservationDate: timeShareOnSale?.reservationDate,
                                closeDate: timeShareOnSale?.closeDate,
                                completed: 0
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

export const getAllUserPriorityByStaff = ({
    id,
    userID,
    page,
    limit,
    orderBy,
    orderType,
}) => {
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
                },
            });
            if (
                projectResponse &&
                userResponse &&
                userResponse.RoleCode.roleName === "Staff"
            ) {
                if (projectResponse.status === 3) {
                    const timeShareOnSale = await db.TimeShareDate.findOne({
                        where: {
                            projectID: id,
                        },
                        order: [['id', 'DESC']]
                    })
                    const ticketResponsePagination = await db.ReservationTicket.findAll({
                        nest: true,
                        raw: true,
                        attributes: ["id", "userID", "projectID", "timeShareID"],
                        include: [
                            {
                                model: db.User,
                                attributes: ["id", "username"],
                            },
                            {
                                model: db.Project,
                                attributes: ["id", "name", "thumbnailPathUrl"],
                                include: {
                                    model: db.Location,
                                    attributes: ["id", "name"],
                                },
                            },
                            {
                                model: db.TimeShare,
                                attributes: ["id", "startDate", "endDate"],
                                include: {
                                    model: db.TypeRoom,
                                    atributes: ["id", "name"],
                                },
                                where: {
                                    userID,
                                },
                            },
                            {
                                model: db.Booking,
                                attributes: ["id", "status"],
                            },
                        ],
                        where: {
                            projectID: id,
                            status: 2,
                            reservationDate: timeShareOnSale?.reservationDate,
                            closeDate: timeShareOnSale?.closeDate,
                            completed: 0
                        }
                    });
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
                        ticketResponse = await db.ReservationTicket.findAll({
                            nest: true,
                            raw: true,
                            attributes: ["id", "userID", "projectID", "timeShareID"],
                            include: [
                                {
                                    model: db.User,
                                    attributes: ["id", "username"],
                                },
                                {
                                    model: db.Project,
                                    attributes: ["id", "name", "thumbnailPathUrl"],
                                    include: {
                                        model: db.Location,
                                        attributes: ["id", "name"],
                                    },
                                },
                                {
                                    model: db.TimeShare,
                                    attributes: ["id", "startDate", "endDate"],
                                    include: {
                                        model: db.TypeRoom,
                                        atributes: ["id", "name"],
                                    },
                                    where: {
                                        userID,
                                    },
                                },
                                {
                                    model: db.Booking,
                                    attributes: ["id", "status"],
                                },
                            ],
                            where: {
                                projectID: id,
                                status: 2,
                                reservationDate: timeShareOnSale?.reservationDate,
                                closeDate: timeShareOnSale?.closeDate,
                                completed: 0
                            }
                        });
                        if (ticketResponse.length !== 0) {
                            for (let i = 0; i < ticketResponse.length; i++) {
                                const ticket = {};
                                ticket.reservationID = ticketResponse[i].id;
                                ticket.userID = ticketResponse[i].User.id;
                                ticket.username = ticketResponse[i].User.username;
                                ticket.projectID = ticketResponse[i].Project.id;
                                ticket.projectName = ticketResponse[i].Project.name;
                                ticket.projectThumbnailPathUrl =
                                    ticketResponse[i].Project.thumbnailPathUrl;
                                ticket.location = ticketResponse[i].Project.Location.name;
                                ticket.typeRoomID = ticketResponse[i].TimeShare.TypeRoom.id;
                                ticket.typeRoomName = ticketResponse[i].TimeShare.TypeRoom.name;
                                ticket.timeShareID = ticketResponse[i].TimeShare.id;
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
                message: !projectResponse
                    ? `Project (${id}) does not exist!`
                    : !userResponse
                        ? `User (${userID}) does not exist!`
                        : !(userResponse.RoleCode.roleName === "Staff")
                            ? `User (${userID}) is not a staff!`
                            : projectResponse.status !== 3
                                ? `Project (${id}) is not on checkPriority Stage!`
                                : response.length === 0
                                    ? `Can not find any Users have Priority with Project(${id}) have TimeShares managed by Staff(${userID})!`
                                    : `All Users have Priority with Project(${id}) have TimeShares managed by Staff(${userID}).`,
                data: response,
                count: response.length,
                countPages: countPages,
                page: pageInput,
            });
        } catch (error) {
            console.log(error);
            reject(error);
        }
    });
};

export const getAllTicketsByUser = ({ id, status, page, limit, orderBy, orderType }) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = [];
            let userResponse;
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

            userResponse = await db.User.findByPk(id);
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
                                },
                                completed: 0,
                            }
                            : parseInt(status) === 2 ?
                                {
                                    userID: id,
                                    status: 1,
                                    timeShareID: {
                                        [Op.ne]: null
                                    },
                                    completed: 0,
                                }
                                : parseInt(status) === 4 ?
                                    {
                                        userID: id,
                                        status: 1,
                                        completed: 0,
                                    } :
                                    {
                                        userID: id,
                                        status: 2,
                                        completed: 0,
                                    },
                        include: [
                            {
                                model: db.User,
                                attributes: ['id', 'username']
                            },
                            {
                                model: db.TimeShare,
                                attributes: ['id', 'startDate', 'endDate', 'price'],
                                include: [
                                    {
                                        model: db.TypeRoom,
                                        atributes: ['id', 'name'],
                                    },
                                ],
                            },
                            {
                                model: db.Project,
                                attributes: ['id', 'name', 'thumbnailPathUrl', 'status'],
                                where: {
                                    id: {
                                        [Op.ne]: null
                                    }
                                },
                                include: [
                                    // {
                                    //     model: db.TimeShareDate,
                                    //     where: {
                                    //         status: 0
                                    //     }
                                    // },
                                    {
                                        model: db.Location,
                                        attributes: ['id', 'name'],
                                    },
                                ]
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
                        //...queries,
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
                            nest: true,
                            raw: true,
                            attributes: ticketAttributes,
                            where: parseInt(status) === 1 ?
                                {
                                    userID: id,
                                    timeShareID: {
                                        [Op.eq]: null
                                    },
                                    completed: 0,
                                }
                                : parseInt(status) === 2 ?
                                    {
                                        userID: id,
                                        status: 1,
                                        timeShareID: {
                                            [Op.ne]: null
                                        },
                                        completed: 0,
                                    }
                                    : parseInt(status) === 4 ?
                                        {
                                            userID: id,
                                            status: 1,
                                            completed: 0,
                                        } :
                                        {
                                            userID: id,
                                            status: 2,
                                            completed: 0,
                                        },
                            include: [
                                {
                                    model: db.User,
                                    attributes: ['id', 'username']
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
                                {
                                    model: db.Project,
                                    attributes: ['id', 'name', 'thumbnailPathUrl', 'status'],
                                    where: {
                                        id: {
                                            [Op.ne]: null
                                        }
                                    },
                                    include: [
                                        // {
                                        //     model: db.TimeShareDate,
                                        //     where: {
                                        //         status: 0
                                        //     }
                                        // },
                                        {
                                            model: db.Location,
                                            attributes: ['id', 'name'],
                                        },
                                    ]
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
                                console.log(ticketResponse[i].TimeShare.TypeRoom.name);
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
                                //response.push(ticket);
                                if ((!(ticketResponse[i].Project.status === 3 && (+status === 2 || +status === 1)) && !(ticketResponse[i].Project.status !== 3 && (+status === 4)))) {
                                    console.log(123);
                                    response.push(ticket);
                                }
                            }
                        }
                    }
                }
                else {
                    //queries.orderBy = 'status';
                    //queries.orderType = 'ASC';
                    // const test = await db.ReservationTicket.findAll({
                    //     nest: true,
                    //     raw: true,
                    //     where: {
                    //         userID: id,
                    //         // refund: 0,
                    //         // status: 1,
                    //     },
                    //     attributes: ticketAttributes,
                    //     include: [
                    //         {
                    //             model: db.User,
                    //             attributes: ['id', 'username']
                    //         },
                    //         {
                    //             model: db.TimeShare,
                    //             attributes: ['id', 'startDate', 'endDate'],
                    //             include: [
                    //                 {
                    //                     model: db.TypeRoom,
                    //                     atributes: ['id', 'name'],
                    //                 },
                    //                 // {
                    //                 //     model: db.TimeShareDate,
                    //                 //     where: {
                    //                 //         status: 0
                    //                 //     }
                    //                 // }
                    //             ]
                    //         },
                    //         {
                    //             model: db.Booking,
                    //             attributes: ['id', 'status'],
                    //         },
                    //         {
                    //             model: db.Project,
                    //             attributes: ['id', 'name', 'thumbnailPathUrl', 'status'],
                    //             include: [
                    //                 {
                    //                     model: db.TimeShareDate,
                    //                     where: {
                    //                         status: 0
                    //                     }
                    //                 },
                    //                 {
                    //                     model: db.Location,
                    //                     attributes: ['id', 'name'],
                    //                 },
                    //             ]
                    //         },
                    //     ],
                    // })
                    // for (let i = 0; i < test.length; i++) {
                    //     console.log(test[i]);

                    // }
                    console.log(123456789);
                    const ticketResponsePagination = await db.ReservationTicket.findAll({
                        nest: true,
                        raw: true,
                        where: {
                            userID: id,
                            completed: 0,
                            // refund: 0,
                            // status: 1,
                        },
                        //attributes: ticketAttributes,
                        include: [
                            {
                                model: db.User,
                                attributes: ['id', 'username']
                            },
                            {
                                model: db.TimeShare,
                                attributes: ['id', 'startDate', 'endDate'],
                                include: [
                                    {
                                        model: db.TypeRoom,
                                        atributes: ['id', 'name'],
                                    },
                                    // {
                                    //     model: db.TimeShareDate,
                                    //     where: {
                                    //         status: 0
                                    //     }
                                    // }
                                ]
                            },
                            {
                                model: db.Booking,
                                attributes: ['id', 'status'],
                            },
                            {
                                model: db.Project,
                                attributes: ['id', 'name', 'thumbnailPathUrl', 'status'],
                                where: {
                                    id: {
                                        [Op.ne]: null
                                    }
                                },
                                include: [
                                    // {
                                    //     model: db.TimeShareDate,
                                    //     where: {
                                    //         status: 0
                                    //     }
                                    // },
                                    {
                                        model: db.Location,
                                        attributes: ['id', 'name'],
                                    },
                                ]
                            },
                        ],
                    })
                    console.log(queries);
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
                            nest: true,
                            raw: true,
                            where: {
                                userID: id,
                                completed: 0,
                                // refund: 0,
                                // status: 1,
                            },
                            //attributes: ticketAttributes,
                            include: [
                                {
                                    model: db.User,
                                    attributes: ['id', 'username']
                                },
                                {
                                    model: db.TimeShare,
                                    attributes: ['id', 'startDate', 'endDate'],
                                    include: [
                                        {
                                            model: db.TypeRoom,
                                            atributes: ['id', 'name'],
                                        },
                                        // {
                                        //     model: db.TimeShareDate,
                                        //     where: {
                                        //         status: 0
                                        //     }
                                        // },
                                    ]
                                },
                                {
                                    model: db.Booking,
                                    attributes: ['id', 'status'],
                                },
                                {
                                    model: db.Project,
                                    where: {
                                        id: {
                                            [Op.ne]: null
                                        }
                                    },
                                    attributes: ['id', 'name', 'thumbnailPathUrl', 'status'],
                                    include: [
                                        // {
                                        //     model: db.TimeShareDate,
                                        //     where: {
                                        //         status: 0
                                        //     }
                                        // },
                                        {
                                            model: db.Location,
                                            attributes: ['id', 'name'],
                                        },
                                    ]
                                },
                            ],
                            //offset: 0, 
                            ///limit: 10,
                            //order: [ [ 'id', 'ASC' ] ],
                            ...queries
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
                                if (ticketResponse[i].id) {
                                    response.push(ticket);
                                }
                            }
                            //console.log(ticketResponse);
                        }
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

export const getAllTicketsByAdmin = ({ id, status, page, limit, orderBy, orderType }) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = [];
            let pageInput = 1;
            let countPages = 0;
            let queries = pagination({ page, limit, orderType, orderBy });
            const projectResponse = await db.Project.findByPk(id);
            if (projectResponse && projectResponse?.status !== 3) {
                const timeShareDateResponse = await db.TimeShareDate.findOne({
                    where: {
                        projectID: id,
                        status: 0,
                    }
                })
                const ticketResponsePagination = await db.ReservationTicket.findAll({
                    nest: true,
                    raw: true,
                    attributes: ["id", "userID", "projectID", "timeShareID"],
                    where: (+status === 2) ? {
                        projectID: id,
                        status: 1,
                        reservationDate: timeShareDateResponse.reservationDate,
                        closeDate: timeShareDateResponse.closeDate,
                        timeShareID: {
                            [Op.eq]: null,
                        }
                    } : (+status === 3) ? {
                        projectID: id,
                        status: 1,
                        reservationDate: timeShareDateResponse.reservationDate,
                        closeDate: timeShareDateResponse.closeDate,
                        timeShareID: {
                            [Op.ne]: null,
                        }
                    } : {
                        projectID: id,
                        status: 1,
                        reservationDate: timeShareDateResponse.reservationDate,
                        closeDate: timeShareDateResponse.closeDate,
                    },
                });
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
                        nest: true,
                        raw: true,
                        attributes: ["id", "userID", "projectID", "timeShareID"],
                        include: [
                            {
                                model: db.User,
                                attributes: ["id", "username"],
                            },
                            {
                                model: db.Project,
                                attributes: ["id", "name", "thumbnailPathUrl"],
                                include: {
                                    model: db.Location,
                                    attributes: ["id", "name"],
                                },
                            },
                            {
                                model: db.TimeShare,
                                attributes: ["id", "startDate", "endDate"],
                                include: {
                                    model: db.TypeRoom,
                                    atributes: ["id", "name"],
                                },
                            },
                        ],
                        where: (+status === 2) ? {
                            projectID: id,
                            status: 1,
                            reservationDate: timeShareDateResponse.reservationDate,
                            closeDate: timeShareDateResponse.closeDate,
                            timeShareID: {
                                [Op.eq]: null,
                            }
                        } : (+status === 3) ? {
                            projectID: id,
                            status: 1,
                            reservationDate: timeShareDateResponse.reservationDate,
                            closeDate: timeShareDateResponse.closeDate,
                            timeShareID: {
                                [Op.ne]: null,
                            }
                        } : {
                            projectID: id,
                            status: 1,
                            reservationDate: timeShareDateResponse.reservationDate,
                            closeDate: timeShareDateResponse.closeDate,
                        },
                        ...queries,
                    });
                    if (ticketResponse.length !== 0) {
                        for (let i = 0; i < ticketResponse.length; i++) {
                            const ticket = {};
                            ticket.reservationID = ticketResponse[i].id;
                            ticket.userID = ticketResponse[i].User.id;
                            ticket.username = ticketResponse[i].User.username;
                            ticket.projectID = ticketResponse[i].Project.id;
                            ticket.projectName = ticketResponse[i].Project.name;
                            ticket.projectThumbnailPathUrl = ticketResponse[i].Project.thumbnailPathUrl;
                            ticket.location = ticketResponse[i].Project.Location.name;
                            ticket.typeRoomID = ticketResponse[i].TimeShare.TypeRoom.id;
                            ticket.typeRoomName = ticketResponse[i].TimeShare.TypeRoom.name;
                            ticket.timeShareID = ticketResponse[i].TimeShare.id;
                            ticket.startDate = ticketResponse[i].TimeShare.startDate;
                            ticket.endDate = ticketResponse[i].TimeShare.endDate;
                            response.push(ticket);
                        }
                    }
                }
            }
            resolve({
                err: response.length !== 0 ? 0 : 1,
                message: !projectResponse
                    ? `Project (${id}) does not exist!`
                    : projectResponse.status === 3 ?
                        `Project (${id}) has already checked for priority!`
                        : response.length === 0
                            ? `Can not find any Users have bought Reservation Ticket of Project(${id}) before checkPrority Stage!`
                            : `All Users have bought Reservation Ticket of Project(${id}) before checkPrority Stage.`,
                data: response.length !== 0 ? response : null,
                count: response.length,
                countPages: countPages,
                page: pageInput
            });
        } catch (error) {
            console.log(error);
            reject(error);
        }
    });
};

export const dashboardInTicket = (year) => {
    return new Promise(async (resolve, reject) => {
        try {
            const response = [];
            let theFirstQuarter = await db.ReservationTicket.findAll({
                include: {
                    model: db.Project,
                    include: {
                        model: db.TimeShareDate,
                        where: {
                            completedDate: {
                                [Op.lte]: convertDate(`31/3/${year}`)
                            }
                        }
                    }
                },
                where: {
                    reservationDate: {
                        [Op.gte]: convertDate(`1/1/${year}`)
                    },
                }
            })
            let responseTheFirstQuarter = {}
            responseTheFirstQuarter.quarter = "1"
            responseTheFirstQuarter.date = `1/1/${year} - 31/3/${year}`
            responseTheFirstQuarter.numberOfTicketBought = theFirstQuarter.length

            let secondQuarter = await db.ReservationTicket.findAll({
                // include: {
                //     model: db.Project,
                //     include: {
                //         model: db.TimeShareDate,
                //         where: {
                //             completedDate: {
                //                 [Op.lte]: convertDate(`30/6/${year}`)
                //             }
                //         }
                //     }
                // },
                where: {
                    reservationDate: {
                        [Op.gte]: convertDate(`1/4/${year}`)
                    },
                }
            })
            console.log(secondQuarter.length);
            let responseSecondQuarter = {}
            responseSecondQuarter.quarter = "2"
            responseSecondQuarter.date = `1/4/${year} - 30/6/${year}`
            responseSecondQuarter.numberOfTicketBought = secondQuarter.length

            let thirdQuarter = await db.ReservationTicket.findAll({
                include: {
                    model: db.Project,
                    include: {
                        model: db.TimeShareDate,
                        where: {
                            completedDate: {
                                [Op.lte]: convertDate(`30/9/${year}`)
                            }
                        }
                    }
                },
                where: {
                    reservationDate: {
                        [Op.gte]: convertDate(`1/7/${year}`)
                    },
                }
            })
            let responsethirdQuarter = {}
            responsethirdQuarter.quarter = "3"
            responsethirdQuarter.date = `1/7/${year} - 30/9/${year}`
            responsethirdQuarter.numberOfTicketBought = thirdQuarter.length

            let fourthQuarter = await db.ReservationTicket.findAll({
                include: {
                    model: db.Project,
                    include: {
                        model: db.TimeShareDate,
                        where: {
                            completedDate: {
                                [Op.lte]: convertDate(`31/12/${year}`)
                            }
                        }
                    }
                },
                where: {
                    reservationDate: {
                        [Op.gte]: convertDate(`1/10/${year}`)
                    },
                }
            })
            let responsefourthQuarter = {}
            responsefourthQuarter.quarter = "4"
            responsefourthQuarter.date = `1/10/${year} - 31/12/${year}`
            responsefourthQuarter.numberOfTicketBought = fourthQuarter.length

            if(responseTheFirstQuarter.numberOfTicketBought !== 0 || responseSecondQuarter.numberOfTicketBought !== 0 || responsethirdQuarter.numberOfTicketBought !== 0 || responsefourthQuarter.numberOfTicketBought !== 0){
                response.push(responseTheFirstQuarter);
                response.push(responseSecondQuarter);
                response.push(responsethirdQuarter);
                response.push(responsefourthQuarter);
            }
            resolve({
                err: response.length !== 0 ? 0 : 1,
                message: response.length !== 0 ? "Dashboard" : "Not have enough information to make a dashboard!",
                data: response.length !== 0 ? response : null,
            })

        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}
