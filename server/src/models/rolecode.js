"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class RoleCode extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      RoleCode.hasMany(models.User ,{
        foreignKey: 'roleID',
        ondelete: 'cascade', hooks: true
      });
    }
  }
  RoleCode.init(
    {
      roleName: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "RoleCode",
    }
  );
  return RoleCode;
};
