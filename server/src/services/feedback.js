import db from "../models";
import "dotenv/config";
import { Model, Op, fn, col, literal } from "sequelize";
import { pagination } from "../middlewares/pagination";

export const addFeedBack = ({
    userID,
    content,
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            const [feedback, created] = await db.FeedBack.findOrCreate({
                defaults: {
                    userID,
                    content,
                    status: 0
                },
                where: {
                    userID,
                    content,
                }
            })
            resolve({
                err: created ? 0 : 1,
                message: created ? "Feedback Successfully" : `Feedback duplicated by User (${userID})`,
                data: created ? feedback : ""
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
            const feedBackResponse = await db.FeedBack.findOne({
                where: {
                    id: feedBackID
                }
            })
            if (feedBackResponse) {
                if (feedBackResponse.status === 0) {
                    await db.FeedBack.update({
                        status: 1
                    }, {
                        where: {
                            id: feedBackID
                        }
                    })
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
                err: feedBackResponse ? 0 : 1,
                mess: !feedBackResponse ? `Can not find FeedBack (${feedBackID})!`
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