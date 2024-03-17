'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class TimeShareDate extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
            TimeShareDate.belongsTo(models.Project, {
                foreignKey: 'projectID',
            });
            TimeShareDate.hasMany(models.TimeShare, {
                foreignKey: 'timeShareDateID',
                ondelete: 'cascade', hooks: true,
            })
        }
    }
    TimeShareDate.init({
        startDate: DataTypes.DOUBLE,
        endDate: DataTypes.DATE,
        reservationPrice: DataTypes.DOUBLE,
        reservationDate: DataTypes.DATE,
        openDate: DataTypes.DATE,
        closeDate: DataTypes.DATE,
        status: DataTypes.INTEGER,
        projectID: DataTypes.INTEGER
    }, {
        sequelize,
        modelName: 'TimeShareDate',
    });
    return TimeShareDate;
};