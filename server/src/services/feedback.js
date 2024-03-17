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
               defaults : {
                   userID,
                   content,
                   // status : 0
                },
                where : {
                    userID,
                }
           })
           resolve({
            err : created ? 0 : 1,
            mess : created ? "Feedback Successfully" : "Feedback Fail",
            data : created ? feedback : ""
           })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const getAllFeedBackByAdmin = () => {
    return new Promise(async (resolve, reject) => {
        try {
           const feedback = await db.FeedBack.findAll()
           resolve ({
            err : feedback ? 0 : 1,
            data : feedback ? feedback : ""
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
           const feedback = db.FeedBack.update({
            status : 1
           }, {
            where : {
                id:feedBackID
            }
           })
           resolve({
            err : feedback ? 0 : 1,
            mess : feedback ? "Success" : "Fail"
           })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

export const ShowFeedBackToUser = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const feedback = await db.FeedBack.findAll({
                where : {
                    stauts : 1
                }
            })
            resolve ({
             err : feedback ? 0 : 1,
             data : feedback ? feedback : ""
            })
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}