'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Project extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Project.hasMany(models.TypeOfProject, {foreignKey: 'projectID', ondelete: 'cascade', hooks: true});
      Project.hasMany(models.Image, {foreignKey: 'projectID', ondelete: 'cascade', hooks: true});
      Project.hasMany(models.ReservationTicket, {foreignKey: 'projectID', ondelete: 'cascade', hooks: true});
      Project.belongsTo(models.Location, {foreignKey: 'locationID'});
      Project.hasMany(models.TimeShareDate, {foreignKey: 'projectID', ondelete: 'cascade', hooks: true});
      // define association here
    }
  }
  Project.init({
    name: DataTypes.STRING,
    description: DataTypes.TEXT('long'),
    buildingStatus: DataTypes.INTEGER,
    features: DataTypes.STRING,
    attractions: DataTypes.STRING,
    status: DataTypes.INTEGER,
    reservationPrice: DataTypes.DOUBLE,
    reservationDate: DataTypes.DATE,
    openDate: DataTypes.DATE,
    closeDate: DataTypes.DATE,
    thumbnailPathUrl: DataTypes.STRING,
    thumbnailPathName: DataTypes.STRING,
    locationID: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Project',
  });
  return Project;
};