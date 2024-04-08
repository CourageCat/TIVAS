import { INTEGER } from "sequelize";
import { badRequest, missValue } from "../middlewares/handle_errors";
import * as services from "../services";
import { response } from "express";

export const addFeedBack = async(req, res) => {
    const response = await services.addFeedBack(req.body);
    return res.status(200).json(response); 
}

export const getAllFeedBackByAdmin = async(req, res) => {
    const response = await services.getAllFeedBackByAdmin(req.query);
    return res.status(200).json(response)
}

export const updateShowFeedBack = async(req, res) => {
    const { feedBackID } = req.params;
    const response = await services.updateShowFeedBack(feedBackID);
    return res.status(200).json(response);
}

export const showFeedBackToUser = async(req, res) => {
    const response = await services.showFeedBackToUser();
    return res.status(200).json(response);
}

export const deleteFeedBack = async(req, res) => {
    const { id } = req.params;
    const response = await services.deleteFeedBack(id);
    return res.status(200).json(response);
}