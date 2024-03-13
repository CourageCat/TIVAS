import { INTEGER } from "sequelize";
import { badRequest, missValue } from "../middlewares/handle_errors";
import * as services from "../services";
import { response } from "express";
const cloudinary = require("cloudinary").v2;
var randomstring = require("randomstring");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export const paymentReservation = async (req, res) => {
  const { username, amount } = req.body;
  const response = await services.paymentReservation(username);
  if (!response) return missValue("Not user in system!");
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: response?.data?.refundHistoryID,
      type: "card",
    });
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: "usd",
      customer: response?.data?.refundHistoryID,
      payment_method: paymentMethods.data[0].id,
      confirm: true,
      return_url: "https://facebook.com",
    });
    return res
      .status(200)
      .json({ err: 0, clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error:", error);
    if (error.code === "payment_intent_requires_confirmation") {
      return res.status(400).json({ err: 1, mess: "Insufficient funds." });
    } else {
      return res
        .status(500)
        .json({ err: 1, mess: "An error occurred while processing payment." });
    }
  }
};

export const createTicket = async (req,res) => {
    const code = randomstring.generate(6);
    const response = await services.createTicket(req.body,code);
    return res.status(200).json(response);
}
 
export const activeTicket = async (req,res) => {
    const {id} = req.params
    const response = await services.activeTicket(id)
    return res.status(200).json(response)
}
 
// export const checkTicket = async (req, res) => {
//     const { code } = req.body;
//     if(!code){
//         return missValue("Missing Value!", res);
//     }
//     const response = await services.checkTicket(req.body);
//     return res.status(200).json(response);
// }
 
export const createReservation = async(req, res) => {
    const { code, timeShareID, userID } = req.body;
    if(!code || !/^\d+$/.test(timeShareID) || !/^\d+$/.test(userID)){
        return missValue("Missing Value!", res);
    }
    const response = await services.createReservation(req.body);
    return res.status(200).json(response);
}
 
export const checkPriority = async (req,res) => {
    const {id} = req.params
    const response = await services.checkPriority(id)
    return res.status(200).json(response)
}
 
export const getTimeSharePriority = async (req, res) => {
    const {userID} = req.params;
    const response = await services.getTimeSharePriority(userID);
    return res.status(200).json(response);
}
 
export const getUserTickets = async (req, res) => {
    const { id } = req.params;
    const response = await services.getUserTickets(id);
    return res.status(200).json(response);
}

export const getUserBuyTickets = async (req, res) => {
  const { id } = req.params;
  const response = await services.getUserBuyTickets(id);
  return res.status(200).json(response);
}

export const getAllUserNoPriorityByAdmin = async (req, res) => {
  const { id } = req.params;
  const response = await services.getAllUserNoPriorityByAdmin(id, req.query);
  return res.status(200).json(response);
}

export const getAllUserPriorityByAdmin = async (req, res) => {
  const { id } = req.params;
  const response = await services.getAllUserPriorityByAdmin(id, req.query);
  return res.status(200).json(response);
}

export const getAllUserNoPriorityByStaff = async (req, res) => {
  const response = await services.getAllUserNoPriorityByStaff(req.query);
  return res.status(200).json(response);
}

export const getAllUserPriorityByStaff = async (req, res) => {
  const response = await services.getAllUserPriorityByStaff(req.query);
  return res.status(200).json(response);
}

// export const getAllFailedTickets = async (req, res) => {
//   const { id } = req.params;
//   const resposne = await services.get();
// }

export const getAllTicketsByUser = async (req, res) => {
  const response = await services.getAllTicketsByUser(req.query);
  return res.status(200).json(response);
}

export const getAllTicketsByAdmin = async (req, res) => {
  const { id } = req.params;
  if(!/^\d+$/.test(id)){
    return missValue("Missing value!", res);
  }
    const response = await services.getAllTicketsByAdmin(id);
    return res.status(200).json(response);
}

