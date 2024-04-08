'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Location extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
        Location.hasMany(models.Project, {foreignKey: 'locationID', ondelete: 'cascade', hooks: true});
        Location.hasMany(models.Project, {foreignKey: 'locationID', ondelete: 'cascade', hooks: true});
      // define association here
    }
  }
  Location.init({
    name: DataTypes.STRING,
    imagePathUrl: DataTypes.STRING,
    imagePathName: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Location',
  });
  return Location;
};