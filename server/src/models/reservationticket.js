'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class ReservationTicket extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            ReservationTicket.belongsTo(models.User, {
                foreignKey: 'userID',
            });
            ReservationTicket.belongsTo(models.Project, {
                foreignKey: 'projectID',
            });
            ReservationTicket.belongsTo(models.TimeShare, {
                foreignKey: 'timeShareID',
            });
            ReservationTicket.hasOne(models.Booking, {
                foreignKey: 'reservationTicketID',
                ondelete: 'cascade', hooks: true
            });
            // define association here
        }
    }
    ReservationTicket.init({
        code: DataTypes.STRING,
        status: DataTypes.INTEGER,
        reservationPrice: DataTypes.DOUBLE,
        reservationDate: DataTypes.DATE,
        openDate: DataTypes.DATE,
        closeDate: DataTypes.DATE,
        refund: DataTypes.INTEGER,
        bookingDate: DataTypes.DATE,
        refundDate: DataTypes.DATE,
        userID: DataTypes.INTEGER,
        projectID: DataTypes.INTEGER,
        timeShareID: DataTypes.INTEGER,
    }, {
        sequelize,
        modelName: 'ReservationTicket',
    });
    return ReservationTicket;
};