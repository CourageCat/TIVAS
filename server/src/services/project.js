import db, { Sequelize } from "../models";
const cloudinary = require('cloudinary').v2;
import "dotenv/config";
import { Model, Op, fn, col, literal, INTEGER } from "sequelize";
import { pagination } from "../middlewares/pagination";
const nodemailer = require("nodemailer");

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

const deleteProjectImage = (fileData) => {
    if (fileData.thumbnail) {
        for (let i = 0; i < fileData.thumbnail.length; i++) {
            cloudinary.uploader.destroy(fileData.thumbnail[i].filename);
        }
    }
    if (fileData.images) {
        for (let i = 0; i < fileData.images.length; i++) {
            cloudinary.uploader.destroy(fileData.images[i].filename);
        }
    }
}

export const createNewProject = ({
    name,
    description,
    location,
    buildingStatus,
    type,
    features,
    attractions,
}, fileData) => {
    return new Promise(async (resolve, reject) => {
        try {
            let typeInDBError = 0;
            const imageProjectArray = [];
            const typeErrorMessage = [];
            let [project, created] = [];
            console.log(created);
            let stringT = type.split(",");
            for (let i = 0; i < stringT.length; i++) {
                let typeInDB = await db.Type.findOne({
                    where: {
                        name: stringT[i]
                    }
                })
                if (!typeInDB) {
                    typeInDBError = typeInDBError + 1;
                    typeErrorMessage.push(stringT[i])
                }
            }
            if (typeInDBError === 0) {
                [project, created] = await db.Project.findOrCreate({
                    where: { name },
                    defaults: {
                        name,
                        description,
                        buildingStatus,
                        features,
                        attractions,
                        status: 0,
                        ordering: 0,
                        thumbnailPathUrl: fileData.thumbnail ? fileData.thumbnail[0].path : null,
                        thumbnailPathName: fileData.thumbnail ? fileData.thumbnail[0].filename : null,
                        locationID: location
                    },
                })
                console.log(created)
                if (created) {
                    for (let i = 0; i < stringT.length; i++) {
                        const TypeOfProject = await db.TypeOfProject.create({
                            projectID: project.id,
                            typeID: stringT[i] == "Villa" ? 1 : 2,
                        })
                    }

                    //Import images to imageTable
                    if (fileData.images) {
                        for (let i = 0; i < fileData.images.length; i++) {
                            const image = {
                                pathUrl: fileData.images[i].path,
                                pathName: fileData.images[i].filename,
                                projectID: project.id
                            }
                            imageProjectArray.push(image);
                        }
                        await db.Image.bulkCreate(imageProjectArray);
                    }
                }
            }
            resolve({
                err: created ? 0 : 1,
                mess: typeInDBError > 0 ?
                    `TypeOfProject: (${typeErrorMessage.join(',')}) not exist!`
                    : created ?
                        "Create Project Successfully."
                        : "Project Name has been used!",
            })
            if (fileData && !created) {
                console.log('123')
                deleteProjectImage(fileData);
            }
        } catch (error) {
            console.log(error);
            reject(error);
            if (fileData) {
                deleteProjectImage(fileData);
            }
        }
    })
}

export const getAllProject = ({ page, limit, orderType, orderBy }) => {
    return new Promise(async (resolve, reject) => {
        try {
            //pagination and limit
            let response = [];
            let pageInput = 1;
            const queries = pagination({ page, limit, orderType, orderBy });
            const projectResponse = await db.Project.findAll();
            let countPages = projectResponse.length !== 0 ? 1 : 0;
            if (projectResponse.length / queries.limit > 1) {
                countPages = Math.ceil(projectResponse.length / queries.limit)
            }
            if (page) {
                pageInput = page
            }
            if (pageInput <= countPages) {
                //queries.raw = true;
                response = await db.Project.findAll({
                    raw: true,
                    nest: true,
                    attributes: ['id', 'name', 'thumbnailPathUrl', 'status', 'buildingStatus', 'reservationDate', 'reservationPrice', 'openDate', 'closeDate', 'features', 'attractions', 'locationID'],
                    include: {
                        model: db.Location,
                        attributes: ['id', 'name']
                    },
                    ...queries,
                })
                console.log(response[0]);
                if (response.length !== 0) {
                    for (let i = 0; i < response.length; i++) {
                        response[i].location = response[i].Location.name;
                        if (response[i].features) {
                            response[i].features = response[i].features.split(',');
                        }
                        if (response[i].attractions) {
                            response[i].attractions = response[i].attractions.split(',');
                        }
                    }
                }
            }
            resolve({
                err: (response.length !== 0) ? 0 : 1,
                message: (response.length !== 0) ? `Get all of projects results` : 'Can not find any projects!',
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

export const getAllWithType = ({ page, limit, orderType, orderBy }) => {
    return new Promise(async (resolve, reject) => {
        try {
            //pagination and limit
            let response = [];
            let projectResponse = [];
            let pageInput = 1;
            const queries = pagination({ page, limit, orderType, orderBy });
            const projectResponsePagination = await db.Project.findAll();
            let countPages = projectResponsePagination.length !== 0 ? 1 : 0;
            if (projectResponsePagination.length / queries.limit > 1) {
                countPages = Math.ceil(projectResponsePagination.length / queries.limit)
            }
            if (page) {
                pageInput = page
            }
            if (pageInput <= countPages) {
                //queries.raw = true;
                projectResponse = await db.Project.findAll({
                    //raw: true,
                    nest: true,
                    attributes: ['id', 'name', 'thumbnailPathUrl', 'status', 'buildingStatus', 'reservationDate', 'reservationPrice', 'openDate', 'closeDate', 'features', 'attractions', 'locationID'],
                    include: [
                        {
                            model: db.Location,
                            attributes: ['id', 'name']
                        },
                        {
                            model: db.TypeOfProject,
                            include: {
                                model: db.Type
                            }
                        },
                    ],
                    ...queries,
                })
                console.log(projectResponse[0].TypeOfProjects.length);
                if (projectResponse.length !== 0) {
                    for (let i = 0; i < projectResponse.length; i++) {
                        //response[i].location = response[i].Location.name;
                        const project = {};
                        if (projectResponse[i].features) {
                            project.features = projectResponse[i].features.split(',');
                        }
                        if (projectResponse[i].attractions) {
                            project.attractions = projectResponse[i].attractions.split(',');
                        }
                        project.id = projectResponse[i].id;
                        project.name = projectResponse[i].name;
                        project.thumbnailPathUrl = projectResponse[i].thumbnailPathUrl;
                        project.status = projectResponse[i].status;
                        project.buildingStatus = projectResponse[i].buildingStatus;
                        project.reservationDate = projectResponse[i].reservationDate;
                        project.reservationPrice = projectResponse[i].reservationPrice;
                        project.openDate = projectResponse[i].openDate;
                        project.closeDate = projectResponse[i].closeDate;
                        project.features = projectResponse[i].features;
                        project.attractions = projectResponse[i].attractions;
                        project.location = projectResponse[i].Location.name;
                        project.typeOfProject = [];
                        for (let j = 0; j < projectResponse[i].TypeOfProjects.length; j++) {
                            project.typeOfProject.push(projectResponse[i].TypeOfProjects[j].Type.name)
                        }
                        response.push(project);
                    }
                }
            }
            resolve({
                err: (response.length !== 0) ? 0 : 1,
                message: (response.length !== 0) ? `Get all of projects results` : 'Can not find any projects!',
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

export const getAllByLocation = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await db.Project.findAll({
                raw: true,
                nest: true,
                where: {
                    locationID: id,
                },
                include: {
                    model: db.Location,
                    attributes: ['id', 'name']
                },
            })
            if (response.length !== 0) {
                for (let i = 0; i < response.length; i++) {
                    response[i].location = response[i].Location.name;
                }
            }
            resolve({
                err: response.length !== 0 ? 0 : 1,
                message: response.length !== 0 ? 'All Locations' : 'Can not find any Location',
                data: response.length !== 0 ? response : null,
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }

    })
}

export const deleteProject = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const projectRespone = await db.Project.findByPk(id);
            if (projectRespone) {
                cloudinary.uploader.destroy(projectRespone.thumbnailPathName);
                const imageProject = await db.Image.findAll({
                    where: {
                        projectID: id
                    }
                })
                if (imageProject) {
                    Promise.all(imageProject.map((image) => {
                        cloudinary.uploader.destroy(image.pathName);
                    }))
                }
                await projectRespone.destroy();
            }
            resolve({
                err: projectRespone ? 0 : 1,
                message: projectRespone ? 'Deleted Successfully.' : `Can not find Project with id: ${id}`
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const updateProject = ({
    name,
    description,
    location,
    buildingStatus,
    features,
    attractions,
    thumbnailDeleted,
    imagesDeleted,
}, id, fileData) => {
    return new Promise(async (resolve, reject) => {
        try {
            let nameDuplicated;
            let locationDB;
            let imageErrorMessage = [];
            const imageProjectArray = [];
            //Check TypeRoom is existed in DB
            let projectResult = await db.Project.findByPk(id);
            if (projectResult) {

                if (projectResult.name !== name) {
                    nameDuplicated = await db.Project.findOne({
                        where: {
                            name
                        }
                    })
                }
                if (!nameDuplicated) {
                    //Delete images
                    if (imagesDeleted) {
                        imagesDeleted = imagesDeleted.split(',');
                        await Promise.all(imagesDeleted.map(async (image) => {
                            const imageResult = await db.Image.findByPk(image);
                            if (imageResult) {
                                cloudinary.uploader.destroy(imageResult.pathName);
                                await db.Image.destroy({
                                    where: {
                                        id: image
                                    }
                                });

                            }
                            else {
                                imageErrorMessage.push(`(${image})`);
                            }
                        }));
                    }

                    //Delete or Update thumbnail
                    if ((parseInt(thumbnailDeleted) === 1) || fileData.thumbnail) {
                        cloudinary.uploader.destroy(projectResult.thumbnailPathName);
                    }

                    //Update
                    await db.Project.update({
                        name,
                        description,
                        buildingStatus,
                        features,
                        attractions,
                        thumbnailPathUrl: fileData.thumbnail ? fileData.thumbnail[0].path : (parseInt(thumbnailDeleted) === 1) ? null : projectResult.thumbnailPathUrl,
                        thumbnailPathName: fileData.thumbnail ? fileData.thumbnail[0].filename : (parseInt(thumbnailDeleted) === 1) ? null : projectResult.thumbnailPathName,
                        locationID: location,
                    }, {
                        where: {
                            id: id,
                        }
                    })

                    //Import images to imageTable
                    if (fileData.images) {
                        for (let i = 0; i < fileData.images.length; i++) {
                            const image = {
                                pathUrl: fileData.images[i].path,
                                pathName: fileData.images[i].filename,
                                projectID: id
                            }
                            imageProjectArray.push(image);
                        }
                        await db.Image.bulkCreate(imageProjectArray);
                    }

                    if (!projectResult && fileData) {
                        deleteProjectImage(fileData);
                    }
                }
            }
            resolve({
                err: !nameDuplicated ? 0 : 1,
                message: !projectResult ?
                    `Can not find Project with id: (${id})`
                    : nameDuplicated ?
                        'Project Name has been used!'
                        : 'Update Successfully.',
                messageImage: imageErrorMessage.length !== 0 ? `Can not find Image: ${imageErrorMessage.join(',')}` : null,
            });
        } catch (error) {
            reject(error);
            console.log(error);
            if (fileData) {
                deleteProjectImage(fileData);
            }
        }
    })
}

export const searchProject = ({ info, searchBy, page, limit, orderBy, orderType, type }) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = [];
            let pageInput = 1;
            let searchByDB = searchBy.split(',');
            if (type) {
                type = type.split(",");
            }
            let locationDB;
            //condition clause
            const whereClause = {};
            for (let i = 0; i < searchByDB.length; i++) {
                if (searchByDB[i] !== 'location') {
                    whereClause[searchByDB[i]] = { [Op.substring]: info };
                } else {
                    locationDB = info;
                }
            }
            console.log(whereClause);
            const queries = pagination({ page, limit, orderType, orderBy });
            const projectResponse = await db.Project.findAll({
                raw: true,
                nest: true,
                where: whereClause,
                attributes: ['id', 'name', 'thumbnailPathUrl', 'status', 'buildingStatus', 'reservationDate', 'reservationPrice', 'openDate', 'closeDate', 'closeDate', 'features', 'attractions', 'locationID'],
                include: [
                    {
                        model: db.TypeOfProject,
                        as: 'TypeOfProjects',
                        required: true,
                        attributes: [], // Assuming you want to exclude TypeOfProject attributes from the result
                        include: {
                            model: db.Type,
                            as: 'Type',
                            attributes: [], // Assuming you want to exclude Type attributes from the result
                            where: {
                                name: {
                                    [Op.in]: type ? type : ['Villa', 'Hotel']
                                }
                            }
                        },
                    },
                    {
                        model: db.Location,
                        attributes: [],
                        where: locationDB ? {
                            name: { [Op.substring]: locationDB },
                        } : {}
                    }
                ],
                group: ['TypeOfProjects.projectID', 'Project.name', 'Project.locationID', 'Project.thumbnailPathUrl', 'Project.id'],
                having: type ? (literal(`COUNT(TypeOfProjects.projectID) = ${type.length}`)) : literal((`COUNT(TypeOfProjects.projectID) > 0`)),
                subQuery: false,
            });
            let countPages = projectResponse.length !== 0 ? 1 : 0;
            if (projectResponse.length / queries.limit > 1) {
                countPages = Math.ceil(projectResponse.length / queries.limit)
            }
            if (page) {
                pageInput = page
            }

            //pagination and limit
            queries.raw = true;
            if (pageInput <= countPages) {
                response = await db.Project.findAll({
                    raw: true,
                    nest: true,
                    where: whereClause,
                    attributes: ['id', 'name', 'thumbnailPathUrl', 'status', 'buildingStatus', 'reservationDate', 'reservationPrice', 'openDate', 'closeDate', 'closeDate', 'features', 'attractions', 'locationID'],
                    include: [
                        {
                            model: db.TypeOfProject,
                            as: 'TypeOfProjects',
                            required: true,
                            attributes: [], // Assuming you want to exclude TypeOfProject attributes from the result
                            include: {
                                model: db.Type,
                                as: 'Type',
                                attributes: [], // Assuming you want to exclude Type attributes from the result
                                where: {
                                    name: {
                                        [Op.in]: type ? type : ['Villa', 'Hotel']
                                    }
                                }
                            },
                        },
                        {
                            model: db.Location,
                            attributes: ['id', 'name'],
                            where: locationDB ? {
                                name: { [Op.substring]: locationDB },
                            } : {}
                        }
                    ],
                    group: ['TypeOfProjects.projectID', 'Project.name', 'Project.locationID', 'Project.thumbnailPathUrl', 'Project.id'],
                    having: type ? (literal(`COUNT(TypeOfProjects.projectID) = ${type.length}`)) : literal((`COUNT(TypeOfProjects.projectID) > 0`)),
                    subQuery: false,
                    ...queries
                });
                if (response.length !== 0) {
                    for (let i = 0; i < response.length; i++) {
                        response[i].location = response[i].Location.name;
                        if (response[i].features) {
                            response[i].features = response[i].features.split(',');
                        }
                        if (response[i].attractions) {
                            response[i].attractions = response[i].attractions.split(',');
                        }
                    }
                }
            }
            resolve({
                err: (response.length !== 0) ? 0 : 1,
                mess: (response.length !== 0) ? `Search Projects Results` : "Can not find any Projects!",
                data: (response.length !== 0) ? response : null,
                count: response.length !== 0 ? response.length : 0,
                countPages: countPages,
                page: pageInput
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const searchNameAndLocationProject = (info, limit) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response;
            const bestMatch = await db.Project.findAll({
                nest: true,
                raw: true,
                attributes: ['id', 'name', 'thumbnailPathUrl'],
                where: {
                    name: { [Op.substring]: info },
                },
                include: {
                    model: db.Location,
                    attributes: ['id', 'name'],
                    where: {
                        name: { [Op.substring]: info }
                    }
                },
                limit: 1,
            })
            const projectByNameResponse = await db.Project.findAll({
                nest: true,
                raw: true,
                attributes: ['id', 'name', 'thumbnailPathUrl'],
                include: {
                    model: db.Location,
                    attributes: ['id', 'name'],
                },
                where: {
                    name: { [Op.substring]: info }
                },
                limit,
            })
            const projectByLocationResponse = await db.Project.findAll({
                nest: true,
                raw: true,
                attributes: ['id', 'name', 'thumbnailPathUrl'],
                include: {
                    model: db.Location,
                    attributes: ['id', 'name'],
                    where: {
                        name: { [Op.substring]: info }
                    }
                },
                limit,
            })
            if (bestMatch.length !== 0 || projectByNameResponse.length !== 0 || projectByLocationResponse.length !== 0) {
                response = {};
                response.bestMatch = bestMatch
                response.ProjectName = projectByNameResponse;
                response.ProjectLocation = projectByLocationResponse;
            }
            resolve({
                err: response ? 0 : 1,
                message: response ? 'Search Projects Results' : 'Can not find any Project!',
                data: response ? response : null,
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getTop10 = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await db.Project.findAll({
                raw: true,
                nest: true,
                attributes: ['id', 'name', 'status', 'buildingStatus', 'reservationDate', 'thumbnailPathUrl', 'createdAt', 'reservationPrice', 'openDate', 'closeDate', 'features', 'attractions', 'locationID'],
                include: {
                    model: db.Location,
                    attributes: ['id', 'name'],
                },
                limit: 10,
                order: [['createdAt', 'DESC']],
            })
            if (response.length !== 0) {
                console.log(123);
                for (let i = 0; i < response.length; i++) {
                    response[i].location = response[i].Location.name;
                    if (response[i].features) {
                        response[i].features = response[i].features.split(',');
                    }
                    if (response[i].attractions) {
                        response[i].attractions = response[i].attractions.split(',');
                    }
                }
            }
            resolve({
                err: (response.length !== 0) ? 0 : 1,
                mess: (response.length !== 0) ? "Get top 10 new projects results" : "Can not find any Projects!",
                data: (response.length !== 0) ? response : null,
                count: response.length,
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getDetailsProject = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const response = {};
            const projectResponse = await db.Project.findByPk(id, {
                attributes: { exclude: ['createdAt', 'updatedAt', 'thumbnailPathName'] },
                nest: true,
                //raw: true,
                include: [
                    {
                        model: db.TypeOfProject,
                        attributes: ['id'],
                        where: {
                            projectID: id,
                        },
                        include: [
                            {
                                model: db.TypeRoom,
                                attributes: ['id', 'name', 'bedrooms', 'bathrooms', 'persons', 'size', 'bedTypes', 'amenities'],
                                include: [
                                    {
                                        model: db.Image,
                                        attributes: ['id', 'pathUrl'],
                                        limit: 1,
                                    },
                                ],
                            },
                            {
                                model: db.Type,
                                attributes: ['name'],
                            },
                        ],
                        order: [['id', 'ASC']],
                    },
                    {
                        nest: true,
                        model: db.Image,
                        attributes: ['id', 'pathUrl'],
                    },
                    {
                        nest: true,
                        model: db.Location,
                        attributes: ['id', 'name']
                    },
                ],
            },
            );

            if (projectResponse) {
                let type = "";
                if (projectResponse.TypeOfProjects.length !== 2) {
                    type = projectResponse.TypeOfProjects[0].Type.name
                } else {
                    type = "Villa and Hotel";
                }
                response.Project = {
                    id: projectResponse.id,
                    name: projectResponse.name,
                    description: projectResponse.description,
                    buildingStatus: projectResponse.buildingStatus,
                    location: projectResponse.Location.name,
                    features: projectResponse.features?.split(','),
                    attractions: projectResponse.attractions?.split(','),
                    type: type,
                    saleStatus: projectResponse.saleStatus,
                    status: projectResponse.status,
                    reservationPrice: projectResponse.reservationPrice,
                    openDate: projectResponse.openDate,
                    thumbnailPathUrl: projectResponse.thumbnailPathUrl,
                    images: projectResponse.Images
                }

                response.TypeRoom = [];
                for (let i = 0; i < projectResponse.TypeOfProjects.length; i++) {
                    for (let j = 0; j < projectResponse.TypeOfProjects[i].TypeRooms.length; j++) {
                        response.TypeRoom.push({
                            id: projectResponse.TypeOfProjects[i].TypeRooms[j].id,
                            name: projectResponse.TypeOfProjects[i].TypeRooms[j].name,
                            bedrooms: projectResponse.TypeOfProjects[i].TypeRooms[j].bedrooms,
                            bathrooms: projectResponse.TypeOfProjects[i].TypeRooms[j].bathrooms,
                            persons: projectResponse.TypeOfProjects[i].TypeRooms[j].persons,
                            bedTypes: projectResponse.TypeOfProjects[i].TypeRooms[j].bedTypes.split(','),
                            amenities: projectResponse.TypeOfProjects[i].TypeRooms[j].amenities?.split(','),
                            size: projectResponse.TypeOfProjects[i].TypeRooms[j].size,
                            images: projectResponse.TypeOfProjects[i].TypeRooms[j].Images
                        })
                    }

                }


                // response.Project = {

                // }
                // response.TypeRoom = {

                // }
                // if (response.Project.features) {
                //     response.Project.features = response.Project.features.split(',')
                // }
                // if (response.Project.attractions) {
                //     response.Project.attractions = response.Project.attractions.split(',')
                // }
                // if (typeRoomResponse) {
                //     response.typeRooms = typeRoomResponse;
                //     for (let i = 0; i < response.typeRooms.length; i++) {
                //         if (response.typeRooms[i].bedTypes) {
                //             response.typeRooms[i].bedTypes = response.typeRooms[i].bedTypes.split(',');
                //         }
                //         if (response.typeRooms[i].amenities) {
                //             response.typeRooms[i].amenities = response.typeRooms[i].amenities.split(',');
                //         }

                //     }
                // }
            }
            resolve({
                err: response ? 0 : 1,
                message: response ? `Project ${id} found` : `Can not find Project with id: ${id}!`,
                data: response ? response : null,
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getTypeOfProject = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            let typeResponse = [];
            const projectResponse = await db.Project.findByPk(id);
            if (projectResponse) {
                typeResponse = await db.Type.findAll({
                    attributes: ['name'],
                    include: {
                        model: db.TypeOfProject,
                        attributes: [],
                        where: {
                            projectID: id,
                        }
                    }
                })
            }
            resolve({
                err: typeResponse.length !== 0 ? 0 : 1,
                message: !projectResponse ?
                    `Project (${id}) does not exist!`
                    : typeResponse.length === 0 ?
                        `Can not find any type of project (${id})`
                        : `Type of project (${id}).`,
                data: typeResponse,
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const updateBooking = ({
    openDate,
    closeDate
}, id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const projectResponse = await db.Project.findByPk(id);
            if (projectResponse) {
                if (!(projectResponse.status === 2 && (projectResponse.openDate.getTime() !== convertDate(openDate).getTime() || projectResponse.closeDate.getTime() !== convertDate(closeDate).getTime()))) {
                    await db.Project.update({
                        openDate: convertDate(openDate),
                        closeDate: convertDate(closeDate)
                    }, {
                        where: {
                            id,
                        }
                    })
                    await db.TimeShareDate.update({
                        openDate: convertDate(openDate),
                        closeDate: convertDate(closeDate)
                    }, {
                        where: {
                            projectID: id,
                            status: 0
                        }
                    })
                    await db.ReservationTicket.update({
                        openDate: convertDate(openDate),
                        closeDate: convertDate(closeDate)
                    }, {
                        where: {
                            reservationDate: projectResponse.reservationDate,
                            projectID: id,
                        }
                    })

                    if (projectResponse.status === 1) {

                        const user = await db.ReservationTicket.findAll({
                            where: {
                                projectID: id,
                                status: 1
                            }
                        })
                        const result = Object.groupBy(user, ({ userID }) => userID)
                        let count1 = 0
                        for (let properties in result) {
                            count1 = count1 + 1
                        }
                        for (let i = 0; i < count1; i++) {
                            const user1 = await db.User.findByPk(Object.getOwnPropertyNames(result)[i])
                            let transporter = nodemailer.createTransport({
                                service: "gmail",
                                auth: {
                                    user: process.env.GOOGE_APP_EMAIL,
                                    pass: process.env.GOOGLE_APP_PASSWORD,
                                },
                            });
                            let mailOptions = {
                                from: "Tivas",
                                to: `${user1.email}`,
                                subject: "Confirm received email",
                                text: projectResponse.openDate?.getTime() !== convertDate(openDate).getTime() && projectResponse.closeDate?.getTime() !== convertDate(closeDate).getTime() ?
                                    `Open date of ${projectResponse.name} is move to ${openDate} and Close date of ${projectResponse.name} is move to ${closeDate}`
                                    : projectResponse.openDate?.getTime() !== convertDate(openDate).getTime() ?
                                        `Open date of ${projectResponse.name} is move to ${openDate}`
                                        : `Close date of ${projectResponse.name} is move to ${closeDate}`

                            };
                            console.log(user1.id);
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
            resolve({
                err: !(projectResponse.status === 2 && (projectResponse.openDate.getTime() !== convertDate(openDate).getTime() || projectResponse.closeDate.getTime() !== convertDate(closeDate).getTime())) ? 0 : 1,
                mess: !projectResponse ?
                    `Project (${id}) does not exist!`
                    : (projectResponse.status === 2 && (projectResponse.openDate.getTime() !== convertDate(openDate).getTime() || projectResponse.closeDate.getTime() !== convertDate(closeDate).getTime())) ?
                        `Can not update Open date or Close date because Project(${id}) is already opened for booking!` :
                        `Update booking for Project (${id}) successfully.`
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}


export const openReservationTicket = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const message = [];
            let timeShareResponse = [];
            const dateNow = new Date().toDateString()
            const check = await db.Project.findByPk(id)
            if (check) {
                if (check.status === 0) {
                    const timeShareDateResponse = await db.TimeShareDate.findOne({
                        where: {
                            projectID: id,
                        },
                        order: [['id', 'DESC']]
                    })
                    console.log(timeShareDateResponse.id);
                    timeShareResponse = await db.TimeShare.findAll({
                        where: {
                            timeShareDateID: timeShareDateResponse.id,
                        }
                    })
                    // if(check.reservationDate !== dateNow){
                    //     message.push("not in the time to buy")
                    // }else{
                    if (timeShareResponse.length !== 0) {
                        await db.Project.update({
                            status: 1,
                        }, {
                            where: {
                                id
                            }
                        })
                    }
                    // }
                }
            }
            resolve({
                err: timeShareResponse.length !== 0 ? 0 : 1,
                mess: !check ?
                    `Project (${id}) does not exist!`
                    : check.status !== 0 ?
                        `Project (${id}) has already opened for reservation`
                        : timeShareResponse.length === 0 ?
                            `Project (${id}) does not have any TimeShares!`
                            : `You can buy reservation ticket in Project (${id}) now`
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const openBooking = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const message = [];
            //const dateNow = new Date().toDateString()
            const check = await db.Project.findByPk(id)
            //console.log(check.openDate < dateNow);
            if (check) {
                if (check.status !== 2) {
                    // if(check.openDate !== dateNow){
                    //     message.push("not in the time to buy")
                    // }else{
                    await db.Project.update({
                        status: 2,
                    }, {
                        where: {
                            id
                        }
                    })
                    const timeShareDatesResponse = await db.TimeShareDate.findOne({
                        where: {
                            projectID: id,
                            status: 0,
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
                            timeShare.saleStatus = 1;
                        });

                        // Save changes back to the database
                        await Promise.all(timeSharesToUpdate.map((timeShare) => timeShare.save()));
                    }
                    message.push("This project is open now")
                } else {
                    message.push(`Project (${id}) is already opened for booking!`)
                }
                // }
            } else {
                message.push(`Project (${id}) does not exist!`);

            }
            resolve({
                err: (check && check.status !== 2) ? 0 : 1,
                mess: (check && check.status !== 2) ? message[0] : message[0]
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

// export const updateReservation = ({
//     reservationDate,
//     reservationPrice
// }, id) => {
//     return new Promise(async (resolve, reject) => {
//         try {

//             resolve({
//                 err: 
//                 message: !projectResponse ?
//                 `Project (${id}) does not exist!`:
//                 projectResponse.status === 1 && (reservationDate || reservationPrice) ?
//                 `Can not update Reservation Date or Reservation Price because Project(${id}) is already opened for reservation!`
//                 : projectResponse.status === 2 && (openDate || closeDate || reservationDate || reservationPrice) ?
//                 `Can not update Reservation Date or Reservation Price or Open date or Close date because Project(${id}) is already opened for booking!`
//             })

//         } catch (error) {
//             console.log(error);
//             reject(error);
//         }
//     })
// }

export const getReservation = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = {};
            const projectResponse = await db.Project.findByPk(id);
            if (projectResponse) {
                response.reservationDate = projectResponse.reservationDate;
                response.reservationPrice = projectResponse.reservationPrice;
                response.openDate = projectResponse.openDate;
                response.closeDate = projectResponse.closeDate;
            }
            resolve({
                err: response.reservationDate ? 0 : 1,
                message: response.reservationDate ? `Project (${id})'s reservation info.` : `Project(${id}) does not have any reservation info!`,
                data: response.reservationDate ? response : null,
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const updateReservationInfo = (id, { reservationDate, reservationPrice }) => {
    return new Promise(async (resolve, reject) => {
        try {
            const projectResponse = await db.Project.findByPk(id)
            //const message = [];
            //const dateNow = new Date().toDateString()
            if (projectResponse) {
                if (projectResponse.status === 0 || projectResponse.status === 3) {
                    if (projectResponse.status === 3) {
                        await db.Project.update({
                            status: 0
                        }, {
                            where: {
                                id,
                            }
                        })
                        await db.Project.update({
                            reservationDate: convertDate(reservationDate),
                            reservationPrice,
                            openDate: null,
                            closeDate: null
                        }, {
                            where: {
                                id
                            }
                        })
                    }
                    await db.Project.update({
                        reservationDate: convertDate(reservationDate),
                        reservationPrice,
                    }, {
                        where: {
                            id
                        }
                    })
                    const timeShareDatesResponse = await db.TimeShareDate.findOne({
                        where: {
                            projectID: id,
                            status: 0
                        }
                    })
                    console.log(timeShareDatesResponse);
                    if (timeShareDatesResponse) {
                        await db.TimeShareDate.update({
                            reservationDate: convertDate(reservationDate),
                            reservationPrice,
                        }, {
                            where: {
                                projectID: id,
                                status: 0,
                            }
                        })
                        await db.ReservationTicket.update({
                            reservationDate: convertDate(reservationDate),
                            reservationPrice,
                        }, {
                            where: {
                                reservationDate: timeShareDatesResponse.reservationDate,
                            }
                        })
                    } else {
                        const timeShareDatesCreated = await db.TimeShareDate.create({
                            reservationDate: convertDate(reservationDate),
                            reservationPrice,
                            projectID: id,
                            status: 0,
                        })
                        await db.ReservationTicket.update({
                            reservationDate: convertDate(reservationDate),
                            reservationPrice,
                        }, {
                            where: {
                                reservationDate: timeShareDatesCreated.reservationDate,
                            }
                        })
                    }
                }
                //  else if (projectResponse.status === 1) {
                //     await db.Project.update({
                //         openDate: openDate? openDateconvertDate(openDate) : null,
                //         closeDate: closeDate? convertDate(closeDate): null,
                //     }, {
                //         where: {
                //             id
                //         }
                //     })
                //     await db.TimeShareDate.update({
                //         openDate: openDate? openDateconvertDate(openDate) : null,
                //         closeDate: closeDate? convertDate(closeDate): null,
                //     }, {
                //         where: {
                //             projectID: id,
                //             status: 0
                //         }
                //     })
                //     await db.ReservationTicket.update({
                //         openDate: openDate? openDateconvertDate(openDate) : null,
                //         closeDate: closeDate? convertDate(closeDate): null,
                //     }, {
                //         where: {
                //             reservationDate: projectResponse.reservationDate,
                //             closeDate: projectResponse.closeDate,
                //         }
                //     })
                // }
                // if (((projectResponse.openDate?.getTime() !== convertDate(openDate).getTime()) || (projectResponse.closeDate?.getTime() !== convertDate(closeDate).getTime())) && projectResponse.status === 1) {
                //     const user = await db.ReservationTicket.findAll({
                //         where: {
                //             projectID: id,
                //             status: 1
                //         }
                //     })
                //     const result = Object.groupBy(user, ({ userID }) => userID)
                //     let count1 = 0
                //     for (let properties in result) {
                //         count1 = count1 + 1
                //     }
                //     for (let i = 0; i < count1; i++) {
                //         const user1 = await db.User.findByPk(Object.getOwnPropertyNames(result)[i])
                //         let transporter = nodemailer.createTransport({
                //             service: "gmail",
                //             auth: {
                //                 user: process.env.GOOGE_APP_EMAIL,
                //                 pass: process.env.GOOGLE_APP_PASSWORD,
                //             },
                //         });
                //         let mailOptions = {
                //             from: "Tivas",
                //             to: `${user1.email}`,
                //             subject: "Confirm received email",
                //             text: projectResponse.openDate?.getTime() !== convertDate(openDate).getTime() && projectResponse.closeDate?.getTime() !== convertDate(closeDate).getTime() ?
                //                 `Open date of ${projectResponse.name} is move to ${openDate} and Close date of ${projectResponse.name} is move to ${closeDate}`
                //                 : projectResponse.openDate?.getTime() !== convertDate(openDate).getTime() ?
                //                     `Open date of ${projectResponse.name} is move to ${openDate}`
                //                     : `Close date of ${projectResponse.name} is move to ${closeDate}`

                //         };
                //         console.log(user1.id);
                //         transporter.sendMail(mailOptions, function (error, info) {
                //             if (error) {
                //                 console.log(error);
                //             } else {
                //                 console.log("Email sent: " + info.response);
                //             }
                //         });
                //     }
                // }
            }
            resolve({
                err: !((projectResponse?.status === 1 || projectResponse?.status === 2) && (projectResponse.reservationDate?.getTime() !== convertDate(reservationDate).getTime() || projectResponse?.reservationPrice !== reservationPrice)) ? 0 : 1,
                message: !projectResponse ?
                    `Project (${id}) does not exist!` :
                    projectResponse.status === 1 && (projectResponse.reservationDate?.getTime() !== convertDate(reservationDate).getTime() || projectResponse.reservationPrice !== reservationPrice) ?
                        `Can not update Reservation Date or Reservation Price because Project(${id}) is already opened for reservation!`
                        : projectResponse.status === 2 && (projectResponse.reservationDate?.getTime() !== convertDate(reservationDate).getTime() || projectResponse.reservationPrice !== reservationPrice) ?
                            `Can not update Reservation Date, Reservation Price because Project(${id}) is already opened for booking!`
                            : `Update Reservation for Project (${id}) successfully.`
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const updateOrdering = ({ id, ordering }) => {
    return new Promise(async (resolve, reject) => {
        try {
            console.log((id));
            console.log(ordering);
            await db.Project.update({
                ordering
            }, {
                where: {
                    id
                }
            })
            resolve({
                err: 0,
                mess: "Update ordering successfully"
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getAllInReservation = ({
    page,
    limit,
    orderBy,
    orderType
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let projectResponse = [];
            let pageInput = 1;
            let countPages = 0;
            let queries = pagination({ page, limit, orderType, orderBy });
            //countPages
            const projectResponsePagination = await db.Project.findAll({
                where: {
                    status: 1,
                }
            })
            countPages = projectResponsePagination.length !== 0 ? 1 : 0;
            if (projectResponsePagination.length / queries.limit > 1) {
                countPages = Math.ceil(projectResponsePagination.length / queries.limit)
            }
            if (page) {
                pageInput = page
            }

            //Pagination
            if (pageInput <= countPages) {
                projectResponse = await db.Project.findAll({
                    attributes: ['id', 'name', 'thumbnailPathUrl', 'status', 'buildingStatus', 'reservationDate', 'reservationPrice', 'openDate', 'closeDate', 'features', 'attractions', 'locationID'],
                    include: {
                        model: db.Location,
                        attributes: ['id', 'name']
                    },
                    where: {
                        status: 1,
                    },
                    ...queries
                })
                if (projectResponse.length !== 0) {
                    for (let i = 0; i < projectResponse.length; i++) {
                        projectResponse[i].location = projectResponse[i].Location.name;
                        if (projectResponse[i].features) {
                            projectResponse[i].features = projectResponse[i].features.split(',');
                        }
                        if (projectResponse[i].attractions) {
                            projectResponse[i].attractions = projectResponse[i].attractions.split(',');
                        }
                    }
                }
            }
            resolve({
                err: projectResponse.length !== 0 ? 0 : 1,
                message: projectResponse.length === 0 ? 'Can not find nay Project being on Open Reservation Stage!' : 'All Projects being on Open Reservation Stage.',
                data: projectResponse,
                count: projectResponse.length,
                countPages: countPages,
                page: pageInput
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getAllSoldReservationStageOfProject = ({
    projectID,
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
            const projectResponse = await db.Project.findByPk(projectID);
            if (projectResponse) {
                const timeShareDateResponsePagination = await db.TimeShareDate.findAll({
                    where: {
                        projectID,
                        status: 1,
                    }
                })

                countPages = timeShareDateResponsePagination.length !== 0 ? 1 : 0;
                if (timeShareDateResponsePagination.length / queries.limit > 1) {
                    countPages = Math.ceil(
                        timeShareDateResponsePagination.length / queries.limit
                    );
                }
                if (page) {
                    pageInput = page;
                }
                if (pageInput <= countPages) {
                    const timeShareDateResponse = await db.TimeShareDate.findAll({
                        where: {
                            projectID,
                            status: 1,
                        },
                        ...queries
                    })
                    if (timeShareDateResponse.length !== 0) {
                        for (let i = 0; i < timeShareDateResponse.length; i++) {
                            const timeShareDate = {};
                            timeShareDate.id = timeShareDateResponse[i].id;
                            timeShareDate.date = `${formatDate(timeShareDateResponse[i].reservationDate)} - ${formatDate(timeShareDateResponse[i].closeDate)}`;
                            timeShareDate.reservationPrice = timeShareDateResponse[i].reservationPrice;
                            timeShareDate.reservationDate = formatDate(timeShareDateResponse[i].reservationDate);
                            timeShareDate.openDate = formatDate(timeShareDateResponse[i].openDate);
                            timeShareDate.closeDate = formatDate(timeShareDateResponse[i].closeDate);
                            response.push(timeShareDate);
                        }
                    }
                }
            }
            resolve({
                err: response.length !== 0 ? 0 : 1,
                message: !projectResponse ?
                    `Project (${projectID}) does not exist!`
                    : response.length === 0 ?
                        `Project (${projectID}) does not have any Sold Reservation Stage`
                        : `All Sold Reservation Stage of Project (${projectID})`,
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

export const statisticOnStage = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            let array = []
            const project = await db.TimeShareDate.findAll({
                where: {
                    projectID: id,
                    status: 1
                }
            })
            // date
            for (let i = 0; i < project.length; i++) {
                let countPurchased = 0;
                let obj = {}
                let check = true
                obj.date = formatDate(project[i].reservationDate) + " - " + formatDate(project[i].closeDate)
                //numberOfReservationTicketBought && numberOfTimeSharesBooked
                const { count, rows } = await db.ReservationTicket.findAndCountAll({
                    where: {
                        reservationDate: project[i].reservationDate,
                        projectID: id
                    }
                })
                obj.numberOfReservationTicketBought = count
                let booked = 0
                let ticketId = []
                rows.forEach((item) => {
                    if (item.status == 2) {
                        booked++
                        ticketId.push(item.id)
                    }
                })
                obj.numberOfTimeSharesBooked = booked
                //numberOfTimeSharesPurchasedFailed && numberOfTimeSharesPurchasedSuccess
                const booking = await db.Booking.findAll({
                    where: {
                        reservationTicketID: ticketId,
                    }
                })
                let accept = 0
                let deny = 0
                let revenue = 0
                booking.forEach((item) => {
                    if (item.status == 1) {
                        accept++
                        revenue += item.priceBooking
                    } else if (item.status == -1) {
                        deny++
                    } else {
                        check = false
                    }
                })
                countPurchased = accept + deny;
                revenue = revenue + countPurchased * project[i].reservationPrice
                obj.numberOfTimeSharesPurchasedFailed = deny
                obj.numberOfTimeSharesPurchasedSuccess = accept
                obj.revenue = revenue
                if (check) array.push(obj)
            }
            resolve({
                err: array.length !== 0 ? 0 : 1,
                mess: array.length === 0 ?
                    `Project (${id}) does not have enough information for statistic!`
                    : `Project (${id})'s statistic.`,
                data: array
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getAllProjectSold = ({
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
            const projectResponsePagination = await db.Project.findAll({
                nest: true,
                attributes: ['id'],
                include: {
                    required: true,
                    attributes: [],
                    model: db.TimeShareDate,
                    as: 'TimeShareDates',
                    where: {
                        status: 1
                    },
                },
                group: ['Project.id'],
            })
            countPages = projectResponsePagination.length !== 0 ? 1 : 0;
            if (projectResponsePagination.length / queries.limit > 1) {
                countPages = Math.ceil(
                    projectResponsePagination.length / queries.limit
                );
            }
            if (page) {
                pageInput = page;
            }

            if (pageInput <= countPages) {
                const projectResponse = await db.Project.findAll({
                    nest: true,
                    required: true,
                    attributes: ['id', 'name', 'thumbnailPathUrl', 'buildingStatus'],
                    include: [
                        {
                            model: db.TimeShareDate,
                            attributes: [],
                            as: 'TimeShareDates',
                            where: {
                                status: 1
                            },
                        },
                        {
                            model: db.Location,
                            attributes: ['id', 'name']
                        },
                    ],
                    group: ['Project.id'],
                    ...queries
                })
                console.log(projectResponse);
                if (projectResponse.length !== 0) {
                    for (let i = 0; i < projectResponse.length; i++) {
                        let project = {};
                        const numberOfSoldStage = await db.TimeShareDate.findAll({
                            where: {
                                projectID: projectResponse[i].id,
                                status: 1,
                            }
                        })
                        const numberOfTimeShareSold = await db.ReservationTicket.findAll({
                            include: {
                                model: db.Booking,
                                where: {
                                    status: 1
                                }
                            },
                            where: {
                                projectID: projectResponse[i].id
                            }
                        })
                        project.id = projectResponse[i].id
                        project.name = projectResponse[i].name
                        project.thumbnailPathUrl = projectResponse[i].thumbnailPathUrl
                        project.buildingStatus = projectResponse[i].buildingStatus
                        project.locationID = projectResponse[i].Location.id
                        project.location = projectResponse[i].Location.name
                        project.numberOfSoldStage = numberOfSoldStage.length
                        response.push(project);
                        project.numberOfTimeShareSold = numberOfTimeShareSold.length
                        //project.numberOfUserByTimeShare = projectResponse[i].Project.name
                    }
                }
            }


            // const projectResponse = await db.Project.findAll({
            //     attributes: ['id', 'name', 'thumbnailPathUrl', 'status', 'buildingStatus', 'reservationDate', 'reservationPrice', 'openDate', 'closeDate', 'features', 'attractions', 'locationID'],
            //     include: [
            //         {
            //             required: true,
            //             model: db.TimeShareDate,
            //             where: {
            //                 status: 1,
            //             },
            //         },
            //         {
            //             model: db.Location,
            //             attributes: ['id', 'name']
            //         },
            //     ],
            // })
            // const result = Object.groupBy((projectResponse), ({ id }) => id)
            // let count1 = 0
            // for (let properties in result) {
            //     count1 = count1 + 1
            // }
            // for (let i = 0; i < count1; i++) {
            //     response.push(result[Object.getOwnPropertyNames(result)[i]][0])
            // }
            resolve({
                err: response.length !== 0 ? 0 : 1,
                message: response.length !== 0 ? `All Projects have Sold Stage.` : `Can not find any Project that have Sold Stage`,
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