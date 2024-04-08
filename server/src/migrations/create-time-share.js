'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TimeShares', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      price: {
        type: Sequelize.DOUBLE
      },
      startDate: {
        type: Sequelize.DATE
      },
      endDate: {
        type: Sequelize.DATE
      },
      saleStatus: {
        type: Sequelize.INTEGER
      },
      quantity: {
        type: Sequelize.INTEGER
      },
      timeShareDateID: {
        type: Sequelize.INTEGER
      },
      typeRoomID: {
        type: Sequelize.INTEGER
      },
      userID: {
        type: Sequelize.INTEGER
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
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('TimeShares');
  }
};