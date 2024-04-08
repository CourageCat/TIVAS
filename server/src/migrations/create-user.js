"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Users", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      username: {
        type: Sequelize.STRING,
      },
      fullName: {
        type: Sequelize.STRING,
      },
      email: {
        type: Sequelize.STRING,
      },
      password: {
        type: Sequelize.STRING,
      },
      phoneNumber: {
        type: Sequelize.STRING,
      },
      banStatus: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      reasonBan: {
        type: Sequelize.STRING,
      },
      refundHistoryID: {
        type: Sequelize.STRING,
      },
      roleID: {
        type: Sequelize.INTEGER,
        defaultValue: 3,
      },
      avatarURL: {
        type: Sequelize.STRING,
        defaultValue:
          "https://res.cloudinary.com/tivas/image/upload/v1709040512/tivas_image/unknown_wyqayg.jpg",
      },
      avatarPathName: {
        type: Sequelize.STRING,
        defaultValue: "unknown_wyqayg",
      },
      refreshToken: {
        type: Sequelize.STRING,
      },
      type: {
        type: Sequelize.STRING,
      },
      createdAt: {
        type: "TIMESTAMP",
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        allowNull: false,
      },
      updatedAt: {
        type: "TIMESTAMP",
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        allowNull: false,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Users");
  },
};
