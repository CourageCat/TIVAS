import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import "dotenv/config";
import "../connectionDB";

import initRoutes from "./routes";

const app = express();
const PORT = process.env.PORT;

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);


app.use(cookieParser());
  
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

initRoutes(app);

app.listen(PORT, () => {
  console.log(`Successfully at PORT ${PORT}`);
});