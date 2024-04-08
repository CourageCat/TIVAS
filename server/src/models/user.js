"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      User.belongsTo(models.RoleCode, {
        foreignKey: 'roleID',
      });
      User.hasMany(models.ReservationTicket, {foreignKey: 'userID', ondelete: 'cascade', hooks: true});      
      // User.hasOne(models.RefundHistory, {
      //   foreignKey: 'userID',
      // });
      User.hasMany(models.TimeShare, {foreignKey: 'userID', ondelete: 'cascade', hooks: true});
      User.hasMany(models.WishList, {foreignKey: 'userID', ondelete: 'cascade', hooks: true});
      User.hasMany(models.FeedBack, {foreignKey: 'userID', ondelete: 'cascade', hooks: true})
    }
  }
  User.init(
    {
      username: DataTypes.STRING,
      fullName: DataTypes.STRING,
      email: DataTypes.STRING,
      password: DataTypes.STRING,
      phoneNumber: DataTypes.STRING,
      banStatus: DataTypes.BOOLEAN,
      reasonBan: DataTypes.STRING,
      roleID: DataTypes.INTEGER,
      refreshToken: DataTypes.STRING,
      refundHistoryID: DataTypes.STRING,
      avatarURL: DataTypes.STRING,
      avatarPathName: DataTypes.STRING,
      type: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "User",
    }
  );
  return User;
};
