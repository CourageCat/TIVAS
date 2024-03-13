'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TypeRoom extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TypeRoom.hasMany(models.TimeShare, {foreignKey: 'typeRoomID', ondelete: 'cascade', hooks: true});
      TypeRoom.belongsTo(models.TypeOfProject, {foreignkey: 'typeOfProjectID'})
      TypeRoom.hasMany(models.Image, {foreignKey: 'typeRoomID', ondelete: 'cascade', hooks: true});
      // define association here
    }
  }
  TypeRoom.init({
    name: DataTypes.STRING,
    bedrooms: DataTypes.INTEGER,
    bathrooms: DataTypes.INTEGER,
    persons: DataTypes.INTEGER,
    size: DataTypes.DOUBLE,
    bedTypes: DataTypes.STRING,
    amenities: DataTypes.STRING,
    description: DataTypes.TEXT('long'),
    quantity: DataTypes.INTEGER,
    typeOfProjectID: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'TypeRoom',
  });
  return TypeRoom;
};