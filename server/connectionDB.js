const { Sequelize } = require("sequelize");

// const sequelize = new Sequelize(
//   process.env.DATABASE,
//   process.env.USERNAME_DB,
//   process.env.PASSWORD_DB,
//   {
//     host: process.env.HOST,
//     dialect: "mysql",
//     logging: false,
//   }
// );
const sequelizeDB = new Sequelize(
  process.env.DATABASE,
  process.env.USERNAME_DB,
  process.env.PASSWORD_CLOUD_DB,
  {
    host: process.env.HOST_CLOUD,
    dialect: "mysql",
    logging: false,
  }
);


// const connection = async () => {
//   try {
//     await sequelize.authenticate();
//     console.log("Connection has been established successfully.");
//   } catch (error) {
//     console.error("Unable to connect to the database:", error);
//   }
// };
const connectionDB = async () => {
  try {
    await sequelizeDB.authenticate();
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

// connection();

connectionDB();