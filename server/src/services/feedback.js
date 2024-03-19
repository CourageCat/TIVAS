import db from "../models";
import "dotenv/config";
import { Model, Op, fn, col, literal, where } from "sequelize";
import { pagination } from "../middlewares/pagination";

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
export const addFeedBack = ({
    userID,
    content,
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let feedbackLimit = 0;
            const today = new Date();
            const todayYear = today.getFullYear();
            const todayMonth = today.getMonth() + 1; // Month is zero-indexed, so add 1
            const todayDay = today.getDate();
            let userPermission;
            const userResponse = await db.User.findByPk(userID);
            if (userResponse) {
                userPermission = await db.ReservationTicket.findOne({
                    where: {
                        userID,
                        status: 2
                    }
                })
                if (userPermission) {
                    const { count, rows } = await db.FeedBack.findAndCountAll({
                        where: {
                            userID,
                            createdAt: {
                                [Op.and]: [
                                    where(fn('YEAR', col('createdAt')), '=', todayYear),
                                    where(fn('MONTH', col('createdAt')), '=', todayMonth),
                                    where(fn('DAY', col('createdAt')), '=', todayDay)
                                ]
                            }
                        }
                    });
                    console.log(feedbackLimit);
                    feedbackLimit = count;
                    if (feedbackLimit < 5) {
                        await db.FeedBack.create({
                            userID,
                            content,
                            status: 0
                        })
                    }
                }
            }
            resolve({
                err: feedbackLimit < 5 ? 0 : 1,
                message: !userResponse ?
                    `User (${userID}) does not exist`
                    : !userPermission ?
                        `User must have at least 1 time priority when booking any timeshares to feedback!`
                        : feedbackLimit >= 5 ?
                            `User (${userID}) have already feedbacked more than 5 times on today!`
                            : "Feedback Successfully",
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getAllFeedBackByAdmin = ({
    status,
    page,
    limit,
    orderBy,
    orderType,
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let feedback = [];
            let pageInput = 1;
            let countPages = 0;
            let queries = pagination({ page, limit, orderType, orderBy });
            queries.nest = true;
            const feedbackPagination = await db.FeedBack.findAll({
                include: {
                    model: db.User,
                    attributes: ['id', 'username', 'fullName', 'avatarURL']
                },
                where: (+status === 1) ? {
                    status: 1
                } : {
                    [Op.or]: [
                        {
                            status: 0
                        },
                        {
                            status: 1
                        }
                    ]
                }
            })
            countPages = feedbackPagination.length !== 0 ? 1 : 0;
            if (feedbackPagination.length / queries.limit > 1) {
                countPages = Math.ceil(
                    feedbackPagination.length / queries.limit
                );
            }
            if (page) {
                pageInput = page;
            }
            if (pageInput <= countPages) {
                feedback = await db.FeedBack.findAll({
                    include: {
                        model: db.User,
                        attributes: ['id', 'username', 'fullName', 'avatarURL']
                    },
                    where: (+status === 1) ? {
                        status: 1
                    } : {
                        [Op.or]: [
                            {
                                status: 0
                            },
                            {
                                status: 1
                            }
                        ]
                    },
                    ...queries,
                })
            }
            resolve({
                err: feedback.length !== 0 ? 0 : 1,
                message: feedback.length === 0 ? 'Can not find any feedbacks by Users!' : `All feedbacks by Users`,
                data: feedback.length !== 0 ? feedback : null,
                count: feedback.length,
                countPages: countPages,
                page: pageInput
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const updateShowFeedBack = (feedBackID) => {
    return new Promise(async (resolve, reject) => {
        try {
            let feedBackPosted = 0;
            const feedBackResponse = await db.FeedBack.findOne({
                where: {
                    id: feedBackID
                }
            })
            if (feedBackResponse) {
                if (feedBackResponse.status === 0) {
                    const { count, rows } = await db.FeedBack.findAndCountAll({
                        where: {
                            status: 1,
                        }
                    })

                    feedBackPosted = count;

                    if (feedBackPosted < 5) {
                        await db.FeedBack.update({
                            status: 1
                        }, {
                            where: {
                                id: feedBackID
                            }
                        })
                    }
                } else {
                    await db.FeedBack.update({
                        status: 0
                    }, {
                        where: {
                            id: feedBackID
                        }
                    })
                }
            }
            resolve({
                err: feedBackPosted < 5 ? 0 : 1,
                mess: !feedBackResponse ? `Can not find FeedBack (${feedBackID})!`
                    : feedBackPosted >= 5 ?
                        'Can post only maximum for 5 feedbacks to Users'
                        : feedBackResponse.status === 0 ?
                            'Show feedback to Users successfully.'
                            : 'Unshow feedback to Users successfully.'
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const showFeedBackToUser = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const feedback = await db.FeedBack.findAll({
                include: {
                    model: db.User,
                    attributes: ['id', 'username', 'fullName', 'avatarURL']
                },
                where: {
                    status: 1
                }
            })
            resolve({
                err: feedback.length !== 0 ? 0 : 1,
                message: feedback.length === 0 ? 'Can not find any feedbacks shown to User!' : 'All feedbacks shown to User',
                data: feedback.length !== 0 ? feedback : null
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const deleteFeedBack = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const feedbackResponse = await db.FeedBack.findByPk(id);
            if(feedbackResponse){
                await db.FeedBack.destroy({
                    where: {
                        id,
                    }
                })
            }
            resolve({
                err: feedbackResponse ? 0 : 1,
                message: !feedbackResponse ? `FeedBack (${id}) does not exist!` : 'Delete FeedBack successfully.',
            })
        } catch (error) {
            console.log(error);
            reject(error)
        }
    })
}