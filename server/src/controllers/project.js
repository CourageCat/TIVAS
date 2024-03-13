import { INTEGER } from "sequelize";
import { badRequest, missValue } from "../middlewares/handle_errors";
import * as services from "../services";
import { response } from "express";
const cloudinary = require("cloudinary").v2;

const isValidDate = (dateString) => {
  const parts = dateString.split("/");
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);

  const date = new Date(year, month, day);
  console.log(date);
  return (
    date.getDate() === day &&
    date.getMonth() === month &&
    date.getFullYear() === year
  );
};

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
};

//Create New Project
export const createNewProject = async (req, res) => {
  try {
    const {
      name,
      description,
      buildingStatus,
      type,
      location,
      features,
      attractions,
    } = req.body;
    if (
      !name ||
      !description ||
      !buildingStatus ||
      !type ||
      !location ||
      !features ||
      !attractions
    ) {
      if (req.files) {
        deleteProjectImage(req.files);
      }
      return missValue("Missing value!", res);
    }
    if (!/^\d+$/.test(buildingStatus)) {
      if (req.files) {
        deleteProjectImage(req.files);
      }
      return badRequest("Building Status is required an INTEGER!", res);
    }
    const response = await services.createNewProject(req.body, req.files);
    return res.status(200).json(response);
  } catch (error) {
    if (req.files) {
      deleteProjectImage(req.files);
    }
    console.log(error);
  }
};
//Delete Project
export const deleteProjects = async (req, res) => {
  const { id } = req.params;
  const response = await services.deleteProject(id);
  return res.status(200).json(response);
};
//Update Project
export const updateProjects = async (req, res) => {
  const { id } = req.params;
  const { name, description, buildingStatus, location, features, attractions } =
    req.body;
  if (
    !name ||
    !description ||
    !buildingStatus ||
    !location ||
    !features ||
    !attractions ||
    !/^\d+$/.test(id)
  ) {
    if (req.files) {
      deleteProjectImage(req.files);
    }
    return missValue("Missing value!", res);
  }
  if (!/^\d+$/.test(buildingStatus)) {
    if (req.files) {
      deleteProjectImage(req.files);
    }
    return badRequest("Building Status is required an INTEGER!", res);
  }
  const response = await services.updateProject(req.body, id, req.files);
  return res.status(200).json(response);
};
//Get All Project
export const getAllProject = async (req, res) => {
  const response = await services.getAllProject(req.query);
  return res.status(200).json(response);
};

export const getAllByLocation = async (req, res) => {
  const { id } = req.params;
  const response = await services.getAllByLocation(id);
  return res.status(200).json(response);
};

//Search Project
export const searchProject = async (req, res) => {
  const response = await services.searchProject(req.query);
  return res.status(200).json(response);
};

export const searchNameAndLocationProject = async (req, res) => {
  const { info, limit } = req.query;
  console.log(info);
  console.log(limit);
  let limitDB;
  if (/^\d+$/.test(limit)) {
    limitDB = parseInt(limit);
  } else {
    limitDB = 3;
  }
  const response = await services.searchNameAndLocationProject(info, limitDB);
  return res.status(200).json(response);
};

//Get Top 10 New Projects
export const getTop10 = async (req, res) => {
  const response = await services.getTop10();
  return res.status(200).json(response);
};

//Get Project Details
export const getDetailsProject = async (req, res) => {
  const { id } = req.params;
  const response = await services.getDetailsProject(id);
  return res.status(200).json(response);
};

export const getTypeOfProject = async (req, res) => {
  const { id } = req.params;
  const response = await services.getTypeOfProject(id); 
  return res.status(200).json(response);
}

export const updateBooking = async (req, res) => {
  const { id } = req.params;
  const response = await services.updateBooking(req.body, id);
  return res.status(200).json(response);
};

export const openReservationTicket = async (req, res) => {
  const { id } = req.params;
  const response = await services.openReservationTicket(id);
  return res.status(200).json(response);
};

export const openBooking = async (req, res) => {
  const { id } = req.params;
  const response = await services.openBooking(id);
  return res.status(200).json(response);
};

export const getAllWithType = async (req, res) => {
  const response = await services.getAllWithType(req.query);
  return res.status(200).json(response);
};

export const updateReservation = async (req, res) => {
  const { id } = req.params;
  const response = await services.updateReservation(req.body, id);
  return res.status(200).json(response);
};

export const getReservation = async (req, res) => {
  const { id } = req.params;
  const response = await services.getReservation(id);
  return res.status(200).json(response);
};

export const updateReservationInfo = async (req, res) => {
  const { id } = req.params;
  const { reservationDate, reservationPrice, openDate, closeDate } = req.body;
  if (!reservationDate || !reservationPrice || !openDate || !closeDate) {
    return missValue("Missing value!", res);
  }
  const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  if (
    !dateRegex.test(reservationDate) ||
    !dateRegex.test(openDate) ||
    !dateRegex.test(closeDate)
  ) {
    return badRequest(
      "Reservation Date, Open Date or Close Date must be like (dd/mm/yyyy) format!",
      res
    );
  }
  if (
    !isValidDate(reservationDate) ||
    !isValidDate(openDate) ||
    !isValidDate(closeDate)
  ) {
    return badRequest(
      "Reservation Date, Open Date or Close Date must be a valid date!",
      res
    );
  }
  if (!/\b\d+(\.\d+)?\b/g.test(reservationPrice)) {
    return badRequest("Reservation Price is required a NUMBER!");
  }
  if (reservationPrice < 0) {
    return badRequest("Reservation Price must be higher than 0!", res);
  }
  const response = await services.updateReservationInfo(id, req.body);
  return res.status(200).json(response);
};

export const getAllProjectReservation = async (req, res) => {
  const response = await services.getAllProjectReservation;
};
