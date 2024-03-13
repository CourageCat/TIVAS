'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Booking.hasOne(models.Contract ,{
        foreignKey: 'bookingID',
        ondelete: 'cascade', hooks: true
      });
      Booking.belongsTo(models.ReservationTicket ,{
        foreignKey: 'reservationTicketID',
      });
      // define association here
    }
  }
  Booking.init({
    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE,
    status: DataTypes.INTEGER,
    priceBooking: DataTypes.DOUBLE,
    reservationTicketID: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Booking',
  });
  return Booking;
};