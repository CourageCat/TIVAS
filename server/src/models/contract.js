'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Contract extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Contract.belongsTo(models.Booking ,{
        foreignKey: 'bookingID',
      });
      // define association here
    }
  }
  Contract.init({
    priceInReturn: DataTypes.DOUBLE,
    progress: DataTypes.STRING,
    images: DataTypes.STRING,
    bookingID: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Contract',
  });
  return Contract;
};