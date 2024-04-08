import db from "../models";
import "dotenv/config";
import { Model, Op, fn, col, literal } from "sequelize";
import { pagination } from "../middlewares/pagination";

export const getAllLocation = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await db.Location.findAll({
                attributes: {exclude: ['createdAt', 'updatedAt', 'imagePathName']}
            });
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