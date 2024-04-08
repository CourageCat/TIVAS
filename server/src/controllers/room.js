import { INTEGER } from "sequelize";
import * as services from "../services";
import { response } from "express";
const cloudinary = require("cloudinary").v2;


export const test = async (req, res) => {
    console.log(req.files)
    
    return res.status(200).json(response);
  };