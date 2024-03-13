import { INTEGER } from "sequelize";
import { badRequest, missValue } from "../middlewares/handle_errors";
import * as services from "../services";
import { response } from "express";

export const getAllLocation = async(req, res) => {
    const response = await services.getAllLocation();
    return res.status(200).json(response);
}