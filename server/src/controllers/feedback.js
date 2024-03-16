import * as services from "../services";
import { missValue, notAuth } from "../middlewares/handle_errors";

export const addFeedBack = async(req, res) => {
    const response = await db.FeedBack.addFeedBack(userID, req.body);
    return res.status(200).json(response); 
}

export const getAllFeedBackByAdmin = async(req, res) => {
    const response = await db.FeedBack.getAllFeedBackByAdmin;
    return res.status(200).json(response);
}

export const updateShowFeedBack = async(req, res) => {
    const { feedBackID } = req.params;
    const response = await db.FeedBack.updateShowFeedBack(feedBackID);
    return res.status(200).json(response);
}

export const ShowFeedBackToUser = async(req, res) => {
    const response = await db.FeedBack.showFeedBackToUser();
    return res.status(200).json(response);
}