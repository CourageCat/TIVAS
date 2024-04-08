'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Image extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Image.belongsTo(models.Project, {foreignKey: 'projectID'});
      Image.belongsTo(models.TypeRoom, {foreignKey: 'typeRoomID'});
    }
  }
  Image.init({
    pathUrl: DataTypes.STRING,
    pathName: DataTypes.STRING,
    projectID: DataTypes.INTEGER,
    typeRoomID: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Image',
  });
  return Image;
};