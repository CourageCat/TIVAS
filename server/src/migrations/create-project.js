'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Projects', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.TEXT('long')
      },
      buildingStatus: {
        type: Sequelize.INTEGER
      },
      features: {
        type: Sequelize.STRING
      },
      attractions: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.INTEGER
      },
      reservationPrice: {
        type: Sequelize.DOUBLE
      },
      reservationDate: {
        type: Sequelize.DATE
      },
      openDate: {
        type: Sequelize.DATE
      },
      closeDate: {
        type: Sequelize.DATE
      },
      ordering: {
        type: Sequelize.INTEGER
      },
      thumbnailPathUrl: {
        type: Sequelize.STRING
      },
      thumbnailPathName: {
        type: Sequelize.STRING
      },
      locationID: {
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
    await queryInterface.dropTable('Projects');
  }
};