'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class WishList extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
        WishList.belongsTo(models.User, {foreignKey: 'projectID'});
        WishList.belongsTo(models.Project, {foreignKey: 'projectID'});
      // define association here
    }
  }
  WishList.init({
    userID: DataTypes.INTEGER,
    projectID: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'WishList',
  });
  return WishList;
};