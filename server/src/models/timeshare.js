'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TimeShare extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TimeShare.hasMany(models.ReservationTicket, {foreignKey: 'timeShareID', ondelete: 'cascade', hooks: true});
      TimeShare.belongsTo(models.TypeRoom ,{
        foreignKey: 'typeRoomID',
      });
      TimeShare.belongsTo(models.User, {
        foreignKey: 'userID'
      });
      TimeShare.belongsTo(models.TimeShareDate, {
        foreignKey: 'timeShareDateID'
      })
      // define association here
    }
  }
  TimeShare.init({
    price: DataTypes.DOUBLE,
    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE,
    saleStatus: DataTypes.INTEGER,
    quantity: DataTypes.INTEGER,
    timeShareDateID: DataTypes.INTEGER,
    typeRoomID: DataTypes.INTEGER,
    userID: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'TimeShare',
  });
  return TimeShare;
};