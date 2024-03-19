import { INTEGER } from "sequelize";
import {
  badRequest,
  internalServerError,
  missValue,
} from "../middlewares/handle_errors";
import * as services from "../services";
import { response } from "express";

const isValidDate = (dateString) => {
  const parts = dateString.split("/");
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);

  const date = new Date(year, month, day);
  return (
    date.getDate() === day &&
    date.getMonth() === month &&
    date.getFullYear() === year
  );
};

export const createNewTimeShare = async (req, res) => {
  try {
    const { typeRoomID, userID } = req.query;
    const { price, startDate, endDate } = req.body;
    if (
      !price ||
      !startDate ||
      !endDate ||
      !/^\d+$/.test(typeRoomID) ||
      !/^\d+$/.test(userID)
    ) {
      return missValue("Missing value!", res);
    }
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return badRequest(
        "Start Date or End Date must be like (dd/mm/yyyy) format!",
        res
      );
    }
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return badRequest("Start Date or End Date must be a valid date!", res);
    }
    if (!/\b\d+(\.\d+)?\b/g.test(price)) {
      return badRequest("Price is required a NUMBER!");
    }
    if (price < 0) {
      return badRequest("Price must be higher than 0!", res);
    }
    const response = await services.createNewTimeShare(req.query, req.body);
    return res.status(200).json(response);
  } catch (error) {
    console.log(error);
    return internalServerError("Error at Server Side!", res);
  }
};

export const getAllTimeShare = async (req, res) => {
    try {
        const response = await services.getAllTimeShare(req.query);
        return res.status(200).json(response);
    } catch (error) {
        console.log(error);
        return internalServerError("Error at Server Side!", res);
    }
}

export const getAllTimeShareOfProject = async (req, res) => {
    try {
        const { projectID } = req.params;
        if(!/^\d+$/.test(projectID)){
            return badRequest("projectID is required an INTEGER!", res);
        }
        const response = await services.getAllTimeShareOfProject(projectID, req.query);
        return res.status(200).json(response);
    } catch (error) {
        console.log(error);
        return internalServerError("Error at Server Side!", res);
    }
}

export const getAllTimeShareOfProjectByAdmin = async (req, res) => {
    const { projectID } = req.params;
    const response = await services.getAllTimeShareOfProjectByAdmin(projectID, req.query);
    return res.status(200).json(response);
}

export const getDetailsTimeShare = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return badRequest("projectID is required an INTEGER123!", res);
    }
    const response = await services.getDetailsTimeShare(id);
    res.status(200).json(response);
  } catch (error) {
    console.log(error);
    return internalServerError("Error at Server Side!", res);
  }
};

export const getAllTimeShareByStaff = async (req, res) => {
  const { userID } = req.params;
  const response = await services.getAllTimeShareByStaff(userID, req.query);
  return res.status(200).json(response);
};

export const getAllTimeShareOfProjectByStaff = async (req, res) => {
  const response = await services.getAllTimeShareOfProjectByStaff(req.query);
  return res.status(200).json(response);
};

export const getAllTimeShareOfSoldReservationStage = async (req, res) => {
  const response = await services.getAllTimeShareOfSoldReservationStage(req.query);
  return res.status(200).json(response);
}

export const getAllUserPurchasedTimeShare = async (req, res) => {
  const response = await services.getAllUserPurchasedTimeShare(req.query);
  return res.status(200).json(response);
}

export const getDetailsTimeShareByStaff = async (req, res) => {
  const response = await services.getDetailsTimeShareByStaff(req.query);
  return res.status(200).json(response);
};
