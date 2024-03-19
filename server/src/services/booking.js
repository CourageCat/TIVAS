import db from "../models";
import "dotenv/config";
import { Model, Op, fn, col, literal } from "sequelize";
import { pagination } from "../middlewares/pagination";

export const rejectBooking = ({
    userID,
    timeShareID,
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userResponse = await db.User.findByPk(userID);
            const timeShareResponse = await db.TimeShare.findByPk(timeShareID);
            let ticket;
            if (userResponse && timeShareResponse) {
                ticket = await db.ReservationTicket.findOne({
                    where: {
                        userID,
                        timeShareID,
                        status: 2,
                    }
                })
                if (ticket) {
                    await db.Booking.update({
                        status: -1
                    }, {
                        where: {
                            reservationTicketID: ticket.id
                        }
                    })

                    await db.TimeShare.update({
                        quantity: timeShareResponse.quantity + 1
                    }, {
                        where: {
                            id: timeShareID,
                        }
                    })
                }
            }
            resolve({
                err: ticket ? 0 : 1,
                message: !userResponse ?
                    `User (${userID}) does not exist!`
                    : !timeShareResponse ?
                        `TimeShare (${timeShareID}) does not exist!`
                        : !ticket ?
                            `User (${userID}) does not have any booking with TimeShare (${timeShareID})!`
                            : "Reject successfully."
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const completeBooking = ({
    userID,
    timeShareID,
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let ticket;
            const userResponse = await db.User.findByPk(userID);
            const timeShareResponse = await db.TimeShare.findByPk(timeShareID);
            if (userResponse && timeShareResponse) {
                ticket = await db.ReservationTicket.findOne({
                    where: {
                        userID,
                        timeShareID,
                        status: 2,
                    }
                })

                if (ticket) {
                    await db.Booking.update({
                        status: 1
                    }, {
                        where: {
                            reservationTicketID: ticket.id
                        }
                    })
                }
            }
            resolve({
                err: ticket ? 0 : 1,
                message: !userResponse ?
                    `User (${userID}) does not exist!`
                    : !timeShareResponse ?
                        `TimeShare (${timeShareID}) does not exist!`
                        : !ticket ?
                            `User (${userID}) does not have any booking with TimeShare (${timeShareID})!`
                            : "Pay successfully."
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}