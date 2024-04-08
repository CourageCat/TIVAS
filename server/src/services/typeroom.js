import db from "../models";
const cloudinary = require("cloudinary").v2;
import "dotenv/config";
import { Model, Op } from "sequelize";
import { pagination } from "../middlewares/pagination";

const deleteTypeRoomImage = (fileData) => {
  if (fileData) {
    for (let i = 0; i < fileData.length; i++) {
      cloudinary.uploader.destroy(fileData[i].filename);
    }
  }
};

// export const createProperty = ({
//     name,
//     description,
// }, fileData) => {
//     return new Promise(async (resolve, reject) => {
//         try {
//             const created = await db.Property.findOrCreate({
//                 where: { name },
//                 defaults: {
//                     name,
//                     description,
//                     images: fileData?.path,
//                     quantity: 0
//                 },
//             })

//             resolve({
//                 err: created ? 0 : 1,
//                 mess: created ? "Create Property Successfully." : "Property Name has been used!",
//             })

//             if (fileData && !created) {
//                 cloudinary.uploader.destroy(fileData.filename)
//             }
//         } catch (error) {
//             console.log(error);
//             reject(error);
//             if (fileData) {
//                 cloudinary.uploader.destroy(fileData.filename)
//             }
//         }
//     })
// }

export const createTypeRoom = (
  projectID,
  {
    name,
    bedrooms,
    bathrooms,
    persons,
    size,
    bedTypes,
    amenities,
    description,
    type,
    quantity,
  },
  fileData
) => {
  return new Promise(async (resolve, reject) => {
    try {
      let typeOfProjectResponse;
      let typeRoomResponse;
      let imageResponse;
      let typeRoomDuplicated;
      const imageTypeRoomArray = [];

      //Find type is existed in DB
      const typeResponse = await db.Type.findOne({
        where: {
          name: type,
        },
      });

      //Find project is existed in DB
      const projectResponse = await db.Project.findByPk(projectID);

      //Find project has type
      if (typeResponse && projectResponse) {
        typeOfProjectResponse = await db.TypeOfProject.findOne({
          where: {
            projectID: projectResponse.id,
            typeID: typeResponse.id,
          },
        });
        if (typeOfProjectResponse) {
          typeRoomDuplicated = await db.TypeRoom.findOne({
            where: {
              name,
              typeOfProjectID: typeOfProjectResponse.id,
            },
          });

          if (!typeRoomDuplicated) {
            typeRoomResponse = await db.TypeRoom.create({
              name,
              bedrooms,
              bathrooms,
              persons,
              size,
              bedTypes,
              amenities,
              description,
              quantity,
              typeOfProjectID: typeOfProjectResponse.id,
            });

            //Import images to imageTable
            if (typeRoomResponse) {
              if (fileData) {
                for (let i = 0; i < fileData.length; i++) {
                  const image = {
                    pathUrl: fileData[i].path,
                    pathName: fileData[i].filename,
                    typeRoomID: typeRoomResponse.id,
                  };
                  imageTypeRoomArray.push(image);
                }
                await db.Image.bulkCreate(imageTypeRoomArray);
              }
            }
          }
        }
      }
      resolve({
        err: typeRoomResponse ? 0 : 1,
        message: !projectResponse
          ? `Project (${projectID}) does not exist!`
          : !typeResponse
          ? `TypeOfProject: (${type}) does not exist!`
          : !typeOfProjectResponse
          ? `Project (${projectID}) does not have (${type})!`
          : typeRoomDuplicated
          ? `Project (${projectID}) with (${type}) Type already has had TypeRoom with name: ${name}`
          : "Create successfully.",
      });

      if (typeRoomDuplicated && fileData) {
        deleteTypeRoomImage(fileData);
      }
    } catch (error) {
      console.log(error);
      reject(error);
      if (fileData) {
        deleteTypeRoomImage(fileData);
      }
    }
  });
};

export const updateTypeRoom = (
  id,
  {
    name,
    bedrooms,
    bathrooms,
    persons,
    size,
    bedTypes,
    amenities,
    description,
    imagesDeleted,
  },
  fileData
) => {
  return new Promise(async (resolve, reject) => {
    try {
      let imageErrorMessage = [];
      const imageTypeRoomArray = [];
      let typeOfProjectResponse;
      let typeResponse;
      let typeRoomDuplicated;
      let checkUpdate;
      //Check TypeRoom is existed in DB
      let typeRoomResponse = await db.TypeRoom.findByPk(id);
      if (typeRoomResponse) {
        typeOfProjectResponse = await db.TypeOfProject.findByPk(
          typeRoomResponse.typeOfProjectID
        );

        typeResponse = await db.Type.findOne({
          where: {
            id: typeOfProjectResponse.typeID,
          },
        });
        if (typeRoomResponse.name !== name) {
          typeRoomDuplicated = await db.TypeRoom.findOne({
            where: {
              name,
              typeOfProjectID: typeOfProjectResponse.id,
            },
          });
        }
        if (!typeRoomDuplicated) {
          //Delete images
          if (imagesDeleted) {
            imagesDeleted = imagesDeleted.split(",");
            await Promise.all(
              imagesDeleted.map(async (image) => {
                const imageResult = await db.Image.findByPk(image);
                if (imageResult) {
                  cloudinary.uploader.destroy(imageResult.pathName);
                  await db.Image.destroy({
                    where: {
                      id: image,
                    },
                  });
                } else {
                  imageErrorMessage.push(`(${image})`);
                }
              })
            );
          }

          //Update
          checkUpdate = await db.TypeRoom.update(
            {
              name,
              bedrooms,
              bathrooms,
              persons,
              size,
              bedTypes,
              amenities,
              description,
              typeOfProjectID: typeOfProjectResponse.id,
            },
            {
              where: {
                id: id,
              },
            }
          );

          //Import images to imageTable
          if (fileData) {
            for (let i = 0; i < fileData.length; i++) {
              const image = {
                pathUrl: fileData[i].path,
                pathName: fileData[i].filename,
                typeRoomID: id,
              };
              imageTypeRoomArray.push(image);
            }
            await db.Image.bulkCreate(imageTypeRoomArray);
          }
        }
      }
      resolve({
        err: checkUpdate ? 0 : 1,
        message: !typeRoomResponse
          ? `Can not find TypeRoom with id: (${id})`
          : typeRoomDuplicated
          ? `Project (${typeOfProjectResponse.projectID}) with (${typeResponse.name}) Type already has had TypeRoom with name: ${name}`
          : "Update Successfully.",
        messageImage:
          imageErrorMessage.length !== 0
            ? `Can not find Image: ${imageErrorMessage.join(",")}`
            : null,
      });
      if (typeRoomDuplicated && fileData) {
        deleteTypeRoomImage(fileData);
      }
    } catch (error) {
      reject(error);
      console.log(error);
      if (fileData) {
        deleteTypeRoomImage(fileData);
      }
    }
  });
};

export const deleteTypeRoom = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const typeRoomResponse = await db.TypeRoom.findByPk(id);
      if (typeRoomResponse) {
        const imageTypeRoom = await db.Image.findAll({
          where: {
            typeRoomID: id,
          },
        });
        if (imageTypeRoom) {
          Promise.all(
            imageTypeRoom.map((image) => {
              cloudinary.uploader.destroy(image.pathName);
            })
          );
        }
        await typeRoomResponse.destroy();
      }
      resolve({
        err: typeRoomResponse ? 0 : 1,
        message: typeRoomResponse
          ? "Deleted Successfully."
          : `Can not find TypeRoom with id: ${id}`,
      });
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
};

export const getAllTypeRoom = (
  projectID,
  { page, limit, orderType, orderBy }
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const queries = pagination({ page, limit, orderType, orderBy });
      queries.nest = true;
      const response = await db.TypeRoom.findAll({
        attributes: [
          "id",
          "name",
          "bedrooms",
          "bathrooms",
          "persons",
          "size",
          "bedTypes",
          "amenities",
        ],
        include: [
          {
            model: db.TypeOfProject,
            attributes: [],
            where: {
              projectID: projectID,
            },
          },
          {
            model: db.Image,
            attributes: ["id", "pathUrl"],
            limit: 1,
          },
        ],
        ...queries,
      });
      if (response) {
        for (let i = 0; i < response.length; i++) {
          response[i].bedTypes = response[i].bedTypes.split(",");
          if (response[i].amenities) {
            response[i].amenities = response[i].amenities.split(",");
          }
        }
      }
      resolve({
        err: response && response.length !== 0 ? 0 : 1,
        message:
          response && response.length !== 0
            ? `All TypeRooms of Project (${projectID})`
            : `Can not find any TypeRooms of Project (${projectID})`,
        data: response,
        count: response ? response.length : 0,
        page: page,
      });
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
};

export const getDetailsTypeRoom = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await db.TypeRoom.findByPk(id, {
        attributes: {
          exclude: [
            "createdAt",
            "updatedAt",
            "typeOfProjectID",
            "TypeOfProjectId",
          ],
        },
        nest: true,
        include: {
          model: db.Image,
          attributes: ["id", "pathUrl"],
        },
      });
      if (response) {
        response.bedTypes = response.bedTypes.split(",");
        if (response.amenities) {
          response.amenities = response.amenities.split(",");
        }
      }
      resolve({
        err: response ? 0 : 1,
        message: response
          ? `TypeRoom (${id}) found`
          : `Can not find TypeRoom (${id})`,
        data: response,
      });
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
};
