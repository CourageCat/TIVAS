import db from "../models";
import "dotenv/config";
import { Model, Op, fn, col, literal } from "sequelize";
import { pagination } from "../middlewares/pagination";

export const rejectBooking = ({
    reservationID
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            const ticket = await db.ReservationTicket.findByPk(reservationID)
            if (ticket) {
                await db.Booking.update({
                    status: -1
                }, {
                    where: {
                        reservationTicketID: ticket.id
                    },
                })

                const timeShareResponse = await db.TimeShare.findByPk(ticket.timeShareID);

                await db.TimeShare.update({
                    quantity: timeShareResponse.quantity + 1
                }, {
                    where: {
                        id: ticket.timeShareID,
                    }
                })

                const timeShareDate = await db.TimeShareDate.findOne({
                    where: {
                        projectID: ticket.projectID
                    },
                    order: [['id', 'DESC']]
                })
                const reservationTicketResponse = await db.ReservationTicket.findAll({
                    include: {
                        model: db.Booking,
                        where: {
                            status: 0
                        }
                    },
                    where: {
                        reservationDate: timeShareDate.reservationDate,
                        projectID: ticket.projectID
                    }
                })
                if (reservationTicketResponse.length === 0) {
                    await db.TimeShareDate.update({
                        status: 1
                    }, {
                        where: {
                            id: timeShareDate.id
                        }
                    })
                    const updateBooking = await db.Booking.findOne({
                        where: {
                            reservationTicketID: reservationID
                        }
                    })
                    await db.TimeShareDate.update({
                        completedDate: updateBooking.updatedAt
                    }, {
                        where: {
                            id: timeShareDate.id
                        }
                    })

                    await db.ReservationTicket.update({
                        completed: 1,
                    }, {
                        where: {
                            reservationDate: timeShareDate.reservationDate,
                            projectID: ticket.projectID
                        }
                    })
                }
            }
            resolve({
                err: ticket ? 0 : 1,
                message: !ticket ?
                    `Reservation does not exist!`
                    : "Reject successfully."
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const completeBooking = ({
    reservationID
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            const ticket = await db.ReservationTicket.findByPk(reservationID)

            if (ticket) {
                await db.Booking.update({
                    status: 1
                }, {
                    where: {
                        reservationTicketID: ticket.id
                    },
                })
                const timeShareDate = await db.TimeShareDate.findOne({
                    where: {
                        projectID: ticket.projectID
                    },
                    order: [['id', 'DESC']]
                })
                console.log(123);
                const reservationTicketResponse = await db.ReservationTicket.findAll({
                    include: {
                        model: db.Booking,
                        where: {
                            status: 0
                        }
                    },
                    where: {
                        reservationDate: timeShareDate.reservationDate,
                        projectID: ticket.projectID
                    }
                })
                if (reservationTicketResponse.length === 0) {
                    await db.TimeShareDate.update({
                        status: 1
                    }, {
                        where: {
                            id: timeShareDate.id
                        }
                    })
                    const updateBooking = await db.Booking.findOne({
                        where: {
                            reservationTicketID: reservationID
                        }
                    })
                    await db.TimeShareDate.update({
                        completedDate: updateBooking.updatedAt
                    }, {
                        where: {
                            id: timeShareDate.id
                        }
                    })
                    await db.ReservationTicket.update({
                        completed: 1,
                    }, {
                        where: {
                            reservationDate: timeShareDate.reservationDate,
                            projectID: ticket.projectID
                        }
                    })
                }
            }
            resolve({
                err: ticket ? 0 : 1,
                message: !ticket ?
                    `Reservation does not exist!`
                    : "Completed successfully."
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}