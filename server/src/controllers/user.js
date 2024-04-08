import { missValue } from "../middlewares/handle_errors";
import * as services from "../services";
const cloudinary = require("cloudinary").v2;

const deleteAvatarImage = (fileData) => {
  if (fileData?.avatar) {
    for (let i = 0; i < fileData.avatar.length; i++) {
      cloudinary.uploader.destroy(fileData.avatar[i].filename);
    }
  }
};

export const getUser = async (req, res) => {
  const { username } = req.params;
  if (!username) {
    return missValue("Missing username");
  }
  const response = await services.getUser(req.params);

  return res.status(200).json(response);
};

export const getAvatarUser = async (req, res) => {
  const { username } = req.params;
  if (!username) {
    return missValue("Missing username");
  }

  const response = await services.getAvatarUser(req.params);

  return res.status(200).json(response);
};

export const editUser = async (req, res) => {
  const { username, fullName, numberPhone } = req.body;
  if (!username || !fullName || !numberPhone) {
    if (req.files) {
      deleteAvatarImage(req.files);
    }
    return missValue("Missing value", res);
  }
  const response = await services.editUser(req.body, req.files);

  return res.status(200).json(response);
};

export const getAllUsers = async (req, res) => {
  const response = await services.getAllUsers(req.query);
  return res.status(200).json(response);
};

export const getBankingUser = async (req, res) => {
  const { username } = req.params;
  if (!username) {
    return missValue("Missing username");
  }
  const response = await services.getBankingUser(req.params);
  return res.status(200).json(response);
};

export const banUser = async (req, res) => {
  const { id, reasonBan } = req.body;
  const response = await services.banUser(req.body);
  return res.status(200).json(response);
};

export const unBanUser = async (req, res) => {
  const { id } = req.body;
  const response = await services.unBanUser(req.body);
  return res.status(200).json(response);
};

export const addWishlist = async (req, res) => {
  const response = await services.addWishlist(req.query);
  return res.status(200).json(response);
};

export const viewwishlist = async (req, res) => {
  const response = await services.viewwishlist(req.query);
  return res.status(200).json(response);
};

export const deletewishlist = async (req, res) => {
  const response = await services.deletewishlist(req.query);
  return res.status(200).json(response);
};

export const checkProjectWishlist = async (req, res) => {
  const response = await services.checkProjectWishlist(req.query);
  return res.status(200).json(response);
}

export const getHistory = async (req, res) => {
  const response = await services.getHistory(req.query);
  return res.status(200).json(response);
}