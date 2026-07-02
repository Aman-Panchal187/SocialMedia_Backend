import { DataTypes } from 'sequelize';

const defineCall = (sequelize) =>
  sequelize.define(
    'Call',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      callerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      calleeId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      callType: {
        type: DataTypes.ENUM('voice', 'video'),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('missed', 'completed', 'rejected', 'failed'),
        allowNull: false,
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      endedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      durationSec: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'calls',
      underscored: true,
      timestamps: true,
    }
  );

export default defineCall;
