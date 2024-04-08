'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class FeedBack extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
        FeedBack.belongsTo(models.User, {foreignKey: 'userID'});
      // define association here
    }
  }
  FeedBack.init({
    content: DataTypes.STRING,
    status: DataTypes.INTEGER,
    userID: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'FeedBack',
  });
  return FeedBack;
};