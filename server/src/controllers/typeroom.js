import { INTEGER } from "sequelize";
import { badRequest, internalServerError, missValue } from "../middlewares/handle_errors";
import * as services from "../services";
import { response } from "express";
const cloudinary = require("cloudinary").v2;

const deleteTypeRoomImage = (fileData) => {
  if (fileData) {
    for (let i = 0; i < fileData.length; i++) {
      cloudinary.uploader.destroy(fileData[i].filename);
    }
  }
}

// export const createNewProperty = async (req, res) => {
//   const { name, description } = req.body;
//   if (!name || !description) {
//     if (req.file) {
//       cloudinary.uploader.destroy(req.file.filename);
//     }
//     return missValue("Missing value!", res);
//   }
//   const response = await services.createProperty(req.body, req.file);
//   return res.status(200).json(response);
// };

export const createNewTypeRoom = async (req, res) => {
  try {
    const { projectID } = req.params;
    const { name, bedrooms, bathrooms, persons, description, type, quantity, size, bedTypes } = req.body;
    if (!name || !bedrooms || !bathrooms || !persons || !description || (!/^\d+$/.test(projectID)) || !type || !size || !bedTypes || !quantity) {
      if (req.files) {
        deleteTypeRoomImage(req.files);
      }
      return missValue("Missing value!", res);
    }
    if ((!/^\d+$/.test(bedrooms)) || (!/^\d+$/.test(bathrooms)) || (!/^\d+$/.test(persons)) || (!/^\d+$/.test(quantity))) {
      if (req.files) {
        deleteTypeRoomImage(req.files);
      }
      return badRequest("bedrooms, bathrooms, persons, quantity are required an INTEGER!", res);
    }
    if (!/\b\d+(\.\d+)?\b/g.test(size)) {
      if (req.files) {
        deleteProjectImage(req.files);
      }
      return badRequest("Size is required a NUMBER!", res);
    }
    if (bedrooms < 0 || bathrooms < 0 || persons < 0 || quantity < 0 || size < 0) {
      return badRequest("bedrooms, persons, quantity, size must be higher than 0!", res)
    }

    const response = await services.createTypeRoom(projectID, req.body, req.files);
    return res.status(200).json(response);
  } catch (error) {
    if (req.files) {
      deleteTypeRoomImage(req.files);
    }
    console.log(error)
    return internalServerError("Error at Server Side!", res);
  }
  // const { name, description } = req.body;
  // if (!name || !description) {
  //   if (req.file) {
  //     cloudinary.uploader.destroy(req.file.filename);
  //   }
  //   return missValue("Missing value!", res);
  // }
  // const response = await services.createProperty(req.body, req.file);
  // return res.status(200).json(response);
};

export const updateTypeRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, bedrooms, bathrooms, persons, description, imagesDeleted, size, bedTypes, } = req.body;
    if (!name || !bedrooms || !bathrooms || !persons || !description || (!/^\d+$/.test(id)) || !size || !bedTypes) {
      if (req.files) {
        deleteTypeRoomImage(req.files);
      }
      return missValue("Missing value!", res);
    }
    if ((!/^\d+$/.test(bedrooms)) || (!/^\d+$/.test(bathrooms)) || (!/^\d+$/.test(persons))) {
      if (req.files) {
        deleteTypeRoomImage(req.files);
      }
      return badRequest("bedrooms, bathrooms, persons, quantity are required an INTEGER!", res);
    }
    if(!/\b\d+(\.\d+)?\b/g.test(size)){
      if(req.files) {
        deleteProjectImage(req.files);
      }
      return badRequest("Size is required a NUMBER!", res);
    }
    if(bedrooms < 0 || bathrooms < 0 || persons < 0 || size < 0){
      return badRequest("bedrooms, bathrooms, persons, size must be higher than 0!", res)
    }
    if (imagesDeleted) {
      let imagesDeletedArray = imagesDeleted.split(',');
      Promise.all(imagesDeletedArray.map((image) => {
        if ((!/^\d+$/.test(image))) {
          if (req.files) {
            deleteTypeRoomImage(req.files);
          }
          return badRequest("imagesDeleted is required a string contains of an array of INTEGER!", res);
        }
      }))
    }
    const response = await services.updateTypeRoom(id, req.body, req.files);
    return res.status(200).json(response);
  } catch (error) {
    console.log(error)
    return internalServerError("Error at Server Side!", res);
  }
  // const { name, description } = req.body;
  // if (!name || !description) {
  //   if (req.file) {
  //     cloudinary.uploader.destroy(req.file.filename);
  //   }
  //   return missValue("Missing value!", res);
  // }
  // const response = await services.createProperty(req.body, req.file);
  // return res.status(200).json(response);
};

export const deleteTypeRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await services.deleteTypeRoom(id);
    return res.status(200).json(response);
  } catch (error) {
    console.log(error);
    return internalServerError("Error at Server Side!", res);
  }
}

export const getAllTypeRoom = async (req, res) => {
  try {
    const { projectID } = req.params
    const response = await services.getAllTypeRoom(projectID, req.query);
    return res.status(200).json(response);
  } catch (error) {
    console.log(error);
    return internalServerError("Error at Server Side!", res);
  }
}

export const getDetailsTypeRoom = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return badRequest("projectID is required an INTEGER!", res);
    }
    const response = await services.getDetailsTypeRoom(id);
    return res.status(200).json(response);
  } catch (error) {
    console.log(error);
    return internalServerError("Error at Server Side!", res);
  }
}