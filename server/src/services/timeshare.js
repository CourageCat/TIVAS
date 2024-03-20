import db from "../models";
import "dotenv/config";
import { Model, Op, fn, col, literal } from "sequelize";
import { pagination } from "../middlewares/pagination";

const convertDate = (dateString) => {
    const parts = dateString.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    const date = new Date(year, month, day);
    return date;
}

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

export const createNewTimeShare = (
    {
        typeRoomID,
        userID
    }
    ,
    {
        price,
        startDate,
        endDate
    },
) => {
    return new Promise(async (resolve, reject) => {
        try {
            let timeShareQuantity = 0;
            let timeShareDateResponse;
            let errorTime;
            let projectReservated;
            const startDateDB = convertDate(startDate);
            const endDateDB = convertDate(endDate);

            let [timeShare, created] = [];

            //Find TypeRoom in DB
            const typeRoomResponse = await db.TypeRoom.findByPk(typeRoomID, {
                include: {
                    model: db.TypeOfProject,
                    include: {
                        model: db.Project
                    }
                }
            });

            //Find User in DB
            const userResponse = await db.User.findByPk(userID, {
                include: {
                    model: db.RoleCode,
                    attributes: ['roleName'],
                }
            });

            if (typeRoomResponse && userResponse && userResponse.RoleCode.roleName === 'Staff' && typeRoomResponse.TypeOfProject.Project.status === 0) {
                projectReservated = typeRoomResponse.TypeOfProject.Project.reservationDate
                if (projectReservated) {
                    timeShareDateResponse = await db.TimeShareDate.findOne({
                        where: {
                            projectID: typeRoomResponse.TypeOfProject.Project.id,
                            status: 0
                        }
                    })


                    if (!(timeShareDateResponse?.startDate)) {
                        await db.TimeShareDate.update({
                            startDate: startDateDB,
                            endDate: endDateDB,
                        }, {
                            where: {
                                id: timeShareDateResponse.id
                            }
                        })
                    }
                    timeShareQuantity = typeRoomResponse.quantity;
                    //Find all TimeShares that have the same typeroom, startdate, enddate with the TimeShare Created
                    const timeShareDuplicated = await db.TimeShare.findAll({
                        where: {
                            startDate: startDateDB,
                            endDate: endDateDB,
                            typeRoomID,
                        }
                    })
                    if (timeShareDuplicated.length !== 0) {
                        for (let i = 0; i < timeShareDuplicated.length; i++) {
                            timeShareQuantity = timeShareQuantity - (timeShareQuantity - timeShareDuplicated[i].quantity)
                        }
                    }

                    if (timeShareQuantity !== 0) {
                        [timeShare, created] = await db.TimeShare.findOrCreate({
                            where: {
                                typeRoomID,
                                timeShareDateID: timeShareDateResponse.id
                            },
                            defaults: {
                                price,
                                startDate: startDateDB,
                                endDate: endDateDB,
                                userID,
                                saleStatus: 0,
                                typeRoomID,
                                quantity: timeShareQuantity,
                                timeShareDateID: timeShareDateResponse.id
                            },
                        })
                    }
                }
            }
            resolve({
                err: created ? 0 : 1,
                message: !typeRoomResponse ?
                    `Can not find TypeRoom (${typeRoomID})!`
                    : !userResponse ?
                        `Can not find User (${userID})!`
                        : userResponse.RoleCode.roleName !== 'Staff' ?
                            `User (${userID}) is not a staff!`
                            : typeRoomResponse.TypeOfProject.Project.status !== 0 ?
                                `TypeRoom (${typeRoomID}) belongs to Project which is for sales!`
                                : !projectReservated ?
                                    `TypeRoom (${typeRoomID}) does not belong to Project that have reservation info!`
                                    : timeShareQuantity === 0 ?
                                    `TypeRoom (${typeRoomID}) with StartDate (${startDate}) and EndDate (${endDate}) is out of stock!`
                                    : !created ?
                                        `This timeshare is created by this staff or another staff!`
                                        : "Create successfully."
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getAllTimeShare = ({
    page,
    limit,
    orderType,
    orderBy
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = [];
            let pageInput = 1;
            const queries = pagination({ page, limit, orderType, orderBy });
            const timeShareResponse = await db.TimeShare.findAll({
                include: {
                    required: true,
                    model: db.TimeShareDate,
                    attributes: [],
                    where: {
                        status: 0,
                    }
                }
            });
            let countPages = timeShareResponse.length !== 0 ? 1 : 0;
            if (timeShareResponse.length / queries.limit > 1) {
                countPages = Math.ceil(timeShareResponse.length / queries.limit)
            }
            if (page) {
                pageInput = page
            }
            queries.nest = true;
            queries.raw = true;
            if (pageInput <= countPages) {
                response = await db.TimeShare.findAll({
                    attributes: ['id', 'price', 'startDate', 'endDate', 'saleStatus', 'createdAt'],
                    include: [
                        {
                            model: db.TypeRoom,
                            attributes: ['id', 'name', 'persons'],
                            include: {
                                model: db.TypeOfProject,
                                attributes: ['id'],
                                include: {
                                    model: db.Project,
                                    attributes: ['id', 'name', 'thumbnailPathUrl', 'locationID'],
                                    include: {
                                        model: db.Location,
                                        attributes: ['id', 'name']
                                    }
                                }
                            }
                        },
                        {
                            required: true,
                            model: db.TimeShareDate,
                            attributes: [],
                            where: {
                                status: 0,
                            }
                        },
                    ],
                    ...queries,
                })
                if (response.length !== 0) {
                    for (let i = 0; i < response.length; i++) {
                        response[i].location = response[i].TypeRoom.TypeOfProject.Project.Location.name;
                    }
                }
            }
            resolve({
                err: (response.length !== 0) ? 0 : 1,
                message: (response.length !== 0) ? `All TimeShares Result` : `Can not find any TimeShares`,
                data: (response.length !== 0) ? response : null,
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

export const getAllTimeShareOfProject = (projectID, {
    page,
    limit,
    orderBy,
    orderType,
}
) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = {};
            response.Project = {};
            response.list = [];
            let timeShareResponse = [];
            let countPages = 0;
            let pageInput = 1;
            const queries = pagination({ page, limit, orderType, orderBy });
            queries.nest = true;
            queries.raw = true;
            const projectResponse = await db.Project.findByPk(projectID, {
                attributes: ['id', 'name', 'thumbnailPathUrl'],
                include: {
                    model: db.Location,
                    attributes: ['id', 'name']
                }
            });
            queries.nest = true;
            queries.raw = true;
            if (projectResponse) {
                response.Project.name = projectResponse.name;
                response.Project.location = projectResponse.Location.name;
                response.Project.thumbnailPathUrl = projectResponse.thumbnailPathUrl;
                const timeShareResponsePagination = await db.TimeShare.findAll({
                    attributes: [],
                    include: [
                        {
                            model: db.TypeRoom,
                            attributes: [],
                            required: true,
                            include: {
                                model: db.TypeOfProject,
                                attributes: [],
                                where: {
                                    projectID
                                },
                            }
                        },
                        {
                            required: true,
                            model: db.TimeShareDate,
                            attributes: [],
                            where: {
                                status: 0,
                            }
                        }
                    ],
                });
                countPages = timeShareResponsePagination.length !== 0 ? 1 : 0;
                if (timeShareResponsePagination.length / queries.limit > 1) {
                    countPages = Math.ceil(timeShareResponsePagination.length / queries.limit)
                }
                if (page) {
                    pageInput = page
                }
                if (pageInput <= countPages) {
                    timeShareResponse = await db.TimeShare.findAll({
                        raw: true,
                        nest: true,
                        attributes: ['id', 'price', 'startDate', 'endDate', 'saleStatus', 'createdAt'],
                        include: [
                            {
                                model: db.TypeRoom,
                                attributes: ['id', 'name', 'persons'],
                                required: true,
                                include: {
                                    model: db.TypeOfProject,
                                    attributes: ['id'],
                                    where: {
                                        projectID
                                    },
                                    include: {
                                        model: db.Project,
                                        attributes: ['id', 'name', 'thumbnailPathUrl', 'locationID'],
                                        include: {
                                            model: db.Location,
                                            attributes: ['id', 'name']
                                        }
                                    }
                                }
                            },
                            {
                                required: true,
                                model: db.TimeShareDate,
                                attributes: [],
                                where: {
                                    status: 0,
                                }
                            }
                        ],
                        ...queries,
                    })
                    console.log(timeShareResponse);
                    response.list = timeShareResponse;
                }
            } else {
                response.Project = null;
            }

            resolve({
                err: timeShareResponse.length !== 0 ? 0 : 1,
                message: !projectResponse ?
                    `Can not find Project (${projectID})` :
                    !(timeShareResponse.length !== 0) ? `Can not find any TimeShares of Project (${projectID})`
                        : `All TimeShares Of Project (${projectID})'s Result`,
                data: response,
                count: timeShareResponse.length !== 0 ? timeShareResponse.length : 0,
                page: pageInput,
                countPages: countPages,
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getAllTimeShareOfProjectByAdmin = (projectID, {
    page,
    limit,
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = {};
            const projectResponse = await db.Project.findByPk(projectID);
            if (projectResponse) {
                const timeShareSold = await db.TimeShare.findAll({
                    raw: true,
                    nest: true,
                    attributes: ['id', 'price', 'startDate', 'endDate', 'saleStatus', 'createdAt', 'timeShareDateID'],
                    include: [
                        {
                            model: db.TypeRoom,
                            attributes: ['id', 'name', 'persons'],
                            required: true,
                            include: {
                                model: db.TypeOfProject,
                                attributes: ['id'],
                                where: {
                                    projectID
                                },
                                // include: {
                                //     model: db.Project,
                                //     attributes: ['id', 'name', 'thumbnailPathUrl', 'locationID'],
                                //     include: {
                                //         model: db.Location,
                                //         attributes: ['id', 'name']
                                //     }
                                // }
                            }
                        },
                        {
                            required: true,
                            model: db.TimeShareDate,
                            attributes: ['reservationDate', 'closeDate'],
                            where: {
                                status: 1,
                            }
                        }
                    ],
                })
                const timeShareOnSale = await db.TimeShare.findAll({
                    raw: true,
                    nest: true,
                    attributes: ['id', 'price', 'startDate', 'endDate', 'saleStatus', 'createdAt'],
                    include: [
                        {
                            model: db.TypeRoom,
                            attributes: ['id', 'name', 'persons'],
                            required: true,
                            include: {
                                model: db.TypeOfProject,
                                attributes: ['id'],
                                where: {
                                    projectID
                                },
                                // include: {
                                //     model: db.Project,
                                //     attributes: ['id', 'name', 'thumbnailPathUrl', 'locationID'],
                                //     include: {
                                //         model: db.Location,
                                //         attributes: ['id', 'name']
                                //     }
                                // }
                            }
                        },
                        {
                            required: true,
                            model: db.TimeShareDate,
                            attributes: ['reservationDate', 'closeDate'],
                            where: {
                                status: 0,
                            }
                        }
                    ],
                })
                //OnSale
                if (timeShareOnSale.length !== 0) {
                    const dateOnSale = formatDate(timeShareOnSale[0].TimeShareDate.reservationDate) + "-" + formatDate(timeShareOnSale[0].TimeShareDate.closeDate);
                    response.OnSale = [];
                    const onSale = {}
                    onSale.OnSaleDate = dateOnSale;
                    onSale.OnSale = timeShareOnSale;
                    response.OnSale.push(onSale);
                }

                //Sold
                if (timeShareSold.length !== 0) {
                    response.Sold = [];
                    let result = Object.groupBy(timeShareSold, ({ timeShareDateID }) => timeShareDateID)
                    let count1 = 0
                    for (let properties in result) {
                        count1 = count1 + 1
                    }
                    console.log(result);
                    for (let i = 0; i < count1; i++) {
                        console.log(Object.getOwnPropertyNames(result)[i]);
                        const timeShareDate = await db.TimeShareDate.findByPk(Object.getOwnPropertyNames(result)[i]);
                        console.log(timeShareDate);
                        const dateSold = formatDate(timeShareDate.reservationDate) + "-" + formatDate(timeShareDate.closeDate);
                        const sold = {}
                        sold.SoldDate = dateSold;
                        sold.Sold = result[Object.getOwnPropertyNames(result)[i]];
                        response.Sold.push(sold);
                    }
                }
                //response.OnSale = 
                //console.log(timeShareSold);
                //console.log(timeShareOnSale);
            }
            resolve({
                err: 0,
                data: response,
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getAllTimeShareOfSoldReservationStage = ({
    id,
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
            const stage = await db.TimeShareDate.findByPk(id);
            if (stage) {
                const timeShareResponsePagination = await db.TimeShare.findAll({
                    attributes: ['id', 'price', 'startDate', 'endDate', 'saleStatus', 'createdAt'],
                    include: [
                        {
                            model: db.TypeRoom,
                            attributes: ['id', 'name', 'persons'],
                            include: {
                                model: db.TypeOfProject,
                                attributes: ['id'],
                                include: {
                                    model: db.Project,
                                    attributes: ['id', 'name', 'thumbnailPathUrl', 'locationID'],
                                    include: {
                                        model: db.Location,
                                        attributes: ['id', 'name']
                                    }
                                }
                            }
                        },
                        {
                            required: true,
                            model: db.TimeShareDate,
                            attributes: [],
                            where: {
                                id,
                            }
                        },
                    ],
                })
                countPages = timeShareResponsePagination.length !== 0 ? 1 : 0;
                if (timeShareResponsePagination.length / queries.limit > 1) {
                    countPages = Math.ceil(
                        timeShareResponsePagination.length / queries.limit
                    );
                }
                if (page) {
                    pageInput = page;
                }
                if (pageInput <= countPages) {
                    response = await db.TimeShare.findAll({
                        attributes: ['id', 'price', 'startDate', 'endDate', 'saleStatus', 'createdAt'],
                        include: [
                            {
                                model: db.TypeRoom,
                                attributes: ['id', 'name', 'persons'],
                                include: {
                                    model: db.TypeOfProject,
                                    attributes: ['id'],
                                    include: {
                                        model: db.Project,
                                        attributes: ['id', 'name', 'thumbnailPathUrl', 'locationID'],
                                        include: {
                                            model: db.Location,
                                            attributes: ['id', 'name']
                                        }
                                    }
                                }
                            },
                            {
                                required: true,
                                model: db.TimeShareDate,
                                attributes: [],
                                where: {
                                    id,
                                }
                            },
                        ],
                        ...queries,
                    })
                }

            }
            resolve({
                err: response.length !== 0 ? 0 : 1,
                message: !stage ?
                    `Can not find Stage (${id})`
                    : response.length === 0 ?
                        `Can not find any TimeShares in this Sold Reservation Stage`
                        : `All TimeShares in this Sold Reservation Stage`,
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

export const getAllUserPurchasedTimeShare = ({
    id,
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
            const timeShareResponse = await db.TimeShare.findByPk(id);
            if (timeShareResponse) {
                const ticketResponsePagination = await db.ReservationTicket.findAll({
                    include: [
                        {
                            model: db.Booking,
                            where: {
                                status: 1
                            }
                        },
                        {
                            model: db.User,

                        }
                    ],
                    where: {
                        timeShareID: id,
                    }
                })
                countPages = ticketResponsePagination.length !== 0 ? 1 : 0;
                if (ticketResponsePagination.length / queries.limit > 1) {
                    countPages = Math.ceil(
                        ticketResponsePagination.length / queries.limit
                    );
                }
                if (pageInput <= countPages) {
                    const ticketResponse = await db.ReservationTicket.findAll({
                        include: [
                            {
                                model: db.Booking,
                                where: {
                                    status: 1
                                }
                            },
                            {
                                model: db.User,
                            }
                        ],
                        where: {
                            timeShareID: id,
                        },
                        ...queries,
                    })
                    if (ticketResponse.length !== 0) {
                        for (let i = 0; i < ticketResponse.length; i++) {
                            let user = {};
                            user.id = ticketResponse[i].User.id;
                            user.username = ticketResponse[i].User.username;
                            user.fullName = ticketResponse[i].User.fullName;
                            user.avatarURL = ticketResponse[i].User.avatarURL;
                            response.push(user);
                        }
                    }
                }
            }
            resolve({
                err: response.length !== 0 ? 0 : 1,
                message: !timeShareResponse ?
                    `TimeShare (${id}) does not exist!`
                    : response.length === 0 ?
                        `Does not find any Users purchased TimeShare (${id})!`
                        : `All Users purchased TimeShare (${id}).`,
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

export const getDetailsTimeShare = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const response = {};
            const timeShareResponse = await db.TimeShare.findByPk(id, {
                attributes: ['id', 'price', 'startDate', 'endDate', 'saleStatus'],
                nest: true,
                include: {
                    model: db.TypeRoom,
                    attributes: ['id', 'name', 'bedrooms', 'bathrooms', 'persons', 'size', 'bedTypes', 'amenities', 'description'],
                    include: [
                        {
                            model: db.TypeOfProject,
                            attributes: ['id'],
                            required: true,
                            include: {
                                model: db.Project,
                                attributes: ['id', 'name', 'description', 'features', 'attractions', 'reservationPrice', 'openDate', 'status', 'thumbnailPathUrl', 'locationID'],
                                include: [
                                    {
                                        model: db.Image,
                                        attributes: ['pathUrl'],
                                    },
                                    {
                                        model: db.Location,
                                        attributes: ['id', 'name'],
                                    }
                                ]
                            }
                        },
                        {
                            model: db.Image,
                            attributes: ['pathUrl'],
                        }
                    ]
                }
            })

            if (timeShareResponse) {
                response.TimeShare = {
                    id: timeShareResponse.id,
                    price: timeShareResponse.price,
                    startDate: timeShareResponse.startDate,
                    endDate: timeShareResponse.endDate,
                    saleStatus: timeShareResponse.saleStatus,
                }
                response.TypeRoom = {
                    id: timeShareResponse.TypeRoom.id,
                    name: timeShareResponse.TypeRoom.name,
                    bedrooms: timeShareResponse.TypeRoom.bedrooms,
                    bathrooms: timeShareResponse.TypeRoom.bathrooms,
                    persons: timeShareResponse.TypeRoom.persons,
                    size: timeShareResponse.TypeRoom.size,
                    bedTypes: timeShareResponse.TypeRoom.bedTypes?.split(','),
                    amenities: timeShareResponse.TypeRoom.amenities?.split(','),
                    description: timeShareResponse.TypeRoom.description,
                    images: timeShareResponse.TypeRoom.Images,
                };
                response.Project = {
                    id: timeShareResponse.TypeRoom.TypeOfProject.Project.id,
                    name: timeShareResponse.TypeRoom.TypeOfProject.Project.name,
                    description: timeShareResponse.TypeRoom.TypeOfProject.Project.description,
                    location: timeShareResponse.TypeRoom.TypeOfProject.Project.Location.name,
                    features: timeShareResponse.TypeRoom.TypeOfProject.Project.features?.split(','),
                    attraction: timeShareResponse.TypeRoom.TypeOfProject.Project.attractions?.split(','),
                    reservationPrice: timeShareResponse.TypeRoom.TypeOfProject.Project.reservationPrice,
                    openDate: timeShareResponse.TypeRoom.TypeOfProject.Project.openDate,
                    status: timeShareResponse.TypeRoom.TypeOfProject.Project.status,
                    thumbnailPathUrl: timeShareResponse.TypeRoom.TypeOfProject.Project.thumbnailPathUrl,
                    images: timeShareResponse.TypeRoom.TypeOfProject.Project.Images,
                };
            }
            resolve({
                err: response.TimeShare ? 0 : 1,
                message: response.TimeShare ? `TimeShare (${id}) found` : `Can not find TimeShare (${id})`,
                data: response.TimeShare ? response : null,
            })
        } catch (error) {
            console.log(error);
            reject(error)
        }
    })
}

export const getAllTimeShareByStaff = (userID, {
    page,
    limit,
    orderBy,
    orderType,
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let countPages = 0;
            let pageInput = 1;
            const queries = pagination({ page, limit, orderType, orderBy });
            queries.nest = true;
            queries.raw = true;
            let response = [];
            queries.nest = true;
            queries.raw = true;
            const userResponse = await db.User.findByPk(userID, {
                include: [
                    {
                        model: db.RoleCode
                    },
                ]
            });
            if (userResponse && userResponse.RoleCode.roleName === 'Staff') {
                const timeShareResponse = await db.TimeShare.findAll({
                    attributes: [],
                    include: [
                        {
                            model: db.User,
                            attributes: [],
                            where: {
                                id: userID,
                            }
                        },
                    ]
                });
                countPages = timeShareResponse.length !== 0 ? 1 : 0;
                if (timeShareResponse.length / queries.limit > 1) {
                    countPages = Math.ceil(timeShareResponse.length / queries.limit)
                }
                if (page) {
                    pageInput = page
                }
                if (pageInput <= countPages) {
                    response = await db.TimeShare.findAll({
                        raw: true,
                        nest: true,
                        attributes: ['id', 'price', 'startDate', 'endDate', 'saleStatus', 'createdAt'],
                        include: [
                            {
                                model: db.TypeRoom,
                                attributes: ['id', 'name', 'persons'],
                                required: true,
                                include: {
                                    model: db.TypeOfProject,
                                    attributes: ['id'],
                                    include: {
                                        model: db.Project,
                                        attributes: ['id', 'name', 'thumbnailPathUrl', 'locationID'],
                                        include: {
                                            model: db.Location,
                                            attributes: ['id', 'name']
                                        }
                                    }
                                }
                            },
                            {
                                model: db.User,
                                attributes: ['id'],
                                where: {
                                    id: userID,
                                }
                            }
                        ],
                        ...queries,
                    })

                    if (response.length !== 0) {
                        for (let i = 0; i < response.length; i++) {
                            response[i].location = response[i].TypeRoom.TypeOfProject.Project.Location.name;
                        }
                    }
                }
            }
            resolve({
                err: (response.length !== 0) ? 0 : 1,
                message: !userResponse ?
                    `User (${userID}) does not exist!`
                    : !(userResponse.RoleCode.roleName === 'Staff') ?
                        `User (${userID}) is not a staff!`
                        : (response.length !== 0) ? `All TimeShares managed by Staff ${userID} Result` : `Can not find any TimeShares managed by Staff (${userID})`,
                data: (response.length !== 0) ? response : null,
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

export const getAllTimeShareOfProjectByStaff = ({
    projectID,
    userID,
    page,
    limit,
    orderBy,
    orderType,
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let countPages = 0;
            let pageInput = 1;
            const queries = pagination({ page, limit, orderType, orderBy });
            queries.nest = true;
            queries.raw = true;
            let response = [];
            queries.nest = true;
            queries.raw = true;
            const userResponse = await db.User.findByPk(userID, {
                include: {
                    model: db.RoleCode
                }
            });
            const projectResponse = await db.Project.findByPk(projectID);
            if (userResponse && userResponse.RoleCode.roleName === 'Staff' && projectResponse) {
                const timeShareResponse = await db.TimeShare.findAll({
                    attributes: [],
                    include:
                        [
                            {
                                model: db.User,
                                attributes: [],
                                where: {
                                    id: userID,
                                },
                            },
                            {
                                model: db.TypeRoom,
                                attributes: [],
                                required: true,
                                include: {
                                    model: db.TypeOfProject,
                                    attributes: [],
                                    where: {
                                        projectID
                                    },
                                }
                            }
                        ]
                });
                countPages = timeShareResponse.length !== 0 ? 1 : 0;
                if (timeShareResponse.length / queries.limit > 1) {
                    countPages = Math.ceil(timeShareResponse.length / queries.limit)
                }
                if (page) {
                    pageInput = page
                }
                if (pageInput <= countPages) {
                    response = await db.TimeShare.findAll({
                        raw: true,
                        nest: true,
                        attributes: ['id', 'price', 'startDate', 'endDate', 'saleStatus', 'createdAt'],
                        include: [
                            {
                                model: db.TypeRoom,
                                attributes: ['id', 'name', 'persons'],
                                required: true,
                                include: {
                                    model: db.TypeOfProject,
                                    attributes: ['id'],
                                    where: {
                                        projectID
                                    },
                                    include: {
                                        model: db.Project,
                                        attributes: ['id', 'name', 'thumbnailPathUrl', 'locationID'],
                                        include: {
                                            model: db.Location,
                                            attributes: ['id', 'name']
                                        }
                                    }
                                }
                            },
                            {
                                model: db.User,
                                attributes: ['id'],
                                where: {
                                    id: userID,
                                }
                            }
                        ],
                        ...queries,
                    })

                    if (response.length !== 0) {
                        for (let i = 0; i < response.length; i++) {
                            response[i].location = response[i].TypeRoom.TypeOfProject.Project.Location.name;
                        }
                    }
                }
            }
            resolve({
                err: (response.length !== 0) ? 0 : 1,
                message: !userResponse ?
                    `User (${userID}) does not exist!`
                    : !(userResponse.RoleCode.roleName === 'Staff') ?
                        `User (${userID}) is not a staff!`
                        : !projectResponse ?
                            `Project (${projectID}) does not exist!`
                            : (response.length !== 0) ? `All TimeShares of Project (${projectID}) managed by Staff (${userID}) Result` : `Can not find any TimeShares of Project (${projectID}) managed by Staff (${userID})`,
                data: (response.length !== 0) ? response : null,
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

export const getDetailsTimeShareByStaff = ({ id, userID }) => {
    return new Promise(async (resolve, reject) => {
        try {
            const response = {};
            const userResponse = await db.User.findByPk(userID, {
                include: {
                    model: db.RoleCode,
                }
            });
            if (userResponse && userResponse.RoleCode.roleName === 'Staff') {
                const timeShareResponse = await db.TimeShare.findByPk(id, {
                    attributes: ['id', 'price', 'startDate', 'endDate', 'saleStatus'],
                    nest: true,
                    include: [
                        {
                            model: db.TypeRoom,
                            attributes: ['id', 'name', 'bedrooms', 'bathrooms', 'persons', 'size', 'bedTypes', 'amenities', 'description'],
                            include: [
                                {
                                    model: db.TypeOfProject,
                                    attributes: ['id'],
                                    required: true,
                                    include: {
                                        model: db.Project,
                                        attributes: ['id', 'name', 'description', 'features', 'attractions', 'reservationPrice', 'openDate', 'status', 'thumbnailPathUrl', 'locationID'],
                                        include: [
                                            {
                                                model: db.Image,
                                                attributes: ['pathUrl'],
                                            },
                                            {
                                                model: db.Location,
                                                attributes: ['id', 'name'],
                                            }
                                        ]
                                    }
                                },
                                {
                                    model: db.Image,
                                    attributes: ['pathUrl'],
                                },
                            ]
                        },
                        {
                            model: db.User,
                            attributes: ['id'],
                            where: {
                                id: userID,
                            }
                        }
                    ]
                })

                if (timeShareResponse) {
                    response.TimeShare = {
                        id: timeShareResponse.id,
                        price: timeShareResponse.price,
                        startDate: timeShareResponse.startDate,
                        endDate: timeShareResponse.endDate,
                        saleStatus: timeShareResponse.saleStatus,
                    }
                    response.TypeRoom = {
                        id: timeShareResponse.TypeRoom.id,
                        name: timeShareResponse.TypeRoom.name,
                        bedrooms: timeShareResponse.TypeRoom.bedrooms,
                        bathrooms: timeShareResponse.TypeRoom.bathrooms,
                        persons: timeShareResponse.TypeRoom.persons,
                        size: timeShareResponse.TypeRoom.size,
                        bedTypes: timeShareResponse.TypeRoom.bedTypes?.split(','),
                        amenities: timeShareResponse.TypeRoom.amenities?.split(','),
                        description: timeShareResponse.TypeRoom.description,
                        images: timeShareResponse.TypeRoom.Images,
                    };
                    response.Project = {
                        id: timeShareResponse.TypeRoom.TypeOfProject.Project.id,
                        name: timeShareResponse.TypeRoom.TypeOfProject.Project.name,
                        description: timeShareResponse.TypeRoom.TypeOfProject.Project.description,
                        location: timeShareResponse.TypeRoom.TypeOfProject.Project.Location.name,
                        features: timeShareResponse.TypeRoom.TypeOfProject.Project.features?.split(','),
                        attraction: timeShareResponse.TypeRoom.TypeOfProject.Project.attractions?.split(','),
                        reservationPrice: timeShareResponse.TypeRoom.TypeOfProject.Project.reservationPrice,
                        openDate: timeShareResponse.TypeRoom.TypeOfProject.Project.openDate,
                        status: timeShareResponse.TypeRoom.TypeOfProject.Project.status,
                        thumbnailPathUrl: timeShareResponse.TypeRoom.TypeOfProject.Project.thumbnailPathUrl,
                        images: timeShareResponse.TypeRoom.TypeOfProject.Project.Images,
                    };
                }
            }
            resolve({
                err: response.TimeShare ? 0 : 1,
                message: !userResponse ?
                    `User (${userID}) does not exist!`
                    : userResponse.RoleCode.roleName !== 'Staff' ?
                        `User (${userID}) is not a staff!`
                        : response.TimeShare ? `TimeShare (${id}) managed by Staff (${userID}) found` : `Can not find TimeShare (${id}) or TimeShare(${id}) is not managed by Staff (${userID})`,
                data: response.TimeShare ? response : null,
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}