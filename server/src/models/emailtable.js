'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class EmailTable extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  EmailTable.init({
    email: DataTypes.STRING,
    otp: DataTypes.STRING,
    expiredAt: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'EmailTable',
  });
  return EmailTable;
};