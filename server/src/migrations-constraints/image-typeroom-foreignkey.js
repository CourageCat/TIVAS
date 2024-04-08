'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addConstraint('Images', {
      type: 'foreign key',
      name: 'image-typeroom-fk',
      fields: ['typeRoomID'],
      references: {
        table: 'TypeRooms',
        field: 'id',
      },
      onDelete: 'cascade',
      onUpdate: 'cascade',
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeConstraint('Images', 'image-typeroom-fk');
  }
};
